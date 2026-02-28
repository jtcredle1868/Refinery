"""
Module 2: Voice Isolation Lab

Character dialogue extraction and voice analysis:
- Dialogue extraction: all dialogue for each named character, side-by-side
- Voice fingerprint: unique vocabulary, sentence length, punctuation habits, register
- Jargon bleed detection: specialized language in wrong characters
- Compare view: side-by-side voice fingerprint comparison
- Similarity score: 0-100 index for voice distinctiveness
"""
import json
import re
from collections import Counter
from typing import Optional
from app.services.claude_client import ClaudeClient


VOICE_ISOLATION_SYSTEM = """You are Refinery's Voice Isolation Lab — an expert in character voice analysis.
You extract dialogue, fingerprint each character's unique speech patterns, and detect when characters
sound too similar or use language inconsistent with their background.

You MUST return your analysis as valid JSON matching the exact schema requested. No additional text outside the JSON.
Be specific about chapter locations. Provide actionable feedback."""


async def run_voice_analysis(
    raw_text: str,
    chapters: list[dict],
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Run Voice Isolation Lab analysis."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    local_stats = _extract_dialogue_local(raw_text, chapters)

    if len(raw_text) > 150_000:
        manuscript_for_ai = _build_voice_excerpt(raw_text, chapters)
    else:
        manuscript_for_ai = raw_text

    prompt = f"""Analyze the character voices in this manuscript. There are approximately
{local_stats['total_dialogue_lines']} dialogue lines detected.

MANUSCRIPT TEXT:
\"\"\"
{manuscript_for_ai[:200_000]}
\"\"\"

Return ONLY valid JSON with this structure:
{{
    "voice_score": <0-100 overall voice distinctiveness>,
    "characters": [
        {{
            "name": "Character Name",
            "dialogue_count": <int>,
            "voice_fingerprint": {{
                "avg_sentence_length": <float>,
                "vocabulary_richness": <float 0-1>,
                "top_unique_words": ["word1", "word2", ...],
                "punctuation_habits": "description of punctuation patterns",
                "register": "formal|casual|slang|mixed",
                "formality_score": <0-10>,
                "speech_patterns": "description of distinctive speech patterns"
            }},
            "jargon_bleed": [
                {{
                    "chapter": <int>,
                    "passage": "the flagged dialogue",
                    "jargon_type": "medical|legal|technical|etc",
                    "reason": "why this character wouldn't use this language"
                }}
            ],
            "sample_dialogue": ["line1", "line2", "line3"]
        }}
    ],
    "similarity_matrix": [
        {{
            "character_a": "Name A",
            "character_b": "Name B",
            "similarity_score": <0-100>,
            "similar_traits": ["trait1", "trait2"],
            "flagged": <bool true if score > 60>
        }}
    ],
    "jargon_bleed_total": <int>,
    "most_distinctive_character": "Name",
    "least_distinctive_character": "Name",
    "summary": "2-3 paragraph summary of voice analysis findings"
}}"""

    result = await claude.analyze_json(VOICE_ISOLATION_SYSTEM, prompt)
    result["local_stats"] = local_stats
    return result


def _extract_dialogue_local(raw_text: str, chapters: list[dict]) -> dict:
    """Extract basic dialogue statistics locally."""
    dialogue_pattern = re.compile(r'"([^"]{5,})"')
    all_dialogue = dialogue_pattern.findall(raw_text)

    chapter_dialogue = []
    for ch in chapters:
        ch_dialogue = dialogue_pattern.findall(ch["text"])
        chapter_dialogue.append({
            "chapter": ch["index"] + 1,
            "title": ch["title"],
            "dialogue_count": len(ch_dialogue),
        })

    return {
        "total_dialogue_lines": len(all_dialogue),
        "avg_dialogue_length": sum(len(d.split()) for d in all_dialogue) / max(len(all_dialogue), 1),
        "chapter_dialogue_counts": chapter_dialogue,
    }


def _build_voice_excerpt(raw_text: str, chapters: list[dict]) -> str:
    """Build dialogue-focused excerpts for long manuscripts."""
    excerpts = []
    dialogue_pattern = re.compile(r'[^.!?]*"[^"]{5,}"[^.!?]*[.!?]')
    for ch in chapters:
        dialogue_passages = dialogue_pattern.findall(ch["text"])[:10]
        if dialogue_passages:
            excerpt = "\n".join(dialogue_passages)
            excerpts.append(f"=== Chapter {ch['index'] + 1}: {ch['title']} ===\n{excerpt}")
    return "\n\n".join(excerpts)
