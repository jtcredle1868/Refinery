import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Refinery API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./refinery.db"

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "refinery-dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    EXPORT_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exports")
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: set = {".docx", ".pdf", ".txt", ".rtf"}

    class Config:
        env_file = ".env"


settings = Settings()
