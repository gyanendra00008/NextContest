from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NextContestBackend")

app = FastAPI(
    title="NextContest API",
    description="Real-time Coding Contests Aggregator API for LeetCode, Codeforces, and CodeChef",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

# Simple in-memory cache: { key: (timestamp, data) }
_cache = {}
CACHE_TTL = 60  # seconds


def get_cached(key: str):
    if key in _cache:
        cached_time, data = _cache[key]
        if time.time() - cached_time < CACHE_TTL:
            return data
    return None


def set_cache(key: str, data):
    _cache[key] = (time.time(), data)


# --- Platform Fetchers ---

def fetch_leetcode_data():
    cached = get_cached("leetcode")
    if cached:
        return cached

    url = "https://leetcode.com/graphql/"
    upcoming_payload = {
        "operationName": "contestV2UpcomingContests",
        "query": """
        query contestV2UpcomingContests {
            contestV2UpcomingContests {
                titleSlug
                title
                titleCn
                startTime
                duration
                cardImg
                cardImgApp
            }
        }
        """,
        "variables": {},
    }

    past_payload = {
        "operationName": "contestV2HistoryContests",
        "query": """
        query contestV2HistoryContests($skip: Int!, $limit: Int!) {
            contestV2HistoryContests(skip: $skip, limit: $limit) {
                totalNum
                contests {
                    titleSlug
                    title
                    titleCn
                    startTime
                    duration
                    cardImg
                    cardImgApp
                    companyWatermark
                    solved
                    totalQuestions
                }
            }
        }
        """,
        "variables": {"limit": 15, "skip": 0},
    }

    try:
        up_res = requests.post(url, json=upcoming_payload, headers=HEADERS, timeout=10)
        up_data = up_res.json()
    except Exception as e:
        logger.error(f"Error fetching LeetCode upcoming: {e}")
        up_data = {"data": {"contestV2UpcomingContests": []}}

    try:
        past_res = requests.post(url, json=past_payload, headers=HEADERS, timeout=10)
        past_data = past_res.json()
    except Exception as e:
        logger.error(f"Error fetching LeetCode past: {e}")
        past_data = {"data": {"contestV2HistoryContests": {"contests": []}}}

    raw_upcoming = up_data.get("data", {}).get("contestV2UpcomingContests", []) or []
    raw_past = past_data.get("data", {}).get("contestV2HistoryContests", {}).get("contests", []) or []

    # Standardized items
    upcoming_list = []
    for c in raw_upcoming:
        upcoming_list.append({
            "id": c.get("titleSlug"),
            "name": c.get("title"),
            "platform": "LeetCode",
            "url": f"https://leetcode.com/contest/{c.get('titleSlug')}",
            "startTime": c.get("startTime"),  # unix timestamp in seconds
            "duration": c.get("duration"),    # in seconds
            "status": "UPCOMING",
            "cardImg": c.get("cardImg")
        })

    past_list = []
    for c in raw_past:
        past_list.append({
            "id": c.get("titleSlug"),
            "name": c.get("title"),
            "platform": "LeetCode",
            "url": f"https://leetcode.com/contest/{c.get('titleSlug')}",
            "startTime": c.get("startTime"),  # unix timestamp in seconds
            "duration": c.get("duration"),    # in seconds
            "status": "FINISHED",
            "cardImg": c.get("cardImg")
        })

    result = {
        "status": "success",
        "platform": "LeetCode",
        "upcoming_contests": upcoming_list,
        "past_contests": past_list,
        # Backward compatibility with existing frontend expectations
        "upcoming_contest": up_data,
        "past_contest": past_data,
    }

    set_cache("leetcode", result)
    return result


def fetch_codeforces_data():
    cached = get_cached("codeforces")
    if cached:
        return cached

    url = "https://codeforces.com/api/contest.list?gym=false"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10).json()
        contests = response.get("result", [])
    except Exception as e:
        logger.error(f"Error fetching Codeforces: {e}")
        contests = []

    upcoming_list = []
    past_list = []
    legacy_list = []

    # Filter upcoming and past
    for c in contests:
        phase = c.get("phase")
        item = {
            "id": str(c.get("id")),
            "name": c.get("name"),
            "platform": "Codeforces",
            "url": f"https://codeforces.com/contest/{c.get('id')}",
            "startTime": c.get("startTimeSeconds"),  # unix timestamp in seconds
            "duration": c.get("durationSeconds"),    # in seconds
            "phase": phase,
            "status": "LIVE" if phase == "CODING" else ("UPCOMING" if phase == "BEFORE" else "FINISHED")
        }

        if phase in ["BEFORE", "CODING"]:
            upcoming_list.append(item)
        elif phase == "FINISHED":
            if len(past_list) < 20:
                past_list.append(item)

    # Sort upcoming chronologically (earliest first)
    upcoming_list.sort(key=lambda x: x["startTime"] or 0)

    # Legacy contest_list format: [name, phase, durationSeconds, startTimeSeconds]
    for c in upcoming_list + past_list[:15]:
        legacy_list.append([
            c["name"],
            c["phase"],
            c["duration"],
            c["startTime"]
        ])

    result = {
        "status": "success",
        "platform": "Codeforces",
        "upcoming_contests": upcoming_list,
        "past_contests": past_list,
        # Backward compatibility
        "contest_list": legacy_list
    }

    set_cache("codeforces", result)
    return result


