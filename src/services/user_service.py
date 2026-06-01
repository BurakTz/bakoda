from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import Booking, BookingStatus, Favorite, Room, User
from src.services.booking_service import BookingNotFoundError, get_booking_detail, user_owns_booking


async def get_user_bookings(
    db: AsyncSession,
    user_id: int,
    status_filter: str | None = None,
) -> list[Booking]:
    user = await db.get(User, user_id)
    if user is None:
        return []

    email_match = func.lower(Booking.guest_email) == user.email.lower()
    stmt = (
        select(Booking)
        .options(selectinload(Booking.room).selectinload(Room.hotel))
        .where(or_(Booking.user_id == user_id, (Booking.user_id.is_(None) & email_match)))
    )

    today = datetime.now(timezone.utc).date()
    if status_filter == "upcoming":
        # Include in-progress stays (check-in may be before today).
        stmt = stmt.where(Booking.status == BookingStatus.confirmed, Booking.check_out >= today)
    elif status_filter == "past":
        stmt = stmt.where(Booking.status == BookingStatus.confirmed, Booking.check_out < today)
    elif status_filter == "cancelled":
        stmt = stmt.where(Booking.status == BookingStatus.cancelled)

    stmt = stmt.order_by(Booking.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_user_booking(db: AsyncSession, user_id: int, booking_id: int) -> Booking:
    user = await db.get(User, user_id)
    if user is None:
        raise BookingNotFoundError(f"Booking {booking_id} not found")
    booking = await get_booking_detail(db, booking_id)
    if not user_owns_booking(booking, user):
        raise BookingNotFoundError(f"Booking {booking_id} not found")
    return booking


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
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user
