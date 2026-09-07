import pytest
import os
from fastapi.testclient import TestClient
from main import app
from problem_db import ProblemDatabase
from problem_service import ProblemService, CURATED_SEED_PROBLEMS
from contest_recommender import ContestRecommender
from problem_fetcher import _normalize_question

client = TestClient(app)


# ---------------------------------------------------------
# Unit Tests: Problem Database & Data Layer
# ---------------------------------------------------------

def test_problem_database_operations(tmp_path):
    test_db_path = str(tmp_path / "test_problems.db")
    db = ProblemDatabase(db_path=test_db_path)

    # Insert sample problems
    sample_problems = [
        {
            "frontend_id": "1",
            "title": "Two Sum",
            "title_slug": "two-sum",
            "difficulty": "Easy",
            "ac_rate": 54.2,
            "paid_only": False,
            "tags": [{"name": "Array", "slug": "array"}, {"name": "Hash Table", "slug": "hash-table"}]
        },
        {
            "frontend_id": "3",
            "title": "Longest Substring Without Repeating Characters",
            "title_slug": "longest-substring-without-repeating-characters",
            "difficulty": "Medium",
            "ac_rate": 35.8,
            "paid_only": False,
            "tags": [{"name": "String", "slug": "string"}, {"name": "Sliding Window", "slug": "sliding-window"}]
        },
        {
            "frontend_id": "999",
            "title": "Paid Only Secret Problem",
            "title_slug": "paid-only-secret-problem",
            "difficulty": "Hard",
            "ac_rate": 42.0,
            "paid_only": True,
            "tags": [{"name": "Dynamic Programming", "slug": "dynamic-programming"}]
        }
    ]

    count = db.upsert_problems_batch(sample_problems)
    assert count == 3

    # Check stats
    stats = db.get_stats()
    assert stats["total_problems"] == 3
    assert stats["easy_count"] == 1
    assert stats["medium_count"] == 1
    assert stats["hard_count"] == 1
    assert stats["free_count"] == 2
    assert stats["paid_count"] == 1

    # Check get_problem
    prob = db.get_problem("two-sum")
    assert prob is not None
    assert prob["title"] == "Two Sum"
    assert prob["difficulty"] == "Easy"
    assert prob["paid_only"] is False
    assert any(t["name"] == "Array" for t in prob["tags"])

    # Query with paid_only = False (must exclude paid problem)
    free_problems = db.query_problems(paid_only=False)
    assert len(free_problems) == 2
    assert all(not p["paid_only"] for p in free_problems)

    # Query by difficulty
    medium_problems = db.query_problems(difficulty="Medium")
    assert len(medium_problems) == 1
    assert medium_problems[0]["title_slug"] == "longest-substring-without-repeating-characters"

    # Query by tag slug
    array_problems = db.query_problems(tag_slugs=["array"])
    assert len(array_problems) == 1
    assert array_problems[0]["title_slug"] == "two-sum"

    # Query with exclusion
    excluded = db.query_problems(exclude_slugs={"two-sum"}, paid_only=False)
    assert len(excluded) == 1
    assert excluded[0]["title_slug"] == "longest-substring-without-repeating-characters"

    # Test conflict update
    updated_problem = {
        "frontend_id": "1",
        "title": "Two Sum (Updated)",
        "title_slug": "two-sum",
        "difficulty": "Easy",
        "ac_rate": 55.0,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}]
    }
    db.upsert_problem(updated_problem)
    retrieved = db.get_problem("two-sum")
    assert retrieved["title"] == "Two Sum (Updated)"
    assert retrieved["ac_rate"] == 55.0


def test_question_normalization():
    raw = {
        "frontendQuestionId": "42",
        "title": "Trapping Rain Water",
        "titleSlug": "trapping-rain-water",
        "difficulty": "Hard",
        "acRate": 62.723,
        "isPaidOnly": False,
        "topicTags": [{"name": "Array", "slug": "array"}, {"name": "Two Pointers", "slug": "two-pointers"}]
    }
    norm = _normalize_question(raw)
    assert norm["frontend_id"] == "42"
    assert norm["title"] == "Trapping Rain Water"
    assert norm["title_slug"] == "trapping-rain-water"
    assert norm["difficulty"] == "Hard"
    assert norm["ac_rate"] == 62.72
    assert norm["paid_only"] is False
    assert len(norm["tags"]) == 2
    assert norm["tags"][0]["name"] == "Array"


# ---------------------------------------------------------
# Unit Tests: Deterministic Recommendation Algorithm
# ---------------------------------------------------------

