from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas import HotelDetailOut, HotelOut
from src.services import hotel_service

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.get("", response_model=dict)
async def list_hotels(
    city: str | None = Query(default=None),
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    guests: int | None = Query(default=None),
    price_min: float | None = Query(default=None),
    price_max: float | None = Query(default=None),
    stars: int | None = Query(default=None),
    sort: str = Query(default="recommended"),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    hotels, total = await hotel_service.search_hotels(
        db, city=city, check_in=check_in, check_out=check_out,
        guests=guests, price_min=price_min, price_max=price_max,
        stars=stars, sort=sort, page=page,
    )
    return {
        "hotels": [HotelOut.model_validate(h) for h in hotels],
        "total": total,
        "page": page,
    }


@router.get("/{hotel_id}", response_model=HotelDetailOut)
async def get_hotel(hotel_id: int, db: AsyncSession = Depends(get_db)):
    hotel = await hotel_service.get_hotel_detail(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Otel bulunamadı")
    return HotelDetailOut.model_validate(hotel)
