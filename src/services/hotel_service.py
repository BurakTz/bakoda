from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import Booking, BookingStatus, Hotel, Room, RoomStatus


async def search_hotels(
    db: AsyncSession,
    city: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
    price_min: float | None = None,
    price_max: float | None = None,
    stars: int | None = None,
    sort: str = "recommended",
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[Hotel], int]:
    stmt = select(Hotel)

    if city:
        stmt = stmt.where(Hotel.city.ilike(f"%{city}%"))
    if stars:
        stmt = stmt.where(Hotel.stars == stars)
    if price_min is not None:
        stmt = stmt.where(Hotel.price_per_night >= price_min)
    if price_max is not None:
        stmt = stmt.where(Hotel.price_per_night <= price_max)

    if check_in and check_out:
        # Müsait odası olmayan otelleri filtrele
        booked_room_ids = (
            select(Room.id)
            .join(Booking, Booking.room_id == Room.id)
            .where(
                Booking.status == BookingStatus.confirmed,
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            )
            .scalar_subquery()
        )
        available_hotel_ids = (
            select(Room.hotel_id)
            .where(
                Room.status == RoomStatus.available,
                Room.id.not_in(booked_room_ids),
                Room.hotel_id.is_not(None),
            )
            .distinct()
            .scalar_subquery()
        )
        stmt = stmt.where(Hotel.id.in_(available_hotel_ids))

    if sort == "price-asc":
        stmt = stmt.order_by(Hotel.price_per_night.asc())
    elif sort == "price-desc":
        stmt = stmt.order_by(Hotel.price_per_night.desc())
    elif sort == "rating":
        stmt = stmt.order_by(Hotel.rating.desc())
    else:
        stmt = stmt.order_by(Hotel.rating.desc(), Hotel.id.asc())

    count_result = await db.execute(select(Hotel.id).where(stmt.whereclause if stmt.whereclause is not None else True))
    total = len(count_result.all())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_hotel_detail(db: AsyncSession, hotel_id: int) -> Hotel | None:
    result = await db.execute(
        select(Hotel)
        .options(
            selectinload(Hotel.rooms),
            selectinload(Hotel.amenities),
            selectinload(Hotel.reviews),
        )
        .where(Hotel.id == hotel_id)
    )
    return result.scalar_one_or_none()
