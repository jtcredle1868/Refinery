"""Enterprise routes — org management, RBAC, annotations, decision workflow, webhook, batch actions."""
import csv
import io
import json
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserTier
from app.models.manuscript import Manuscript, ManuscriptStatus
from app.models.analysis import AnalysisResult, AnalysisStatus
from app.models.enterprise import (
    Organization, OrgMembership, EnterpriseRole,
    Annotation, ManuscriptDecision, DecisionStage, DecisionOutcome,
)
from app.services.manuscript_parser import parse_manuscript

router = APIRouter(prefix="/enterprise", tags=["enterprise"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _require_enterprise(user: User):
    if user.tier != UserTier.ENTERPRISE:
        raise HTTPException(status_code=403, detail="Enterprise tier required.")


async def _get_membership(user: User, db: AsyncSession) -> OrgMembership:
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user.id,
            OrgMembership.is_active == True,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=403, detail="No active organization membership.")
    return membership


async def _require_role(user: User, db: AsyncSession, min_roles: list[EnterpriseRole]) -> OrgMembership:
    membership = await _get_membership(user, db)
    if membership.role not in min_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Requires role: {', '.join(r.value for r in min_roles)}. Your role: {membership.role.value}",
        )
    return membership


# ---------------------------------------------------------------------------
# Organization Management
# ---------------------------------------------------------------------------

class CreateOrgRequest(BaseModel):
    name: str
    primary_contact_email: str | None = None


class AddSeatRequest(BaseModel):
    user_email: str
    role: str = "reader"


class UpdateSeatRequest(BaseModel):
    role: str


