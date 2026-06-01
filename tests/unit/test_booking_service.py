from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.models import Booking, BookingStatus, Room, RoomStatus, RoomType
from src.services.booking_service import (
    BookingAlreadyCancelledError,
    BookingNotFoundError,
    RoomNotAvailableError,
    cancel_booking,
    create_booking,
    get_booking,
)


def _room(**kw) -> Room:
    r = Room()
    defaults = dict(id=1, room_number="101", type=RoomType.double, capacity=2, price_per_night=100.0, status=RoomStatus.available)
    defaults.update(kw)
    for k, v in defaults.items():
        setattr(r, k, v)
    return r


def _booking(**kw) -> Booking:
    b = Booking()
    defaults = dict(id=1, room_id=1, guest_name="Ali", guest_email="ali@x.com",
                    check_in=date(2026, 7, 1), check_out=date(2026, 7, 3),
                    total_price=200.0, status=BookingStatus.confirmed, confirmation_key=None)
    defaults.update(kw)
    for k, v in defaults.items():
        setattr(b, k, v)
    return b


def _db_returning(*rows):
    """Each row: value for scalar_one_or_none, or int for scalar_one (inventory count)."""
    mock_db = AsyncMock()
    results = []
    for row in rows:
        result = MagicMock()
        if isinstance(row, int):
            result.scalar_one.return_value = row
        else:
            result.scalar_one_or_none.return_value = row
        results.append(result)
    mock_db.execute.side_effect = results
    return mock_db


@pytest.mark.asyncio
async def test_create_booking_success():
    room = _room(hotel_id=10)
    db = _db_returning(room, None, 3)  # room, no date conflict, 3 rooms available at hotel
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    db.flush = AsyncMock()
    booking = await create_booking(db, 1, "Ali", "ali@x.com", date(2026, 7, 1), date(2026, 7, 3))
    db.add.assert_called_once()
    assert booking.total_price == 200.0


@pytest.mark.asyncio
async def test_create_booking_room_not_found():
    db = _db_returning(None)
    with pytest.raises(RoomNotAvailableError):
        await create_booking(db, 999, "Ali", "ali@x.com", date(2027, 7, 1), date(2027, 7, 3))


@pytest.mark.asyncio
async def test_create_booking_room_maintenance():
    room = _room(status=RoomStatus.maintenance)
    db = _db_returning(room)
    with pytest.raises(RoomNotAvailableError):
        await create_booking(db, 1, "Ali", "ali@x.com", date(2027, 8, 1), date(2027, 8, 3))


@pytest.mark.asyncio
async def test_create_booking_date_conflict():
    room = _room(hotel_id=10)
    existing = _booking()
    db = _db_returning(room, existing)  # room found, conflict found
    with pytest.raises(RoomNotAvailableError):
        await create_booking(db, 1, "Ali", "ali@x.com", date(2027, 9, 1), date(2027, 9, 3))


@pytest.mark.asyncio
async def test_create_booking_insufficient_hotel_inventory():
    room = _room(hotel_id=10)
    db = _db_returning(room, None, 1)
    with pytest.raises(RoomNotAvailableError):
        await create_booking(
            db, 1, "Ali", "ali@x.com", date(2027, 10, 1), date(2027, 10, 3), rooms_count=2
        )


@pytest.mark.asyncio
async def test_create_booking_multi_room_price():
    room = _room(hotel_id=10, price_per_night=100.0)
    db = _db_returning(room, None, 2)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()
    booking = await create_booking(
        db, 1, "Ali", "ali@x.com", date(2026, 7, 1), date(2026, 7, 3), rooms_count=2
    )
    assert booking.total_price == 400.0


@pytest.mark.asyncio
async def test_get_booking_found():
    b = _booking(id=5)
    db = _db_returning(b)
    result = await get_booking(db, 5)
    assert result is b


@pytest.mark.asyncio
async def test_get_booking_not_found():
    db = _db_returning(None)
    with pytest.raises(BookingNotFoundError):
        await get_booking(db, 999)


@pytest.mark.asyncio
async def test_cancel_booking_success():
    b = _booking(status=BookingStatus.confirmed)
    db = _db_returning(b)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    result = await cancel_booking(db, 1)
    assert result.status == BookingStatus.cancelled


@pytest.mark.asyncio
async def test_cancel_booking_already_cancelled():
    b = _booking(status=BookingStatus.cancelled)
    db = _db_returning(b)
    with pytest.raises(BookingAlreadyCancelledError):
        await cancel_booking(db, 1)
