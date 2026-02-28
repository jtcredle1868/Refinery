"""
Module 5: Prose Refinery

Craft-level prose analysis:
- Tic tracker: top 20 recurring words/phrases, flags chapters with 2x+ avg frequency
- Filter word detector: hedging language (seemed, appeared, felt, noticed, realized, wondered)
- Show vs. tell analyzer: passages describing emotion directly, with scene-level alternatives
- Sentence rhythm profiler: avg sentence length, variance, consecutive-short/long runs
- Metaphor frequency manager: recurring metaphor families, overuse within 5000-word windows
"""
import re
import json
from collections import Counter
from typing import Optional
from app.services.claude_client import ClaudeClient


# Common filter/hedging words per the RDD
FILTER_WORDS = [
    "seemed", "appeared", "felt", "noticed", "realized", "wondered",
    "thought", "knew", "saw", "heard", "watched", "looked",
    "began to", "started to", "tried to", "managed to",
    "somewhat", "slightly", "a bit", "a little", "rather",
    "very", "really", "quite", "just", "actually", "basically",
    "practically", "virtually", "literally", "simply",
]

PROSE_REFINERY_SYSTEM = """You are Refinery's Prose Refinery module — a master-level prose analyst
specializing in craft-level writing analysis. You identify writing tics, filter words, show-vs-tell
passages, and sentence rhythm problems at the manuscript scale.

You provide specific, actionable feedback with exact locations. You MUST return valid JSON only.
Be constructive but honest — writers need the truth to improve."""


