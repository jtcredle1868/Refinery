"""
Module 7: Argument Coherence Engine (Academic — replaces Pacing Architect)

Academic argument structure analysis:
- Thesis statement extraction and mapping
- Evidence-to-claim ratio per chapter
- Logical progression map with gap detection
- Counterargument coverage analysis
- Chapter coherence scores
"""
import json
from typing import Optional
from app.services.claude_client import ClaudeClient


ARGUMENT_SYSTEM = """You are Refinery's Argument Coherence Engine — an expert in academic argumentation,
logical structure, and scholarly writing assessment. You analyze dissertations, theses, and academic
manuscripts for argumentative rigor, evidence quality, and logical progression.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON."""


async def run_argument_analysis(
    raw_text: str,
    chapters: list[dict],
    discipline: str = "general",
    document_type: str = "dissertation",
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run Argument Coherence Engine analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    if len(raw_text) > 150_000:
        manuscript_for_ai = _build_argument_excerpt(raw_text, chapters)
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the argumentative structure of this {document_type} in the {discipline} discipline.
It has {len(chapters)} chapters.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "coherence_score": <0-100>,
    "thesis_statement": {{
        "extracted_thesis": "The identified central argument/thesis",
        "location": "Chapter and approximate location",
        "clarity_score": <0-100>,
        "restated_in_chapters": [<chapter numbers where thesis is restated or developed>],
        "contested_in_chapters": [<chapter numbers where thesis is challenged>]
    }},
    "evidence_to_claim_ratio": {{
        "overall_ratio": <float>,
        "chapters": [
            {{
                "chapter": <int>,
                "title": "Chapter Title",
                "claims_made": <int>,
                "evidence_provided": <int>,
                "ratio": <float>,
                "under_supported_claims": [
                    {{
                        "claim": "The unsupported claim",
                        "location": "approximate location",
                        "evidence_needed": "What type of evidence would support this"
                    }}
                ]
            }}
        ]
    }},
    "logical_progression": {{
        "overall_flow_score": <0-100>,
        "chapter_connections": [
            {{
                "from_chapter": <int>,
                "to_chapter": <int>,
                "connection_strength": "strong|adequate|weak|missing",
                "connection_type": "builds_on|extends|contrasts|introduces_new|repeats",
                "gap_description": "Description of any logical gap (null if strong)"
            }}
        ],
        "stall_points": [
            {{
                "chapter": <int>,
                "description": "Where the argument stalls or loops"
            }}
        ],
        "contradiction_points": [
            {{
                "chapter_a": <int>,
                "chapter_b": <int>,
                "description": "What contradicts"
            }}
        ]
    }},
    "counterargument_coverage": [
        {{
            "counterargument": "The counterargument identified",
            "chapter": <int>,
            "how_addressed": "acknowledged|refuted|dismissed|absent",
            "adequacy": "adequate|insufficient|missing",
            "suggestion": "How to better address this counterargument"
        }}
    ],
    "chapter_coherence_scores": [
        {{
            "chapter": <int>,
            "title": "Chapter Title",
            "coherence_score": <0-100>,
            "connection_to_prior": <0-100 or null for first chapter>,
            "connection_to_next": <0-100 or null for last chapter>,
            "recommendation": "Brief recommendation for improvement"
        }}
    ],
    "summary": "2-3 paragraph summary of argumentative strengths and areas for improvement"
}}"""

    result = await claude.analyze_json(ARGUMENT_SYSTEM, prompt)
    return result


def _build_argument_excerpt(raw_text: str, chapters: list[dict]) -> str:
    excerpts = []
    for ch in chapters:
        text = ch["text"]
        if len(text) > 1500:
            excerpt = text[:750] + "\n[...]\n" + text[-750:]
        else:
            excerpt = text
        excerpts.append(f"=== Chapter {ch['index'] + 1}: {ch['title']} ===\n{excerpt}")
    return "\n\n".join(excerpts)
