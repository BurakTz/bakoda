from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.models import Booking, BookingStatus, Hotel, Room, RoomStatus, RoomType, User
from src.services.booking_service import (
    BookingNotFoundError,
    RoomNotAvailableError,
    _compute_total_price,
    _make_confirmation_code,
    _min_capacity_per_room,
    booking_to_list_out,
    create_booking,
    get_booking_detail,
    link_orphan_bookings_for_user,
    mark_booking_paid,
    user_owns_booking,
)


def test_make_confirmation_code_with_and_without_id():
    assert _make_confirmation_code(None) == "BKD-0000-2026"
    assert _make_confirmation_code(7) == "BKD-0007-2026"
    assert _make_confirmation_code(12345) == "BKD-12345-2026"


def test_compute_total_price_rounds_two_decimals():
    total = _compute_total_price(99.99, date(2026, 1, 1), date(2026, 1, 4), 2)
    assert total == round(99.99 * 3 * 2, 2)


@pytest.mark.parametrize(
    ("guests", "rooms", "expected"),
    [(1, 1, 1), (4, 2, 2), (5, 2, 3), (6, 3, 2)],
)
def test_min_capacity_per_room(guests, rooms, expected):
    assert _min_capacity_per_room(guests, rooms) == expected


def test_user_owns_booking_by_user_id():
    user = User(id=3, email="u@example.com")
    booking = Booking(user_id=3, guest_email="other@example.com")
    assert user_owns_booking(booking, user)


def test_user_owns_booking_by_matching_guest_email():
    user = User(id=1, email="Guest@Example.com")
    booking = Booking(user_id=None, guest_email="guest@example.com")
    assert user_owns_booking(booking, user)


def test_user_owns_booking_denied():
    user = User(id=1, email="a@example.com")
    booking = Booking(user_id=2, guest_email="b@example.com")
    assert not user_owns_booking(booking, user)


def test_booking_to_list_out_enriches_hotel_fields():
    hotel = Hotel(
        id=5, name="Test Hotel", city="İstanbul", district="Kadıköy", thumbnail="thumb.jpg"
    )
    room = Room(
        id=2,
        hotel_id=5,
        hotel=hotel,
        room_number="201",
        name="Deluxe",
        type=RoomType.double,
        capacity=2,
        price_per_night=200.0,
        status=RoomStatus.available,
    )
    booking = Booking(
        id=10,
        room_id=2,
        room=room,
        guest_name="Ali",
        guest_email="ali@x.com",
        check_in=date(2026, 6, 1),
        check_out=date(2026, 6, 3),
        guests=2,
        rooms_count=1,
        total_price=400.0,
        status=BookingStatus.confirmed,
        created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )

    out = booking_to_list_out(booking)

    assert out.hotel_name == "Test Hotel"
    assert out.hotel_city == "İstanbul, Kadıköy"
    assert out.hotel_id == 5
    assert out.hotel_thumbnail == "thumb.jpg"
    assert out.room_name == "Deluxe"


@pytest.mark.asyncio
async def test_create_booking_rejects_invalid_guest_or_room_counts():
    db = AsyncMock()
    with pytest.raises(RoomNotAvailableError, match="guests"):
        await create_booking(
            db, 1, "A", "a@x.com", date(2026, 7, 1), date(2026, 7, 3), guests=0
        )
    with pytest.raises(RoomNotAvailableError, match="rooms_count"):
        await create_booking(
            db, 1, "A", "a@x.com", date(2026, 7, 1), date(2026, 7, 3), rooms_count=0
        )


@pytest.mark.asyncio
async def test_create_booking_capacity_too_low():
    room = Room(
        id=1,
        hotel_id=10,
        room_number="101",
        type=RoomType.double,
        capacity=1,
        price_per_night=100.0,
        status=RoomStatus.available,
    )
    result = MagicMock()
    result.scalar_one_or_none.return_value = room
    db = AsyncMock()
    db.execute.return_value = result

    with pytest.raises(RoomNotAvailableError, match="capacity"):
        await create_booking(
            db, 1, "Ali", "ali@x.com", date(2026, 7, 1), date(2026, 7, 3), guests=4, rooms_count=1
        )


@pytest.mark.asyncio
async def test_create_booking_multiple_rooms_without_hotel_raises():
    room = Room(
        id=1,
        hotel_id=None,
        room_number="S1",
        type=RoomType.single,
        capacity=4,
        price_per_night=80.0,
        status=RoomStatus.available,
    )
    results = [MagicMock(), MagicMock(), MagicMock()]
    results[0].scalar_one_or_none.return_value = room
    results[1].scalar_one_or_none.return_value = None
    results[2].scalar_one.return_value = 1
    db = AsyncMock()
    db.execute.side_effect = results

    with pytest.raises(RoomNotAvailableError, match="Multiple rooms"):
        await create_booking(
            db, 1, "Ali", "ali@x.com", date(2026, 7, 1), date(2026, 7, 3), rooms_count=2
        )


@pytest.mark.asyncio
async def test_get_booking_detail_not_found():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db = AsyncMock()
    db.execute.return_value = result

    with pytest.raises(BookingNotFoundError):
        await get_booking_detail(db, 999)


@pytest.mark.asyncio
async def test_mark_booking_paid_sets_confirmed():
    booking = Booking(id=3, status=BookingStatus.cancelled)
    result = MagicMock()
    result.scalar_one_or_none.return_value = booking
    db = AsyncMock()
    db.execute.return_value = result
    db.flush = AsyncMock()

    updated = await mark_booking_paid(db, 3)

    assert updated.status == BookingStatus.confirmed
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_link_orphan_bookings_for_user():
    user = User(id=5, email="orphan@example.com")
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()

    await link_orphan_bookings_for_user(db, user)

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
