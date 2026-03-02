import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserTier(str, enum.Enum):
    INDIE_FREE = "indie_free"
    INDIE_PRO = "indie_pro"
    ACADEMIC_STUDENT = "academic_student"
    ACADEMIC_ADVISOR = "academic_advisor"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    tier = Column(SQLEnum(UserTier), default=UserTier.INDIE_FREE, nullable=False)
    organization = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    manuscripts = relationship("Manuscript", back_populates="user")
