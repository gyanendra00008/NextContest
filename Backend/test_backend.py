import pytest
from fastapi.testclient import TestClient
from main import app
from Analyzer import analyze_skills, analyze_contests, analyze_recent_activity, create_user_profile
from llm_service import _generate_rule_based_fallback, get_ai_analysis

client = TestClient(app)


def test_home_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "endpoints" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_leetcode_contests():
    response = client.get("/Leetcode")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "LeetCode"
    assert "upcoming_contests" in data
    assert "past_contests" in data


def test_codeforces_contests():
    response = client.get("/Codeforces")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "Codeforces"
    assert "upcoming_contests" in data


def test_codechef_contests():
    response = client.get("/Codechef")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "CodeChef"
    assert "upcoming_contests" in data


def test_atcoder_contests():
    response = client.get("/Atcoder")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "AtCoder"
    assert "upcoming_contests" in data


def test_all_contests():
    response = client.get("/All")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "total_upcoming" in data
    assert isinstance(data["upcoming_contests"], list)

    # Lowercase alias
    response_lower = client.get("/all")
    assert response_lower.status_code == 200


def test_analyzer_empty_and_robust():
    # Empty skill data should not crash
    skills = analyze_skills({})
    assert skills["weak_topics"] == []
    assert skills["strong_topics"] == []
    assert skills["total_solved"] == 0

    # None data should not crash
    skills_none = analyze_skills(None)
    assert skills_none["weak_topics"] == []

    # Contest empty data
    contest = analyze_contests({})
    assert contest["level"] == "No contest data"
    assert contest["rating"] is None

    # Contest rating level tiers
    assert analyze_contests({"userContestRanking": {"rating": 1300}})["level"] == "Beginner"
    assert analyze_contests({"userContestRanking": {"rating": 1500}})["level"] == "Intermediate"
    assert analyze_contests({"userContestRanking": {"rating": 1750}})["level"] == "Advanced"
    assert analyze_contests({"userContestRanking": {"rating": 2100}})["level"] == "Expert"

    # Recent empty data
    recent = analyze_recent_activity(None)
    assert recent == []


def test_analyzer_full_profile():
    sample_skills = {
        "matchedUser": {
            "tagProblemCounts": {
                "fundamental": [{"tagName": "Array", "tagSlug": "array", "problemsSolved": 30}],
                "intermediate": [{"tagName": "Graph", "tagSlug": "graph", "problemsSolved": 2}],
                "advanced": [{"tagName": "DP", "tagSlug": "dynamic-programming", "problemsSolved": 0}]
            }
        }
    }
    sample_contest = {
        "userContestRanking": {
            "rating": 1520.4,
            "attendedContestsCount": 10,
            "globalRanking": 12000
        }
    }
    sample_recent = {
        "recentAcSubmissionList": [
            {"id": "1", "title": "Two Sum", "titleSlug": "two-sum", "timestamp": "1700000000"}
        ]
    }

    profile = create_user_profile(sample_skills, sample_contest, sample_recent, username="testuser")
    assert profile["username"] == "testuser"
    assert profile["contest_rating"] == 1520
    assert profile["rating_level"] == "Intermediate"
    assert profile["total_solved"] == 32
    assert "Array" in profile["strong_topics"]
    assert "DP" in profile["weak_topics"]
    assert len(profile["recent_problems"]) == 1


def test_rule_based_fallback():
    profile = {
        "username": "tester",
        "weak_topics": ["Graph", "DP"],
        "strong_topics": ["Array"],
        "contest_rating": 1550
    }
    fallback = _generate_rule_based_fallback(profile)
    assert "strengths" in fallback
    assert "weaknesses" in fallback
    assert "recommended_topics" in fallback
    assert "recommended_difficulty" in fallback
    assert "training_strategy" in fallback


def test_leetcode_user_not_found():
    response = client.get("/leetcode/this_user_definitely_does_not_exist_xyz123")
    assert response.status_code in [404, 400]


def test_analyzer_unique_solved_problems_count():
    # User solved 42 unique problems, but tags sum to 150 and submissions sum to 120
    skills_with_stats = {
        "matchedUser": {
            "tagProblemCounts": {
                "fundamental": [
                    {"tagName": "Array", "tagSlug": "array", "problemsSolved": 40},
                    {"tagName": "Hash Table", "tagSlug": "hash-table", "problemsSolved": 35}
                ],
                "intermediate": [
                    {"tagName": "Dynamic Programming", "tagSlug": "dynamic-programming", "problemsSolved": 45},
                    {"tagName": "Binary Search", "tagSlug": "binary-search", "problemsSolved": 30}
                ],
                "advanced": []
            },
            "submitStatsGlobal": {
                "acSubmissionNum": [
                    {"difficulty": "All", "count": 42, "submissions": 120},
                    {"difficulty": "Easy", "count": 15, "submissions": 40},
                    {"difficulty": "Medium", "count": 22, "submissions": 65},
                    {"difficulty": "Hard", "count": 5, "submissions": 15}
                ],
                "totalSubmissionNum": [
                    {"difficulty": "All", "count": 42, "submissions": 300}
                ]
            }
        }
    }

    analyzed = analyze_skills(skills_with_stats)
    # Must equal the unique solved problems count (42), not tag sum (150) or attempts/submissions (120/300)
    assert analyzed["total_solved"] == 42

    profile = create_user_profile(skills_with_stats, None, None, username="uniquetest")
    assert profile["total_solved"] == 42
    assert profile["total_problems_solved"] == 42


def test_duplicate_submissions_do_not_increase_count():
    # A user who solved 1 problem with 20 repeat submissions
    skills_data = {
        "matchedUser": {
            "tagProblemCounts": {
                "fundamental": [{"tagName": "Array", "tagSlug": "array", "problemsSolved": 1}],
                "intermediate": [],
                "advanced": []
            },
            "submitStatsGlobal": {
                "acSubmissionNum": [
                    {"difficulty": "All", "count": 1, "submissions": 20},
                    {"difficulty": "Easy", "count": 1, "submissions": 20}
                ]
            }
        }
    }

    analyzed = analyze_skills(skills_data)
    assert analyzed["total_solved"] == 1


def test_analyzer_difficulty_breakdown_fallback():
    # If "All" difficulty entry is missing, sum the individual unique difficulty counts
    skills_data = {
        "matchedUser": {
            "submitStatsGlobal": {
                "acSubmissionNum": [
                    {"difficulty": "Easy", "count": 10, "submissions": 25},
                    {"difficulty": "Medium", "count": 20, "submissions": 50},
                    {"difficulty": "Hard", "count": 5, "submissions": 15}
                ]
            }
        }
    }

    analyzed = analyze_skills(skills_data)
    assert analyzed["total_solved"] == 35
