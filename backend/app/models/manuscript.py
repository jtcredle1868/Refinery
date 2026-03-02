import datetime
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship

from app.database import Base


class ManuscriptStatus(str, enum.Enum):
    PENDING = "PENDING"
    EXTRACTING = "EXTRACTING"
    ANALYZING = "ANALYZING"
    COMPLETE = "COMPLETE"
    ERROR = "ERROR"


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    status = Column(SQLEnum(ManuscriptStatus), default=ManuscriptStatus.PENDING, nullable=False)
    word_count = Column(Integer, default=0)
    chapter_count = Column(Integer, default=0)
    extracted_text = Column(Text, nullable=True)
    chapters_json = Column(Text, nullable=True)  # JSON string of chapter data
    progress_percent = Column(Float, default=0.0)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_analyzed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="manuscripts")
    analysis_results = relationship("AnalysisResult", back_populates="manuscript", cascade="all, delete-orphan")
    edit_queue_items = relationship("EditQueueItem", back_populates="manuscript", cascade="all, delete-orphan")
