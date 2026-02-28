"""
Module 8: Citation & Source Architecture (Academic)

Citation analysis for scholarly manuscripts:
- Citation frequency heatmap: over-reliance on single sources
- Source recency analysis: outdated source detection
- Primary vs secondary source balance
- Citation gap detection: claims without evidence
- Citation format validation (APA, MLA, Chicago, AMA)
"""
import json
import re
from typing import Optional
from app.services.claude_client import ClaudeClient


CITATION_SYSTEM = """You are Refinery's Citation & Source Architecture module — an expert in academic
citation analysis, source evaluation, and scholarly evidence assessment. You analyze manuscripts for
citation quality, source diversity, recency, and format compliance.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON."""


async def run_citation_analysis(
    raw_text: str,
    chapters: list[dict],
    citation_format: str = "APA",
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run Citation & Source Architecture analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    local_stats = _detect_citations_local(raw_text, chapters)

    if len(raw_text) > 150_000:
        manuscript_for_ai = raw_text[:100_000] + "\n[...truncated...]\n" + raw_text[-50_000:]
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the citation and source architecture of this academic manuscript.
Expected citation format: {citation_format}.
Local detection found approximately {local_stats['estimated_citation_count']} citations.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "citation_score": <0-100>,
    "citation_frequency_heatmap": {{
        "total_citations": <int>,
        "unique_sources": <int>,
        "chapters": [
            {{
                "chapter": <int>,
                "title": "Chapter Title",
                "citation_count": <int>,
                "top_cited_sources": [
                    {{
                        "source": "Author (Year) or shortened ref",
                        "count": <int>,
                        "percentage_of_chapter": <float>,
                        "over_reliant": <bool true if >30%>
                    }}
                ]
            }}
        ],
        "most_cited_overall": [
            {{
                "source": "Author/Work",
                "total_citations": <int>,
                "chapters_cited_in": [<int>]
            }}
        ]
    }},
    "citation_gaps": [
        {{
            "chapter": <int>,
            "claim": "The unsupported claim text",
            "location": "approximate location",
            "confidence": <0-100 that this needs a citation>,
            "suggested_type": "What type of source would support this"
        }}
    ],
    "source_recency": {{
        "recent_5_years_pct": <float>,
        "mid_5_10_years_pct": <float>,
        "old_10_plus_years_pct": <float>,
        "flagged_chapters": [
            {{
                "chapter": <int>,
                "old_source_pct": <float>,
                "concern": "Description of recency concern"
            }}
        ]
    }},
    "primary_secondary_balance": {{
        "primary_source_pct": <float>,
        "secondary_source_pct": <float>,
        "assessment": "adequate|needs_more_primary|needs_more_secondary",
        "recommendation": "Brief recommendation"
    }},
    "format_validation": {{
        "format": "{citation_format}",
        "errors_found": <int>,
        "errors": [
            {{
                "chapter": <int>,
                "citation_text": "The incorrectly formatted citation",
                "issue": "What's wrong",
                "correction": "Suggested correction"
            }}
        ]
    }},
    "summary": "2-3 paragraph summary of citation architecture"
}}"""

    result = await claude.analyze_json(CITATION_SYSTEM, prompt)
    result["local_stats"] = local_stats
    return result


def _detect_citations_local(raw_text: str, chapters: list[dict]) -> dict:
    """Detect citations using common patterns."""
    # APA-style: (Author, Year)
    apa_pattern = re.compile(r'\([A-Z][a-z]+(?:\s(?:&|and)\s[A-Z][a-z]+)*,\s\d{4}[a-z]?\)')
    apa_citations = apa_pattern.findall(raw_text)

    # Numbered citations: [1], [2,3], [1-5]
    num_pattern = re.compile(r'\[\d+(?:[,\-]\s*\d+)*\]')
    num_citations = num_pattern.findall(raw_text)

    # Footnote markers
    fn_pattern = re.compile(r'\^\d+|\[\^?\d+\]')
    fn_citations = fn_pattern.findall(raw_text)

    total = len(apa_citations) + len(num_citations) + len(fn_citations)

    return {
        "estimated_citation_count": total,
        "apa_style_count": len(apa_citations),
        "numbered_style_count": len(num_citations),
        "footnote_count": len(fn_citations),
    }
