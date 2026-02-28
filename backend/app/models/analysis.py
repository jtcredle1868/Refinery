from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class AnalysisType(str, enum.Enum):
    XRAY = "xray"  # Full manuscript X-ray diagnostic
    INTELLIGENCE_ENGINE = "intelligence_engine"  # Module 1
    VOICE_ISOLATION = "voice_isolation"  # Module 2
    PACING_ARCHITECT = "pacing_architect"  # Module 3
    CHARACTER_ARC = "character_arc"  # Module 4
    PROSE_REFINERY = "prose_refinery"  # Module 5
    REVISION_CENTER = "revision_center"  # Module 6
    ARGUMENT_COHERENCE = "argument_coherence"  # Module 7 (Academic)
    CITATION_ARCHITECTURE = "citation_architecture"  # Module 8 (Academic)
    ACADEMIC_VOICE = "academic_voice"  # Module 9 (Academic)
    ACQUISITION_SCORE = "acquisition_score"  # Module 11 (Enterprise)


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_id = Column(Integer, ForeignKey("manuscripts.id"), nullable=False)
    analysis_type = Column(SQLEnum(AnalysisType), nullable=False)
    status = Column(SQLEnum(AnalysisStatus), default=AnalysisStatus.PENDING)

    # Health scores (0-100)
    score_structure = Column(Float, nullable=True)
    score_voice = Column(Float, nullable=True)
    score_pacing = Column(Float, nullable=True)
    score_character = Column(Float, nullable=True)
    score_prose = Column(Float, nullable=True)
    score_overall = Column(Float, nullable=True)

    # Full analysis results stored as JSON
    results_json = Column(Text, nullable=True)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    manuscript = relationship("Manuscript", back_populates="analyses")
