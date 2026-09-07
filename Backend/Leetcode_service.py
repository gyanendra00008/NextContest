import asyncio
import logging
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from typing import Optional, List, Dict, Any, Set
from Analyzer import create_user_profile
from llm_service import get_ai_analysis
from problem_service import problem_service
from contest_recommender import recommender

logger = logging.getLogger("NextContestBackend.LeetCode")

LEETCODE_URL = "https://leetcode.com/graphql/"
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://leetcode.com",
    "Accept": "application/json"
}


class UserRequest(BaseModel):
    username: str


# -----------------------------------
# GraphQL Queries
# -----------------------------------

SKILL_STATS_QUERY = """
query skillStats($username: String!) {
  matchedUser(username: $username) {
    tagProblemCounts {
      advanced {
        tagName
        tagSlug
        problemsSolved
      }
      intermediate {
        tagName
        tagSlug
        problemsSolved
      }
      fundamental {
        tagName
        tagSlug
        problemsSolved
      }
    }
  }
}
"""

CONTEST_QUERY = """
query userContestRankingInfo($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
    badge {
      name
    }
  }

  userContestRankingHistory(username: $username) {
    attended
    trendDirection
    problemsSolved
    totalProblems
    finishTimeInSeconds
    rating
    ranking
    contest {
      title
      startTime
    }
  }
}
"""

RECENT_SUBMISSIONS_QUERY = """
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
"""


# -----------------------------------
# Helper Function
# -----------------------------------

async def graphql_request(query: str, variables: dict):
    payload = {
        "query": query,
        "variables": variables
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                LEETCODE_URL,
                json=payload,
                headers=HEADERS
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="LeetCode API request timed out. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to LeetCode API: {str(e)}"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"LeetCode returned status {response.status_code}"
        )

    data = response.json()

    if "errors" in data:
        errors = data["errors"]
        error_msgs = [e.get("message", "") for e in errors if isinstance(e, dict)]
        if any("does not exist" in m.lower() for m in error_msgs):
            username = variables.get("username", "Unknown")
            raise HTTPException(
                status_code=404,
                detail=f"LeetCode user '{username}' does not exist."
            )
        raise HTTPException(
            status_code=400,
            detail=error_msgs if error_msgs else errors
        )

    return data.get("data", {})


# -----------------------------------
# Router Definition
# -----------------------------------

router = APIRouter(prefix="/leetcode", tags=["LeetCode Analysis"])


# -----------------------------------
# Problem Data Layer Endpoints
# -----------------------------------

class ProblemSyncRequest(BaseModel):
    limit: int = 500
    skip: int = 0


class PersonalizedContestRequest(BaseModel):
    user_profile: Dict[str, Any]
    ai_analysis: Optional[Dict[str, Any]] = None
    custom_exclusions: Optional[List[str]] = None
    seed: Optional[str] = None


@router.get("/problems/stats")
async def get_problem_stats():
    """Retrieve problem database statistics including total, difficulty breakdown, and last sync."""
    try:
        return {
            "status": "success",
            "stats": problem_service.get_stats()
        }
    except Exception as e:
        logger.error(f"Error fetching problem stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/problems/sync")
async def sync_problems(req: Optional[ProblemSyncRequest] = None):
    """Sync LeetCode problems metadata from GraphQL into SQLite."""
    limit = req.limit if req else 500
    skip = req.skip if req else 0
    try:
        result = await problem_service.sync_from_leetcode(limit=limit, skip=skip)
        return result
    except Exception as e:
        logger.error(f"Error during problem sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/problems/search")
