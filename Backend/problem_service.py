import logging
import asyncio
from typing import List, Dict, Any, Optional, Set

from problem_db import db, ProblemDatabase
from problem_fetcher import fetcher, ProblemFetcher

logger = logging.getLogger("NextContestBackend.ProblemService")

# Built-in curated seed dataset: 35+ classic foundational LeetCode problems
# Guarantees the system works immediately out of the box even before first sync.
CURATED_SEED_PROBLEMS = [
    # --- EASY ---
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
        "frontend_id": "20",
        "title": "Valid Parentheses",
        "title_slug": "valid-parentheses",
        "difficulty": "Easy",
        "ac_rate": 41.5,
        "paid_only": False,
        "tags": [{"name": "String", "slug": "string"}, {"name": "Stack", "slug": "stack"}]
    },
    {
        "frontend_id": "21",
        "title": "Merge Two Sorted Lists",
        "title_slug": "merge-two-sorted-lists",
        "difficulty": "Easy",
        "ac_rate": 64.8,
        "paid_only": False,
        "tags": [{"name": "Linked List", "slug": "linked-list"}, {"name": "Recursion", "slug": "recursion"}]
    },
    {
        "frontend_id": "70",
        "title": "Climbing Stairs",
        "title_slug": "climbing-stairs",
        "difficulty": "Easy",
        "ac_rate": 53.0,
        "paid_only": False,
        "tags": [{"name": "Math", "slug": "math"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}, {"name": "Memoization", "slug": "memoization"}]
    },
    {
        "frontend_id": "104",
        "title": "Maximum Depth of Binary Tree",
        "title_slug": "maximum-depth-of-binary-tree",
        "difficulty": "Easy",
        "ac_rate": 75.8,
        "paid_only": False,
        "tags": [{"name": "Tree", "slug": "tree"}, {"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}, {"name": "Binary Tree", "slug": "binary-tree"}]
    },
    {
        "frontend_id": "121",
        "title": "Best Time to Buy and Sell Stock",
        "title_slug": "best-time-to-buy-and-sell-stock",
        "difficulty": "Easy",
        "ac_rate": 54.9,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}]
    },
    {
        "frontend_id": "125",
        "title": "Valid Palindrome",
        "title_slug": "valid-palindrome",
        "difficulty": "Easy",
        "ac_rate": 48.3,
        "paid_only": False,
        "tags": [{"name": "Two Pointers", "slug": "two-pointers"}, {"name": "String", "slug": "string"}]
    },
    {
        "frontend_id": "141",
        "title": "Linked List Cycle",
        "title_slug": "linked-list-cycle",
        "difficulty": "Easy",
        "ac_rate": 51.2,
        "paid_only": False,
        "tags": [{"name": "Hash Table", "slug": "hash-table"}, {"name": "Linked List", "slug": "linked-list"}, {"name": "Two Pointers", "slug": "two-pointers"}]
    },
    {
        "frontend_id": "206",
        "title": "Reverse Linked List",
        "title_slug": "reverse-linked-list",
        "difficulty": "Easy",
        "ac_rate": 78.4,
        "paid_only": False,
        "tags": [{"name": "Linked List", "slug": "linked-list"}, {"name": "Recursion", "slug": "recursion"}]
    },
    {
        "frontend_id": "226",
        "title": "Invert Binary Tree",
        "title_slug": "invert-binary-tree",
        "difficulty": "Easy",
        "ac_rate": 78.6,
        "paid_only": False,
        "tags": [{"name": "Tree", "slug": "tree"}, {"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}, {"name": "Binary Tree", "slug": "binary-tree"}]
    },
    {
        "frontend_id": "242",
        "title": "Valid Anagram",
        "title_slug": "valid-anagram",
        "difficulty": "Easy",
        "ac_rate": 65.4,
        "paid_only": False,
        "tags": [{"name": "Hash Table", "slug": "hash-table"}, {"name": "String", "slug": "string"}, {"name": "Sorting", "slug": "sorting"}]
    },
    {
        "frontend_id": "704",
        "title": "Binary Search",
        "title_slug": "binary-search",
        "difficulty": "Easy",
        "ac_rate": 58.7,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Binary Search", "slug": "binary-search"}]
    },

    # --- MEDIUM ---
    {
        "frontend_id": "3",
        "title": "Longest Substring Without Repeating Characters",
        "title_slug": "longest-substring-without-repeating-characters",
        "difficulty": "Medium",
        "ac_rate": 35.8,
        "paid_only": False,
        "tags": [{"name": "Hash Table", "slug": "hash-table"}, {"name": "String", "slug": "string"}, {"name": "Sliding Window", "slug": "sliding-window"}]
    },
    {
        "frontend_id": "5",
        "title": "Longest Palindromic Substring",
        "title_slug": "longest-palindromic-substring",
        "difficulty": "Medium",
        "ac_rate": 34.6,
        "paid_only": False,
        "tags": [{"name": "Two Pointers", "slug": "two-pointers"}, {"name": "String", "slug": "string"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}]
    },
    {
        "frontend_id": "11",
        "title": "Container With Most Water",
        "title_slug": "container-with-most-water",
        "difficulty": "Medium",
        "ac_rate": 56.4,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Two Pointers", "slug": "two-pointers"}, {"name": "Greedy", "slug": "greedy"}]
    },
    {
        "frontend_id": "15",
        "title": "3Sum",
        "title_slug": "3sum",
        "difficulty": "Medium",
        "ac_rate": 35.8,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Two Pointers", "slug": "two-pointers"}, {"name": "Sorting", "slug": "sorting"}]
    },
    {
        "frontend_id": "33",
        "title": "Search in Rotated Sorted Array",
        "title_slug": "search-in-rotated-sorted-array",
        "difficulty": "Medium",
        "ac_rate": 41.5,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Binary Search", "slug": "binary-search"}]
    },
    {
        "frontend_id": "46",
        "title": "Permutations",
        "title_slug": "permutations",
        "difficulty": "Medium",
        "ac_rate": 79.2,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Backtracking", "slug": "backtracking"}]
    },
    {
        "frontend_id": "53",
        "title": "Maximum Subarray",
        "title_slug": "maximum-subarray",
        "difficulty": "Medium",
        "ac_rate": 51.6,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Divide and Conquer", "slug": "divide-and-conquer"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}]
    },
    {
        "frontend_id": "56",
        "title": "Merge Intervals",
        "title_slug": "merge-intervals",
        "difficulty": "Medium",
        "ac_rate": 48.2,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Sorting", "slug": "sorting"}]
    },
    {
        "frontend_id": "78",
        "title": "Subsets",
        "title_slug": "subsets",
        "difficulty": "Medium",
        "ac_rate": 80.1,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Backtracking", "slug": "backtracking"}, {"name": "Bit Manipulation", "slug": "bit-manipulation"}]
    },
    {
        "frontend_id": "98",
        "title": "Validate Binary Search Tree",
        "title_slug": "validate-binary-search-tree",
        "difficulty": "Medium",
        "ac_rate": 33.4,
        "paid_only": False,
        "tags": [{"name": "Tree", "slug": "tree"}, {"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Binary Search Tree", "slug": "binary-search-tree"}, {"name": "Binary Tree", "slug": "binary-tree"}]
    },
    {
        "frontend_id": "102",
        "title": "Binary Tree Level Order Traversal",
        "title_slug": "binary-tree-level-order-traversal",
        "difficulty": "Medium",
        "ac_rate": 68.3,
        "paid_only": False,
        "tags": [{"name": "Tree", "slug": "tree"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}, {"name": "Binary Tree", "slug": "binary-tree"}]
    },
    {
        "frontend_id": "139",
        "title": "Word Break",
        "title_slug": "word-break",
        "difficulty": "Medium",
        "ac_rate": 47.1,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Hash Table", "slug": "hash-table"}, {"name": "String", "slug": "string"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}, {"name": "Trie", "slug": "trie"}, {"name": "Memoization", "slug": "memoization"}]
    },
    {
        "frontend_id": "146",
        "title": "LRU Cache",
        "title_slug": "lru-cache",
        "difficulty": "Medium",
        "ac_rate": 43.7,
        "paid_only": False,
        "tags": [{"name": "Hash Table", "slug": "hash-table"}, {"name": "Linked List", "slug": "linked-list"}, {"name": "Design", "slug": "design"}, {"name": "Doubly-Linked List", "slug": "doubly-linked-list"}]
    },
    {
        "frontend_id": "200",
        "title": "Number of Islands",
        "title_slug": "number-of-islands",
        "difficulty": "Medium",
        "ac_rate": 60.1,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}, {"name": "Union Find", "slug": "union-find"}, {"name": "Matrix", "slug": "matrix"}]
    },
    {
        "frontend_id": "207",
        "title": "Course Schedule",
        "title_slug": "course-schedule",
        "difficulty": "Medium",
        "ac_rate": 47.6,
        "paid_only": False,
        "tags": [{"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}, {"name": "Graph", "slug": "graph"}, {"name": "Topological Sort", "slug": "topological-sort"}]
    },
    {
        "frontend_id": "300",
        "title": "Longest Increasing Subsequence",
        "title_slug": "longest-increasing-subsequence",
        "difficulty": "Medium",
        "ac_rate": 56.2,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Binary Search", "slug": "binary-search"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}]
    },
    {
        "frontend_id": "322",
        "title": "Coin Change",
        "title_slug": "coin-change",
        "difficulty": "Medium",
        "ac_rate": 44.8,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}]
    },

    # --- HARD ---
    {
        "frontend_id": "4",
        "title": "Median of Two Sorted Arrays",
        "title_slug": "median-of-two-sorted-arrays",
        "difficulty": "Hard",
        "ac_rate": 41.5,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Binary Search", "slug": "binary-search"}, {"name": "Divide and Conquer", "slug": "divide-and-conquer"}]
    },
    {
        "frontend_id": "23",
        "title": "Merge k Sorted Lists",
        "title_slug": "merge-k-sorted-lists",
        "difficulty": "Hard",
        "ac_rate": 54.3,
        "paid_only": False,
        "tags": [{"name": "Linked List", "slug": "linked-list"}, {"name": "Divide and Conquer", "slug": "divide-and-conquer"}, {"name": "Heap (Priority Queue)", "slug": "heap-priority-queue"}, {"name": "Merge Sort", "slug": "merge-sort"}]
    },
    {
        "frontend_id": "42",
        "title": "Trapping Rain Water",
        "title_slug": "trapping-rain-water",
        "difficulty": "Hard",
        "ac_rate": 62.7,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Two Pointers", "slug": "two-pointers"}, {"name": "Dynamic Programming", "slug": "dynamic-programming"}, {"name": "Stack", "slug": "stack"}, {"name": "Monotonic Stack", "slug": "monotonic-stack"}]
    },
    {
        "frontend_id": "76",
        "title": "Minimum Window Substring",
        "title_slug": "minimum-window-substring",
        "difficulty": "Hard",
        "ac_rate": 44.1,
        "paid_only": False,
        "tags": [{"name": "Hash Table", "slug": "hash-table"}, {"name": "String", "slug": "string"}, {"name": "Sliding Window", "slug": "sliding-window"}]
    },
    {
        "frontend_id": "84",
        "title": "Largest Rectangle in Histogram",
        "title_slug": "largest-rectangle-in-histogram",
        "difficulty": "Hard",
        "ac_rate": 45.3,
        "paid_only": False,
        "tags": [{"name": "Array", "slug": "array"}, {"name": "Stack", "slug": "stack"}, {"name": "Monotonic Stack", "slug": "monotonic-stack"}]
    },
    {
        "frontend_id": "124",
        "title": "Binary Tree Maximum Path Sum",
        "title_slug": "binary-tree-maximum-path-sum",
        "difficulty": "Hard",
        "ac_rate": 40.5,
        "paid_only": False,
        "tags": [{"name": "Dynamic Programming", "slug": "dynamic-programming"}, {"name": "Tree", "slug": "tree"}, {"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Binary Tree", "slug": "binary-tree"}]
    },
    {
        "frontend_id": "297",
        "title": "Serialize and Deserialize Binary Tree",
        "title_slug": "serialize-and-deserialize-binary-tree",
        "difficulty": "Hard",
        "ac_rate": 57.8,
        "paid_only": False,
        "tags": [{"name": "String", "slug": "string"}, {"name": "Tree", "slug": "tree"}, {"name": "Depth-First Search", "slug": "depth-first-search"}, {"name": "Breadth-First Search", "slug": "breadth-first-search"}, {"name": "Design", "slug": "design"}, {"name": "Binary Tree", "slug": "binary-tree"}]
    }
]


