"""
Module 4: Character Arc Workshop

Character development tracking:
- Want/Fear/Belief/Behavior tracking per primary character across chapters
- Inconsistency flagging: behavior vs established Belief/Fear without justification
- Transformation validation: whether climactic change is earned
- Basic arc tracking (alternative arc generation deferred to beta)
"""
import json
from typing import Optional
from app.services.claude_client import ClaudeClient


CHARACTER_ARC_SYSTEM = """You are Refinery's Character Arc Workshop — an expert in character development,
psychological motivation, and narrative arc construction. You track each character's Want, Fear, Belief,
and Behavior across every chapter and identify where development is strong, inconsistent, or unearned.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON."""


async def run_character_arc_analysis(
    raw_text: str,
    chapters: list[dict],
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run Character Arc Workshop analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    if len(raw_text) > 150_000:
        manuscript_for_ai = _build_character_excerpt(raw_text, chapters)
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the character arcs in this {len(chapters)}-chapter manuscript.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "character_score": <0-100>,
    "characters": [
        {{
            "name": "Character Name",
            "role": "protagonist|antagonist|supporting|minor",
            "arc_type": "positive_change|negative_change|flat|corruption|disillusionment|other",
            "want": "What the character consciously wants",
            "fear": "What the character fears most",
            "belief": "The character's core belief about the world",
            "arc_summary": "2-3 sentence summary of their development",
            "chapter_tracking": [
                {{
                    "chapter": <int>,
                    "behavior": "Key behavior or action in this chapter",
                    "belief_state": "How their belief manifests here",
                    "development_note": "What changes or stays the same"
                }}
            ],
            "inconsistencies": [
                {{
                    "chapter": <int>,
                    "description": "What is inconsistent",
                    "expected_behavior": "What we'd expect given their established traits",
                    "actual_behavior": "What they actually do",
                    "severity": "high|medium|low",
                    "justified": false
                }}
            ],
            "transformation_validation": {{
                "climax_chapter": <int or null>,
                "change_earned": <bool>,
                "earning_evidence": "Why the change is or isn't earned",
                "missing_setup": ["scene/moment that would strengthen the arc"]
            }}
        }}
    ],
    "relationship_dynamics": [
        {{
            "character_a": "Name",
            "character_b": "Name",
            "relationship_type": "allies|adversaries|romantic|mentor_student|rivals|family",
            "evolution": "How the relationship changes",
            "key_scenes": [<chapter numbers>]
        }}
    ],
    "summary": "2-3 paragraph summary of character development strengths and weaknesses"
}}"""

    result = await claude.analyze_json(CHARACTER_ARC_SYSTEM, prompt)
    return result


def _build_character_excerpt(raw_text: str, chapters: list[dict]) -> str:
    """Build character-focused excerpts."""
    excerpts = []
    for ch in chapters:
        text = ch["text"]
        if len(text) > 1200:
            excerpt = text[:600] + "\n[...]\n" + text[-600:]
        else:
            excerpt = text
        excerpts.append(f"=== Chapter {ch['index'] + 1}: {ch['title']} ===\n{excerpt}")
    return "\n\n".join(excerpts)