@router.post("/org")
async def create_organization(
    request: CreateOrgRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new enterprise organization."""
    await _require_enterprise(current_user)

    org = Organization(
        name=request.name,
        primary_contact_email=request.primary_contact_email or current_user.email,
        webhook_api_key=secrets.token_urlsafe(32),
    )
    db.add(org)
    await db.flush()
    await db.refresh(org)

    # Creator becomes admin
    membership = OrgMembership(
        user_id=current_user.id,
        org_id=org.id,
        role=EnterpriseRole.ADMIN,
    )
    db.add(membership)

    # Link user to org
    current_user.org_id = org.id
    db.add(current_user)

    return {
        "id": org.id,
        "name": org.name,
        "webhook_api_key": org.webhook_api_key,
        "primary_contact_email": org.primary_contact_email,
    }


@router.get("/org")
async def get_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's organization details."""
    await _require_enterprise(current_user)
    membership = await _get_membership(current_user, db)

    result = await db.execute(
        select(Organization).where(Organization.id == membership.org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get all members
    members_result = await db.execute(
        select(OrgMembership, User).join(User, OrgMembership.user_id == User.id).where(
            OrgMembership.org_id == org.id,
        )
    )
    members = [
        {
            "id": m.id,
            "user_id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": m.role.value,
            "is_active": m.is_active,
        }
        for m, u in members_result.all()
    ]

    return {
        "id": org.id,
        "name": org.name,
        "primary_contact_email": org.primary_contact_email,
        "webhook_api_key": org.webhook_api_key if membership.role == EnterpriseRole.ADMIN else None,
        "members": members,
        "your_role": membership.role.value,
    }


@router.post("/org/seats")
async def add_seat(
    request: AddSeatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a user to the organization (Admin only)."""
    await _require_enterprise(current_user)
    membership = await _require_role(current_user, db, [EnterpriseRole.ADMIN])

    # Find user by email
    result = await db.execute(select(User).where(User.email == request.user_email))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found. They must register first.")

    # Check not already a member
    existing = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == target_user.id,
            OrgMembership.org_id == membership.org_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member of this organization.")

    role = EnterpriseRole(request.role) if request.role in [r.value for r in EnterpriseRole] else EnterpriseRole.READER

    new_membership = OrgMembership(
        user_id=target_user.id,
        org_id=membership.org_id,
        role=role,
    )
    db.add(new_membership)

    # Update user's org_id and tier
    target_user.org_id = membership.org_id
    target_user.tier = UserTier.ENTERPRISE
    db.add(target_user)

    return {"message": f"Added {request.user_email} as {role.value}", "user_id": target_user.id}


@router.patch("/org/seats/{membership_id}")
async def update_seat(
    membership_id: int,
    request: UpdateSeatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's role (Admin only)."""
    await _require_enterprise(current_user)
    admin_membership = await _require_role(current_user, db, [EnterpriseRole.ADMIN])

    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.id == membership_id,
            OrgMembership.org_id == admin_membership.org_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Membership not found")

    target.role = EnterpriseRole(request.role)
    db.add(target)
    return {"message": f"Updated role to {request.role}"}


@router.delete("/org/seats/{membership_id}")
async def remove_seat(
    membership_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the organization (Admin only)."""
    await _require_enterprise(current_user)
    admin_membership = await _require_role(current_user, db, [EnterpriseRole.ADMIN])

    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.id == membership_id,
            OrgMembership.org_id == admin_membership.org_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Membership not found")

    target.is_active = False
    db.add(target)
    return {"message": "Member removed"}


@router.post("/org/regenerate-key")
async def regenerate_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the webhook API key (Admin only)."""
    await _require_enterprise(current_user)
    membership = await _require_role(current_user, db, [EnterpriseRole.ADMIN])

    result = await db.execute(
        select(Organization).where(Organization.id == membership.org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.webhook_api_key = secrets.token_urlsafe(32)
    db.add(org)
    return {"webhook_api_key": org.webhook_api_key}


# ---------------------------------------------------------------------------
# Annotations (Enterprise multi-editor)
# ---------------------------------------------------------------------------

class CreateAnnotationRequest(BaseModel):
    manuscript_id: int
    chapter_num: int | None = None
    location_hint: str | None = None
    content: str
    annotation_type: str = "comment"


class UpdateAnnotationRequest(BaseModel):
    content: str


@router.post("/annotations")
async def create_annotation(
    request: CreateAnnotationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an annotation to a manuscript."""
    await _require_enterprise(current_user)
    membership = await _get_membership(current_user, db)

    # Verify manuscript belongs to the org
    ms_result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == request.manuscript_id,
            Manuscript.org_id == membership.org_id,
        )
    )
    if not ms_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Manuscript not found in your organization")

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
async def list_annotations(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all annotations for a manuscript."""
    await _require_enterprise(current_user)
    membership = await _get_membership(current_user, db)

    # Verify org access
    ms_result = await db.execute(
        select(Manuscript).where(
            Manuscript.id == manuscript_id,
            Manuscript.org_id == membership.org_id,
        )
    )
    if not ms_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Manuscript not found in your organization")

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


@router.put("/annotations/{annotation_id}")
async def update_annotation(
    annotation_id: int,
    request: UpdateAnnotationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an annotation (own annotations only)."""
    result = await db.execute(
        select(Annotation).where(
            Annotation.id == annotation_id,
            Annotation.user_id == current_user.id,
        )
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found or not yours to edit")

    annotation.content = request.content
    db.add(annotation)
    return {"message": "Annotation updated", "id": annotation.id}


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an annotation (own annotations only)."""
    result = await db.execute(
        select(Annotation).where(
            Annotation.id == annotation_id,
            Annotation.user_id == current_user.id,
        )
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found or not yours to delete")

    await db.delete(annotation)
    return {"message": "Annotation deleted"}


# ---------------------------------------------------------------------------
# Decision Workflow
# ---------------------------------------------------------------------------

class AdvanceWorkflowRequest(BaseModel):
    manuscript_id: int
    notes: str = ""
    outcome: str | None = None  # Only for director stage


@router.get("/workflow/{manuscript_id}")
async def get_workflow(
    manuscript_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the decision workflow for a manuscript."""
    await _require_enterprise(current_user)
    membership = await _get_membership(current_user, db)

    result = await db.execute(
        select(ManuscriptDecision).where(
            ManuscriptDecision.manuscript_id == manuscript_id,
            ManuscriptDecision.org_id == membership.org_id,
        )
    )
    decision = result.scalar_one_or_none()
    if not decision:
        # Auto-create if doesn't exist
        decision = ManuscriptDecision(
            manuscript_id=manuscript_id,
            org_id=membership.org_id,
        )
        db.add(decision)
        await db.flush()
        await db.refresh(decision)

    assigned_name = None
    if decision.assigned_to_id:
        user_result = await db.execute(select(User).where(User.id == decision.assigned_to_id))
        assigned_user = user_result.scalar_one_or_none()
        if assigned_user:
            assigned_name = assigned_user.full_name or assigned_user.email

    return {
        "id": decision.id,
        "manuscript_id": decision.manuscript_id,
        "stage": decision.stage.value,
        "outcome": decision.outcome.value,
        "assigned_to_id": decision.assigned_to_id,
        "assigned_to_name": assigned_name,
        "reader_notes": decision.reader_notes,
        "editor_notes": decision.editor_notes,
        "director_notes": decision.director_notes,
        "updated_at": decision.updated_at.isoformat() if decision.updated_at else None,
    }


@router.post("/workflow/advance")
async def advance_workflow(
    request: AdvanceWorkflowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Advance the decision workflow to the next stage (role-gated)."""
    await _require_enterprise(current_user)
    membership = await _get_membership(current_user, db)

    result = await db.execute(
        select(ManuscriptDecision).where(
            ManuscriptDecision.manuscript_id == request.manuscript_id,
            ManuscriptDecision.org_id == membership.org_id,
        )
    )
    decision = result.scalar_one_or_none()
    if not decision:
        decision = ManuscriptDecision(
            manuscript_id=request.manuscript_id,
            org_id=membership.org_id,
        )
        db.add(decision)
        await db.flush()
        await db.refresh(decision)

    # Role-gated advancement
    role = membership.role

    if decision.stage == DecisionStage.UNREVIEWED:
        # Reader, Editor, or Director can advance from Unreviewed
        if role not in (EnterpriseRole.READER, EnterpriseRole.EDITOR, EnterpriseRole.DIRECTOR, EnterpriseRole.ADMIN):
            raise HTTPException(status_code=403, detail="Insufficient role to advance from Unreviewed")
        decision.stage = DecisionStage.READER_REVIEWED
        decision.reader_notes = request.notes

    elif decision.stage == DecisionStage.READER_REVIEWED:
        # Editor or Director can advance from Reader Reviewed
        if role not in (EnterpriseRole.EDITOR, EnterpriseRole.DIRECTOR, EnterpriseRole.ADMIN):
            raise HTTPException(status_code=403, detail="Editor or Director role required to advance from Reader Reviewed")
        decision.stage = DecisionStage.EDITOR_RECOMMENDED
        decision.editor_notes = request.notes

    elif decision.stage == DecisionStage.EDITOR_RECOMMENDED:
        # Director only can make final decision
        if role not in (EnterpriseRole.DIRECTOR, EnterpriseRole.ADMIN):
            raise HTTPException(status_code=403, detail="Director role required for final decision")
        decision.stage = DecisionStage.DIRECTOR_DECISION
        decision.director_notes = request.notes
        if request.outcome:
            decision.outcome = DecisionOutcome(request.outcome)

    elif decision.stage == DecisionStage.DIRECTOR_DECISION:
        raise HTTPException(status_code=400, detail="Workflow already at final stage")

    db.add(decision)
    await db.flush()
    await db.refresh(decision)

    return {
        "message": f"Workflow advanced to {decision.stage.value}",
        "stage": decision.stage.value,
        "outcome": decision.outcome.value,
    }


# ---------------------------------------------------------------------------
# Webhook Receiver (Submission Intake)
# ---------------------------------------------------------------------------

@router.post("/webhook/submission")
async def webhook_submission(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    """Receive manuscript submission via webhook (API key auth)."""
    # Validate API key
    result = await db.execute(
        select(Organization).where(Organization.webhook_api_key == x_api_key)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Parse the request body
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if not file:
            raise HTTPException(status_code=400, detail="No file provided in form data")

        title = form.get("title", file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename)
        author_name = form.get("author_name", "Unknown")
        genre = form.get("genre", "")

        file_bytes = await file.read()
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ("docx", "txt", "pdf", "rtf"):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

        try:
            parsed = parse_manuscript(file_bytes, ext)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse manuscript: {str(e)}")

        # Find org admin as owner
        admin_result = await db.execute(
            select(OrgMembership).where(
                OrgMembership.org_id == org.id,
                OrgMembership.role == EnterpriseRole.ADMIN,
                OrgMembership.is_active == True,
            )
        )
        admin_member = admin_result.scalars().first()
        if not admin_member:
            raise HTTPException(status_code=500, detail="Organization has no admin user")

        manuscript = Manuscript(
            title=title,
            file_type=ext,
            word_count=parsed["word_count"],
            chapter_count=parsed["chapter_count"],
            status=ManuscriptStatus.READY,
            raw_text=parsed["raw_text"],
            chapters_json=json.dumps(parsed["chapters"]),
            owner_id=admin_member.user_id,
            org_id=org.id,
            author_name=author_name,
            genre=genre,
        )
        db.add(manuscript)
        await db.flush()
        await db.refresh(manuscript)

        return {
            "success": True,
            "manuscript_id": manuscript.id,
            "title": manuscript.title,
            "word_count": manuscript.word_count,
            "chapter_count": manuscript.chapter_count,
        }

    else:
        # JSON metadata-only submission (file URL or text)
        body = await request.json()
        title = body.get("title", "Untitled Submission")
        author_name = body.get("author_name", "Unknown")
        genre = body.get("genre", "")
        raw_text = body.get("text", "")

        if not raw_text:
            raise HTTPException(status_code=400, detail="Either file upload or 'text' field required")

        word_count = len(raw_text.split())

        admin_result = await db.execute(
            select(OrgMembership).where(
                OrgMembership.org_id == org.id,
                OrgMembership.role == EnterpriseRole.ADMIN,
                OrgMembership.is_active == True,
            )
        )
        admin_member = admin_result.scalars().first()
        if not admin_member:
            raise HTTPException(status_code=500, detail="Organization has no admin user")

        manuscript = Manuscript(
            title=title,
            file_type="txt",
            word_count=word_count,
            chapter_count=1,
            status=ManuscriptStatus.READY,
            raw_text=raw_text,
            chapters_json=json.dumps([{"title": "Full Text", "text": raw_text, "index": 0}]),
            owner_id=admin_member.user_id,
            org_id=org.id,
            author_name=author_name,
            genre=genre,
        )
        db.add(manuscript)
        await db.flush()
        await db.refresh(manuscript)

        return {
            "success": True,
            "manuscript_id": manuscript.id,
            "title": manuscript.title,
            "word_count": manuscript.word_count,
        }


# ---------------------------------------------------------------------------
# Batch Actions
# ---------------------------------------------------------------------------

class BatchAssignRequest(BaseModel):
    manuscript_ids: list[int]
    assign_to_email: str


class BatchPassRequest(BaseModel):
    manuscript_ids: list[int]


class BatchExportRequest(BaseModel):
    manuscript_ids: list[int]


@router.post("/batch/assign")
async def batch_assign(
    request: BatchAssignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign multiple manuscripts to an editor."""
    await _require_enterprise(current_user)
    membership = await _require_role(
        current_user, db,
        [EnterpriseRole.EDITOR, EnterpriseRole.DIRECTOR, EnterpriseRole.ADMIN],
    )

    # Find assignee
    result = await db.execute(select(User).where(User.email == request.assign_to_email))
    assignee = result.scalar_one_or_none()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")

    updated = 0
    for ms_id in request.manuscript_ids:
        ms_result = await db.execute(
            select(Manuscript).where(
                Manuscript.id == ms_id,
                Manuscript.org_id == membership.org_id,
            )
        )
        manuscript = ms_result.scalar_one_or_none()
        if manuscript:
            manuscript.assigned_to_id = assignee.id
            db.add(manuscript)
            updated += 1

    return {"message": f"Assigned {updated} manuscripts to {request.assign_to_email}"}


@router.post("/batch/pass")
async def batch_pass(
    request: BatchPassRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark multiple manuscripts as Pass."""
    await _require_enterprise(current_user)
    membership = await _require_role(
        current_user, db,
        [EnterpriseRole.EDITOR, EnterpriseRole.DIRECTOR, EnterpriseRole.ADMIN],
    )

    updated = 0
    for ms_id in request.manuscript_ids:
        # Get or create decision
        result = await db.execute(
            select(ManuscriptDecision).where(
                ManuscriptDecision.manuscript_id == ms_id,
                ManuscriptDecision.org_id == membership.org_id,
            )
        )
        decision = result.scalar_one_or_none()
        if not decision:
            decision = ManuscriptDecision(
                manuscript_id=ms_id,
                org_id=membership.org_id,
            )
            db.add(decision)

        decision.outcome = DecisionOutcome.PASS
        decision.stage = DecisionStage.DIRECTOR_DECISION
        db.add(decision)
        updated += 1

    return {"message": f"Marked {updated} manuscripts as Pass"}


@router.post("/batch/export-csv")
async def batch_export_csv(
    request: BatchExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export selected manuscripts to CSV."""
    await _require_enterprise(current_user)
    membership = await _get_membership(current_user, db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Manuscript ID", "Title", "Author", "Genre", "Word Count",
        "Chapter Count", "Acquisition Score", "Tier", "Status", "Assigned To",
    ])

    for ms_id in request.manuscript_ids:
        ms_result = await db.execute(
            select(Manuscript).where(
                Manuscript.id == ms_id,
                Manuscript.org_id == membership.org_id,
            )
        )
        manuscript = ms_result.scalar_one_or_none()
        if not manuscript:
            continue

        # Get acquisition score
        acq_result = await db.execute(
            select(AnalysisResult).where(
                AnalysisResult.manuscript_id == ms_id,
                AnalysisResult.analysis_type == "acquisition_score",
                AnalysisResult.status == AnalysisStatus.COMPLETED,
            )
        )
        acq = acq_result.scalar_one_or_none()
        score = round(acq.score_overall) if acq and acq.score_overall else ""
        tier = ""
        if score:
            if score >= 80: tier = "Strong Consider"
            elif score >= 60: tier = "Consider"
            elif score >= 40: tier = "Maybe"
            else: tier = "Pass"

        # Get assigned user
        assigned_name = ""
        if manuscript.assigned_to_id:
            user_result = await db.execute(select(User).where(User.id == manuscript.assigned_to_id))
            assigned_user = user_result.scalar_one_or_none()
            if assigned_user:
                assigned_name = assigned_user.full_name or assigned_user.email

        writer.writerow([
            manuscript.id, manuscript.title, manuscript.author_name or "",
            manuscript.genre or "", manuscript.word_count, manuscript.chapter_count,
            score, tier, manuscript.status.value, assigned_name,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=manuscripts_export.csv"},
    )
