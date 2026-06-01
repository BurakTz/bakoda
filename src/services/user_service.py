from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import Booking, BookingStatus, Favorite, Room, User


async def get_user_bookings(
    db: AsyncSession,
    user_id: int,
    status_filter: str | None = None,
) -> list[Booking]:
    stmt = (
        select(Booking)
        .options(selectinload(Booking.room).selectinload(Room.hotel))
        .where(Booking.user_id == user_id)
    )

    today = datetime.now(timezone.utc).date()
    if status_filter == "upcoming":
        stmt = stmt.where(Booking.status == BookingStatus.confirmed, Booking.check_in >= today)
    elif status_filter == "past":
        stmt = stmt.where(Booking.status == BookingStatus.confirmed, Booking.check_out < today)
    elif status_filter == "cancelled":
        stmt = stmt.where(Booking.status == BookingStatus.cancelled)

    stmt = stmt.order_by(Booking.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_favorites(db: AsyncSession, user_id: int) -> list[Favorite]:
    result = await db.execute(
        select(Favorite)
        .options(selectinload(Favorite.hotel))
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
    )
    return list(result.scalars().all())


async def add_favorite(db: AsyncSession, user_id: int, hotel_id: int) -> Favorite:
    existing = await db.execute(
        select(Favorite).where(Favorite.user_id == user_id, Favorite.hotel_id == hotel_id)
    )
    found = existing.scalar_one_or_none()
    if found:
        result = await db.execute(
            select(Favorite).options(selectinload(Favorite.hotel)).where(Favorite.id == found.id)
        )
        return result.scalar_one()
    fav = Favorite(user_id=user_id, hotel_id=hotel_id)
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    result = await db.execute(
        select(Favorite).options(selectinload(Favorite.hotel)).where(Favorite.id == fav.id)
    )
    return result.scalar_one()


async def remove_favorite(db: AsyncSession, user_id: int, hotel_id: int) -> bool:
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == user_id, Favorite.hotel_id == hotel_id)
    )
    fav = result.scalar_one_or_none()
    if not fav:
        return False
    await db.delete(fav)
    await db.commit()
    return True


async def update_user(db: AsyncSession, user: User, data: dict) -> User:
    for key, value in data.items():
        if value is not None:
            setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user
