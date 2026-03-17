"""
conftest.py — shared fixtures for all Refinery backend tests.

Uses an in-memory SQLite database (via aiosqlite) so no running PostgreSQL
is required. The ClaudeClient is fully mocked to avoid real API calls.
"""
import os
import pytest
import pytest_asyncio

# Set env vars BEFORE any app modules are imported so settings are consistent.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["DATABASE_SYNC_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-only"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

# Build a SQLite engine BEFORE importing app modules that create the real engine.
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# Now import app modules — then swap out the engine they already created.
import app.core.database as _db_module  # noqa: E402

_db_module.engine = test_engine
_db_module.async_session = TestSessionLocal

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Yield a clean session for each test, rolled back afterwards."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """AsyncClient bound to the FastAPI app with DB dependency overridden."""
    from httpx import AsyncClient, ASGITransport

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
