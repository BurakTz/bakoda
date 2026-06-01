from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import Booking, BookingStatus, Hotel, HotelReview, Room, RoomStatus


_LOCATION_NORMALIZATION_REPLACEMENTS = (
    ("ı", "i"),
    ("İ", "i"),
    ("I", "i"),
    ("ş", "s"),
    ("Ş", "s"),
    ("ç", "c"),
    ("Ç", "c"),
    ("ğ", "g"),
    ("Ğ", "g"),
    ("ö", "o"),
    ("Ö", "o"),
    ("ü", "u"),
    ("Ü", "u"),
    ("â", "a"),
    ("Â", "a"),
    ("ê", "e"),
    ("Ê", "e"),
    ("î", "i"),
    ("Î", "i"),
    ("ô", "o"),
    ("Ô", "o"),
    ("û", "u"),
    ("Û", "u"),
    ("é", "e"),
    ("É", "e"),
    ("á", "a"),
    ("Á", "a"),
    ("à", "a"),
    ("À", "a"),
    ("è", "e"),
    ("È", "e"),
    ("í", "i"),
    ("Í", "i"),
    ("ó", "o"),
    ("Ó", "o"),
    ("ú", "u"),
    ("Ú", "u"),
    ("ñ", "n"),
    ("Ñ", "n"),
)


def _normalize_location_term(raw: str) -> str:
    normalized = str(raw or "").strip()
    for source, target in _LOCATION_NORMALIZATION_REPLACEMENTS:
        normalized = normalized.replace(source, target)
    return " ".join(normalized.lower().split())


def _normalized_column(column):
    expr = func.lower(func.coalesce(column, ""))
    for source, target in _LOCATION_NORMALIZATION_REPLACEMENTS:
        expr = func.replace(expr, source.lower(), target)
    return expr


async def search_hotels(
    db: AsyncSession,
    city: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
    rooms: int | None = None,
    price_min: float | None = None,
    price_max: float | None = None,
    stars: int | None = None,
    sort: str = "recommended",
    page: int = 1,
    page_size: int = 12,
) -> tuple[list[Hotel], int]:
    stmt = select(Hotel)
    rooms_needed = max(1, rooms or 1)
    min_capacity = None
    if guests:
        min_capacity = max(1, (guests + rooms_needed - 1) // rooms_needed)
    capacity_cond = Room.capacity >= min_capacity if min_capacity else True

    normalized_location = _normalize_location_term(city) if city else ""
    if normalized_location:
        location_pattern = f"%{normalized_location}%"
        stmt = stmt.where(
            or_(
                _normalized_column(Hotel.city).like(location_pattern),
                _normalized_column(Hotel.district).like(location_pattern),
            )
        )
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
                capacity_cond,
            )
            .group_by(Room.hotel_id)
            .having(func.count(Room.id) >= rooms_needed)
        )
        stmt = stmt.where(Hotel.id.in_(available_hotel_ids))
    elif guests:
        capacity_hotel_ids = (
            select(Room.hotel_id)
            .where(
                Room.status == RoomStatus.available,
                Room.hotel_id.is_not(None),
                capacity_cond,
            )
            .distinct()
            .scalar_subquery()
        )
        stmt = stmt.where(Hotel.id.in_(capacity_hotel_ids))

    if sort == "price-asc":
        stmt = stmt.order_by(Hotel.price_per_night.asc())
    elif sort == "price-desc":
        stmt = stmt.order_by(Hotel.price_per_night.desc())
    elif sort == "rating":
        stmt = stmt.order_by(Hotel.rating.desc())
    else:
        stmt = stmt.order_by(Hotel.rating.desc(), Hotel.id.asc())

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = int((await db.execute(count_stmt)).scalar_one() or 0)

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_hotel_detail(
    db: AsyncSession,
    hotel_id: int,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = None,
) -> tuple[Hotel | None, int | None]:
    """Return hotel and optional count of rooms available for the given stay."""
    result = await db.execute(
        select(Hotel)
        .options(
            selectinload(Hotel.rooms),
            selectinload(Hotel.amenities),
            selectinload(Hotel.reviews),
        )
        .where(Hotel.id == hotel_id)
    )
    hotel = result.scalar_one_or_none()
    if hotel is None:
        return None, None

    if check_in and check_out:
        from src.services import room_service

        available = await room_service.list_available_hotel_rooms(
            db, hotel_id, check_in, check_out, guests=guests
        )
        hotel.rooms = available
        return hotel, len(available)

    available_now = [r for r in hotel.rooms if r.status == RoomStatus.available]
    hotel.rooms = available_now
    return hotel, len(available_now)


async def create_hotel_review(
    db: AsyncSession,
    hotel_id: int,
    reviewer_name: str,
    country: str | None,
    rating: float,
    title: str | None,
    text: str,
) -> HotelReview | None:
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        return None

    review = HotelReview(
        hotel_id=hotel_id,
        reviewer_name=reviewer_name,
        country=country,
        rating=rating,
        title=title,
        text=text.strip(),
    )
    db.add(review)
    await db.flush()

    stats = await db.execute(
        select(func.count(HotelReview.id), func.avg(HotelReview.rating))
        .where(HotelReview.hotel_id == hotel_id)
    )
    reviews_count, avg_rating = stats.one()
    hotel.reviews_count = int(reviews_count or 0)
    hotel.rating = float(avg_rating or 0.0)

    await db.commit()
    await db.refresh(review)
    return review
