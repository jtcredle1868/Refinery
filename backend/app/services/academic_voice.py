"""
Module 9: Academic Voice Calibration (Academic — replaces Voice Isolation Lab)

Academic writing voice analysis:
- Register consistency: formal vs informal/colloquial shifts
- Hedge appropriateness: over-hedging vs under-hedging
- Passive voice density per chapter (flag >40%)
- Overall academic voice scoring (Formality, Precision, Authorial Confidence)
"""
import json
import re
from typing import Optional
from app.services.claude_client import ClaudeClient


ACADEMIC_VOICE_SYSTEM = """You are Refinery's Academic Voice Calibration module — an expert in scholarly
writing register, hedging patterns, and academic prose conventions. You analyze academic manuscripts for
register consistency, appropriate hedging, passive voice usage, and overall authorial voice quality.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON."""


async def run_academic_voice_analysis(
    raw_text: str,
    chapters: list[dict],
    discipline: str = "general",
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run Academic Voice Calibration analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    local_stats = _analyze_passive_voice_local(raw_text, chapters)

    if len(raw_text) > 150_000:
        manuscript_for_ai = raw_text[:100_000] + "\n[...]\n" + raw_text[-50_000:]
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the academic voice of this {discipline} manuscript.
Local passive voice analysis found approximately {local_stats['total_passive_pct']:.1f}% passive constructions.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "voice_score": <0-100>,
    "sub_scores": {{
        "formality": <0-100>,
        "precision": <0-100>,
        "authorial_confidence": <0-100>
    }},
    "register_consistency": {{
        "overall_formality": <0-10>,
        "chapters": [
            {{
                "chapter": <int>,
                "title": "Chapter Title",
                "formality_score": <0-10>,
                "flagged": <bool true if score dips below 6.0>,
                "informal_passages": [
                    {{
                        "text": "The informal passage",
                        "issue": "What makes it informal",
                        "suggestion": "Formal alternative"
                    }}
                ]
            }}
        ]
    }},
    "hedge_analysis": {{
        "over_hedged": [
            {{
                "chapter": <int>,
                "passage": "The over-hedged text",
                "hedge_words": ["perhaps", "might", etc.],
                "issue": "How this weakens the argument",
                "suggestion": "More confident alternative"
            }}
        ],
        "under_hedged": [
            {{
                "chapter": <int>,
                "passage": "The overclaiming text",
                "issue": "Why this needs qualification",
                "suggestion": "Appropriately hedged alternative"
            }}
        ]
    }},
    "passive_voice": {{
        "overall_percentage": <float>,
        "chapters": [
            {{
                "chapter": <int>,
                "passive_pct": <float>,
                "flagged": <bool true if >40%>,
                "worst_examples": [
                    {{
                        "passive": "The passive construction",
                        "active": "Active voice alternative"
                    }}
                ]
            }}
        ]
    }},
    "summary": "2-3 paragraph summary of academic voice quality"
}}"""

    result = await claude.analyze_json(ACADEMIC_VOICE_SYSTEM, prompt)
    result["local_stats"] = local_stats
    return result


def _analyze_passive_voice_local(raw_text: str, chapters: list[dict]) -> dict:
    """Detect passive voice constructions locally."""
    passive_pattern = re.compile(
        r'\b(is|are|was|were|be|been|being)\s+'
        r'(being\s+)?'
        r'(\w+ed|written|done|made|seen|known|found|given|taken|shown)\b',
        re.IGNORECASE
    )

    sentences = re.split(r'(?<=[.!?])\s+', raw_text)
    total_sentences = len([s for s in sentences if s.strip()])
    passive_count = sum(1 for s in sentences if passive_pattern.search(s))

    chapter_stats = []
    for ch in chapters:
        ch_sentences = re.split(r'(?<=[.!?])\s+', ch["text"])
        ch_total = len([s for s in ch_sentences if s.strip()])
        ch_passive = sum(1 for s in ch_sentences if passive_pattern.search(s))
        pct = (ch_passive / max(ch_total, 1)) * 100
        chapter_stats.append({
            "chapter": ch["index"] + 1,
            "title": ch["title"],
            "total_sentences": ch_total,
            "passive_count": ch_passive,
            "passive_pct": round(pct, 1),
            "flagged": pct > 40,
        })

    total_pct = (passive_count / max(total_sentences, 1)) * 100

    return {
        "total_sentences": total_sentences,
        "total_passive": passive_count,
        "total_passive_pct": round(total_pct, 1),
        "chapter_stats": chapter_stats,
    }