def test_deterministic_contest_recommendation(tmp_path):
    test_db_path = str(tmp_path / "rec_test.db")
    db = ProblemDatabase(db_path=test_db_path)
    db.upsert_problems_batch(CURATED_SEED_PROBLEMS)
    svc = ProblemService(database=db)
    rec = ContestRecommender(service=svc)

    user_profile = {
        "username": "algo_champ",
        "contest_rating": 1550,
        "contest_level": "Intermediate",
        "total_problems_solved": 150,
        "weak_topics": [{"topic": "Dynamic Programming", "solved": 2}, {"topic": "Tree", "solved": 3}],
        "strong_topics": [{"topic": "Array", "solved": 40}, {"topic": "String", "solved": 25}],
        "recent_problems": [
            {"title": "Two Sum", "titleSlug": "two-sum"},
            {"title": "Valid Parentheses", "titleSlug": "valid-parentheses"}
        ]
    }

    ai_analysis = {
        "strengths": ["Array", "String"],
        "weaknesses": ["Dynamic Programming", "Tree"],
        "recommended_topics": ["Dynamic Programming", "Tree"],
        "recommended_difficulty": "Medium",
        "training_strategy": "Master DP recurrence relations and DFS/BFS tree traversals."
    }

    contest = rec.generate_personalized_contest(user_profile, ai_analysis, seed="seed_alpha")

    # 1. Check contest format
    assert contest["total_problems"] == 4
    assert len(contest["problems"]) == 4
    assert contest["difficulty_tier"] == "Intermediate"
    assert "Dynamic Programming" in contest["focus_areas"] or "Tree" in contest["focus_areas"]
    assert "problems" in contest
    assert "summary" in contest

    slots = [p["slot"] for p in contest["problems"]]
    assert slots == ["Q1", "Q2", "Q3", "Q4"]

    # 2. Verify strict exclusion of recent problems
    problem_slugs = [p["title_slug"] for p in contest["problems"]]
    assert "two-sum" not in problem_slugs
    assert "valid-parentheses" not in problem_slugs

    # 3. Verify all selected problems are free
    for p in contest["problems"]:
        full_p = svc.get_problem(p["title_slug"])
        assert full_p["paid_only"] is False

    # 4. Check slot progression for Intermediate (Q1: Easy, Q2: Medium, Q3: Medium, Q4: Hard)
    diffs = [p["difficulty"] for p in contest["problems"]]
    assert diffs[0] == "Easy"
    assert diffs[1] == "Medium"
    assert diffs[2] == "Medium"
    assert diffs[3] == "Hard"

    # 5. Check deterministic repeatability with identical seed
    contest2 = rec.generate_personalized_contest(user_profile, ai_analysis, seed="seed_alpha")
    slugs1 = [p["title_slug"] for p in contest["problems"]]
    slugs2 = [p["title_slug"] for p in contest2["problems"]]
    assert slugs1 == slugs2


def test_recommender_rating_tiers(tmp_path):
    test_db_path = str(tmp_path / "tiers_test.db")
    db = ProblemDatabase(db_path=test_db_path)
    db.upsert_problems_batch(CURATED_SEED_PROBLEMS)
    svc = ProblemService(database=db)
    rec = ContestRecommender(service=svc)

    # Beginner profile (< 1400)
    beginner_profile = {
        "username": "beginner_coder",
        "contest_rating": 1250,
        "contest_level": "Beginner",
        "total_problems_solved": 25,
        "weak_topics": [{"topic": "Tree", "solved": 1}],
        "strong_topics": [{"topic": "Array", "solved": 15}],
        "recent_problems": []
    }
    beg_contest = rec.generate_personalized_contest(beginner_profile, {})
    beg_diffs = [p["difficulty"] for p in beg_contest["problems"]]
    # Beginner should have Easy warmups and Medium peaks, no premature Hard problems
    assert beg_diffs[0] == "Easy"
    assert beg_diffs[1] == "Easy"
    assert "Hard" not in beg_diffs


# ---------------------------------------------------------
# Integration Tests: FastAPI Endpoints
# ---------------------------------------------------------

def test_api_problem_stats():
    response = client.get("/leetcode/problems/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "stats" in data
    stats = data["stats"]
    assert stats["total_problems"] > 0
    assert stats["free_count"] > 0


def test_api_problem_search():
    response = client.get("/leetcode/problems/search?difficulty=Easy&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "problems" in data
    for p in data["problems"]:
        assert p["difficulty"] == "Easy"
        assert p["paid_only"] is False


def test_api_problem_tags():
    response = client.get("/leetcode/problems/tags")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "tags" in data
    assert len(data["tags"]) > 0


def test_api_problem_detail():
    response = client.get("/leetcode/problems/two-sum")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["problem"]["title_slug"] == "two-sum"

    # Non-existent problem
    not_found = client.get("/leetcode/problems/this-slug-does-not-exist-at-all-xyz")
    assert not_found.status_code == 404


def test_api_personalized_contest_post():
    payload = {
        "user_profile": {
            "username": "api_test_user",
            "contest_rating": 1500,
            "contest_level": "Intermediate",
            "total_problems_solved": 80,
            "weak_topics": [{"topic": "Dynamic Programming", "solved": 1}],
            "strong_topics": [{"topic": "Array", "solved": 30}],
            "recent_problems": [{"title": "Two Sum", "titleSlug": "two-sum"}]
        },
        "ai_analysis": {
            "strengths": ["Array"],
            "weaknesses": ["Dynamic Programming"],
            "recommended_topics": ["Dynamic Programming"],
            "recommended_difficulty": "Medium",
            "training_strategy": "Focus on dynamic programming subproblems."
        },
        "custom_exclusions": ["merge-two-sorted-lists"],
        "seed": "api_seed_1"
    }

    response = client.post("/leetcode/personalized-contest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "contest" in data
    contest = data["contest"]
    assert contest["total_problems"] == 4

    slugs = [p["title_slug"] for p in contest["problems"]]
    assert "two-sum" not in slugs
    assert "merge-two-sorted-lists" not in slugs
