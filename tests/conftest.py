import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.auth.service import create_initial_admin


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def require_db():
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            await create_initial_admin(db)
    except Exception as exc:
        pytest.skip(f"PostgreSQL test database is not available or migrated: {exc}")
