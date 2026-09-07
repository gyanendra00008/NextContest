import sqlite3
import json
import os
import time
import logging
from typing import List, Dict, Any, Optional, Set

logger = logging.getLogger("NextContestBackend.ProblemDB")

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DEFAULT_DB_PATH = os.path.join(DB_DIR, "leetcode_problems.db")


class ProblemDatabase:
    """
    SQLite-backed local storage for LeetCode problem metadata.
    Provides fast indexed queries by difficulty, tags, acceptance rate, and paid status.
    """

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def init_db(self) -> None:
        """Initializes tables and indexes if they do not already exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Main problems table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS problems (
                frontend_id TEXT,
                title TEXT NOT NULL,
                title_slug TEXT PRIMARY KEY,
                difficulty TEXT NOT NULL,
                ac_rate REAL DEFAULT 0.0,
                paid_only INTEGER DEFAULT 0,
                tags_json TEXT DEFAULT '[]',
                updated_at INTEGER NOT NULL
            );
            """)

            # Tag junction table for fast topic filtering
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS problem_tags (
                problem_slug TEXT NOT NULL,
                tag_name TEXT NOT NULL,
                tag_slug TEXT NOT NULL,
                PRIMARY KEY (problem_slug, tag_slug),
                FOREIGN KEY (problem_slug) REFERENCES problems(title_slug) ON DELETE CASCADE
            );
            """)

            # Metadata table for sync timestamps and statistics
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
            """)

            # Indexes for ultra-fast querying
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_problems_paid ON problems(paid_only);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_problems_ac_rate ON problems(ac_rate);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_problem_tags_slug ON problem_tags(tag_slug);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_problem_tags_problem ON problem_tags(problem_slug);")

            conn.commit()

    def upsert_problem(self, problem: Dict[str, Any]) -> None:
        """Upsert a single problem into the database."""
        self.upsert_problems_batch([problem])

    def upsert_problems_batch(self, problems: List[Dict[str, Any]]) -> int:
        """
        Batch upsert a list of problems and their associated topic tags.
        Returns the number of problems upserted.
        """
        if not problems:
            return 0

        now = int(time.time())
        problem_rows = []
        tag_rows = []

        for p in problems:
            title_slug = p.get("title_slug") or p.get("titleSlug")
            if not title_slug:
                continue

            frontend_id = str(p.get("frontend_id") or p.get("frontendQuestionId") or "")
            title = p.get("title") or "Untitled"
            difficulty = (p.get("difficulty") or "Medium").capitalize()
            ac_rate = float(p.get("ac_rate") or p.get("acRate") or 0.0)
            paid_only = 1 if (p.get("paid_only") or p.get("paidOnly")) else 0

            # Tags handling
            raw_tags = p.get("tags") or p.get("topicTags") or []
            tags_list = []
            for t in raw_tags:
                if isinstance(t, dict):
                    t_name = t.get("name", "")
                    t_slug = t.get("slug", "") or t_name.lower().replace(" ", "-")
                elif isinstance(t, str):
                    t_name = t
                    t_slug = t.lower().replace(" ", "-")
                else:
                    continue
                if t_name:
                    tags_list.append({"name": t_name, "slug": t_slug})
                    tag_rows.append((title_slug, t_name, t_slug))

            tags_json = json.dumps(tags_list)
            problem_rows.append((frontend_id, title, title_slug, difficulty, ac_rate, paid_only, tags_json, now))

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Insert or update problems
            cursor.executemany("""
            INSERT INTO problems (frontend_id, title, title_slug, difficulty, ac_rate, paid_only, tags_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(title_slug) DO UPDATE SET
                frontend_id=excluded.frontend_id,
                title=excluded.title,
                difficulty=excluded.difficulty,
                ac_rate=excluded.ac_rate,
                paid_only=excluded.paid_only,
                tags_json=excluded.tags_json,
                updated_at=excluded.updated_at;
            """, problem_rows)

            # Re-insert tags for these problems
            slugs = [p[2] for p in problem_rows]
            cursor.executemany("DELETE FROM problem_tags WHERE problem_slug = ?;", [(s,) for s in slugs])
            cursor.executemany("""
            INSERT OR IGNORE INTO problem_tags (problem_slug, tag_name, tag_slug)
            VALUES (?, ?, ?);
            """, tag_rows)

            # Update sync metadata
            cursor.execute("""
            INSERT INTO sync_meta (key, value, updated_at)
            VALUES ('last_synced_at', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
            """, (str(now), now))

            conn.commit()

        return len(problem_rows)

    def get_problem(self, title_slug: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single problem by title slug."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM problems WHERE title_slug = ?;", (title_slug,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_dict(row)

    def query_problems(
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
        """
        Versatile indexed query engine for LeetCode problems.
        Supports filtering by difficulty, topic tags, acceptance rate, and exclusions.
        """
        conditions = []
        params: List[Any] = []

        if difficulty:
            conditions.append("p.difficulty = ?")
            params.append(difficulty.capitalize())

        if paid_only is not None:
            conditions.append("p.paid_only = ?")
            params.append(1 if paid_only else 0)

        if min_ac_rate is not None:
            conditions.append("p.ac_rate >= ?")
            params.append(min_ac_rate)

        if max_ac_rate is not None:
            conditions.append("p.ac_rate <= ?")
            params.append(max_ac_rate)

        if search_query:
            conditions.append("(p.title LIKE ? OR p.title_slug LIKE ?)")
            q = f"%{search_query}%"
            params.extend([q, q])

        # Exclude specific slugs (e.g. recently solved)
        if exclude_slugs:
            exclude_list = list(exclude_slugs)
            # Batch exclusions to avoid SQLite variable limit if set is large
            if len(exclude_list) <= 500:
                placeholders = ",".join("?" for _ in exclude_list)
                conditions.append(f"p.title_slug NOT IN ({placeholders})")
                params.extend(exclude_list)

        # Tag filtering
        join_clause = ""
        if tag_slugs:
            clean_tags = [t.lower().replace(" ", "-") for t in tag_slugs if t]
            if clean_tags:
                placeholders = ",".join("?" for _ in clean_tags)
                join_clause = f"INNER JOIN problem_tags pt ON p.title_slug = pt.problem_slug AND pt.tag_slug IN ({placeholders})"
                params = clean_tags + params

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        sql = f"""
        SELECT DISTINCT p.* FROM problems p
        {join_clause}
        {where_clause}
        ORDER BY p.ac_rate DESC
        LIMIT ? OFFSET ?;
        """
        params.extend([limit, offset])

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_stats(self) -> Dict[str, Any]:
        """Returns comprehensive database summary statistics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM problems;")
            total_count = cursor.fetchone()[0]

            cursor.execute("SELECT difficulty, COUNT(*) FROM problems GROUP BY difficulty;")
            difficulty_counts = {row[0]: row[1] for row in cursor.fetchall()}

            cursor.execute("SELECT paid_only, COUNT(*) FROM problems GROUP BY paid_only;")
            paid_counts = {row[0]: row[1] for row in cursor.fetchall()}

            cursor.execute("SELECT COUNT(DISTINCT tag_slug) FROM problem_tags;")
            total_tags = cursor.fetchone()[0]

            cursor.execute("SELECT value FROM sync_meta WHERE key = 'last_synced_at';")
            meta_row = cursor.fetchone()
            last_synced = int(meta_row[0]) if meta_row else None

            # Top 10 most common tags
            cursor.execute("""
            SELECT tag_name, COUNT(*) as cnt FROM problem_tags
            GROUP BY tag_slug
            ORDER BY cnt DESC
            LIMIT 10;
            """)
            top_tags = [{"tag": row[0], "count": row[1]} for row in cursor.fetchall()]

            return {
                "total_problems": total_count,
                "easy_count": difficulty_counts.get("Easy", 0),
                "medium_count": difficulty_counts.get("Medium", 0),
                "hard_count": difficulty_counts.get("Hard", 0),
                "free_count": paid_counts.get(0, 0),
                "paid_count": paid_counts.get(1, 0),
                "total_tags": total_tags,
                "top_tags": top_tags,
                "last_synced_at": last_synced
            }

    def get_all_tags(self) -> List[Dict[str, Any]]:
        """Returns all distinct tags with problem count."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT tag_name, tag_slug, COUNT(*) as problem_count
            FROM problem_tags
            GROUP BY tag_slug
            ORDER BY problem_count DESC;
            """)
            return [
                {"name": row[0], "slug": row[1], "count": row[2]}
                for row in cursor.fetchall()
            ]

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        tags = []
        try:
            tags = json.loads(row["tags_json"])
        except Exception:
            pass

        return {
            "frontend_id": row["frontend_id"],
            "title": row["title"],
            "title_slug": row["title_slug"],
            "difficulty": row["difficulty"],
            "ac_rate": round(row["ac_rate"], 2),
            "paid_only": bool(row["paid_only"]),
            "tags": tags,
            "url": f"https://leetcode.com/problems/{row['title_slug']}/",
            "updated_at": row["updated_at"]
        }


# Global default database instance
db = ProblemDatabase()
