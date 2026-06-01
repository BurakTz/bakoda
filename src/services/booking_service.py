from datetime import date

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import Booking, BookingStatus, Room, RoomStatus, User
from src.schemas import BookingListOut
from src.services import room_service


class RoomNotAvailableError(Exception):
    pass


class BookingNotFoundError(Exception):
    pass


class BookingAlreadyCancelledError(Exception):
    pass


def _min_capacity_per_room(guests: int, rooms_count: int) -> int:
    rooms = max(1, rooms_count)
    return max(1, (max(1, guests) + rooms - 1) // rooms)


async def _is_room_available(
    db: AsyncSession, room_id: int, check_in: date, check_out: date
) -> bool:
    result = await db.execute(
        select(Booking.id)
        .where(
            Booking.room_id == room_id,
            Booking.status == BookingStatus.confirmed,
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is None


def _make_confirmation_code(booking_id: int | None) -> str:
    if booking_id is None:
        return "BKD-0000-2026"
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
    if guests < 1:
        raise RoomNotAvailableError("guests must be at least 1")
    if rooms_count < 1:
        raise RoomNotAvailableError("rooms_count must be at least 1")

    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room: Room | None = room_result.scalar_one_or_none()

    if room is None or room.status != RoomStatus.available:
        raise RoomNotAvailableError(f"Room {room_id} is not available")

    min_capacity = _min_capacity_per_room(guests, rooms_count)
    if room.capacity < min_capacity:
        raise RoomNotAvailableError(
            f"Room {room_id} capacity is {room.capacity}; need at least {min_capacity} per room"
        )

    if not await _is_room_available(db, room_id, check_in, check_out):
        raise RoomNotAvailableError(f"Room {room_id} already booked for the selected dates")

    if room.hotel_id is not None:
        available_at_hotel = await room_service.count_available_rooms(
            db,
            room.hotel_id,
            check_in,
            check_out,
            min_capacity=min_capacity,
        )
        if available_at_hotel < rooms_count:
            raise RoomNotAvailableError(
                f"Only {available_at_hotel} room(s) available for the selected dates; "
                f"requested {rooms_count}"
            )
    elif rooms_count > 1:
        raise RoomNotAvailableError("Multiple rooms require a hotel-linked room")

    nights = (check_out - check_in).days
    total_price = round(room.price_per_night * nights * rooms_count, 2)

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

    if user_id is not None:
        owner = await db.get(User, user_id)
        if owner is not None:
            await db.execute(
                update(Booking)
                .where(
                    Booking.user_id.is_(None),
                    func.lower(Booking.guest_email) == owner.email.lower(),
                )
                .values(user_id=user_id)
            )

    await db.commit()
    await db.refresh(booking)
    return booking


async def link_orphan_bookings_for_user(db: AsyncSession, user: User) -> None:
    """Attach guest bookings for this account email (e.g. after register/login)."""
    await db.execute(
        update(Booking)
        .where(func.lower(Booking.guest_email) == user.email.lower())
        .values(user_id=user.id)
    )
    await db.commit()


async def get_booking(db: AsyncSession, booking_id: int) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if booking is None:
        raise BookingNotFoundError(f"Booking {booking_id} not found")
    return booking


async def get_booking_detail(db: AsyncSession, booking_id: int) -> Booking:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.room).selectinload(Room.hotel))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise BookingNotFoundError(f"Booking {booking_id} not found")
    return booking


def booking_to_list_out(booking: Booking) -> BookingListOut:
    out = BookingListOut.model_validate(booking)
    if booking.room:
        out.room_name = booking.room.name or booking.room.type.value
        if booking.room.hotel:
            out.hotel_name = booking.room.hotel.name
            district = booking.room.hotel.district
            out.hotel_city = (
                f"{booking.room.hotel.city}, {district}" if district else booking.room.hotel.city
            )
            out.hotel_id = booking.room.hotel.id
            out.hotel_thumbnail = booking.room.hotel.thumbnail
    return out


def user_owns_booking(booking: Booking, user: User) -> bool:
    if booking.user_id == user.id:
        return True
    if booking.user_id is None and booking.guest_email.lower() == user.email.lower():
        return True
    return False


async def cancel_booking(db: AsyncSession, booking_id: int) -> Booking:
    booking = await get_booking(db, booking_id)
    if booking.status == BookingStatus.cancelled:
        raise BookingAlreadyCancelledError(f"Booking {booking_id} is already cancelled")
    booking.status = BookingStatus.cancelled
    await db.commit()
    await db.refresh(booking)
    return booking
