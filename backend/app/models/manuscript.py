from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ManuscriptStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PARSING = "parsing"
    READY = "ready"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    ERROR = "error"


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)  # docx, txt, rtf, pdf
    word_count = Column(Integer, default=0)
    chapter_count = Column(Integer, default=0)
    status = Column(SQLEnum(ManuscriptStatus), default=ManuscriptStatus.UPLOADED)
    raw_text = Column(Text, nullable=True)
    chapters_json = Column(Text, nullable=True)  # JSON: list of {title, text, index}
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    genre = Column(String(100), nullable=True)
    author_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="manuscripts", foreign_keys=[owner_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    analyses = relationship("AnalysisResult", back_populates="manuscript", cascade="all, delete-orphan")
