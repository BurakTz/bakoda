from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import BookingStatus, RoomStatus, RoomType
from src.services.booking_service import BookingNotFoundError
from src.services.user_service import (
    add_favorite,
    get_favorites,
    get_user_booking,
    get_user_bookings,
    remove_favorite,
    update_user,
)
from tests.factories import BookingFactory, HotelFactory, RoomFactory, UserFactory


@pytest.mark.asyncio
async def test_get_user_bookings_returns_empty_for_missing_user():
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)

    rows = await get_user_bookings(db, user_id=999)

    assert rows == []


@pytest.mark.asyncio
async def test_get_user_bookings_upcoming_filter(db_session: AsyncSession):
    user = UserFactory(email="upcoming@example.com", first_name="Up", last_name="Coming")
    hotel = HotelFactory(
        name="Up Hotel",
        city="İstanbul",
        district="Merkez",
        stars=4,
        rating=8.0,
        reviews_count=1,
        price_per_night=300.0,
    )
    db_session.add_all([user, hotel])
    await db_session.flush()

    room = RoomFactory(
        hotel_id=hotel.id,
        type=RoomType.double,
        capacity=2,
        price_per_night=300.0,
        status=RoomStatus.available,
    )
    db_session.add(room)
    await db_session.flush()

    today = datetime.now(timezone.utc).date()
    upcoming = BookingFactory(
        user_id=user.id,
        room_id=room.id,
        guest_name="Up Coming",
        guest_email=user.email,
        check_in=today + timedelta(days=10),
        check_out=today + timedelta(days=12),
        total_price=600.0,
        status=BookingStatus.confirmed,
    )
    past = BookingFactory(
        user_id=user.id,
        room_id=room.id,
        guest_name="Past",
        guest_email=user.email,
        check_in=today - timedelta(days=20),
        check_out=today - timedelta(days=18),
        total_price=600.0,
        status=BookingStatus.confirmed,
    )
    cancelled = BookingFactory(
        user_id=user.id,
        room_id=room.id,
        guest_name="Cancel",
        guest_email=user.email,
        check_in=today + timedelta(days=30),
        check_out=today + timedelta(days=32),
        total_price=600.0,
        status=BookingStatus.cancelled,
    )
    db_session.add_all([upcoming, past, cancelled])
    await db_session.commit()

    upcoming_rows = await get_user_bookings(db_session, user.id, status_filter="upcoming")
    past_rows = await get_user_bookings(db_session, user.id, status_filter="past")
    cancelled_rows = await get_user_bookings(db_session, user.id, status_filter="cancelled")

    assert len(upcoming_rows) == 1
    assert upcoming_rows[0].id == upcoming.id
    assert len(past_rows) == 1
    assert past_rows[0].id == past.id
    assert len(cancelled_rows) == 1
    assert cancelled_rows[0].status == BookingStatus.cancelled


@pytest.mark.asyncio
async def test_get_user_bookings_links_guest_email_without_user_id(db_session: AsyncSession):
    user = UserFactory(email="guestlink@example.com", first_name="Guest", last_name="Link")
    hotel = HotelFactory(
        name="Link Hotel",
        city="Ankara",
        stars=3,
        rating=7.5,
        reviews_count=2,
        price_per_night=200.0,
    )
    db_session.add_all([user, hotel])
    await db_session.flush()
    room = RoomFactory(
        hotel_id=hotel.id,
        type=RoomType.double,
        capacity=2,
        price_per_night=200.0,
        status=RoomStatus.available,
    )
    db_session.add(room)
    await db_session.flush()

    orphan = BookingFactory(
        user_id=None,
        room_id=room.id,
        guest_name="Guest Link",
        guest_email="guestlink@example.com",
        check_in=date(2028, 1, 1),
        check_out=date(2028, 1, 3),
        total_price=400.0,
        status=BookingStatus.confirmed,
    )
    db_session.add(orphan)
    await db_session.commit()

    rows = await get_user_bookings(db_session, user.id)

    assert any(b.id == orphan.id for b in rows)


@pytest.mark.asyncio
async def test_get_user_booking_denies_other_users_booking(db_session: AsyncSession):
    owner = UserFactory(email="owner@example.com", first_name="Owner", last_name="One")
    other = UserFactory(email="other@example.com", first_name="Other", last_name="Two")
    hotel = HotelFactory(
        name="Own Hotel",
        city="İzmir",
        stars=4,
        rating=8.0,
        reviews_count=0,
        price_per_night=250.0,
    )
    db_session.add_all([owner, other, hotel])
    await db_session.flush()
    room = RoomFactory(
        hotel_id=hotel.id,
        type=RoomType.double,
        capacity=2,
        price_per_night=250.0,
        status=RoomStatus.available,
    )
    db_session.add(room)
    await db_session.flush()
    booking = BookingFactory(
        user_id=owner.id,
        room_id=room.id,
        guest_name="Owner",
        guest_email=owner.email,
        check_in=date(2028, 2, 1),
        check_out=date(2028, 2, 3),
        total_price=500.0,
        status=BookingStatus.confirmed,
    )
    db_session.add(booking)
    await db_session.commit()

    with pytest.raises(BookingNotFoundError):
        await get_user_booking(db_session, other.id, booking.id)


@pytest.mark.asyncio
async def test_favorites_add_list_remove(db_session: AsyncSession):
    user = UserFactory(email="fav@example.com", first_name="Fav", last_name="User")
    hotel = HotelFactory(
        name="Fav Hotel",
        city="Bodrum",
        stars=5,
        rating=9.0,
        reviews_count=10,
        price_per_night=900.0,
    )
    db_session.add_all([user, hotel])
    await db_session.commit()

    created = await add_favorite(db_session, user.id, hotel.id)
    assert created.hotel.id == hotel.id

    again = await add_favorite(db_session, user.id, hotel.id)
    assert again.id == created.id

    listed = await get_favorites(db_session, user.id)
    assert len(listed) == 1

    removed = await remove_favorite(db_session, user.id, hotel.id)
    assert removed is True
    assert await remove_favorite(db_session, user.id, hotel.id) is False


@pytest.mark.asyncio
async def test_update_user_applies_fields(db_session: AsyncSession):
    user = UserFactory(email="update@example.com", first_name="Old", last_name="Name")
    db_session.add(user)
    await db_session.commit()

    updated = await update_user(db_session, user, {"first_name": "New", "country": "TR"})

    assert updated.first_name == "New"
    assert updated.country == "TR"
