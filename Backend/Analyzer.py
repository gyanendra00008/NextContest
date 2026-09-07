from datetime import datetime
from typing import Dict, Any, List, Optional


class TopicList(list):
    """Subclass of list that allows checking topic names directly with 'in' operator."""
    def __contains__(self, item):
        if super().__contains__(item):
            return True
        for elem in self:
            if isinstance(elem, dict) and (elem.get("topic") == item or elem.get("name") == item):
                return True
            elif isinstance(elem, str) and elem == item:
                return True
        return False


def analyze_skills(skill_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Processes LeetCode tagProblemCounts and ranks topics into weak and strong areas.
    """
    if not skill_data or not isinstance(skill_data, dict):
        return {
            "weak_topics": TopicList(),
            "strong_topics": TopicList(),
            "all_topics": [],
            "total_solved": 0
        }

    matched_user = skill_data.get("matchedUser")
    if not matched_user or not isinstance(matched_user, dict):
        return {
            "weak_topics": TopicList(),
            "strong_topics": TopicList(),
            "all_topics": [],
            "total_solved": 0
        }

    tag_counts = matched_user.get("tagProblemCounts") or {}
    all_tags = []
    seen_tags: Dict[str, Dict[str, Any]] = {}

    for category in ["fundamental", "intermediate", "advanced"]:
        for tag in tag_counts.get(category, []) or []:
            name = tag.get("tagName")
            solved = tag.get("problemsSolved", 0)
            if not name:
                continue

            if name in seen_tags:
                seen_tags[name]["solved"] += solved
            else:
                entry = {
                    "topic": name,
                    "slug": tag.get("tagSlug", ""),
                    "category": category,
                    "solved": solved
                }
                seen_tags[name] = entry
                all_tags.append(entry)

    total_solved = sum(t["solved"] for t in all_tags)

    # Sort ascending for weak topics (fewest solved)
    all_tags.sort(key=lambda x: x["solved"])
    weak_topics = TopicList([
        {"topic": t["topic"], "solved": t["solved"]}
        for t in all_tags[:5]
    ])

    # Strong topics: highest solved counts (descending, only topics with solved > 0)
    solved_tags = [t for t in all_tags if t["solved"] > 0]
    solved_tags.sort(key=lambda x: x["solved"], reverse=True)
    strong_topics = TopicList([
        {"topic": t["topic"], "solved": t["solved"]}
        for t in solved_tags[:5]
    ])

    return {
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "all_topics": all_tags,
        "total_solved": total_solved
    }


def analyze_contests(contest_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extracts contest rating, attended contest count, ranking, and tier level.
    """
    if not contest_data or not isinstance(contest_data, dict):
        return {
            "rating": None,
            "level": "No contest data",
            "contests_attended": 0,
            "global_ranking": None,
            "top_percentage": None,
            "badge": None
        }

    ranking = contest_data.get("userContestRanking")
    if not ranking:
        return {
            "rating": None,
            "level": "No contest data",
            "contests_attended": 0,
            "global_ranking": None,
            "top_percentage": None,
            "badge": None
        }

    raw_rating = ranking.get("rating")
    rating = round(raw_rating) if raw_rating is not None else None

    if rating is None or rating == 0:
        level = "Unrated"
    elif rating < 1400:
        level = "Beginner"
    elif rating < 1600:
        level = "Intermediate"
    elif rating < 1900:
        level = "Advanced"
    else:
        level = "Expert"

    badge_obj = ranking.get("badge")
    badge_name = badge_obj.get("name") if isinstance(badge_obj, dict) else None

    return {
        "rating": rating,
        "level": level,
        "contests_attended": ranking.get("attendedContestsCount", 0),
        "global_ranking": ranking.get("globalRanking"),
        "top_percentage": ranking.get("topPercentage"),
        "badge": badge_name
    }


def analyze_recent_activity(recent_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Parses and deduplicates recent accepted submissions with human-readable dates.
    """
    if not recent_data or not isinstance(recent_data, dict):
        return []

    submissions = recent_data.get("recentAcSubmissionList", []) or []
    problems = []
    seen_slugs = set()

    for submission in submissions:
        if not isinstance(submission, dict):
            continue

        raw_ts = submission.get("timestamp")
        date_str = "Unknown"
        if raw_ts is not None:
            try:
                timestamp = int(raw_ts)
                date = datetime.fromtimestamp(timestamp)
                date_str = date.strftime("%Y-%m-%d")
            except (ValueError, TypeError, OSError):
                date_str = "Unknown"

        slug = submission.get("titleSlug") or ""
        if slug and slug in seen_slugs:
            continue
        if slug:
            seen_slugs.add(slug)

        problems.append({
            "id": submission.get("id"),
            "title": submission.get("title", "Untitled"),
            "slug": slug,
            "date": date_str
        })

    return problems


def recommend_difficulty(contest_rating: Optional[int], total_solved: int = 0) -> str:
    """
    Determines recommended problem difficulty based on contest rating and total problems solved.
    """
    if contest_rating is not None and contest_rating > 0:
        if contest_rating < 1400:
            return "Easy to Medium"
        elif contest_rating < 1600:
            return "Medium"
        elif contest_rating < 1900:
            return "Medium to Hard"
        else:
            return "Hard"

    # Fallback if unrated
    if total_solved < 50:
        return "Easy"
    elif total_solved < 200:
        return "Medium"
    else:
        return "Medium to Hard"


def create_user_profile(
    skills_data: Optional[Dict[str, Any]],
    contest_data: Optional[Dict[str, Any]],
    recent_data: Optional[Dict[str, Any]],
    username: str = ""
) -> Dict[str, Any]:
    """
    Creates a clean, normalized, deterministic user profile ready for LLM consumption
    and future Personalized Contest Generator algorithms.
    """
    skill_analysis = analyze_skills(skills_data)
    contest_analysis = analyze_contests(contest_data)
    recent_activity = analyze_recent_activity(recent_data)

    rating = contest_analysis.get("rating")
    total_solved = skill_analysis.get("total_solved", 0)
    recommended_diff = recommend_difficulty(rating, total_solved)

    return {
        "username": username,
        "weak_topics": skill_analysis.get("weak_topics", []),
        "strong_topics": skill_analysis.get("strong_topics", []),
        "contest_rating": rating,
        "contest_level": contest_analysis.get("level", "Unrated"),
        "rating_level": contest_analysis.get("level", "Unrated"),
        "recent_problems": recent_activity,
        "recommended_difficulty": recommended_diff,
        "contests_attended": contest_analysis.get("contests_attended", 0),
        "total_problems_solved": total_solved,
        "total_solved": total_solved
    }
