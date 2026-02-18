"""Analysis routes — run all analysis modules."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserTier
from app.models.manuscript import Manuscript
from app.models.analysis import AnalysisResult, AnalysisType, AnalysisStatus
from app.services.intelligence_engine import run_manuscript_xray
from app.services.prose_refinery import run_prose_analysis
from app.services.voice_isolation import run_voice_analysis
from app.services.pacing_architect import run_pacing_analysis
from app.services.character_arc import run_character_arc_analysis
from app.services.revision_center import aggregate_edit_queue
from app.services.argument_coherence import run_argument_analysis
from app.services.citation_architecture import run_citation_analysis
from app.services.academic_voice import run_academic_voice_analysis
from app.services.acquisition_score import compute_acquisition_score
from app.services.claude_client import get_claude_client

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Tier access map
TIER_ACCESS = {
    "xray": [UserTier.FREE, UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "intelligence_engine": [UserTier.FREE, UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "prose_refinery": [UserTier.FREE, UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "voice_isolation": [UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "pacing_architect": [UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "character_arc": [UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "revision_center": [UserTier.PRO, UserTier.ACADEMIC, UserTier.ADVISOR, UserTier.ENTERPRISE],
    "argument_coherence": [UserTier.ACADEMIC, UserTier.ADVISOR],
    "citation_architecture": [UserTier.ACADEMIC, UserTier.ADVISOR],
    "academic_voice": [UserTier.ACADEMIC, UserTier.ADVISOR],
    "acquisition_score": [UserTier.ENTERPRISE],
}


class AnalysisResponse(BaseModel):
    id: int
    manuscript_id: int
    analysis_type: str
    status: str
    score_structure: float | None = None
    score_voice: float | None = None
    score_pacing: float | None = None
    score_character: float | None = None
    score_prose: float | None = None
    score_overall: float | None = None
    results_json: str | None = None
    duration_seconds: float | None = None
    created_at: str

    class Config:
        from_attributes = True


class RunAnalysisRequest(BaseModel):
    manuscript_id: int
    analysis_type: str
    discipline: str = "general"
    document_type: str = "dissertation"
    citation_format: str = "APA"


async def _get_user_manuscript(
    manuscript_id: int, user: User, db: AsyncSession,
) -> Manuscript:
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id, Manuscript.owner_id == user.id,
        )
    )
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return manuscript


def _to_response(a: AnalysisResult) -> AnalysisResponse:
    return AnalysisResponse(
        id=a.id, manuscript_id=a.manuscript_id,
        analysis_type=a.analysis_type.value, status=a.status.value,
        score_structure=a.score_structure, score_voice=a.score_voice,
        score_pacing=a.score_pacing, score_character=a.score_character,
        score_prose=a.score_prose, score_overall=a.score_overall,
        results_json=a.results_json, duration_seconds=a.duration_seconds,
        created_at=a.created_at.isoformat(),
    )


TYPE_MAP = {
    "xray": AnalysisType.XRAY,
    "intelligence_engine": AnalysisType.INTELLIGENCE_ENGINE,
    "prose_refinery": AnalysisType.PROSE_REFINERY,
    "voice_isolation": AnalysisType.VOICE_ISOLATION,
    "pacing_architect": AnalysisType.PACING_ARCHITECT,
    "character_arc": AnalysisType.CHARACTER_ARC,
    "revision_center": AnalysisType.REVISION_CENTER,
    "argument_coherence": AnalysisType.ARGUMENT_COHERENCE,
    "citation_architecture": AnalysisType.CITATION_ARCHITECTURE,
    "academic_voice": AnalysisType.ACADEMIC_VOICE,
    "acquisition_score": AnalysisType.ACQUISITION_SCORE,
}


@router.post("/run", response_model=AnalysisResponse, status_code=201)
async def run_analysis(
    request: RunAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run an analysis module on a manuscript."""
    manuscript = await _get_user_manuscript(request.manuscript_id, current_user, db)

    allowed_tiers = TIER_ACCESS.get(request.analysis_type, [])
    if current_user.tier not in allowed_tiers:
        raise HTTPException(
            status_code=403,
            detail=f"Your {current_user.tier.value} tier does not have access to {request.analysis_type}.",
        )

    analysis_type = TYPE_MAP.get(request.analysis_type)
    if not analysis_type:
        raise HTTPException(status_code=400, detail=f"Invalid analysis type: {request.analysis_type}")

    analysis = AnalysisResult(
        manuscript_id=manuscript.id, analysis_type=analysis_type,
        status=AnalysisStatus.RUNNING, started_at=datetime.now(timezone.utc),
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    chapters = json.loads(manuscript.chapters_json) if manuscript.chapters_json else []

    try:
        claude = get_claude_client()

        if request.analysis_type in ("xray", "intelligence_engine"):
            result = await run_manuscript_xray(manuscript.raw_text, chapters, claude)
            scores = result.get("health_scores", {})
            analysis.score_structure = scores.get("structure")
            analysis.score_voice = scores.get("voice_consistency")
            analysis.score_pacing = scores.get("pacing")
            analysis.score_character = scores.get("character_development")
            analysis.score_prose = scores.get("prose_clarity")
            analysis.score_overall = scores.get("overall")

        elif request.analysis_type == "prose_refinery":
            result = await run_prose_analysis(manuscript.raw_text, chapters, claude)
            analysis.score_prose = result.get("prose_score")

        elif request.analysis_type == "voice_isolation":
            result = await run_voice_analysis(manuscript.raw_text, chapters, claude)
            analysis.score_voice = result.get("voice_score")

        elif request.analysis_type == "pacing_architect":
            result = await run_pacing_analysis(manuscript.raw_text, chapters, claude)
            analysis.score_pacing = result.get("pacing_score")

        elif request.analysis_type == "character_arc":
            result = await run_character_arc_analysis(manuscript.raw_text, chapters, claude)
            analysis.score_character = result.get("character_score")

        elif request.analysis_type == "revision_center":
            existing = await db.execute(
                select(AnalysisResult).where(
                    AnalysisResult.manuscript_id == manuscript.id,
                    AnalysisResult.status == AnalysisStatus.COMPLETED,
                )
            )
            completed = existing.scalars().all()
            analyses_data = [
                {"analysis_type": a.analysis_type.value, "results_json": a.results_json}
                for a in completed
            ]
            result = aggregate_edit_queue(analyses_data)

        elif request.analysis_type == "argument_coherence":
            result = await run_argument_analysis(
                manuscript.raw_text, chapters,
                discipline=request.discipline, document_type=request.document_type, claude=claude,
            )
            analysis.score_structure = result.get("coherence_score")

        elif request.analysis_type == "citation_architecture":
            result = await run_citation_analysis(
                manuscript.raw_text, chapters,
                citation_format=request.citation_format, claude=claude,
            )
            analysis.score_overall = result.get("citation_score")

        elif request.analysis_type == "academic_voice":
            result = await run_academic_voice_analysis(
                manuscript.raw_text, chapters,
                discipline=request.discipline, claude=claude,
            )
            analysis.score_voice = result.get("voice_score")

        elif request.analysis_type == "acquisition_score":
            existing = await db.execute(
                select(AnalysisResult).where(
                    AnalysisResult.manuscript_id == manuscript.id,
                    AnalysisResult.status == AnalysisStatus.COMPLETED,
                )
            )
            completed = existing.scalars().all()
            module_results = {}
            for a in completed:
                data = json.loads(a.results_json) if a.results_json else {}
                module_results[a.analysis_type.value] = data
            result = await compute_acquisition_score(
                module_results, raw_text=manuscript.raw_text, claude=claude,
            )
            analysis.score_overall = result.get("acquisition_score")

        analysis.results_json = json.dumps(result)
        analysis.status = AnalysisStatus.COMPLETED
        analysis.completed_at = datetime.now(timezone.utc)
        if analysis.started_at:
            analysis.duration_seconds = (analysis.completed_at - analysis.started_at).total_seconds()

    except Exception as e:
        analysis.status = AnalysisStatus.FAILED
        analysis.results_json = json.dumps({"error": str(e)})
        analysis.completed_at = datetime.now(timezone.utc)
        db.add(analysis)
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)
    return _to_response(analysis)


@router.get("/manuscript/{manuscript_id}", response_model=list[AnalysisResponse])
async def get_manuscript_analyses(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all analyses for a manuscript."""
    await _get_user_manuscript(manuscript_id, current_user, db)
    result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.manuscript_id == manuscript_id)
        .order_by(AnalysisResult.created_at.desc())
    )
    return [_to_response(a) for a in result.scalars().all()]


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific analysis result."""
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await _get_user_manuscript(analysis.manuscript_id, current_user, db)
    return _to_response(analysis)
