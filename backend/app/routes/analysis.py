import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.manuscript import Manuscript, ManuscriptStatus
from app.models.analysis import AnalysisResult, AnalysisModule, EditQueueItem, EditItemStatus
from app.utils.auth import get_current_user
from app.utils.response import api_response
from app.services.analysis_engine import run_full_analysis, run_single_module
from app.services.export_service import export_analysis_docx, export_analysis_pdf, export_reader_report_pdf

router = APIRouter(prefix="/manuscripts", tags=["Analysis"])


class AnalyzeRequest(BaseModel):
    modules: Optional[list] = None  # If None, run all modules


class ExportRequest(BaseModel):
    format: str = "docx"  # "docx" or "pdf"
    report_type: str = "analysis"  # "analysis" or "reader_report"


class EditQueueUpdateRequest(BaseModel):
    status: str  # "ACCEPTED" or "REJECTED"


@router.post("/{manuscript_id}/analyze")
def analyze_manuscript(
    manuscript_id: int,
    req: AnalyzeRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if manuscript.status == ManuscriptStatus.ANALYZING:
        raise HTTPException(status_code=400, detail="Analysis already in progress")

    if not manuscript.extracted_text:
        raise HTTPException(status_code=400, detail="Manuscript text not yet extracted")

    if req and req.modules:
        valid_modules = {m.value for m in AnalysisModule}
        invalid_modules = [m for m in req.modules if m not in valid_modules]
        if invalid_modules:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid module name(s): {invalid_modules}. Valid modules are: {[m.value for m in AnalysisModule]}",
            )

    try:
        if req and req.modules:
            results = {}
            for mod_name in req.modules:
                module = AnalysisModule(mod_name)
                result = run_single_module(db, manuscript, module)
                results[mod_name] = result
            manuscript.status = ManuscriptStatus.COMPLETE
            manuscript.progress_percent = 100.0
            db.commit()
        else:
            results = run_full_analysis(db, manuscript)

        return api_response(data={
            "manuscript_id": manuscript.id,
            "status": manuscript.status.value,
            "modules_completed": list(results.keys()),
        })
    except Exception as e:
        manuscript.status = ManuscriptStatus.ERROR
        manuscript.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{manuscript_id}/analysis/{module}")
def get_analysis_result(
    manuscript_id: int,
    module: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    try:
        analysis_module = AnalysisModule(module)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid module: {module}")

    result = db.query(AnalysisResult).filter(
        AnalysisResult.manuscript_id == manuscript_id,
        AnalysisResult.module == analysis_module,
    ).order_by(AnalysisResult.created_at.desc()).first()

    if not result:
        raise HTTPException(status_code=404, detail=f"No analysis result for module: {module}")

    return api_response(data=json.loads(result.result_json))


@router.get("/{manuscript_id}/analysis")
def get_all_analysis_results(
    manuscript_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    results = db.query(AnalysisResult).filter(
        AnalysisResult.manuscript_id == manuscript_id,
    ).all()

    data = {}
    for result in results:
        data[result.module.value] = json.loads(result.result_json)

    return api_response(data=data)


@router.post("/{manuscript_id}/export")
def export_manuscript(
    manuscript_id: int,
    req: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    # Gather all analysis results
    results = db.query(AnalysisResult).filter(
        AnalysisResult.manuscript_id == manuscript_id,
    ).all()

    if not results:
        raise HTTPException(status_code=400, detail="No analysis results to export. Run analysis first.")

    analysis_data = {}
    for result in results:
        analysis_data[result.module.value] = json.loads(result.result_json)

    try:
        if req.report_type == "reader_report":
            filepath = export_reader_report_pdf(manuscript.title, analysis_data)
        elif req.format == "pdf":
            filepath = export_analysis_pdf(manuscript.title, analysis_data)
        else:
            filepath = export_analysis_docx(manuscript.title, analysis_data)

        return FileResponse(
            filepath,
            media_type="application/octet-stream",
            filename=filepath.split("/")[-1],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# Edit Queue endpoints
@router.get("/{manuscript_id}/edit-queue")
def get_edit_queue(
    manuscript_id: int,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    query = db.query(EditQueueItem).filter(EditQueueItem.manuscript_id == manuscript_id)
    if status_filter:
        try:
            filter_status = EditItemStatus(status_filter)
            query = query.filter(EditQueueItem.status == filter_status)
        except ValueError:
            pass

    items = query.all()

    return api_response(data=[
        {
            "id": item.id,
            "module": item.module.value,
            "severity": item.severity.value,
            "chapter": item.chapter,
            "location": item.location,
            "finding": item.finding,
            "suggestion": item.suggestion,
            "context": item.context,
            "status": item.status.value,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ])


@router.patch("/{manuscript_id}/edit-queue/{item_id}")
def update_edit_queue_item(
    manuscript_id: int,
    item_id: int,
    req: EditQueueUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    item = db.query(EditQueueItem).filter(
        EditQueueItem.id == item_id,
        EditQueueItem.manuscript_id == manuscript_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Edit queue item not found")

    try:
        item.status = EditItemStatus(req.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {req.status}")

    db.commit()
    return api_response(data={"id": item.id, "status": item.status.value})


# Enterprise: Reader report
@router.post("/{manuscript_id}/reports/reader")
def generate_reader_report(
    manuscript_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(
        Manuscript.id == manuscript_id,
        Manuscript.user_id == current_user.id,
    ).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    results = db.query(AnalysisResult).filter(
        AnalysisResult.manuscript_id == manuscript_id,
    ).all()

    if not results:
        raise HTTPException(status_code=400, detail="No analysis results available. Run analysis first.")

    analysis_data = {}
    for result in results:
        analysis_data[result.module.value] = json.loads(result.result_json)

    filepath = export_reader_report_pdf(manuscript.title, analysis_data)
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filepath.split("/")[-1],
    )
