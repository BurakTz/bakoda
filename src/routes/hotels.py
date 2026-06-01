from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import User
from src.schemas import (
    DestinationOut,
    HotelDetailOut,
    HotelOut,
    LocationOut,
    ReviewCreate,
    ReviewOut,
)
from src.services import hotel_service, room_service
from src.services.auth_service import get_current_user

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.get("/destinations", response_model=list[DestinationOut])
async def list_destinations(
    limit: int = Query(default=12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    rows = await hotel_service.list_destinations(db, limit=limit)
    return [DestinationOut.model_validate(r) for r in rows]


@router.get("/locations", response_model=list[LocationOut])
async def search_locations(
    q: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    rows = await hotel_service.search_locations(db, q=q, limit=limit)
    return [LocationOut.model_validate(r) for r in rows]


@router.get("", response_model=dict)
async def list_hotels(
    city: str | None = Query(default=None),
    location: str | None = Query(default=None),
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    guests: int | None = Query(default=None),
    rooms: int | None = Query(default=None, ge=1),
    price_min: float | None = Query(default=None),
    price_max: float | None = Query(default=None),
    stars: int | None = Query(default=None),
    sort: str = Query(default="recommended"),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    location_query = location if location is not None else city

    hotels, total = await hotel_service.search_hotels(
        db,
        city=location_query,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        rooms=rooms,
        price_min=price_min,
        price_max=price_max,
        stars=stars,
        sort=sort,
        page=page,
    )
    hotel_outs = [HotelOut.model_validate(h) for h in hotels]
    if check_in and check_out and hotels:
        rooms_needed = max(1, rooms or 1)
        min_capacity = None
        if guests:
            min_capacity = max(1, (guests + rooms_needed - 1) // rooms_needed)
        counts = await room_service.count_available_rooms_by_hotels(
            db,
            [h.id for h in hotels],
            check_in,
            check_out,
            min_capacity=min_capacity,
        )
        for out in hotel_outs:
            out.available_rooms_count = counts.get(out.id, 0)

    return {
        "hotels": hotel_outs,
        "total": total,
        "page": page,
    }


@router.get("/{hotel_id}", response_model=HotelDetailOut)
async def get_hotel(
    hotel_id: int,
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    guests: int | None = Query(default=None, ge=1),
    db: AsyncSession = Depends(get_db),
):
    if (check_in is None) != (check_out is None):
        raise HTTPException(
            status_code=400, detail="Provide both check_in and check_out or neither"
        )
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    hotel, available_count = await hotel_service.get_hotel_detail(
        db, hotel_id, check_in=check_in, check_out=check_out, guests=guests
    )
    if not hotel:
        raise HTTPException(status_code=404, detail="Otel bulunamadı")
    out = HotelDetailOut.model_validate(hotel)
    out.available_rooms_count = available_count
    if hotel.rooms:
        out.min_price = min(room.price_per_night for room in hotel.rooms)
    else:
        out.min_price = float(hotel.price_per_night)
    return out


@router.post("/{hotel_id}/reviews", response_model=ReviewOut, status_code=201)
async def create_hotel_review(
    hotel_id: int,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reviewer_name = (
        f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email
    )
    review = await hotel_service.create_hotel_review(
        db=db,
        hotel_id=hotel_id,
        reviewer_name=reviewer_name,
        country=current_user.country,
        rating=payload.rating,
        title=payload.title,
        text=payload.text,
    )
    if not review:
        raise HTTPException(status_code=404, detail="Otel bulunamadı")
    return ReviewOut.model_validate(review)
