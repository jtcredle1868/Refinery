from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Refinery"
    APP_VERSION: str = "1.0.0-alpha"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://refinery:refinery@localhost:5432/refinery"
    DATABASE_SYNC_URL: str = "postgresql://refinery:refinery@localhost:5432/refinery"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        """Rewrite a plain postgresql:// URL (e.g. from Railway) to use asyncpg."""
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Authentication
    SECRET_KEY: str = "change-me-in-production-use-a-real-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Claude API
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-6"
    CLAUDE_MAX_TOKENS: int = 8192

    # Manuscript limits
    FREE_TIER_WORD_LIMIT: int = 50_000
    PRO_TIER_WORD_LIMIT: int = 200_000
    MAX_UPLOAD_SIZE_MB: int = 50

    # Stripe (scaffold — set these when you have a Stripe account)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    # CORS — comma-separated list of allowed origins
    # In production, set this to your Railway/Vercel frontend URL(s)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # DB connection pool (reduce for Railway hobby tier connection limits)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # Analysis
    ANALYSIS_TIMEOUT_SECONDS: int = 300  # 5 minutes max

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
