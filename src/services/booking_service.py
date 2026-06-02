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
    db: AsyncSession,
    room_id: int,
    check_in: date,
    check_out: date,
    exclude_booking_id: int | None = None,
) -> bool:
    stmt = select(Booking.id).where(
        Booking.room_id == room_id,
        Booking.status == BookingStatus.confirmed,
        Booking.check_in < check_out,
        Booking.check_out > check_in,
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none() is None


def _make_confirmation_code(booking_id: int | None) -> str:
    if booking_id is None:
        return "BKD-0000-2026"
    return f"BKD-{booking_id:04d}-2026"


def _compute_total_price(
    price_per_night: float, check_in: date, check_out: date, rooms_count: int
) -> float:
    nights = (check_out - check_in).days
    return round(price_per_night * nights * rooms_count, 2)


async def _check_room_availability(
    db: AsyncSession,
    room: Room,
    check_in: date,
    check_out: date,
    guests: int,
    rooms_count: int,
    exclude_booking_id: int | None = None,
) -> None:
    """Raise RoomNotAvailableError if the room cannot satisfy the request.

    ``exclude_booking_id`` lets an update ignore the booking being modified when
    checking for overlapping reservations.
    """
    if room.status != RoomStatus.available:
        raise RoomNotAvailableError(f"Room {room.id} is not available")

    min_capacity = _min_capacity_per_room(guests, rooms_count)
    if room.capacity < min_capacity:
        raise RoomNotAvailableError(
            f"Room {room.id} capacity is {room.capacity}; need at least {min_capacity} per room"
        )

    if not await _is_room_available(db, room.id, check_in, check_out, exclude_booking_id):
        raise RoomNotAvailableError(f"Room {room.id} already booked for the selected dates")

    if room.hotel_id is not None:
        available_at_hotel = await room_service.count_available_rooms(
            db,
            room.hotel_id,
            check_in,
            check_out,
            min_capacity=min_capacity,
        )
        if exclude_booking_id is not None:
            # The room held by this booking is currently counted as booked; for an
            # in-place update it is still usable, so add it back to the inventory.
            available_at_hotel += 1
        if available_at_hotel < rooms_count:
            raise RoomNotAvailableError(
                f"Only {available_at_hotel} room(s) available for the selected dates; "
                f"requested {rooms_count}"
            )
    elif rooms_count > 1:
        raise RoomNotAvailableError("Multiple rooms require a hotel-linked room")


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

    if room is None:
        raise RoomNotAvailableError(f"Room {room_id} is not available")

    await _check_room_availability(db, room, check_in, check_out, guests, rooms_count)

    total_price = _compute_total_price(room.price_per_night, check_in, check_out, rooms_count)

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


async def update_booking(
    db: AsyncSession,
    booking_id: int,
    user_id: int,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
    rooms_count: int | None = None,
) -> Booking:
    """Partially update an existing booking after re-checking availability.

    Only the owner (``user_id``) may update the booking. Cancelled bookings cannot
    be modified. Dates/guest-count changes trigger an availability re-check and a
    ``total_price`` recompute.
    """
    user = await db.get(User, user_id)
    if user is None:
        raise BookingNotFoundError(f"Booking {booking_id} not found")

    booking = await get_booking(db, booking_id)
    if not user_owns_booking(booking, user):
        # Hide other users' bookings behind a 404, matching the read-side pattern.
        raise BookingNotFoundError(f"Booking {booking_id} not found")

    if booking.status == BookingStatus.cancelled:
        raise BookingAlreadyCancelledError(
            f"Booking {booking_id} is cancelled and cannot be updated"
        )

    new_check_in = check_in if check_in is not None else booking.check_in
    new_check_out = check_out if check_out is not None else booking.check_out
    new_guests = guests if guests is not None else booking.guests
    new_rooms_count = rooms_count if rooms_count is not None else booking.rooms_count

    if new_guests < 1:
        raise RoomNotAvailableError("guests must be at least 1")
    if new_rooms_count < 1:
        raise RoomNotAvailableError("rooms_count must be at least 1")
    if new_check_out <= new_check_in:
        raise RoomNotAvailableError("check_out must be after check_in")

    room_result = await db.execute(select(Room).where(Room.id == booking.room_id))
    room: Room | None = room_result.scalar_one_or_none()
    if room is None:
        raise RoomNotAvailableError(f"Room {booking.room_id} is not available")

    await _check_room_availability(
        db,
        room,
        new_check_in,
        new_check_out,
        new_guests,
        new_rooms_count,
        exclude_booking_id=booking.id,
    )

    booking.check_in = new_check_in
    booking.check_out = new_check_out
    booking.guests = new_guests
    booking.rooms_count = new_rooms_count
    booking.total_price = _compute_total_price(
        room.price_per_night, new_check_in, new_check_out, new_rooms_count
    )

    await db.commit()
    await db.refresh(booking)
    return booking


async def mark_booking_paid(db: AsyncSession, booking_id: int) -> Booking:
    """Mark a booking as confirmed/paid after a successful payment.

    ``BookingStatus`` has no dedicated "paid" value, so we (re)assert the
    ``confirmed`` status — keeping the booking out of the cancelled state and
    flushing without committing so the caller controls the transaction boundary.
    """
    booking = await get_booking(db, booking_id)
    booking.status = BookingStatus.confirmed
    await db.flush()
    return booking