async def search_problems(
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    paid_only: Optional[bool] = False,
    min_ac: Optional[float] = None,
    max_ac: Optional[float] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Search and filter stored LeetCode problems."""
    tag_slugs = [tag] if tag else None
    problems = problem_service.search_problems(
        difficulty=difficulty,
        tag_slugs=tag_slugs,
        paid_only=paid_only,
        min_ac_rate=min_ac,
        max_ac_rate=max_ac,
        search_query=q,
        limit=min(limit, 200),
        offset=offset
    )
    return {
        "status": "success",
        "count": len(problems),
        "problems": problems
    }


@router.get("/problems/tags")
async def get_problem_tags():
    """List all available problem tags with problem counts."""
    return {
        "status": "success",
        "tags": problem_service.get_all_tags()
    }


@router.get("/problems/{title_slug}")
async def get_problem_detail(title_slug: str):
    """Fetch metadata for a specific problem by titleSlug."""
    prob = problem_service.get_problem(title_slug)
    if not prob:
        raise HTTPException(status_code=404, detail=f"Problem '{title_slug}' not found in database.")
    return {"status": "success", "problem": prob}


@router.post("/personalized-contest")
async def generate_contest_from_payload(payload: PersonalizedContestRequest):
    """Generate a balanced personalized contest directly from user profile & AI coaching data."""
    try:
        exclusions = set(payload.custom_exclusions or [])
        contest = recommender.generate_personalized_contest(
            user_profile=payload.user_profile,
            ai_analysis=payload.ai_analysis,
            custom_exclusions=exclusions,
            seed=payload.seed
        )
        return {
            "status": "success",
            "contest": contest
        }
    except Exception as e:
        logger.error(f"Error generating personalized contest from payload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{username}/skills")
async def get_skill_stats(username: str):
    """Fetch user's tag-based problem-solving statistics."""
    data = await graphql_request(
        SKILL_STATS_QUERY,
        {"username": username}
    )
    if not data or not data.get("matchedUser"):
        raise HTTPException(
            status_code=404,
            detail=f"LeetCode user '{username}' not found or profile is private."
        )
    return data


@router.get("/{username}/contest")
async def get_contest_stats(username: str):
    """Fetch user's contest rating and history."""
    data = await graphql_request(
        CONTEST_QUERY,
        {"username": username}
    )
    return data


@router.get("/{username}/recent")
async def get_recent_submissions(username: str, limit: int = 15):
    """Fetch user's recent accepted submissions."""
    data = await graphql_request(
        RECENT_SUBMISSIONS_QUERY,
        {
            "username": username,
            "limit": min(limit, 50)
        }
    )
    return data


@router.get("/{username}")
async def get_complete_profile(username: str):
    """Fetch full LeetCode profile (skills, contest, recent submissions) in parallel."""
    try:
        skills, contest, recent = await asyncio.gather(
            graphql_request(SKILL_STATS_QUERY, {"username": username}),
            graphql_request(CONTEST_QUERY, {"username": username}),
            graphql_request(RECENT_SUBMISSIONS_QUERY, {"username": username, "limit": 15}),
        )

        if not skills or not skills.get("matchedUser"):
            raise HTTPException(
                status_code=404,
                detail=f"LeetCode user '{username}' not found or profile is private."
            )

        return {
            "status": "success",
            "username": username,
            "skills": skills,
            "contest": contest,
            "recent_submissions": recent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_complete_profile for {username}: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/{username}/analysis")
async def analyze_user(username: str):
    """Perform skill analysis, contest tiering, and activity parsing."""
    try:
        skills, contest, recent = await asyncio.gather(
            graphql_request(SKILL_STATS_QUERY, {"username": username}),
            graphql_request(CONTEST_QUERY, {"username": username}),
            graphql_request(RECENT_SUBMISSIONS_QUERY, {"username": username, "limit": 15}),
        )

        if not skills or not skills.get("matchedUser"):
            raise HTTPException(
                status_code=404,
                detail=f"LeetCode user '{username}' not found or profile is private."
            )

        profile = create_user_profile(skills, contest, recent, username=username)
        return {
            "status": "success",
            "username": username,
            "profile": profile
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in analyze_user for {username}: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/{username}/ai-analysis")
async def ai_analysis(username: str):
    """Run AI-powered CP coach analysis on user's LeetCode profile."""
    try:
        skills, contest, recent = await asyncio.gather(
            graphql_request(SKILL_STATS_QUERY, {"username": username}),
            graphql_request(CONTEST_QUERY, {"username": username}),
            graphql_request(RECENT_SUBMISSIONS_QUERY, {"username": username, "limit": 15}),
        )

        if not skills or not skills.get("matchedUser"):
            raise HTTPException(
                status_code=404,
                detail=f"LeetCode user '{username}' not found or profile is private."
            )

        user_profile = create_user_profile(skills, contest, recent, username=username)
        ai_result = get_ai_analysis(user_profile)

        return {
            "status": "success",
            "username": username,
            "profile": user_profile,
            "ai_analysis": ai_result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ai_analysis for {username}: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/{username}/personalized-contest")
async def get_user_personalized_contest(username: str, seed: Optional[str] = None):
    """
    End-to-end personalized contest generation:
    1. Fetches user profile (skills, contest rating, recent submissions) from LeetCode.
    2. Runs AI-coaching analysis to identify strengths, weaknesses, and recommended topics.
    3. Runs deterministic recommendation algorithm to assemble a balanced 4-problem contest
       excluding already solved/recent problems and paid-only problems.
    """
    try:
        skills, contest_info, recent = await asyncio.gather(
            graphql_request(SKILL_STATS_QUERY, {"username": username}),
            graphql_request(CONTEST_QUERY, {"username": username}),
            graphql_request(RECENT_SUBMISSIONS_QUERY, {"username": username, "limit": 20}),
        )

        if not skills or not skills.get("matchedUser"):
            raise HTTPException(
                status_code=404,
                detail=f"LeetCode user '{username}' not found or profile is private."
            )

        user_profile = create_user_profile(skills, contest_info, recent, username=username)
        ai_result = get_ai_analysis(user_profile)
        personalized_contest = recommender.generate_personalized_contest(
            user_profile=user_profile,
            ai_analysis=ai_result,
            seed=seed
        )

        return {
            "status": "success",
            "username": username,
            "profile": user_profile,
            "ai_analysis": ai_result,
            "contest": personalized_contest
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating personalized contest for {username}: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# -----------------------------------
# Standalone App Configuration
# -----------------------------------

app = FastAPI(
    title="NextContest - LeetCode Service",
    description="LeetCode profile and AI coaching analysis API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)