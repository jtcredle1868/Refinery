"""
Module 3: Pacing Architect

Chapter-level pacing analysis:
- Pulse graph: action density vs emotional depth by chapter
- Tension curve: rising/falling tension across the full manuscript
- Breathing space detector: 3+ consecutive high-action chapters without decompression
- Slow zone detector: 3+ consecutive low-action chapters without escalation
- Chapter beat classification: ACTION, EMOTION, TRANSITION
"""
import json
from typing import Optional
from app.services.claude_client import ClaudeClient


PACING_SYSTEM = """You are Refinery's Pacing Architect — an expert in narrative pacing, tension management,
and story rhythm. You analyze the balance between action and emotion across every chapter and model the
tension arc of the complete manuscript.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON.
Rate action and emotion on 0-10 scales. Be precise about chapter locations."""


async def run_pacing_analysis(
    raw_text: str,
    chapters: list[dict],
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run Pacing Architect analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    if len(raw_text) > 150_000:
        manuscript_for_ai = _build_pacing_excerpt(raw_text, chapters)
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the pacing of this {len(chapters)}-chapter manuscript.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "pacing_score": <0-100>,
    "chapter_beats": [
        {{
            "chapter": <int>,
            "title": "Chapter Title",
            "action_density": <0-10>,
            "emotional_depth": <0-10>,
            "tension_level": <0-10>,
            "beat_type": "ACTION|EMOTION|TRANSITION",
            "summary": "1-sentence summary of what happens"
        }}
    ],
    "tension_curve": {{
        "shape": "rising|flat|falling|roller_coaster|inverted_u|custom",
        "description": "Description of the overall tension arc",
        "peak_chapter": <int>,
        "lowest_chapter": <int>,
        "tension_values": [<float per chapter, 0-10>]
    }},
    "breathing_space_flags": [
        {{
            "start_chapter": <int>,
            "end_chapter": <int>,
            "consecutive_count": <int>,
            "description": "Description of the high-action sequence needing decompression",
            "suggestion": "Suggestion for adding emotional breathing room"
        }}
    ],
    "slow_zone_flags": [
        {{
            "start_chapter": <int>,
            "end_chapter": <int>,
            "consecutive_count": <int>,
            "description": "Description of the slow sequence",
            "suggestion": "Suggestion for adding tension or escalation"
        }}
    ],
    "act_structure": {{
        "detected_structure": "three_act|four_act|five_act|episodic|other",
        "act_breaks": [<chapter numbers where act breaks occur>],
        "description": "Description of the detected structure"
    }},
    "summary": "2-3 paragraph summary of pacing strengths and issues"
}}"""

    result = await claude.analyze_json(PACING_SYSTEM, prompt)
    return result


def _build_pacing_excerpt(raw_text: str, chapters: list[dict]) -> str:
    """Build pacing-focused excerpts for long manuscripts."""
    excerpts = []
    for ch in chapters:
        text = ch["text"]
        if len(text) > 1500:
            excerpt = text[:500] + "\n[...middle...]\n" + text[len(text)//2:len(text)//2+500] + "\n[...end...]\n" + text[-500:]
        else:
            excerpt = text
        excerpts.append(f"=== Chapter {ch['index'] + 1}: {ch['title']} ===\n{excerpt}")
    return "\n\n".join(excerpts)
