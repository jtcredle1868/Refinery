"""
Module 1: Manuscript Intelligence Engine

Full structural scan of the uploaded manuscript:
- Duplication detection (>70% content similarity between sections)
- Character census (named characters, frequency, first/last appearance)
- Timeline anomaly detection (chronological inconsistencies)
- Lexical fingerprint (top 50 distinctive words)
- Metaphor density heatmap (dominant metaphor families, >3x avg density flags)
- Health dashboard scores across 5 dimensions
"""
import json
import re
from collections import Counter
from typing import Optional
from app.services.claude_client import ClaudeClient


INTELLIGENCE_ENGINE_SYSTEM = """You are Refinery's Manuscript Intelligence Engine — an expert-level literary
analyst that operates at the scale of the full manuscript. You analyze entire books simultaneously,
cross-referencing every element against every other element.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON.
Be specific, cite chapter numbers and passage locations. Be honest and constructive — this is professional
editorial intelligence, not cheerleading."""


async def run_manuscript_xray(
    raw_text: str,
    chapters: list[dict],
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """
    Run the full Manuscript X-ray diagnostic — the 90-second initial scan.
    Returns the health dashboard data and all Module 1 analysis results.
    """
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    # Run local analysis first (fast, no API call)
    local_stats = _compute_local_stats(raw_text, chapters)

    # Build the prompt with the full manuscript
    chapter_summaries = []
    for ch in chapters[:100]:  # Cap at 100 chapters
        preview = ch["text"][:2000]  # First 2000 chars per chapter for the prompt
        chapter_summaries.append(f"### Chapter {ch['index'] + 1}: {ch['title']}\n{preview}\n...")

    manuscript_context = "\n\n".join(chapter_summaries)

    # Truncate to fit within context window while maximizing coverage
    if len(raw_text) > 150_000:
        # For very long manuscripts, send strategic excerpts
        manuscript_for_ai = _build_strategic_excerpt(raw_text, chapters)
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze this complete manuscript and return a JSON object with the following structure.
The manuscript has {local_stats['word_count']} words across {len(chapters)} chapters.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this exact structure:
{{
    "health_scores": {{
        "structure": <0-100>,
        "voice_consistency": <0-100>,
        "pacing": <0-100>,
        "character_development": <0-100>,
        "prose_clarity": <0-100>,
        "overall": <0-100>
    }},
    "duplication_detection": {{
        "duplicates_found": <int>,
        "items": [
            {{
                "type": "paragraph|scene|chapter",
                "location_a": "Chapter X, paragraph Y",
                "location_b": "Chapter X, paragraph Y",
                "similarity_percent": <70-100>,
                "excerpt": "brief excerpt of duplicated content"
            }}
        ]
    }},
    "character_census": {{
        "total_characters": <int>,
        "characters": [
            {{
                "name": "Character Name",
                "frequency": <int mentions>,
                "first_appearance": "Chapter X",
                "last_appearance": "Chapter Y",
                "role": "protagonist|antagonist|supporting|minor"
            }}
        ]
    }},
    "timeline_anomalies": {{
        "anomalies_found": <int>,
        "items": [
            {{
                "location": "Chapter X",
                "description": "description of the chronological inconsistency",
                "severity": "high|medium|low"
            }}
        ]
    }},
    "lexical_fingerprint": {{
        "distinctive_words": ["word1", "word2", ...],
        "top_50_with_frequency": [
            {{"word": "word", "count": <int>, "distinctiveness": <0-100>}}
        ]
    }},
    "metaphor_density": {{
        "dominant_families": ["family1", "family2"],
        "average_density_per_chapter": <float>,
        "chapter_heatmap": [
            {{
                "chapter": <int>,
                "title": "Chapter Title",
                "density": <float>,
                "flagged": <bool>,
                "dominant_metaphors": ["metaphor1"]
            }}
        ]
    }},
    "summary": "A 2-3 paragraph executive summary of the manuscript's structural health, key strengths, and priority areas for revision."
}}"""

    result = await claude.analyze_json(INTELLIGENCE_ENGINE_SYSTEM, prompt)

    # Merge local stats
    result["local_stats"] = local_stats

    return result


def _compute_local_stats(raw_text: str, chapters: list[dict]) -> dict:
    """Compute fast local statistics without API calls."""
    words = raw_text.split()
    word_count = len(words)

    # Word frequency
    word_freq = Counter(w.lower().strip(".,!?;:'\"()-") for w in words if len(w) > 2)

    # Sentence count
    sentences = re.split(r'[.!?]+', raw_text)
    sentence_count = len([s for s in sentences if s.strip()])

    # Average sentence length
    avg_sentence_length = word_count / max(sentence_count, 1)

    # Paragraph count
    paragraphs = [p for p in raw_text.split("\n\n") if p.strip()]

    # Dialogue detection
    dialogue_lines = len(re.findall(r'"[^"]{10,}"', raw_text))

    # Chapter word counts
    chapter_word_counts = []
    for ch in chapters:
        ch_words = len(ch["text"].split())
        chapter_word_counts.append({
            "chapter": ch["index"] + 1,
            "title": ch["title"],
            "word_count": ch_words,
        })

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "paragraph_count": len(paragraphs),
        "avg_sentence_length": round(avg_sentence_length, 1),
        "dialogue_lines": dialogue_lines,
        "chapter_count": len(chapters),
        "chapter_word_counts": chapter_word_counts,
        "most_common_words": word_freq.most_common(100),
    }


def _build_strategic_excerpt(raw_text: str, chapters: list[dict]) -> str:
    """For very long manuscripts, build a strategic excerpt that covers the full arc."""
    excerpts = []
    for ch in chapters:
        text = ch["text"]
        # Take first 500 and last 500 chars of each chapter
        if len(text) > 1200:
            excerpt = text[:600] + "\n[...]\n" + text[-600:]
        else:
            excerpt = text
        excerpts.append(f"=== Chapter {ch['index'] + 1}: {ch['title']} ===\n{excerpt}")

    return "\n\n".join(excerpts)
