"""
Report Generation Services

Shared report generation for:
- Committee Report Generator (Academic — Module 10)
- Reader Report Generator (Enterprise — Module 12)
- Rejection Letter Drafting (Enterprise — Module 13)
"""
import json
from typing import Optional
from app.services.claude_client import ClaudeClient


REPORT_SYSTEM = """You are Refinery's Report Generator — a professional editorial report writer.
You generate clear, structured, professional reports based on manuscript analysis data.
Write in professional prose, not bullet points. Be specific and constructive.
Return ONLY valid JSON."""


async def generate_committee_report(
    manuscript_title: str,
    analysis_results: dict,
    template_type: str = "full_draft_review",
    advisor_notes: str = "",
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Generate a committee-ready progress report (Academic)."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    template_descriptions = {
        "proposal_defense": "Dissertation proposal defense report — focus on thesis viability, methodology, and argument structure",
        "chapter_review": "Chapter review report — focus on individual chapter quality and connection to overall argument",
        "full_draft_review": "Full draft review report — comprehensive assessment of the complete manuscript",
        "final_defense_prep": "Final defense preparation report — identify remaining issues before defense",
    }

    prompt = f"""Generate a committee-ready academic report for the manuscript "{manuscript_title}".
Report type: {template_type} — {template_descriptions.get(template_type, 'Full review')}

Analysis data:
{json.dumps(analysis_results, indent=2)[:15_000]}

Advisor notes: {advisor_notes or 'None provided'}

Return ONLY valid JSON with this structure:
{{
    "report_type": "{template_type}",
    "title": "Report title",
    "date": "February 2026",
    "sections": [
        {{
            "heading": "Section heading",
            "content": "Full prose content for this section (2-4 paragraphs)"
        }}
    ],
    "executive_summary": "3-5 paragraph executive summary",
    "strengths": ["strength1", "strength2", "strength3"],
    "areas_for_improvement": ["area1", "area2", "area3"],
    "recommendations": ["recommendation1", "recommendation2"],
    "overall_assessment": "A final assessment paragraph"
}}"""

    return await claude.analyze_json(REPORT_SYSTEM, prompt)


async def generate_reader_report(
    manuscript_title: str,
    author_name: str,
    analysis_results: dict,
    acquisition_score: dict = None,
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Generate a reader report for enterprise acquisition (Enterprise)."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    prompt = f"""Generate a professional reader report for manuscript acquisition review.

Title: {manuscript_title}
Author: {author_name}
Acquisition Score: {json.dumps(acquisition_score or {}, indent=2)[:3000]}

Analysis data:
{json.dumps(analysis_results, indent=2)[:15_000]}

Return ONLY valid JSON with this structure:
{{
    "title": "{manuscript_title}",
    "author": "{author_name}",
    "synopsis": "200-word AI-generated synopsis of the manuscript",
    "acquisition_score": {acquisition_score.get('acquisition_score', 0) if acquisition_score else 0},
    "strengths": [
        {{
            "category": "Category (e.g., Voice, Pacing, Structure)",
            "description": "Detailed description of the strength"
        }}
    ],
    "concerns": [
        {{
            "category": "Category",
            "description": "Detailed description of the concern",
            "severity": "major|minor"
        }}
    ],
    "market_positioning": "Brief assessment of market fit and comparable titles",
    "editorial_investment": "Assessment of how much editorial work would be needed",
    "recommendation": "ACQUIRE|CONSIDER|REVISE_AND_RESUBMIT|PASS",
    "recommendation_rationale": "2-3 paragraph rationale for the recommendation"
}}"""

    return await claude.analyze_json(REPORT_SYSTEM, prompt)


async def generate_rejection_letter(
    manuscript_title: str,
    author_name: str,
    analysis_results: dict,
    tone: str = "standard",
    claude: Optional[ClaudeClient] = None,
) -> dict:
    """Generate a personalized rejection letter (Enterprise)."""
    if claude is None:
        from app.services.claude_client import get_claude_client
        claude = get_claude_client()

    tone_instructions = {
        "standard": "Professional and brief. Acknowledge the submission, decline, wish them well.",
        "encouraging": "Warm and encouraging. Note 2-3 specific strengths before the pass. Encourage resubmission or continued writing.",
        "detailed": "Specific craft-level notes. Mention 2-3 strengths and 2-3 specific areas for improvement. Most helpful for the author's development.",
    }

    prompt = f"""Generate a personalized rejection letter for a manuscript submission.

Title: {manuscript_title}
Author: {author_name}
Tone: {tone} — {tone_instructions.get(tone, tone_instructions['standard'])}

Analysis highlights:
{json.dumps(analysis_results, indent=2)[:10_000]}

Return ONLY valid JSON with this structure:
{{
    "subject": "Email subject line",
    "salutation": "Dear {author_name},",
    "body": "The full letter body (multiple paragraphs, professional formatting)",
    "closing": "Professional closing",
    "tone": "{tone}"
}}"""

    return await claude.analyze_json(REPORT_SYSTEM, prompt)
