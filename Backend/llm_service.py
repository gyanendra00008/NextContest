import os
import json
import logging
import re
from typing import Dict, Any, List
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("NextContestBackend.LLM")

# Supported models in priority order for Groq API
DEFAULT_MODELS: List[str] = [
    os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "groq/compound",
]

_client: Groq = None


def get_groq_client() -> Groq:
    """Lazily initializes and caches the Groq client instance."""
    global _client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY is not set in environment.")
        return None
    if _client is None:
        try:
            _client = Groq(api_key=api_key)
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            return None
    return _client


def _clean_json_text(text: str) -> str:
    """Strips markdown code fences (```json ... ```) and leading/trailing whitespace."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def _generate_rule_based_fallback(user_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic mentor fallback used when the LLM service is offline or unreachable.
    Ensures the user always receives valuable coaching insights.
    """
    weak_topics = user_profile.get("weak_topics", [])
    strong_topics = user_profile.get("strong_topics", [])
    rating = user_profile.get("contest_rating") or 1400

    def extract_names(topics):
        names = []
        for t in topics:
            if isinstance(t, dict):
                names.append(t.get("topic") or t.get("name", ""))
            elif isinstance(t, str):
                names.append(t)
        return [n for n in names if n]

    weak_names = extract_names(weak_topics) or ["Dynamic Programming", "Graphs", "Binary Search"]
    strong_names = extract_names(strong_topics) or ["Arrays", "Strings"]

    if rating < 1400:
        difficulty = "Easy to Medium"
        strategy = (
            "Focus on foundational data structures: Arrays, Hash Tables, and Two Pointers. "
            "Solve 2-3 Medium problems per topic until the patterns become second nature, then participate in weekly contests."
        )
    elif rating < 1600:
        difficulty = "Medium"
        strategy = (
            "Prioritize intermediate patterns: Binary Search on answer, BFS/DFS tree traversals, and standard DP. "
            "Review contest solutions for problems Q2 and Q3 to improve your speed and accuracy."
        )
    elif rating < 1900:
        difficulty = "Medium to Hard"
        strategy = (
            "Target advanced concepts: Segment Trees, Advanced DP, and Graph Algorithms (Dijkstra, Topological Sort). "
            "Upsolve Q4 problems from past contests under timed practice sessions."
        )
    else:
        difficulty = "Hard"
        strategy = (
            "Engage in heavy contest upsolving focusing on Hard/Div1 problems, game theory, and centroid decomposition. "
            "Simulate contest conditions with 90-minute time constraints."
        )

    return {
        "strengths": strong_names[:5],
        "weaknesses": weak_names[:5],
        "recommended_topics": weak_names[:4],
        "recommended_difficulty": difficulty,
        "training_strategy": strategy
    }


def get_ai_analysis(user_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyzes a clean LeetCode user profile using Groq LLM.
    Returns a validated dictionary conforming to the required schema:
    {
        "strengths": [],
        "weaknesses": [],
        "recommended_topics": [],
        "recommended_difficulty": "",
        "training_strategy": ""
    }
    """
    client = get_groq_client()
    if not client:
        logger.info("Using deterministic fallback coaching as Groq client is not initialized.")
        return _generate_rule_based_fallback(user_profile)

    # Simplified profile for prompt clarity
    compact_profile = {
        "username": user_profile.get("username"),
        "contest_rating": user_profile.get("contest_rating"),
        "contest_level": user_profile.get("contest_level"),
        "recommended_difficulty": user_profile.get("recommended_difficulty"),
        "weak_topics": [t.get("topic") if isinstance(t, dict) else t for t in user_profile.get("weak_topics", [])],
        "strong_topics": [t.get("topic") if isinstance(t, dict) else t for t in user_profile.get("strong_topics", [])],
        "recent_solved": [p.get("title") if isinstance(p, dict) else p for p in user_profile.get("recent_problems", [])][:5]
    }

    prompt = f"""You are an elite Competitive Programming mentor and coach.

Analyze the following LeetCode user profile:

{json.dumps(compact_profile, indent=2)}

Your objectives:
1. Identify the user's key strengths in algorithmic problem solving.
2. Identify their actual weak areas based on problem solved counts and contest rating.
3. Recommend 3 to 5 targeted DSA topics to practice next to break through their current rating plateau.
4. Suggest the optimal problem difficulty (e.g., Easy, Medium, Medium to Hard, Hard).
5. Provide an actionable, 2-3 sentence personalized training strategy.

IMPORTANT REQUIREMENTS:
- Output MUST be strictly valid JSON.
- Do NOT include markdown code blocks, backticks, or any commentary outside the JSON object.
- Match this exact JSON format:
{{
  "strengths": ["topic1", "topic2"],
  "weaknesses": ["topic1", "topic2"],
  "recommended_topics": ["topic1", "topic2", "topic3"],
  "recommended_difficulty": "Medium",
  "training_strategy": "string explanation"
}}
"""

    last_error = None
    models_to_try = []
    for m in DEFAULT_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    for model_name in models_to_try:
        try:
            logger.info(f"Requesting AI analysis from Groq using model: {model_name}")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert competitive programming mentor. You only reply with raw, valid JSON matching the requested schema."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=800,
                temperature=0.3
            )

            raw_content = response.choices[0].message.content
            cleaned = _clean_json_text(raw_content)
            parsed = json.loads(cleaned)

            # Ensure all required keys exist
            required_keys = ["strengths", "weaknesses", "recommended_topics", "recommended_difficulty", "training_strategy"]
            if all(k in parsed for k in required_keys):
                return parsed
            else:
                logger.warning(f"Response from {model_name} missing required keys. Trying next model.")

        except Exception as e:
            last_error = e
            logger.warning(f"Groq model '{model_name}' encountered an error: {e}. Trying next model...")

    logger.error(f"All Groq models failed. Last error: {last_error}. Falling back to rule-based analysis.")
    fallback = _generate_rule_based_fallback(user_profile)
    return fallback