def fetch_codechef_data():
    cached = get_cached("codechef")
    if cached:
        return cached

    url = "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        future = res.get("future_contests", []) or []
        present = res.get("present_contests", []) or []
        past = res.get("past_contests", []) or []
    except Exception as e:
        logger.error(f"Error fetching CodeChef: {e}")
        future, present, past = [], [], []

    upcoming_list = []
    for c in future:
        duration_minutes = c.get("contest_duration", 0)
        try:
            dur_sec = int(duration_minutes) * 60
        except (ValueError, TypeError):
            dur_sec = 0

        upcoming_list.append({
            "id": c.get("contest_code"),
            "name": c.get("contest_name"),
            "platform": "CodeChef",
            "url": f"https://www.codechef.com/{c.get('contest_code')}",
            "startTime": c.get("contest_start_date_iso") or c.get("contest_start_date"),
            "startDateStr": c.get("contest_start_date"),
            "endDateStr": c.get("contest_end_date"),
            "duration": dur_sec,
            "status": "UPCOMING"
        })

    live_list = []
    for c in present:
        duration_minutes = c.get("contest_duration", 0)
        try:
            dur_sec = int(duration_minutes) * 60
        except (ValueError, TypeError):
            dur_sec = 0

        live_list.append({
            "id": c.get("contest_code"),
            "name": c.get("contest_name"),
            "platform": "CodeChef",
            "url": f"https://www.codechef.com/{c.get('contest_code')}",
            "startTime": c.get("contest_start_date_iso") or c.get("contest_start_date"),
            "startDateStr": c.get("contest_start_date"),
            "endDateStr": c.get("contest_end_date"),
            "duration": dur_sec,
            "status": "LIVE"
        })

    past_list = []
    for c in past[:15]:
        duration_minutes = c.get("contest_duration", 0)
        try:
            dur_sec = int(duration_minutes) * 60
        except (ValueError, TypeError):
            dur_sec = 0

        past_list.append({
            "id": c.get("contest_code"),
            "name": c.get("contest_name"),
            "platform": "CodeChef",
            "url": f"https://www.codechef.com/{c.get('contest_code')}",
            "startTime": c.get("contest_start_date_iso") or c.get("contest_start_date"),
            "startDateStr": c.get("contest_start_date"),
            "endDateStr": c.get("contest_end_date"),
            "duration": dur_sec,
            "status": "FINISHED"
        })

    result = {
        "status": "success",
        "platform": "CodeChef",
        "upcoming_contests": upcoming_list,
        "live_contests": live_list,
        "past_contests": past_list,
        # Backward compatibility
        "data": future
    }

    set_cache("codechef", result)
    return result


# --- Routes ---

@app.get("/")
async def home():
    return {
        "status": "🚀 NextContest Backend Running",
        "version": "2.0.0",
        "endpoints": [
            "/Leetcode",
            "/Codeforces",
            "/Codechef",
            "/All",
            "/health"
        ]
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": int(time.time())}


@app.get("/Leetcode")
async def get_leetcode():
    logger.info("LeetCode endpoint requested")
    return fetch_leetcode_data()


@app.get("/Codeforces")
async def get_codeforces():
    logger.info("Codeforces endpoint requested")
    return fetch_codeforces_data()


@app.get("/Codechef")
async def get_codechef():
    logger.info("CodeChef endpoint requested")
    return fetch_codechef_data()


@app.get("/All")
async def get_all_contests():
    logger.info("All contests endpoint requested")
    lc = fetch_leetcode_data()
    cf = fetch_codeforces_data()
    cc = fetch_codechef_data()

    all_upcoming = []
    all_upcoming.extend(lc.get("upcoming_contests", []))
    all_upcoming.extend(cf.get("upcoming_contests", []))
    all_upcoming.extend(cc.get("upcoming_contests", []))
    all_upcoming.extend(cc.get("live_contests", []))

    return {
        "status": "success",
        "total_upcoming": len(all_upcoming),
        "upcoming_contests": all_upcoming,
        "leetcode": lc,
        "codeforces": cf,
        "codechef": cc
    }