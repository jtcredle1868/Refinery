"""Manuscript management routes — upload, list, get, delete."""
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserTier
from app.models.manuscript import Manuscript, ManuscriptStatus
from app.services.manuscript_parser import parse_manuscript
from app.config import get_settings

router = APIRouter(prefix="/manuscripts", tags=["manuscripts"])
settings = get_settings()

ALLOWED_EXTENSIONS = {"docx", "txt", "rtf", "pdf"}


class ManuscriptResponse(BaseModel):
    id: int
    title: str
    file_type: str
    word_count: int
    chapter_count: int
    status: str
    created_at: str

    class Config:
        from_attributes = True


class ManuscriptListResponse(BaseModel):
    manuscripts: list[ManuscriptResponse]
    total: int


@router.post("/upload", response_model=ManuscriptResponse, status_code=status.HTTP_201_CREATED)
async def upload_manuscript(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Supported: {', '.join('.' + e for e in ALLOWED_EXTENSIONS)}",
        )

    # Read file
    file_bytes = await file.read()

    # Check file size
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Parse manuscript
    try:
        parsed = parse_manuscript(file_bytes, ext)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse manuscript: {str(e)}")

    # Check word count limits by tier
    word_limit = (
        settings.FREE_TIER_WORD_LIMIT
        if current_user.tier == UserTier.FREE
        else settings.PRO_TIER_WORD_LIMIT
    )
    if parsed["word_count"] > word_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Manuscript exceeds {current_user.tier.value} tier word limit "
            f"({parsed['word_count']:,} words, limit: {word_limit:,}). "
            f"Upgrade to Pro for unlimited manuscripts.",
        )

    # Derive title from filename
    title = file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename

    # Create manuscript record
    manuscript = Manuscript(
        title=title,
        file_type=ext,
        word_count=parsed["word_count"],
        chapter_count=parsed["chapter_count"],
        status=ManuscriptStatus.READY,
        raw_text=parsed["raw_text"],
        chapters_json=json.dumps(parsed["chapters"]),
        owner_id=current_user.id,
    )
    db.add(manuscript)
    await db.flush()
    await db.refresh(manuscript)

    return ManuscriptResponse(
        id=manuscript.id,
        title=manuscript.title,
        file_type=manuscript.file_type,
        word_count=manuscript.word_count,
        chapter_count=manuscript.chapter_count,
        status=manuscript.status.value,
        created_at=manuscript.created_at.isoformat(),
    )


@router.get("/", response_model=ManuscriptListResponse)
async def list_manuscripts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Manuscript)
        .where(Manuscript.owner_id == current_user.id)
        .order_by(Manuscript.created_at.desc())
    )
    manuscripts = result.scalars().all()
    return ManuscriptListResponse(
        manuscripts=[
            ManuscriptResponse(
                id=m.id,
                title=m.title,
                file_type=m.file_type,
                word_count=m.word_count,
                chapter_count=m.chapter_count,
                status=m.status.value,
                created_at=m.created_at.isoformat(),
            )
            for m in manuscripts
        ],
        total=len(manuscripts),
    )


@router.get("/{manuscript_id}", response_model=ManuscriptResponse)
async def get_manuscript(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.owner_id == current_user.id,
        )
    )
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    return ManuscriptResponse(
        id=manuscript.id,
        title=manuscript.title,
        file_type=manuscript.file_type,
        word_count=manuscript.word_count,
        chapter_count=manuscript.chapter_count,
        status=manuscript.status.value,
        created_at=manuscript.created_at.isoformat(),
    )


@router.delete("/{manuscript_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manuscript(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.owner_id == current_user.id,
        )
    )
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    await db.delete(manuscript)
