import os
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.manuscript import Manuscript, ManuscriptStatus
from app.utils.auth import get_current_user
from app.utils.response import api_response
from app.services.text_extraction import extract_text_from_file, detect_chapters, count_words, normalize_text

router = APIRouter(prefix="/manuscripts", tags=["Manuscripts"])


def _manuscript_to_dict(m: Manuscript) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "original_filename": m.original_filename,
        "file_type": m.file_type,
        "status": m.status.value,
        "word_count": m.word_count,
        "chapter_count": m.chapter_count,
        "progress_percent": m.progress_percent,
        "error_message": m.error_message,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "last_analyzed_at": m.last_analyzed_at.isoformat() if m.last_analyzed_at else None,
    }


@router.post("", status_code=201)
async def upload_manuscript(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file extension
    filename = file.filename or "untitled"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type: {ext}. Accepted: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)}MB")

    # Save file using a server-generated UUID filename to prevent path traversal
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    server_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, server_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # Create manuscript record
    manuscript = Manuscript(
        user_id=current_user.id,
        title=title or os.path.splitext(filename)[0],
        original_filename=filename,
        file_path=file_path,
        file_type=ext,
        status=ManuscriptStatus.PENDING,
    )
    db.add(manuscript)
    db.commit()
    db.refresh(manuscript)

    # Extract text immediately (in production this would be a Celery task)
    try:
        manuscript.status = ManuscriptStatus.EXTRACTING
        db.commit()

        text = extract_text_from_file(file_path, ext)
        text = normalize_text(text)
        chapters = detect_chapters(text)
        word_count = count_words(text)

        manuscript.extracted_text = text
        manuscript.chapters_json = json.dumps([{k: v for k, v in ch.items() if k != "text"} for ch in chapters])
        manuscript.word_count = word_count
        manuscript.chapter_count = len(chapters)
        manuscript.status = ManuscriptStatus.PENDING  # Ready for analysis
        manuscript.progress_percent = 0.0
        db.commit()
    except Exception as e:
        manuscript.status = ManuscriptStatus.ERROR
        manuscript.error_message = str(e)
        db.commit()

    return api_response(data=_manuscript_to_dict(manuscript))


@router.get("")
def list_manuscripts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscripts = db.query(Manuscript).filter(
        Manuscript.user_id == current_user.id
    ).order_by(Manuscript.created_at.desc()).all()

    return api_response(data=[_manuscript_to_dict(m) for m in manuscripts])


@router.get("/{manuscript_id}")
def get_manuscript(
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

    data = _manuscript_to_dict(manuscript)
    if manuscript.chapters_json:
        data["chapters"] = json.loads(manuscript.chapters_json)
    return api_response(data=data)


@router.get("/{manuscript_id}/status")
def get_manuscript_status(
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

    return api_response(data={
        "id": manuscript.id,
        "status": manuscript.status.value,
        "progress_percent": manuscript.progress_percent,
        "error_message": manuscript.error_message,
    })


@router.delete("/{manuscript_id}")
def delete_manuscript(
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

    # Remove file
    if manuscript.file_path and os.path.exists(manuscript.file_path):
        os.remove(manuscript.file_path)

    db.delete(manuscript)
    db.commit()

    return api_response(data={"message": "Manuscript deleted"})
