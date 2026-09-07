import hashlib
import random
import logging
from typing import Dict, Any, List, Optional, Set

from problem_service import problem_service, ProblemService

logger = logging.getLogger("NextContestBackend.Recommender")


def _normalize_tag(tag: Any) -> str:
    """Normalizes any tag string or object into a lowercase hyphenated slug."""
    if isinstance(tag, dict):
        slug = tag.get("slug") or tag.get("name", "")
    elif isinstance(tag, str):
        slug = tag
    else:
        return ""
    return slug.strip().lower().replace(" ", "-").replace("_", "-")


def _extract_tag_names(tags: List[Any]) -> List[str]:
    """Extracts human-readable topic names from a list of tag objects or strings."""
    names = []
    for t in tags:
        if isinstance(t, dict):
            name = t.get("name") or t.get("topic")
            if name:
                names.append(name)
        elif isinstance(t, str):
            names.append(t)
    return names


class ContestRecommender:
    """
    Deterministic Competitive Programming Contest Recommendation Algorithm.
    Combines AI analysis insights and user LeetCode profile to assemble a balanced,
    personalized 4-problem contest with progressive difficulty calibration,
    strict exclusion of solved/paid problems, and targeted weakness practice.
    """

    def __init__(self, service: Optional[ProblemService] = None):
        self.service = service or problem_service

    def generate_personalized_contest(
        self,
        user_profile: Dict[str, Any],
        ai_analysis: Optional[Dict[str, Any]] = None,
        custom_exclusions: Optional[Set[str]] = None,
        seed: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a balanced 4-problem contest personalized to the user.
        
        Args:
            user_profile: Structured user profile (contest rating, weak topics, recent problems, etc.)
            ai_analysis: CP coach AI analysis (strengths, weaknesses, recommended topics, etc.)
            custom_exclusions: Optional additional problem titleSlugs to exclude.
            seed: Optional seed string for deterministic selection or reproducible contest variants.
        """
        username = user_profile.get("username", "Contestant")
        rating = user_profile.get("contest_rating")
        contest_level = user_profile.get("contest_level") or user_profile.get("rating_level") or "Unrated"
        total_solved = user_profile.get("total_problems_solved") or user_profile.get("total_solved") or 0

        # Build exclusion set: all recent problems + custom exclusions
        excluded_slugs: Set[str] = set(custom_exclusions or [])
        recent_problems = user_profile.get("recent_problems", [])
        for p in recent_problems:
            if isinstance(p, dict):
                s = p.get("slug") or p.get("titleSlug")
                if s:
                    excluded_slugs.add(s)
            elif isinstance(p, str):
                excluded_slugs.add(p)

        # Merge AI analysis insights with profile data
        ai_analysis = ai_analysis or {}
        ai_recommended = ai_analysis.get("recommended_topics", [])
        ai_weaknesses = ai_analysis.get("weaknesses", [])
        ai_strengths = ai_analysis.get("strengths", [])

        # Priority topics extraction
        weak_topics_list = user_profile.get("weak_topics", [])
        strong_topics_list = user_profile.get("strong_topics", [])

        weak_slugs = []
        for t in ai_recommended + ai_weaknesses + weak_topics_list:
            slug = _normalize_tag(t)
            if slug and slug not in weak_slugs:
                weak_slugs.append(slug)

        comfort_slugs = []
        for t in ai_strengths + strong_topics_list:
            slug = _normalize_tag(t)
            if slug and slug not in comfort_slugs:
                comfort_slugs.append(slug)

        # Fallback topics if none extracted
        if not weak_slugs:
            weak_slugs = ["dynamic-programming", "binary-search", "graph", "tree", "sliding-window"]
        if not comfort_slugs:
            comfort_slugs = ["array", "string", "hash-table", "two-pointers"]

        # Slot configuration according to user rating tier
        slot_plans = self._determine_slot_plans(rating, contest_level, total_solved, weak_slugs, comfort_slugs)

        # Deterministic RNG initialization
        rng = self._init_rng(username, seed, rating)

        # Select 4 balanced problems
        selected_problems = []
        used_primary_tags: Set[str] = set()
        chosen_slugs: Set[str] = set(excluded_slugs)

        for slot_idx, plan in enumerate(slot_plans):
            slot_id = f"Q{slot_idx + 1}"
            candidate = self._select_candidate_problem(
                plan=plan,
                chosen_slugs=chosen_slugs,
                used_primary_tags=used_primary_tags,
                rng=rng
            )

            if not candidate:
                # Graceful fallback to broader query if strict plan had no free problems left
                candidate = self._fallback_candidate_problem(plan["difficulty"], chosen_slugs, rng)

            if candidate:
                chosen_slugs.add(candidate["title_slug"])
                primary_tag = self._get_primary_tag(candidate, plan["target_tag_slug"])
                used_primary_tags.add(primary_tag)

                # Formulate personalized mentor rationale
                rationale = self._build_problem_rationale(
                    slot_id=slot_id,
                    slot_title=plan["title"],
                    problem=candidate,
                    primary_tag=primary_tag,
                    is_weakness=plan["is_weakness"]
                )

                selected_problems.append({
                    "slot": slot_id,
                    "slot_label": plan["title"],
                    "frontend_id": candidate["frontend_id"],
                    "title": candidate["title"],
                    "title_slug": candidate["title_slug"],
                    "url": candidate["url"],
                    "difficulty": candidate["difficulty"],
                    "ac_rate": f"{candidate['ac_rate']}%",
                    "tags": _extract_tag_names(candidate.get("tags", [])),
                    "primary_tag": primary_tag,
                    "rationale": rationale
                })

        # Generate contest metadata and summary
        focus_tags = [p["primary_tag"] for p in selected_problems if p.get("primary_tag")]
        unique_focus = list(dict.fromkeys(focus_tags))[:3]
        focus_str = " & ".join(unique_focus) if unique_focus else "Core Algorithms"

        contest_title = f"Personalized Contest: {focus_str} Sprint"
        contest_summary = self._build_contest_summary(
            username=username,
            rating=rating,
            contest_level=contest_level,
            selected_problems=selected_problems,
            focus_tags=unique_focus
        )

        contest_id = hashlib.md5(f"{username}_{seed}_{len(selected_problems)}_{rating}".encode()).hexdigest()[:10]

        return {
            "contest_id": f"contest_{contest_id}",
            "title": contest_title,
            "target_duration_minutes": 90,
            "difficulty_tier": contest_level,
            "user_contest_rating": rating,
            "focus_areas": unique_focus,
            "summary": contest_summary,
            "problems": selected_problems,
            "total_problems": len(selected_problems)
        }

    def _determine_slot_plans(
        self,
        rating: Optional[int],
        level: str,
        total_solved: int,
        weak_slugs: List[str],
        comfort_slugs: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Defines the progressive 4-problem curve (Q1 -> Q4) tailored to the user's competitive level.
        """
        primary_weakness = weak_slugs[0] if weak_slugs else "dynamic-programming"
        secondary_weakness = weak_slugs[1] if len(weak_slugs) > 1 else (weak_slugs[0] if weak_slugs else "binary-search")
        comfort_topic = comfort_slugs[0] if comfort_slugs else "array"

        # Tier 1: Beginner / Unrated (< 1400 rating or < 50 solved)
        if (rating is not None and rating < 1400) or (rating is None and total_solved < 50) or level == "Beginner":
            return [
                {
                    "title": "Warm-up & Foundations",
                    "difficulty": "Easy",
                    "ideal_ac_min": 55.0,
                    "ideal_ac_max": 85.0,
                    "target_tag_slug": comfort_topic,
                    "is_weakness": False
                },
                {
                    "title": "Core Implementation",
                    "difficulty": "Easy",
                    "ideal_ac_min": 45.0,
                    "ideal_ac_max": 75.0,
                    "target_tag_slug": secondary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Targeted Pattern Builder",
                    "difficulty": "Medium",
                    "ideal_ac_min": 45.0,
                    "ideal_ac_max": 70.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Contest Milestone",
                    "difficulty": "Medium",
                    "ideal_ac_min": 35.0,
                    "ideal_ac_max": 60.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                }
            ]

        # Tier 2: Intermediate (1400 - 1600 rating)
        elif (rating is not None and rating < 1600) or level == "Intermediate":
            return [
                {
                    "title": "Rhythm & Warm-up",
                    "difficulty": "Easy",
                    "ideal_ac_min": 50.0,
                    "ideal_ac_max": 80.0,
                    "target_tag_slug": comfort_topic,
                    "is_weakness": False
                },
                {
                    "title": "Standard Competition Problem",
                    "difficulty": "Medium",
                    "ideal_ac_min": 45.0,
                    "ideal_ac_max": 65.0,
                    "target_tag_slug": secondary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Targeted Weakness Sprint",
                    "difficulty": "Medium",
                    "ideal_ac_min": 35.0,
                    "ideal_ac_max": 52.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Contest Decider",
                    "difficulty": "Hard",
                    "ideal_ac_min": 25.0,
                    "ideal_ac_max": 48.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                }
            ]

        # Tier 3: Advanced (1600 - 1900 rating)
        elif (rating is not None and rating < 1900) or level == "Advanced":
            return [
                {
                    "title": "Rapid Warm-up",
                    "difficulty": "Medium",
                    "ideal_ac_min": 52.0,
                    "ideal_ac_max": 75.0,
                    "target_tag_slug": comfort_topic,
                    "is_weakness": False
                },
                {
                    "title": "Core Algorithmic Technique",
                    "difficulty": "Medium",
                    "ideal_ac_min": 40.0,
                    "ideal_ac_max": 58.0,
                    "target_tag_slug": secondary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Deep Weakness Overhaul",
                    "difficulty": "Hard",
                    "ideal_ac_min": 30.0,
                    "ideal_ac_max": 45.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Div1 Contest Challenge",
                    "difficulty": "Hard",
                    "ideal_ac_min": 20.0,
                    "ideal_ac_max": 38.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                }
            ]

        # Tier 4: Expert (>= 1900 rating)
        else:
            return [
                {
                    "title": "Pacing & Speed Problem",
                    "difficulty": "Medium",
                    "ideal_ac_min": 40.0,
                    "ideal_ac_max": 65.0,
                    "target_tag_slug": comfort_topic,
                    "is_weakness": False
                },
                {
                    "title": "Complex Algorithmic Pattern",
                    "difficulty": "Hard",
                    "ideal_ac_min": 32.0,
                    "ideal_ac_max": 48.0,
                    "target_tag_slug": secondary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Specialized Mastery Sprint",
                    "difficulty": "Hard",
                    "ideal_ac_min": 22.0,
                    "ideal_ac_max": 38.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                },
                {
                    "title": "Grandmaster Challenge",
                    "difficulty": "Hard",
                    "ideal_ac_min": 15.0,
                    "ideal_ac_max": 32.0,
                    "target_tag_slug": primary_weakness,
                    "is_weakness": True
                }
            ]

    def _select_candidate_problem(
        self,
        plan: Dict[str, Any],
        chosen_slugs: Set[str],
        used_primary_tags: Set[str],
        rng: random.Random
    ) -> Optional[Dict[str, Any]]:
        """
        Queries the database for candidate problems matching the slot plan,
        scores them deterministically, and selects the optimal problem.
        """
        difficulty = plan["difficulty"]
        target_tag = plan["target_tag_slug"]
        min_ac = plan.get("ideal_ac_min", 20.0)
        max_ac = plan.get("ideal_ac_max", 85.0)

        # 1. Query free problems matching target topic and difficulty
        candidates = self.service.search_problems(
            difficulty=difficulty,
            tag_slugs=[target_tag] if target_tag else None,
            paid_only=False,
            exclude_slugs=chosen_slugs,
            limit=30
        )

        # 2. If candidates are sparse, widen search across difficulty without tag restriction
        if len(candidates) < 3:
            general_candidates = self.service.search_problems(
                difficulty=difficulty,
                paid_only=False,
                exclude_slugs=chosen_slugs,
                limit=30
            )
            # Combine without duplicates
            seen = {c["title_slug"] for c in candidates}
            for gc in general_candidates:
                if gc["title_slug"] not in seen:
                    candidates.append(gc)
                    seen.add(gc["title_slug"])

        if not candidates:
            return None

        # 3. Score each candidate
        scored = []
        for prob in candidates:
            score = 100.0
            prob_slugs = [t.get("slug") for t in prob.get("tags", []) if isinstance(t, dict)]

            # Target tag matching bonus
            if target_tag and target_tag in prob_slugs:
                score += 50.0

            # Ideal acceptance rate bonus
            ac = prob.get("ac_rate", 50.0)
            if min_ac <= ac <= max_ac:
                score += 25.0
            else:
                dist = min(abs(ac - min_ac), abs(ac - max_ac))
                score -= min(dist * 0.8, 30.0)

            # Diversity penalty if primary topic already used in this contest
            primary = self._get_primary_tag(prob, target_tag)
            if primary in used_primary_tags:
                score -= 20.0

            scored.append((score, prob))

        # Sort descending by score
        scored.sort(key=lambda x: x[0], reverse=True)

        # Pick from the top candidates deterministically with RNG to avoid identical repeats
        top_pool_size = min(3, len(scored))
        best_pick = rng.choice(scored[:top_pool_size])[1]
        return best_pick

    def _fallback_candidate_problem(
        self,
        difficulty: str,
        chosen_slugs: Set[str],
        rng: random.Random
    ) -> Optional[Dict[str, Any]]:
        """Fallback search across any difficulty to guarantee 4 problems are returned."""
        candidates = self.service.search_problems(
            difficulty=difficulty,
            paid_only=False,
            exclude_slugs=chosen_slugs,
            limit=20
        )
        if not candidates:
            candidates = self.service.search_problems(
                paid_only=False,
                exclude_slugs=chosen_slugs,
                limit=20
            )
        if candidates:
            return rng.choice(candidates[:min(5, len(candidates))])
        return None

    def _get_primary_tag(self, problem: Dict[str, Any], target_tag: Optional[str]) -> str:
        """Determines the most descriptive primary tag for the problem."""
        tags = problem.get("tags", [])
        if target_tag:
            target_clean = target_tag.lower().replace("-", " ")
            for t in tags:
                t_name = t.get("name", "") if isinstance(t, dict) else str(t)
                if target_clean in t_name.lower():
                    return t_name

        if tags and isinstance(tags[0], dict):
            return tags[0].get("name", "Algorithms")
        elif tags and isinstance(tags[0], str):
            return tags[0]
        return "Algorithms"

    def _build_problem_rationale(
        self,
        slot_id: str,
        slot_title: str,
        problem: Dict[str, Any],
        primary_tag: str,
        is_weakness: bool
    ) -> str:
        """Generates clear, personalized coaching feedback for each problem assignment."""
        title = problem.get("title", "")
        diff = problem.get("difficulty", "")

        if slot_id == "Q1":
            return f"Opening warm-up in {primary_tag}. Designed to build rapid rhythm, quick confidence, and establish positive contest momentum."
        elif slot_id == "Q2":
            if is_weakness:
                return f"Medium-tier challenge specifically targeting your growth area in {primary_tag}. Tests fundamental implementation speed."
            return f"Standard competition {diff} problem in {primary_tag} to test pattern recognition under timed conditions."
        elif slot_id == "Q3":
            return f"High-impact problem targeting your identified weakness in {primary_tag}. Crucial for breaking through your current rating plateau."
        else: # Q4
            return f"Contest challenge ({diff}) testing advanced problem-solving and algorithmic resilience in {primary_tag}."

    def _build_contest_summary(
        self,
        username: str,
        rating: Optional[int],
        contest_level: str,
        selected_problems: List[Dict[str, Any]],
        focus_tags: List[str]
    ) -> str:
        """Generates a concise personalized contest executive summary."""
        rating_str = f"rating {rating} ({contest_level})" if rating else f"tier {contest_level}"
        topics_str = ", ".join(focus_tags) if focus_tags else "DSA patterns"
        return (
            f"Tailored for {username} ({rating_str}). This 4-problem contest creates a realistic 90-minute "
            f"simulation that opens with an accessible warm-up to build confidence, directly attacks your "
            f"weaknesses in {topics_str} during the middle rounds, and finishes with a stretch challenge problem."
        )

    def _init_rng(self, username: str, seed: Optional[str], rating: Optional[int]) -> random.Random:
        """Initializes a deterministic pseudo-random generator."""
        seed_str = f"{username}_{seed}_{rating}" if seed else f"{username}_{rating}"
        seed_int = int(hashlib.sha256(seed_str.encode()).hexdigest()[:8], 16)
        return random.Random(seed_int)


# Global recommender instance
recommender = ContestRecommender()
