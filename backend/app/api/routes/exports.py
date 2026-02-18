"""Export routes — DOCX and PDF exports."""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.manuscript import Manuscript
from app.models.analysis import AnalysisResult, AnalysisStatus
from app.services.export_service import (
    export_clean_docx,
    export_tracked_changes_docx,
    export_analysis_report_docx,
)
from app.services.revision_center import aggregate_edit_queue

router = APIRouter(prefix="/exports", tags=["exports"])


class ExportRequest(BaseModel):
    manuscript_id: int
    export_type: str  # "clean_docx", "tracked_docx", "pdf_report"


async def _get_user_manuscript(manuscript_id: int, user: User, db: AsyncSession):
    result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id, Manuscript.owner_id == user.id)
    )
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return manuscript


@router.post("/download")
async def export_manuscript(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export manuscript in various formats."""
    manuscript = await _get_user_manuscript(request.manuscript_id, current_user, db)
    chapters = json.loads(manuscript.chapters_json) if manuscript.chapters_json else []

    if request.export_type == "clean_docx":
        docx_bytes = export_clean_docx(manuscript.raw_text, chapters, manuscript.title)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{manuscript.title}_clean.docx"'},
        )

    elif request.export_type == "tracked_docx":
        # Gather findings from all analyses
        analyses = await db.execute(
            select(AnalysisResult).where(
                AnalysisResult.manuscript_id == manuscript.id,
                AnalysisResult.status == AnalysisStatus.COMPLETED,
            )
        )
        analyses_data = [
            {"analysis_type": a.analysis_type.value, "results_json": a.results_json}
            for a in analyses.scalars().all()
        ]
        queue = aggregate_edit_queue(analyses_data)
        findings = queue.get("items", [])

        docx_bytes = export_tracked_changes_docx(
            manuscript.raw_text, chapters, manuscript.title, findings,
        )
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{manuscript.title}_tracked.docx"'},
        )

    elif request.export_type == "pdf_report":
        # Gather health scores and module summaries
        analyses = await db.execute(
            select(AnalysisResult).where(
                AnalysisResult.manuscript_id == manuscript.id,
                AnalysisResult.status == AnalysisStatus.COMPLETED,
            )
        )
        health_scores = {}
        module_summaries = {}
        for a in analyses.scalars().all():
            data = json.loads(a.results_json) if a.results_json else {}
            module_summaries[a.analysis_type.value] = {
                "summary": data.get("summary", ""),
                "score": getattr(a, "score_overall", None) or getattr(a, "score_structure", None),
            }
            if a.analysis_type.value in ("xray", "intelligence_engine"):
                health_scores = data.get("health_scores", {})

        docx_bytes = export_analysis_report_docx(
            manuscript.title, health_scores, module_summaries,
        )
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{manuscript.title}_report.docx"'},
        )

    raise HTTPException(status_code=400, detail=f"Invalid export type: {request.export_type}")
