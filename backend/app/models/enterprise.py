"""Enterprise, Academic, and multi-tenancy models."""
from datetime import datetime, timezone
import secrets
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean,
    Enum as SQLEnum, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ---------------------------------------------------------------------------
# Enterprise Organization
# ---------------------------------------------------------------------------

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    primary_contact_email = Column(String(255), nullable=True)
    webhook_api_key = Column(String(128), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    members = relationship("OrgMembership", back_populates="organization", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Enterprise Roles & Membership
# ---------------------------------------------------------------------------

class EnterpriseRole(str, enum.Enum):
    READER = "reader"          # Can view + annotate; cannot make decisions
    EDITOR = "editor"          # Can view, annotate, move to Director
    DIRECTOR = "director"      # Acquisitions Director — final decision
    ADMIN = "admin"            # Org admin (billing, seats)


class OrgMembership(Base):
    __tablename__ = "org_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_user_org"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    role = Column(SQLEnum(EnterpriseRole), default=EnterpriseRole.READER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    organization = relationship("Organization", back_populates="members")


# ---------------------------------------------------------------------------
# Annotations (shared between Enterprise editors & Academic advisors)
# ---------------------------------------------------------------------------

class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_id = Column(Integer, ForeignKey("manuscripts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chapter_num = Column(Integer, nullable=True)
    location_hint = Column(String(500), nullable=True)  # text excerpt or char offset
    content = Column(Text, nullable=False)
    annotation_type = Column(String(50), default="comment")  # comment, suggestion, question
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User")
    manuscript = relationship("Manuscript")


# ---------------------------------------------------------------------------
# Decision Workflow (Enterprise acquisition pipeline)
# ---------------------------------------------------------------------------

class DecisionStage(str, enum.Enum):
    UNREVIEWED = "unreviewed"
    READER_REVIEWED = "reader_reviewed"
    EDITOR_RECOMMENDED = "editor_recommended"
    DIRECTOR_DECISION = "director_decision"


class DecisionOutcome(str, enum.Enum):
    PENDING = "pending"
    ACQUIRE = "acquire"
    CONSIDER = "consider"
    REVISE_RESUBMIT = "revise_resubmit"
    PASS = "pass"


class ManuscriptDecision(Base):
    __tablename__ = "manuscript_decisions"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_id = Column(Integer, ForeignKey("manuscripts.id"), nullable=False, unique=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    stage = Column(SQLEnum(DecisionStage), default=DecisionStage.UNREVIEWED, nullable=False)
    outcome = Column(SQLEnum(DecisionOutcome), default=DecisionOutcome.PENDING, nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reader_notes = Column(Text, nullable=True)
    editor_notes = Column(Text, nullable=True)
    director_notes = Column(Text, nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    manuscript = relationship("Manuscript")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


# ---------------------------------------------------------------------------
# Academic: Advisor-Student Assignments
# ---------------------------------------------------------------------------

class AdvisorAssignment(Base):
    __tablename__ = "advisor_assignments"
    __table_args__ = (
        UniqueConstraint("advisor_user_id", "student_user_id", name="uq_advisor_student"),
    )

    id = Column(Integer, primary_key=True, index=True)
    advisor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    advisor = relationship("User", foreign_keys=[advisor_user_id])
    student = relationship("User", foreign_keys=[student_user_id])


# ---------------------------------------------------------------------------
# Invitation Codes (for advisor-student linking)
# ---------------------------------------------------------------------------

class InvitationCode(Base):
    __tablename__ = "invitation_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False, default=lambda: secrets.token_hex(6))
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    purpose = Column(String(50), default="advisor_student")  # advisor_student, enterprise_invite
    is_used = Column(Boolean, default=False)
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[creator_id])
    used_by = relationship("User", foreign_keys=[used_by_id])
