from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import time
from datetime import datetime, timezone, timedelta
import logging

from Leetcode_service import router as leetcode_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NextContestBackend")

app = FastAPI(
    title="NextContest API",
    description="Real-time Coding Contests Aggregator API for LeetCode, Codeforces, CodeChef, and AtCoder with LeetCode Profile & AI Coaching Analysis",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)

# Include LeetCode profile analysis and AI coach endpoints
app.include_router(leetcode_router)


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


def parse_codechef_time(date_iso: str, date_str: str) -> int:
    """Parses CodeChef ISO string or IST date string to unix timestamp (seconds)."""
    if date_iso:
        try:
            dt = datetime.fromisoformat(date_iso.replace("Z", "+00:00"))
            return int(dt.timestamp())
        except Exception:
            pass
    if date_str:
        try:
            # CodeChef times in date_str are IST: '09 Sep 2026  20:00:00'
            cleaned = " ".join(date_str.strip().split())
            dt = datetime.strptime(cleaned, "%d %b %Y %H:%M:%S")
            ist = timezone(timedelta(hours=5, minutes=30))
            dt = dt.replace(tzinfo=ist)
            return int(dt.timestamp())
        except Exception:
            pass
    return 0


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

        start_ts = parse_codechef_time(c.get("contest_start_date_iso"), c.get("contest_start_date"))

        upcoming_list.append({
            "id": c.get("contest_code"),
            "name": c.get("contest_name"),
            "platform": "CodeChef",
            "url": f"https://www.codechef.com/{c.get('contest_code')}",
            "startTime": start_ts if start_ts > 0 else (c.get("contest_start_date_iso") or c.get("contest_start_date")),
            "startDateIso": c.get("contest_start_date_iso"),
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

        start_ts = parse_codechef_time(c.get("contest_start_date_iso"), c.get("contest_start_date"))

        live_list.append({
            "id": c.get("contest_code"),
            "name": c.get("contest_name"),
            "platform": "CodeChef",
            "url": f"https://www.codechef.com/{c.get('contest_code')}",
            "startTime": start_ts if start_ts > 0 else (c.get("contest_start_date_iso") or c.get("contest_start_date")),
            "startDateIso": c.get("contest_start_date_iso"),
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

        start_ts = parse_codechef_time(c.get("contest_start_date_iso"), c.get("contest_start_date"))

        past_list.append({
            "id": c.get("contest_code"),
            "name": c.get("contest_name"),
            "platform": "CodeChef",
            "url": f"https://www.codechef.com/{c.get('contest_code')}",
            "startTime": start_ts if start_ts > 0 else (c.get("contest_start_date_iso") or c.get("contest_start_date")),
            "startDateIso": c.get("contest_start_date_iso"),
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



def parse_duration_seconds(dur_str: str) -> int:
    try:
        dur_str = dur_str.strip()
        if ":" in dur_str:
            parts = dur_str.split(":")
            if len(parts) == 2:
                return int(parts[0]) * 3600 + int(parts[1]) * 60
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return int(dur_str) * 60
    except Exception:
        return 7200


def parse_atcoder_time(time_str: str):
    """
    Parses AtCoder time string: e.g. '2026-09-06 13:10:00+0900'
    Returns unix timestamp (seconds) and iso string.
    """
    try:
        time_str = time_str.strip()
        dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S%z")
        return int(dt.timestamp()), dt.isoformat()
    except Exception:
        return 0, time_str


def fetch_atcoder_data():
    cached = get_cached("atcoder")
    if cached:
        return cached

    url = "https://atcoder.jp/contests"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        res = requests.get(url, headers=headers, timeout=12)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(res.text, "html.parser")
    except Exception as e:
        logger.error(f"Error fetching AtCoder: {e}")
        soup = None

    upcoming_list = []
    live_list = []
    past_list = []
    now_ts = int(time.time())

    if soup:
        for panel in soup.find_all("div", class_="panel"):
            heading = panel.find(class_="panel-heading") or panel.find_previous(["h3", "h4"])
            title = heading.get_text().strip() if heading else ""
            table = panel.find("table")
            if not table:
                continue

            is_upcoming_section = "Upcoming" in title or "Active" in title or "Current" in title
            is_recent_section = "Recent" in title

            if not (is_upcoming_section or is_recent_section):
                continue

            rows = table.find_all("tr")[1:]  # skip header row
            for tr in rows:
                tds = tr.find_all("td")
                if len(tds) < 3:
                    continue

                time_str = tds[0].get_text().strip()
                a_tag = tds[1].find("a")
                if not a_tag:
                    continue
                name = a_tag.get_text().strip()
                href = a_tag.get("href", "")
                contest_id = href.strip("/").split("/")[-1] if href else name
                contest_url = f"https://atcoder.jp{href}" if href.startswith("/") else href

                dur_str = tds[2].get_text().strip()
                duration_sec = parse_duration_seconds(dur_str)
                start_ts, start_iso = parse_atcoder_time(time_str)

                rated_range = tds[3].get_text().strip() if len(tds) > 3 else "-"

                # Determine status based on time
                if start_ts > 0:
                    if start_ts <= now_ts < start_ts + duration_sec:
                        status = "LIVE"
                    elif now_ts < start_ts:
                        status = "UPCOMING"
                    else:
                        status = "FINISHED"
                else:
                    status = "UPCOMING" if is_upcoming_section else "FINISHED"

                item = {
                    "id": contest_id,
                    "name": name,
                    "platform": "AtCoder",
                    "url": contest_url,
                    "startTime": start_ts if start_ts > 0 else start_iso,
                    "startDateStr": time_str,
                    "duration": duration_sec,
                    "status": status,
                    "rated": rated_range
                }

                if status == "LIVE":
                    live_list.append(item)
                    upcoming_list.append(item)
                elif status == "UPCOMING" and is_upcoming_section:
                    upcoming_list.append(item)
                elif status == "FINISHED" and is_recent_section:
                    if len(past_list) < 20:
                        past_list.append(item)

        upcoming_list.sort(key=lambda x: x["startTime"] if isinstance(x["startTime"], (int, float)) else 0)

    result = {
        "status": "success",
        "platform": "AtCoder",
        "upcoming_contests": upcoming_list,
        "live_contests": live_list,
        "past_contests": past_list,
    }

    set_cache("atcoder", result)
    return result


# --- Routes ---

@app.get("/")
async def home():
    return {
        "status": "🚀 NextContest Backend Running",
        "version": "2.2.0",
        "endpoints": {
            "contests": [
                "/Leetcode",
                "/Codeforces",
                "/Codechef",
                "/Atcoder",
                "/All"
            ],
            "leetcode_user_analysis": [
                "/leetcode/{username}",
                "/leetcode/{username}/skills",
                "/leetcode/{username}/contest",
                "/leetcode/{username}/recent",
                "/leetcode/{username}/analysis",
                "/leetcode/{username}/ai-analysis",
                "/leetcode/{username}/personalized-contest"
            ],
            "leetcode_problem_data": [
                "/leetcode/problems/stats",
                "/leetcode/problems/sync",
                "/leetcode/problems/search",
                "/leetcode/problems/tags",
                "/leetcode/problems/{title_slug}"
            ],
            "personalized_contest": [
                "GET /leetcode/{username}/personalized-contest",
                "POST /leetcode/personalized-contest"
            ],
            "system": [
                "/health"
            ]
        }
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": int(time.time())}


@app.get("/Leetcode")
@app.get("/leetcode-contests")
async def get_leetcode():
    logger.info("LeetCode contests endpoint requested")
    return fetch_leetcode_data()


@app.get("/Codeforces")
@app.get("/codeforces")
async def get_codeforces():
    logger.info("Codeforces endpoint requested")
    return fetch_codeforces_data()


@app.get("/Codechef")
@app.get("/codechef")
async def get_codechef():
    logger.info("CodeChef endpoint requested")
    return fetch_codechef_data()


@app.get("/Atcoder")
@app.get("/atcoder")
async def get_atcoder():
    logger.info("AtCoder endpoint requested")
    return fetch_atcoder_data()


@app.get("/All")
@app.get("/all")
async def get_all_contests():
    logger.info("All contests endpoint requested")
    lc = fetch_leetcode_data()
    cf = fetch_codeforces_data()
    cc = fetch_codechef_data()
    at = fetch_atcoder_data()

    seen_keys = set()
    all_upcoming = []

    def add_unique(contests):
        for c in contests:
            key = f"{c.get('platform')}_{c.get('id') or c.get('name')}"
            if key not in seen_keys:
                seen_keys.add(key)
                all_upcoming.append(c)

    add_unique(lc.get("upcoming_contests", []))
    add_unique(cf.get("upcoming_contests", []))
    add_unique(cc.get("live_contests", []))
    add_unique(cc.get("upcoming_contests", []))
    add_unique(at.get("live_contests", []))
    add_unique(at.get("upcoming_contests", []))

    def get_sort_key(c):
        st = c.get("startTime")
        if isinstance(st, (int, float)):
            return st
        if isinstance(st, str):
            try:
                dt = datetime.fromisoformat(st.replace("Z", "+00:00"))
                return int(dt.timestamp())
            except Exception:
                pass
        return 0

    all_upcoming.sort(key=get_sort_key)

    return {
        "status": "success",
        "total_upcoming": len(all_upcoming),
        "upcoming_contests": all_upcoming,
        "leetcode": lc,
        "codeforces": cf,
        "codechef": cc,
        "atcoder": at
    }


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)