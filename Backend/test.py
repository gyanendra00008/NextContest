import json
from Analyzer import create_user_profile
from llm_service import get_ai_analysis


# Mock LeetCode GraphQL payload for offline / unit testing
sample_skills = {
    "matchedUser": {
        "tagProblemCounts": {
            "fundamental": [
                {"tagName": "Array", "tagSlug": "array", "problemsSolved": 80},
                {"tagName": "Hash Table", "tagSlug": "hash-table", "problemsSolved": 50},
                {"tagName": "String", "tagSlug": "string", "problemsSolved": 45}
            ],
            "intermediate": [
                {"tagName": "Binary Search", "tagSlug": "binary-search", "problemsSolved": 12},
                {"tagName": "Dynamic Programming", "tagSlug": "dynamic-programming", "problemsSolved": 5}
            ],
            "advanced": [
                {"tagName": "Graph", "tagSlug": "graph", "problemsSolved": 3},
                {"tagName": "Segment Tree", "tagSlug": "segment-tree", "problemsSolved": 0}
            ]
        },
        "submitStatsGlobal": {
            "acSubmissionNum": [
                {"difficulty": "All", "count": 110, "submissions": 250},
                {"difficulty": "Easy", "count": 60, "submissions": 120},
                {"difficulty": "Medium", "count": 40, "submissions": 100},
                {"difficulty": "Hard", "count": 10, "submissions": 30}
            ]
        }
    }
}

sample_contest = {
    "userContestRanking": {
        "rating": 1450.0,
        "attendedContestsCount": 8,
        "globalRanking": 35000,
        "topPercentage": 25.5,
        "badge": None
    }
}

sample_recent = {
    "recentAcSubmissionList": [
        {"id": "1001", "title": "Two Sum", "titleSlug": "two-sum", "timestamp": "1788700000"},
        {"id": "1002", "title": "Binary Tree Inorder Traversal", "titleSlug": "binary-tree-inorder-traversal", "timestamp": "1788600000"}
    ]
}

print("=== 1. Running Deterministic Analyzer ===")
profile = create_user_profile(
    sample_skills,
    sample_contest,
    sample_recent,
    username="Endr_"
)
print(json.dumps(profile, indent=2))

print("\n=== 2. Running Groq LLM Coaching Layer ===")
ai_result = get_ai_analysis(profile)
print(json.dumps(ai_result, indent=2))