class ProblemService:
    """
    High-level facade connecting the problem database with the LeetCode GraphQL fetcher.
    Provides synchronization, seed-fallback, search, and health monitoring.
    """

    def __init__(self, database: Optional[ProblemDatabase] = None, api_fetcher: Optional[ProblemFetcher] = None):
        self.db = database or db
        self.fetcher = api_fetcher or fetcher
        self._ensure_seeded()

    def _ensure_seeded(self) -> None:
        """Seeds the local SQLite database if it has zero problems."""
        stats = self.db.get_stats()
        if stats.get("total_problems", 0) == 0:
            logger.info("Problem database is empty. Seeding initial curated problems...")
            self.db.upsert_problems_batch(CURATED_SEED_PROBLEMS)
            logger.info(f"Seeded {len(CURATED_SEED_PROBLEMS)} curated problems successfully.")

    async def sync_from_leetcode(self, limit: int = 500, skip: int = 0) -> Dict[str, Any]:
        """
        Fetches fresh problem metadata from LeetCode GraphQL API and updates SQLite.
        """
        logger.info(f"Starting LeetCode problem sync (limit={limit}, skip={skip})...")
        questions = await self.fetcher.fetch_bulk_async(max_problems=limit, start_skip=skip)
        
        if not questions:
            logger.warning("No questions returned from LeetCode sync. Retaining existing database.")
            return {
                "status": "warning",
                "message": "No new problems fetched from LeetCode. Kept existing local data.",
                "synced_count": 0,
                "db_stats": self.db.get_stats()
            }

        count = self.db.upsert_problems_batch(questions)
        logger.info(f"Successfully upserted {count} problems into database.")
        
        return {
            "status": "success",
            "message": f"Successfully synced {count} problems from LeetCode.",
            "synced_count": count,
            "db_stats": self.db.get_stats()
        }

    def sync_from_leetcode_sync(self, limit: int = 500, skip: int = 0) -> Dict[str, Any]:
        """Synchronous version of problem synchronization."""
        return asyncio.run(self.sync_from_leetcode(limit=limit, skip=skip))

    def get_problem(self, title_slug: str) -> Optional[Dict[str, Any]]:
        """Retrieve single problem by titleSlug."""
        return self.db.get_problem(title_slug)

    def search_problems(
        self,
        difficulty: Optional[str] = None,
        tag_slugs: Optional[List[str]] = None,
        paid_only: Optional[bool] = False,
        min_ac_rate: Optional[float] = None,
        max_ac_rate: Optional[float] = None,
        exclude_slugs: Optional[Set[str]] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Filtered search for problems."""
        return self.db.query_problems(
            difficulty=difficulty,
            tag_slugs=tag_slugs,
            paid_only=paid_only,
            min_ac_rate=min_ac_rate,
            max_ac_rate=max_ac_rate,
            exclude_slugs=exclude_slugs,
            search_query=search_query,
            limit=limit,
            offset=offset
        )

    def get_stats(self) -> Dict[str, Any]:
        """Returns database statistics."""
        return self.db.get_stats()

    def get_all_tags(self) -> List[Dict[str, Any]]:
        """Returns all distinct tags."""
        return self.db.get_all_tags()


# Global service instance
problem_service = ProblemService()
