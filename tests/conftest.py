import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.database import Base, get_db
from src.main import app
from src.models import Hotel, HotelAmenity, Room, RoomStatus, RoomType

_TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@postgres:5432/bakoda_test",
)


@pytest.fixture(scope="session")
def pg_container():
    if os.getenv("TEST_DATABASE_URL"):
        yield None
        return
    from testcontainers.postgres import PostgresContainer
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest_asyncio.fixture(scope="session")
async def db_engine(pg_container):
    url = _TEST_DB_URL if pg_container is None else pg_container.get_connection_url().replace("psycopg2", "asyncpg")
    engine = create_async_engine(url, echo=False, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
def session_factory(db_engine):
    return async_sessionmaker(db_engine, expire_on_commit=False)


@pytest_asyncio.fixture()
async def db_session(session_factory):
    """Her test için temiz, bağımsız session."""
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture()
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def sample_hotel(session_factory) -> Hotel:
    async with session_factory() as session:
        hotel = Hotel(
            name="Test Hotel",
            city="İstanbul",
            district="Beşiktaş",
            stars=4,
            rating=4.2,
            reviews_count=100,
            price_per_night=500.0,
        )
        session.add(hotel)
        await session.commit()
        await session.refresh(hotel)
        return hotel


@pytest_asyncio.fixture()
async def sample_room(session_factory, sample_hotel: Hotel) -> Room:
    async with session_factory() as session:
        room = Room(
            hotel_id=sample_hotel.id,
            room_number=f"T{uuid.uuid4().hex[:6].upper()}",
            type=RoomType.double,
            capacity=2,
            price_per_night=150.0,
            status=RoomStatus.available,
        )
        session.add(room)
        await session.commit()
        await session.refresh(room)
        return room


@pytest_asyncio.fixture()
async def auth_client(client: AsyncClient):
    """Token'lı client döner. (client, headers) tuple."""
    resp = await client.post("/api/auth/register", json={
        "email": "fixture_user@bakoda.com",
        "password": "Test1234!",
        "first_name": "Fixture",
        "last_name": "User",
    })
    if resp.status_code == 409:
        resp = await client.post("/api/auth/login", json={
            "email": "fixture_user@bakoda.com",
            "password": "Test1234!",
        })
    token = resp.json()["access_token"]
    return client, {"Authorization": f"Bearer {token}"}
