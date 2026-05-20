from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Booking, BookingStatus, Room, RoomStatus


class RoomNotAvailableError(Exception):
    pass


class BookingNotFoundError(Exception):
    pass


class BookingAlreadyCancelledError(Exception):
    pass


async def _is_room_available(db: AsyncSession, room_id: int, check_in: date, check_out: date) -> bool:
    result = await db.execute(
        select(Booking).where(
            Booking.room_id == room_id,
            Booking.status == BookingStatus.confirmed,
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
    )
    return result.scalar_one_or_none() is None


def _make_confirmation_code(booking_id: int) -> str:
    return f"BKD-{booking_id:04d}-2026"


async def create_booking(
    db: AsyncSession,
    room_id: int,
    guest_name: str,
    guest_email: str,
    check_in: date,
    check_out: date,
    phone: str | None = None,
    guests: int = 1,
    rooms_count: int = 1,
    preferences: str | None = None,
    arrival_time: str | None = None,
    trip_type: str | None = None,
    user_id: int | None = None,
    confirmation_key: str | None = None,
) -> Booking:
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room: Room | None = room_result.scalar_one_or_none()

    if room is None or room.status != RoomStatus.available:
        raise RoomNotAvailableError(f"Room {room_id} is not available")

    if not await _is_room_available(db, room_id, check_in, check_out):
        raise RoomNotAvailableError(f"Room {room_id} already booked for the selected dates")

    nights = (check_out - check_in).days
    total_price = round(room.price_per_night * nights, 2)

    booking = Booking(
        room_id=room_id,
        user_id=user_id,
        guest_name=guest_name,
        guest_email=guest_email,
        phone=phone,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        rooms_count=rooms_count,
        preferences=preferences,
        arrival_time=arrival_time,
        trip_type=trip_type,
        total_price=total_price,
        status=BookingStatus.confirmed,
        confirmation_key=confirmation_key,
    )
    db.add(booking)
    await db.flush()
    booking.confirmation_code = _make_confirmation_code(booking.id)
    await db.commit()
    await db.refresh(booking)
    return booking


async def get_booking(db: AsyncSession, booking_id: int) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if booking is None:
        raise BookingNotFoundError(f"Booking {booking_id} not found")
    return booking


async def cancel_booking(db: AsyncSession, booking_id: int) -> Booking:
    booking = await get_booking(db, booking_id)
    if booking.status == BookingStatus.cancelled:
        raise BookingAlreadyCancelledError(f"Booking {booking_id} is already cancelled")
    booking.status = BookingStatus.cancelled
    await db.commit()
    await db.refresh(booking)
    return booking
