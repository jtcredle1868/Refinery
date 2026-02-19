"""Advisor routes — student management, annotations, progress tracking."""
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
from app.models.analysis import AnalysisResult, AnalysisStatus
from app.models.enterprise import AdvisorAssignment, InvitationCode, Annotation

router = APIRouter(prefix="/advisor", tags=["advisor"])


async def _require_advisor(user: User):
    if user.tier not in (UserTier.ADVISOR, UserTier.ACADEMIC):
        raise HTTPException(status_code=403, detail="Advisor or Academic tier required.")


# ---------------------------------------------------------------------------
# Invitation Codes
# ---------------------------------------------------------------------------

@router.post("/invite")
async def create_invite_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an invitation code for a student."""
    if current_user.tier != UserTier.ADVISOR:
        raise HTTPException(status_code=403, detail="Advisor tier required to generate invite codes.")

    code = InvitationCode(
        creator_id=current_user.id,
        purpose="advisor_student",
    )
    db.add(code)
    await db.flush()
    await db.refresh(code)

    return {
        "code": code.code,
        "id": code.id,
        "expires_at": code.expires_at,
    }


@router.post("/redeem")
async def redeem_invite_code(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Redeem an advisor invitation code to link student to advisor."""
    result = await db.execute(
        select(InvitationCode).where(
            InvitationCode.code == code,
            InvitationCode.is_used == False,
            InvitationCode.purpose == "advisor_student",
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or already used invitation code.")

    if invitation.expires_at and invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation code has expired.")

    # Check if already linked
    existing = await db.execute(
        select(AdvisorAssignment).where(
            AdvisorAssignment.advisor_user_id == invitation.creator_id,
            AdvisorAssignment.student_user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already linked to this advisor.")

    # Create assignment
    assignment = AdvisorAssignment(
        advisor_user_id=invitation.creator_id,
        student_user_id=current_user.id,
    )
    db.add(assignment)

    # Mark code as used
    invitation.is_used = True
    invitation.used_by_id = current_user.id
    db.add(invitation)

    return {
        "message": "Successfully linked to advisor.",
        "advisor_id": invitation.creator_id,
    }


# ---------------------------------------------------------------------------
# Student Roster
# ---------------------------------------------------------------------------

class StudentInfo(BaseModel):
    user_id: int
    email: str
    full_name: str | None
    manuscript_count: int
    latest_manuscript: dict | None


@router.get("/students")
async def list_students(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all students linked to this advisor."""
    if current_user.tier != UserTier.ADVISOR:
        raise HTTPException(status_code=403, detail="Advisor tier required.")

    result = await db.execute(
        select(AdvisorAssignment).where(
            AdvisorAssignment.advisor_user_id == current_user.id,
        )
    )
    assignments = result.scalars().all()

    students = []
    for a in assignments:
        user_result = await db.execute(select(User).where(User.id == a.student_user_id))
        student = user_result.scalar_one_or_none()
        if not student:
            continue

        ms_result = await db.execute(
            select(Manuscript)
            .where(Manuscript.owner_id == student.id)
            .order_by(Manuscript.created_at.desc())
        )
        manuscripts = ms_result.scalars().all()

        latest = None
        if manuscripts:
            m = manuscripts[0]
            latest = {
                "id": m.id,
                "title": m.title,
                "word_count": m.word_count,
                "chapter_count": m.chapter_count,
                "status": m.status.value,
                "created_at": m.created_at.isoformat(),
            }

        students.append({
            "user_id": student.id,
            "email": student.email,
            "full_name": student.full_name,
            "manuscript_count": len(manuscripts),
            "latest_manuscript": latest,
        })

    return {"students": students, "total": len(students)}


@router.get("/students/{student_id}/manuscripts")
async def list_student_manuscripts(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all manuscripts for a supervised student (read-only)."""
    if current_user.tier != UserTier.ADVISOR:
        raise HTTPException(status_code=403, detail="Advisor tier required.")

    # Verify advisor-student link
    result = await db.execute(
        select(AdvisorAssignment).where(
            AdvisorAssignment.advisor_user_id == current_user.id,
            AdvisorAssignment.student_user_id == student_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not supervising this student.")

    ms_result = await db.execute(
        select(Manuscript)
        .where(Manuscript.owner_id == student_id)
        .order_by(Manuscript.created_at.desc())
    )
    manuscripts = ms_result.scalars().all()

    return {
        "manuscripts": [
            {
                "id": m.id,
                "title": m.title,
                "word_count": m.word_count,
                "chapter_count": m.chapter_count,
                "status": m.status.value,
                "created_at": m.created_at.isoformat(),
            }
            for m in manuscripts
        ],
        "total": len(manuscripts),
    }


# ---------------------------------------------------------------------------
# Advisor Annotations (on student manuscripts)
# ---------------------------------------------------------------------------

class AdvisorAnnotationRequest(BaseModel):
    manuscript_id: int
    chapter_num: int | None = None
    location_hint: str | None = None
    content: str
    annotation_type: str = "comment"


@router.post("/annotations")
async def create_advisor_annotation(
    request: AdvisorAnnotationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an annotation to a student's manuscript."""
    if current_user.tier != UserTier.ADVISOR:
        raise HTTPException(status_code=403, detail="Advisor tier required.")

    # Verify the manuscript belongs to a supervised student
    ms_result = await db.execute(
        select(Manuscript).where(Manuscript.id == request.manuscript_id)
    )
    manuscript = ms_result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    # Check advisor link (or own manuscript)
    if manuscript.owner_id != current_user.id:
        link = await db.execute(
            select(AdvisorAssignment).where(
                AdvisorAssignment.advisor_user_id == current_user.id,
                AdvisorAssignment.student_user_id == manuscript.owner_id,
            )
        )
        if not link.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not supervising this student.")

    annotation = Annotation(
        manuscript_id=request.manuscript_id,
        user_id=current_user.id,
        chapter_num=request.chapter_num,
        location_hint=request.location_hint,
        content=request.content,
        annotation_type=request.annotation_type,
    )
    db.add(annotation)
    await db.flush()
    await db.refresh(annotation)

    return {
        "id": annotation.id,
        "manuscript_id": annotation.manuscript_id,
        "user_id": annotation.user_id,
        "user_name": current_user.full_name or current_user.email,
        "chapter_num": annotation.chapter_num,
        "location_hint": annotation.location_hint,
        "content": annotation.content,
        "annotation_type": annotation.annotation_type,
        "created_at": annotation.created_at.isoformat(),
    }


@router.get("/annotations/{manuscript_id}")
async def list_advisor_annotations(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all advisor annotations for a manuscript."""
    await _require_advisor(current_user)

    # Verify access (own manuscript or supervised student)
    ms_result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id)
    )
    manuscript = ms_result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if manuscript.owner_id != current_user.id:
        link = await db.execute(
            select(AdvisorAssignment).where(
                AdvisorAssignment.advisor_user_id == current_user.id,
                AdvisorAssignment.student_user_id == manuscript.owner_id,
            )
        )
        if not link.scalar_one_or_none():
            # Also check if student looking at own manuscript with advisor annotations
            student_link = await db.execute(
                select(AdvisorAssignment).where(
                    AdvisorAssignment.student_user_id == current_user.id,
                )
            )
            if not student_link.scalar_one_or_none():
                raise HTTPException(status_code=403, detail="No access to this manuscript.")

    result = await db.execute(
        select(Annotation, User)
        .join(User, Annotation.user_id == User.id)
        .where(Annotation.manuscript_id == manuscript_id)
        .order_by(Annotation.created_at.asc())
    )
    return [
        {
            "id": a.id,
            "manuscript_id": a.manuscript_id,
            "user_id": a.user_id,
            "user_name": u.full_name or u.email,
            "chapter_num": a.chapter_num,
            "location_hint": a.location_hint,
            "content": a.content,
            "annotation_type": a.annotation_type,
            "created_at": a.created_at.isoformat(),
        }
        for a, u in result.all()
    ]


# ---------------------------------------------------------------------------
# Progress Tracking (score over time)
# ---------------------------------------------------------------------------

@router.get("/progress/{manuscript_id}")
async def get_progress_tracking(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get analysis score history over time for a manuscript."""
    await _require_advisor(current_user)

    # Verify access
    ms_result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id)
    )
    manuscript = ms_result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    # Check ownership or supervision
    if manuscript.owner_id != current_user.id:
        link = await db.execute(
            select(AdvisorAssignment).where(
                AdvisorAssignment.advisor_user_id == current_user.id,
                AdvisorAssignment.student_user_id == manuscript.owner_id,
            )
        )
        if not link.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="No access to this manuscript.")

    # Get all completed analyses sorted by time
    result = await db.execute(
        select(AnalysisResult)
        .where(
            AnalysisResult.manuscript_id == manuscript_id,
            AnalysisResult.status == AnalysisStatus.COMPLETED,
        )
        .order_by(AnalysisResult.created_at.asc())
    )
    analyses = result.scalars().all()

    # Build timeline from xray / intelligence_engine runs
    timeline = []
    for a in analyses:
        if a.analysis_type.value in ("xray", "intelligence_engine"):
            timeline.append({
                "date": a.created_at.isoformat(),
                "overall": a.score_overall,
                "structure": a.score_structure,
                "voice": a.score_voice,
                "pacing": a.score_pacing,
                "character": a.score_character,
                "prose": a.score_prose,
            })

    # Also gather individual module scores over time
    module_scores = {}
    for a in analyses:
        module = a.analysis_type.value
        score = (
            a.score_overall or a.score_structure or a.score_voice
            or a.score_pacing or a.score_character or a.score_prose
        )
        if score is not None:
            if module not in module_scores:
                module_scores[module] = []
            module_scores[module].append({
                "date": a.created_at.isoformat(),
                "score": score,
            })

    return {
        "manuscript_id": manuscript_id,
        "manuscript_title": manuscript.title,
        "timeline": timeline,
        "module_scores": module_scores,
    }
