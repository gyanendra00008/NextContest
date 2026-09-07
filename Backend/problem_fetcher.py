import time
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger("NextContestBackend.ProblemFetcher")

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql/"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://leetcode.com",
    "Accept": "application/json"
}

PROBLEMSET_QUERY = """
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      acRate
      difficulty
      frontendQuestionId: questionFrontendId
      paidOnly: isPaidOnly
      title
      titleSlug
      topicTags {
        name
        slug
      }
    }
  }
}
"""


def _normalize_question(q: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a raw LeetCode GraphQL question dictionary into our standardized metadata schema."""
    topic_tags = []
    for tag in q.get("topicTags", []) or []:
        if isinstance(tag, dict):
            name = tag.get("name", "").strip()
            slug = tag.get("slug", "").strip()
            if name:
                topic_tags.append({"name": name, "slug": slug or name.lower().replace(" ", "-")})

    return {
        "frontend_id": str(q.get("frontendQuestionId", "")),
        "title": q.get("title", "Untitled"),
        "title_slug": q.get("titleSlug", ""),
        "difficulty": (q.get("difficulty") or "Medium").capitalize(),
        "ac_rate": round(float(q.get("acRate", 0.0)), 2),
        "paid_only": bool(q.get("paidOnly", False)),
        "tags": topic_tags,
    }


class ProblemFetcher:
    """
    Fetches LeetCode problem metadata using the official GraphQL API.
    Supports both single-batch fetching and multi-page bulk downloads.
    """

    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout

    async def fetch_batch_async(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        retries: int = 3
    ) -> Dict[str, Any]:
        """
        Asynchronously fetches a batch of problems from LeetCode GraphQL.
        LeetCode imposes a maximum limit of 100 per page.
        """
        clamped_limit = min(max(1, limit), 100)
        payload = {
            "query": PROBLEMSET_QUERY,
            "variables": {
                "categorySlug": "",
                "skip": skip,
                "limit": clamped_limit,
                "filters": filters or {}
            }
        }

        last_err = None
        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        LEETCODE_GRAPHQL_URL,
                        json=payload,
                        headers=HEADERS
                    )

                if response.status_code == 200:
                    data = response.json()
                    res_data = data.get("data", {}).get("problemsetQuestionList", {})
                    total = res_data.get("total", 0)
                    raw_questions = res_data.get("questions", [])
                    cleaned = [_normalize_question(q) for q in raw_questions if q.get("titleSlug")]
                    return {
                        "total": total,
                        "count": len(cleaned),
                        "skip": skip,
                        "limit": clamped_limit,
                        "questions": cleaned
                    }
                else:
                    logger.warning(f"LeetCode problem fetch returned status {response.status_code} (attempt {attempt + 1})")

            except Exception as e:
                last_err = e
                logger.warning(f"Error fetching problems batch skip={skip}: {e} (attempt {attempt + 1})")
                time.sleep(1.0 * (attempt + 1))

        logger.error(f"Failed to fetch problems batch skip={skip} after {retries} attempts: {last_err}")
        return {"total": 0, "count": 0, "skip": skip, "limit": clamped_limit, "questions": []}

    def fetch_batch_sync(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        retries: int = 3
    ) -> Dict[str, Any]:
        """
        Synchronous batch fetcher for CLI tools, seed scripts, or background workers.
        """
        clamped_limit = min(max(1, limit), 100)
        payload = {
            "query": PROBLEMSET_QUERY,
            "variables": {
                "categorySlug": "",
                "skip": skip,
                "limit": clamped_limit,
                "filters": filters or {}
            }
        }

        last_err = None
        for attempt in range(retries):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(
                        LEETCODE_GRAPHQL_URL,
                        json=payload,
                        headers=HEADERS
                    )

                if response.status_code == 200:
                    data = response.json()
                    res_data = data.get("data", {}).get("problemsetQuestionList", {})
                    total = res_data.get("total", 0)
                    raw_questions = res_data.get("questions", [])
                    cleaned = [_normalize_question(q) for q in raw_questions if q.get("titleSlug")]
                    return {
                        "total": total,
                        "count": len(cleaned),
                        "skip": skip,
                        "limit": clamped_limit,
                        "questions": cleaned
                    }
                else:
                    logger.warning(f"LeetCode sync fetch status {response.status_code} (attempt {attempt + 1})")

            except Exception as e:
                last_err = e
                logger.warning(f"Sync fetch error skip={skip}: {e} (attempt {attempt + 1})")
                time.sleep(1.0 * (attempt + 1))

        logger.error(f"Failed sync fetch batch skip={skip}: {last_err}")
        return {"total": 0, "count": 0, "skip": skip, "limit": clamped_limit, "questions": []}

    async def fetch_bulk_async(
        self,
        max_problems: int = 500,
        start_skip: int = 0,
        page_delay: float = 0.2
    ) -> List[Dict[str, Any]]:
        """
        Iteratively fetches multiple pages until max_problems is reached.
        """
        all_questions = []
        skip = start_skip
        batch_limit = 100

        while len(all_questions) < max_problems:
            needed = min(batch_limit, max_problems - len(all_questions))
            result = await self.fetch_batch_async(skip=skip, limit=needed)
            questions = result.get("questions", [])
            if not questions:
                break

            all_questions.extend(questions)
            skip += len(questions)

            # If fewer returned than requested, we reached the end
            if len(questions) < needed or skip >= result.get("total", 0):
                break

            if page_delay > 0:
                time.sleep(page_delay)

        return all_questions


# Global fetcher instance
fetcher = ProblemFetcher()