async def run_prose_analysis(
    raw_text: str,
    chapters: list[dict],
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run the full Prose Refinery analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    # Run local analysis first
    local_results = _compute_local_prose_stats(raw_text, chapters)

    # Build AI analysis prompt
    if len(raw_text) > 150_000:
        manuscript_for_ai = _build_prose_excerpt(raw_text, chapters)
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the prose quality of this manuscript and return detailed JSON results.

LOCAL STATISTICS (already computed):
- Word count: {local_results['word_count']}
- Top filter words found: {json.dumps(local_results['filter_word_counts'][:20])}
- Average sentence length: {local_results['avg_sentence_length']} words
- Top recurring words: {json.dumps(local_results['top_recurring'][:30])}

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "prose_score": <0-100>,
    "tic_tracker": {{
        "tics_found": <int>,
        "items": [
            {{
                "word_or_phrase": "the tic",
                "total_count": <int>,
                "avg_per_chapter": <float>,
                "worst_chapters": [
                    {{"chapter": <int>, "count": <int>, "ratio_vs_avg": <float>}}
                ],
                "severity": "high|medium|low",
                "suggestion": "how to address this tic"
            }}
        ]
    }},
    "filter_words": {{
        "total_filter_words": <int>,
        "density_per_1000_words": <float>,
        "chapter_breakdown": [
            {{
                "chapter": <int>,
                "title": "Chapter Title",
                "filter_word_count": <int>,
                "worst_offenders": ["word1", "word2"],
                "examples": ["example sentence with filter word highlighted"]
            }}
        ],
        "top_filter_words": [
            {{"word": "word", "count": <int>}}
        ]
    }},
    "show_vs_tell": {{
        "tell_passages_found": <int>,
        "items": [
            {{
                "location": "Chapter X, paragraph Y",
                "original": "the telling passage",
                "issue": "what makes this telling rather than showing",
                "suggestion": "a showing alternative",
                "severity": "high|medium|low"
            }}
        ]
    }},
    "sentence_rhythm": {{
        "avg_sentence_length": <float>,
        "variance": <float>,
        "consecutive_short_runs": [
            {{
                "location": "Chapter X",
                "count": <int consecutive short sentences>,
                "excerpt": "the run of short sentences"
            }}
        ],
        "consecutive_long_runs": [
            {{
                "location": "Chapter X",
                "count": <int consecutive long sentences>,
                "excerpt": "the run of long sentences"
            }}
        ],
        "chapter_rhythm_profile": [
            {{
                "chapter": <int>,
                "avg_length": <float>,
                "variance": <float>,
                "rhythm_score": <0-100>
            }}
        ]
    }},
    "metaphor_frequency": {{
        "metaphor_families": [
            {{
                "family": "e.g., water/ocean imagery",
                "count": <int>,
                "overuse_windows": [
                    {{
                        "location": "approximate location in text",
                        "count_in_window": <int>,
                        "flagged": <bool>
                    }}
                ]
            }}
        ]
    }},
    "summary": "2-3 paragraph summary of prose quality, key strengths, and priority fixes"
}}"""

    result = await claude.analyze_json(PROSE_REFINERY_SYSTEM, prompt)
    result["local_stats"] = local_results
    return result


def _compute_local_prose_stats(raw_text: str, chapters: list[dict]) -> dict:
    """Compute fast local prose statistics."""
    words = raw_text.split()
    word_count = len(words)
    lower_text = raw_text.lower()

    # Filter word detection
    filter_word_counts = []
    for fw in FILTER_WORDS:
        count = len(re.findall(r'\b' + re.escape(fw) + r'\b', lower_text))
        if count > 0:
            filter_word_counts.append({"word": fw, "count": count})
    filter_word_counts.sort(key=lambda x: x["count"], reverse=True)

    # Sentence analysis
    sentences = re.split(r'(?<=[.!?])\s+', raw_text)
    sentence_lengths = [len(s.split()) for s in sentences if s.strip()]
    avg_sentence_length = sum(sentence_lengths) / max(len(sentence_lengths), 1)

    # Variance
    if sentence_lengths:
        mean = avg_sentence_length
        variance = sum((x - mean) ** 2 for x in sentence_lengths) / len(sentence_lengths)
    else:
        variance = 0

    # Word frequency (excluding common stop words)
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "is", "was", "are", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "that", "this", "it", "its",
        "not", "no", "from", "as", "he", "she", "they", "them", "his", "her",
        "their", "my", "your", "our", "we", "you", "me", "him", "who", "what",
        "which", "when", "where", "how", "all", "each", "every", "both",
        "few", "more", "most", "other", "some", "such", "than", "too",
        "into", "over", "after", "before", "between", "out", "up", "down",
        "then", "so", "if", "about", "there", "here", "said", "like",
    }
    word_freq = Counter(
        w.lower().strip(".,!?;:'\"()-")
        for w in words
        if w.lower().strip(".,!?;:'\"()-") not in stop_words and len(w) > 2
    )
    top_recurring = [{"word": w, "count": c} for w, c in word_freq.most_common(50)]

    # Per-chapter filter word analysis
    chapter_filter_stats = []
    for ch in chapters:
        ch_lower = ch["text"].lower()
        ch_fw_count = 0
        for fw in FILTER_WORDS:
            ch_fw_count += len(re.findall(r'\b' + re.escape(fw) + r'\b', ch_lower))
        chapter_filter_stats.append({
            "chapter": ch["index"] + 1,
            "title": ch["title"],
            "filter_word_count": ch_fw_count,
            "word_count": len(ch["text"].split()),
        })

    return {
        "word_count": word_count,
        "filter_word_counts": filter_word_counts,
        "total_filter_words": sum(fw["count"] for fw in filter_word_counts),
        "avg_sentence_length": round(avg_sentence_length, 1),
        "sentence_length_variance": round(variance, 1),
        "sentence_count": len(sentence_lengths),
        "top_recurring": top_recurring,
        "chapter_filter_stats": chapter_filter_stats,
    }


def _build_prose_excerpt(raw_text: str, chapters: list[dict]) -> str:
    """Build strategic prose excerpts for long manuscripts."""
    excerpts = []
    for ch in chapters:
        text = ch["text"]
        # Take 800 chars from each chapter for prose analysis
        if len(text) > 1000:
            excerpt = text[:500] + "\n[...]\n" + text[len(text)//2:len(text)//2+300]
        else:
            excerpt = text
        excerpts.append(f"=== Chapter {ch['index'] + 1}: {ch['title']} ===\n{excerpt}")
    return "\n\n".join(excerpts)
