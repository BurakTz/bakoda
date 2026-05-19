from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Booking, BookingStatus, Room, RoomStatus


async def list_rooms(
    db: AsyncSession,
    check_in: date | None = None,
    check_out: date | None = None,
) -> list[Room]:
    stmt = select(Room).where(Room.status == RoomStatus.available)

    if check_in and check_out:
        # Exclude rooms that have an active booking overlapping the requested range
        booked_ids = (
            select(Booking.room_id)
            .where(
                Booking.status == BookingStatus.confirmed,
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            )
            .scalar_subquery()
        )
        stmt = stmt.where(Room.id.not_in(booked_ids))

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
