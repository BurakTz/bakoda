import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Room, RoomStatus, RoomType


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_list_rooms_empty(client: AsyncClient):
    resp = await client.get("/rooms")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_rooms_returns_available(client: AsyncClient, db_session: AsyncSession):
    room = Room(room_number="201", type=RoomType.single, capacity=1, price_per_night=80.0, status=RoomStatus.available)
    db_session.add(room)
    await db_session.commit()

    resp = await client.get("/rooms")
    assert resp.status_code == 200
    numbers = [r["room_number"] for r in resp.json()]
    assert "201" in numbers


@pytest.mark.asyncio
async def test_get_room_not_found(client: AsyncClient):
    resp = await client.get("/rooms/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_room_found(client: AsyncClient, sample_room: Room):
    resp = await client.get(f"/rooms/{sample_room.id}")
    assert resp.status_code == 200
    assert resp.json()["room_number"] == sample_room.room_number


@pytest.mark.asyncio
async def test_list_rooms_bad_date_params(client: AsyncClient):
    resp = await client.get("/rooms?check_in=2026-07-01")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_rooms_with_availability_filter(client: AsyncClient, db_session: AsyncSession):
    room = Room(room_number="302", type=RoomType.double, capacity=2, price_per_night=120.0, status=RoomStatus.available)
    db_session.add(room)
    await db_session.commit()

    resp = await client.get("/rooms?check_in=2026-08-01&check_out=2026-08-05")
    assert resp.status_code == 200
    assert any(r["room_number"] == "302" for r in resp.json())
