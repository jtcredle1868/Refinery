"""
Module 11: Acquisition Score Algorithm (Enterprise)

Composite 0-100 score from weighted module results:
- Structural Integrity: 25% (from Intelligence Engine)
- Voice Distinctiveness: 20% (from Voice Isolation)
- Pacing Quality: 20% (from Pacing Architect)
- Prose Craft: 20% (from Prose Refinery)
- Narrative Originality: 15% (cross-module AI assessment)
"""
import json
from typing import Optional
from app.services.claude_client import ClaudeClient

DEFAULT_WEIGHTS = {
    "structural_integrity": 0.25,
    "voice_distinctiveness": 0.20,
    "pacing_quality": 0.20,
    "prose_craft": 0.20,
    "narrative_originality": 0.15,
}

SCORE_TIERS = {
    (80, 101): {"label": "Strong Consider", "color": "green"},
    (60, 80): {"label": "Consider", "color": "blue"},
    (40, 60): {"label": "Maybe", "color": "amber"},
    (0, 40): {"label": "Pass", "color": "red"},
}


async def compute_acquisition_score(
    module_results: dict,
    raw_text: str = "",
    weights: dict = None,
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """
    Compute the Acquisition Score from available module results.
    module_results keys: 'intelligence_engine', 'voice_isolation', 'pacing_architect', 'prose_refinery'
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS

    scores = {}

    # Structural Integrity from Intelligence Engine
    ie = module_results.get("intelligence_engine", {})
    ie_scores = ie.get("health_scores", {})
    scores["structural_integrity"] = ie_scores.get("structure", 50)

    # Voice Distinctiveness from Voice Isolation
    vi = module_results.get("voice_isolation", {})
    scores["voice_distinctiveness"] = vi.get("voice_score", 50)

    # Pacing Quality from Pacing Architect
    pa = module_results.get("pacing_architect", {})
    scores["pacing_quality"] = pa.get("pacing_score", 50)

    # Prose Craft from Prose Refinery
    pr = module_results.get("prose_refinery", {})
    scores["prose_craft"] = pr.get("prose_score", 50)

    # Narrative Originality — AI assessment if text available
    if raw_text and claude:
        originality = await _assess_originality(raw_text, claude)
        scores["narrative_originality"] = originality
    else:
        scores["narrative_originality"] = 50

    # Compute weighted composite
    composite = sum(
        scores[component] * weights[component]
        for component in weights
    )
    composite = round(min(max(composite, 0), 100))

    # Determine tier
    tier_label = "Pass"
    tier_color = "red"
    for (low, high), tier_info in SCORE_TIERS.items():
        if low <= composite < high:
            tier_label = tier_info["label"]
            tier_color = tier_info["color"]
            break

    return {
        "acquisition_score": composite,
        "tier": tier_label,
        "tier_color": tier_color,
        "component_scores": scores,
        "weights": weights,
        "breakdown": {
            component: {
                "score": scores[component],
                "weight": weights[component],
                "weighted_contribution": round(scores[component] * weights[component], 1),
            }
            for component in weights
        },
    }


async def _assess_originality(raw_text: str, claude: ClaudeClient) -> float:
    """AI assessment of narrative originality."""
    excerpt = raw_text[:20_000]
    prompt = f"""Rate the narrative originality of this manuscript excerpt on a scale of 0-100.
Consider: premise uniqueness, genre innovation, fresh perspective, avoiding cliches.
Return ONLY a JSON object: {{"originality_score": <0-100>, "reasoning": "brief explanation"}}

TEXT:
\"\"\"{excerpt}\"\"\""""

    try:
        result = await claude.analyze_json(
            "You are a literary originality assessor. Return ONLY valid JSON.",
            prompt,
            max_tokens=500,
        )
        return result.get("originality_score", 50)
    except Exception:
        return 50
