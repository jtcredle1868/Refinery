"""
Refinery — Where Prose Becomes Perfect
Main FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.core.database import init_db
from app.api.routes import auth, manuscripts, analysis, reports, exports, enterprise, advisor, payments

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.ANTHROPIC_API_KEY:
        import warnings
        warnings.warn(
            "\n⚠️  ANTHROPIC_API_KEY is not set! "
            "Analysis features will fail. "
            "Add it to your .env file.\n",
            stacklevel=1,
        )
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered manuscript analysis and refinement platform. "
    "Full-document comprehension with craft-level analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(manuscripts.router, prefix=settings.API_PREFIX)
app.include_router(analysis.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(exports.router, prefix=settings.API_PREFIX)
app.include_router(enterprise.router, prefix=settings.API_PREFIX)
app.include_router(advisor.router, prefix=settings.API_PREFIX)
app.include_router(payments.router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "name": "Refinery",
        "tagline": "Where Prose Becomes Perfect",
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
