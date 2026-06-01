from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import User
from src.schemas import HotelDetailOut, HotelOut, ReviewCreate, ReviewOut
from src.services import hotel_service
from src.services.auth_service import get_current_user

router = APIRouter(prefix="/hotels", tags=["hotels"])


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
    return {
        "hotels": [HotelOut.model_validate(h) for h in hotels],
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
