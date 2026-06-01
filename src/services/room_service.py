from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Booking, BookingStatus, Room, RoomStatus


def overlapping_booked_room_ids_subquery(check_in: date, check_out: date):
    """Confirmed bookings that overlap [check_in, check_out)."""
    return (
        select(Booking.room_id)
        .where(
            Booking.status == BookingStatus.confirmed,
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        .scalar_subquery()
    )


def _available_rooms_base(
    check_in: date | None,
    check_out: date | None,
    hotel_id: int | None = None,
    min_capacity: int | None = None,
):
    stmt = select(Room).where(Room.status == RoomStatus.available)
    if hotel_id is not None:
        stmt = stmt.where(Room.hotel_id == hotel_id)
    if min_capacity is not None:
        stmt = stmt.where(Room.capacity >= min_capacity)
    if check_in and check_out:
        booked_ids = overlapping_booked_room_ids_subquery(check_in, check_out)
        stmt = stmt.where(Room.id.not_in(booked_ids))
    return stmt


async def list_rooms(
    db: AsyncSession,
    check_in: date | None = None,
    check_out: date | None = None,
) -> list[Room]:
    stmt = _available_rooms_base(check_in, check_out)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_available_rooms(
    db: AsyncSession,
    hotel_id: int,
    check_in: date,
    check_out: date,
    min_capacity: int | None = None,
) -> int:
    stmt = (
        select(func.count())
        .select_from(Room)
        .where(Room.status == RoomStatus.available, Room.hotel_id == hotel_id)
    )
    if min_capacity is not None:
        stmt = stmt.where(Room.capacity >= min_capacity)
    booked_ids = overlapping_booked_room_ids_subquery(check_in, check_out)
    stmt = stmt.where(Room.id.not_in(booked_ids))
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def list_available_hotel_rooms(
    db: AsyncSession,
    hotel_id: int,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
) -> list[Room]:
    min_capacity = guests if guests else None
    stmt = _available_rooms_base(check_in, check_out, hotel_id=hotel_id, min_capacity=min_capacity)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_room(db: AsyncSession, room_id: int) -> Room | None:
    result = await db.execute(select(Room).where(Room.id == room_id))
    return result.scalar_one_or_none()


async def create_room(db: AsyncSession, **kwargs) -> Room:
    room = Room(**kwargs)
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room
