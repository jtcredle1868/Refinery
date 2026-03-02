import datetime
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum

from app.database import Base
from sqlalchemy.orm import relationship


class AnalysisModule(str, enum.Enum):
    MANUSCRIPT_INTELLIGENCE = "manuscript_intelligence"
    VOICE_ISOLATION = "voice_isolation"
    PACING_ARCHITECT = "pacing_architect"
    CHARACTER_ARC = "character_arc"
    PROSE_REFINERY = "prose_refinery"
    REVISION_COMMAND = "revision_command"


class Severity(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class EditItemStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_id = Column(Integer, ForeignKey("manuscripts.id"), nullable=False)
    module = Column(SQLEnum(AnalysisModule), nullable=False)
    result_json = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    manuscript = relationship("Manuscript", back_populates="analysis_results")


class EditQueueItem(Base):
    __tablename__ = "edit_queue_items"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_id = Column(Integer, ForeignKey("manuscripts.id"), nullable=False)
    module = Column(SQLEnum(AnalysisModule), nullable=False)
    severity = Column(SQLEnum(Severity), nullable=False)
    chapter = Column(String, nullable=True)
    location = Column(String, nullable=True)
    finding = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=False)
    context = Column(Text, nullable=True)
    status = Column(SQLEnum(EditItemStatus), default=EditItemStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    manuscript = relationship("Manuscript", back_populates="edit_queue_items")
