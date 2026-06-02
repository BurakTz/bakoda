from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.models import Booking, BookingStatus, Room, RoomStatus, RoomType
from src.services.room_service import (
    count_available_rooms,
    count_available_rooms_by_hotels,
    get_room,
    list_available_hotel_rooms,
    overlapping_booked_room_ids_subquery,
)


def test_overlapping_subquery_is_scalar_subquery():
    subq = overlapping_booked_room_ids_subquery(date(2026, 7, 1), date(2026, 7, 5))
    assert subq is not None


@pytest.mark.asyncio
async def test_count_available_rooms_by_hotels_empty_list():
    db = AsyncMock()
    result = await count_available_rooms_by_hotels(db, [], date(2026, 7, 1), date(2026, 7, 3))
    assert result == {}
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_count_available_rooms_returns_scalar():
    db = AsyncMock()
    row = MagicMock()
    row.scalar_one.return_value = 4
    db.execute.return_value = row

    count = await count_available_rooms(
        db, hotel_id=1, check_in=date(2026, 8, 1), check_out=date(2026, 8, 4)
    )

    assert count == 4


@pytest.mark.asyncio
async def test_count_available_rooms_by_hotels_maps_hotel_ids():
    db = AsyncMock()
    row = MagicMock()
    row.all.return_value = [(1, 2), (3, 1)]
    db.execute.return_value = row

    counts = await count_available_rooms_by_hotels(
        db, [1, 3], check_in=date(2026, 9, 1), check_out=date(2026, 9, 3)
    )

    assert counts == {1: 2, 3: 1}


@pytest.mark.asyncio
async def test_list_available_hotel_rooms_with_guests_filter():
    room = Room(
        id=5,
        hotel_id=2,
        room_number="G1",
        type=RoomType.double,
        capacity=3,
        price_per_night=150.0,
        status=RoomStatus.available,
    )
    result = MagicMock()
    result.scalars.return_value.all.return_value = [room]
    db = AsyncMock()
    db.execute.return_value = result

    rooms = await list_available_hotel_rooms(
        db, hotel_id=2, check_in=date(2026, 10, 1), check_out=date(2026, 10, 3), guests=3
    )

    assert len(rooms) == 1
    assert rooms[0].capacity >= 3


@pytest.mark.asyncio
async def test_get_room_not_found():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db = AsyncMock()
    db.execute.return_value = result

    room = await get_room(db, 99999)

    assert room is None


@pytest.mark.asyncio
async def test_list_available_excludes_overlapping_booking(db_session):
    from src.services.room_service import list_rooms

    room = Room(
        hotel_id=1,
        room_number="X1",
        type=RoomType.double,
        capacity=2,
        price_per_night=100.0,
        status=RoomStatus.available,
    )
    db_session.add(room)
    await db_session.flush()

    booking = Booking(
        room_id=room.id,
        guest_name="Blocker",
        guest_email="b@example.com",
        check_in=date(2027, 6, 10),
        check_out=date(2027, 6, 15),
        total_price=500.0,
        status=BookingStatus.confirmed,
    )
    db_session.add(booking)
    await db_session.commit()

    available = await list_rooms(
        db_session, check_in=date(2027, 6, 12), check_out=date(2027, 6, 13)
    )

    assert all(r.id != room.id for r in available)
