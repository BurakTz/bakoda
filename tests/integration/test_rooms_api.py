import pytest
from httpx import AsyncClient

from src.models import Room, RoomStatus, RoomType
from tests.factories import RoomFactory


@pytest.fixture()
async def extra_room(session_factory, sample_hotel) -> Room:
    async with session_factory() as session:
        room = RoomFactory(
            hotel_id=sample_hotel.id,
            type=RoomType.single,
            capacity=1,
            price_per_night=80.0,
            status=RoomStatus.available,
        )
        session.add(room)
        await session.commit()
        await session.refresh(room)
        return room


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_list_rooms_returns_ok(client: AsyncClient):
    resp = await client.get("/api/rooms")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_rooms_returns_available(client: AsyncClient, extra_room: Room):
    resp = await client.get("/api/rooms")
    assert resp.status_code == 200
    numbers = [r["room_number"] for r in resp.json()]
    assert extra_room.room_number in numbers


@pytest.mark.asyncio
async def test_get_room_not_found(client: AsyncClient):
    resp = await client.get("/api/rooms/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_room_found(client: AsyncClient, sample_room: Room):
    resp = await client.get(f"/api/rooms/{sample_room.id}")
    assert resp.status_code == 200
    assert resp.json()["room_number"] == sample_room.room_number


@pytest.mark.asyncio
async def test_list_rooms_bad_date_params(client: AsyncClient):
    resp = await client.get("/api/rooms?check_in=2026-07-01")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_rooms_with_availability_filter(client: AsyncClient, extra_room: Room):
    resp = await client.get("/api/rooms?check_in=2027-01-01&check_out=2027-01-05")
    assert resp.status_code == 200
    assert any(r["room_number"] == extra_room.room_number for r in resp.json())


@pytest.mark.asyncio
async def test_factory_batch_rooms_appear_in_listing(
    client: AsyncClient, session_factory, sample_hotel
):
    """Faker ile üretilmiş bir oda partisinin tamamı oda listesinde görünür."""
    async with session_factory() as session:
        rooms = RoomFactory.build_batch(
            4, hotel_id=sample_hotel.id, status=RoomStatus.available
        )
        session.add_all(rooms)
        await session.commit()
        created_numbers = {r.room_number for r in rooms}

    resp = await client.get("/api/rooms")
    assert resp.status_code == 200
    listed_numbers = {r["room_number"] for r in resp.json()}
    assert created_numbers.issubset(listed_numbers)
