"""Report generation routes — committee reports, reader reports, rejection letters."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserTier
from app.models.manuscript import Manuscript
from app.models.analysis import AnalysisResult, AnalysisStatus
from app.services.report_generator import (
    generate_committee_report,
    generate_reader_report,
    generate_rejection_letter,
)

router = APIRouter(prefix="/reports", tags=["reports"])


class CommitteeReportRequest(BaseModel):
    manuscript_id: int
    template_type: str = "full_draft_review"
    advisor_notes: str = ""


class ReaderReportRequest(BaseModel):
    manuscript_id: int
    author_name: str = "Unknown Author"


class RejectionLetterRequest(BaseModel):
    manuscript_id: int
    author_name: str = "Author"
    tone: str = "standard"


async def _get_manuscript_with_results(manuscript_id: int, user: User, db: AsyncSession):
    result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id, Manuscript.owner_id == user.id)
    )
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    analyses = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.manuscript_id == manuscript_id,
            AnalysisResult.status == AnalysisStatus.COMPLETED,
        )
    )
    results = {}
    for a in analyses.scalars().all():
        data = json.loads(a.results_json) if a.results_json else {}
        results[a.analysis_type.value] = data
    return manuscript, results


@router.post("/committee")
async def create_committee_report(
    request: CommitteeReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a committee-ready progress report (Academic tier)."""
    if current_user.tier not in (UserTier.ACADEMIC, UserTier.ADVISOR):
        raise HTTPException(status_code=403, detail="Committee reports require Academic or Advisor tier.")
    manuscript, results = await _get_manuscript_with_results(request.manuscript_id, current_user, db)
    report = await generate_committee_report(
        manuscript.title, results,
        template_type=request.template_type,
        advisor_notes=request.advisor_notes,
    )
    return report


@router.post("/reader")
async def create_reader_report(
    request: ReaderReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a reader report for acquisition review (Enterprise tier)."""
    if current_user.tier != UserTier.ENTERPRISE:
        raise HTTPException(status_code=403, detail="Reader reports require Enterprise tier.")
    manuscript, results = await _get_manuscript_with_results(request.manuscript_id, current_user, db)
    acq = results.get("acquisition_score", {})
    report = await generate_reader_report(
        manuscript.title, request.author_name, results, acquisition_score=acq,
    )
    return report


@router.post("/rejection")
async def create_rejection_letter(
    request: RejectionLetterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a personalized rejection letter (Enterprise tier)."""
    if current_user.tier != UserTier.ENTERPRISE:
        raise HTTPException(status_code=403, detail="Rejection letters require Enterprise tier.")
    manuscript, results = await _get_manuscript_with_results(request.manuscript_id, current_user, db)
    letter = await generate_rejection_letter(
        manuscript.title, request.author_name, results, tone=request.tone,
    )
    return letter
