"""Analysis routes — run X-ray, intelligence engine, prose refinery."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
from app.services.claude_client import get_claude_client

router = APIRouter(prefix="/analysis", tags=["analysis"])


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
    analysis_type: str  # "xray", "intelligence_engine", "prose_refinery"


async def _get_user_manuscript(
    manuscript_id: int,
    user: User,
    db: AsyncSession,
) -> Manuscript:
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.owner_id == user.id,
        )
    )
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return manuscript


@router.post("/run", response_model=AnalysisResponse, status_code=201)
async def run_analysis(
    request: RunAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run an analysis on a manuscript. This is a synchronous endpoint for MVP."""
    manuscript = await _get_user_manuscript(request.manuscript_id, current_user, db)

    # Validate tier access
    if request.analysis_type in ("intelligence_engine", "xray") and current_user.tier == UserTier.FREE:
        # Free tier gets basic X-ray only
        pass
    if request.analysis_type == "prose_refinery" and current_user.tier == UserTier.FREE:
        # Free tier gets basic prose refinery
        pass

    # Map analysis type
    type_map = {
        "xray": AnalysisType.XRAY,
        "intelligence_engine": AnalysisType.INTELLIGENCE_ENGINE,
        "prose_refinery": AnalysisType.PROSE_REFINERY,
    }
    analysis_type = type_map.get(request.analysis_type)
    if not analysis_type:
        raise HTTPException(status_code=400, detail=f"Invalid analysis type: {request.analysis_type}")

    # Create analysis record
    analysis = AnalysisResult(
        manuscript_id=manuscript.id,
        analysis_type=analysis_type,
        status=AnalysisStatus.RUNNING,
        started_at=datetime.now(timezone.utc),
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    # Parse chapters
    chapters = json.loads(manuscript.chapters_json) if manuscript.chapters_json else []

    # Run the analysis
    try:
        claude = get_claude_client()

        if request.analysis_type in ("xray", "intelligence_engine"):
            result = await run_manuscript_xray(manuscript.raw_text, chapters, claude)

            # Extract health scores
            scores = result.get("health_scores", {})
            analysis.score_structure = scores.get("structure")
            analysis.score_voice = scores.get("voice_consistency")
            analysis.score_pacing = scores.get("pacing")
            analysis.score_character = scores.get("character_development")
            analysis.score_prose = scores.get("prose_clarity")
            analysis.score_overall = scores.get("overall")

        elif request.analysis_type == "prose_refinery":
            result = await run_prose_analysis(manuscript.raw_text, chapters, claude)

            # Extract prose score
            analysis.score_prose = result.get("prose_score")

        analysis.results_json = json.dumps(result)
        analysis.status = AnalysisStatus.COMPLETED
        analysis.completed_at = datetime.now(timezone.utc)
        if analysis.started_at:
            analysis.duration_seconds = (
                analysis.completed_at - analysis.started_at
            ).total_seconds()

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

    return AnalysisResponse(
        id=analysis.id,
        manuscript_id=analysis.manuscript_id,
        analysis_type=analysis.analysis_type.value,
        status=analysis.status.value,
        score_structure=analysis.score_structure,
        score_voice=analysis.score_voice,
        score_pacing=analysis.score_pacing,
        score_character=analysis.score_character,
        score_prose=analysis.score_prose,
        score_overall=analysis.score_overall,
        results_json=analysis.results_json,
        duration_seconds=analysis.duration_seconds,
        created_at=analysis.created_at.isoformat(),
    )


@router.get("/manuscript/{manuscript_id}", response_model=list[AnalysisResponse])
async def get_manuscript_analyses(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all analyses for a manuscript."""
    # Verify ownership
    await _get_user_manuscript(manuscript_id, current_user, db)

    result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.manuscript_id == manuscript_id)
        .order_by(AnalysisResult.created_at.desc())
    )
    analyses = result.scalars().all()

    return [
        AnalysisResponse(
            id=a.id,
            manuscript_id=a.manuscript_id,
            analysis_type=a.analysis_type.value,
            status=a.status.value,
            score_structure=a.score_structure,
            score_voice=a.score_voice,
            score_pacing=a.score_pacing,
            score_character=a.score_character,
            score_prose=a.score_prose,
            score_overall=a.score_overall,
            results_json=a.results_json,
            duration_seconds=a.duration_seconds,
            created_at=a.created_at.isoformat(),
        )
        for a in analyses
    ]


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

    # Verify ownership via manuscript
    await _get_user_manuscript(analysis.manuscript_id, current_user, db)

    return AnalysisResponse(
        id=analysis.id,
        manuscript_id=analysis.manuscript_id,
        analysis_type=analysis.analysis_type.value,
        status=analysis.status.value,
        score_structure=analysis.score_structure,
        score_voice=analysis.score_voice,
        score_pacing=analysis.score_pacing,
        score_character=analysis.score_character,
        score_prose=analysis.score_prose,
        score_overall=analysis.score_overall,
        results_json=analysis.results_json,
        duration_seconds=analysis.duration_seconds,
        created_at=analysis.created_at.isoformat(),
    )
