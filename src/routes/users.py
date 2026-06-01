from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import User
from src.schemas import BookingListOut, ChangePasswordIn, FavoriteOut, UserOut, UserUpdate
from src.services.auth_service import get_current_user, hash_password, verify_password
from src.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await user_service.update_user(db, current_user, payload.model_dump(exclude_none=True))
    return UserOut.model_validate(updated)


@router.post("/me/change-password", status_code=200)
async def change_password(
    payload: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Şifre güncellendi"}


@router.delete("/me", status_code=204)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.is_active = False
    await db.commit()


@router.get("/me/bookings", response_model=list[BookingListOut])
async def my_bookings(
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bookings = await user_service.get_user_bookings(db, current_user.id, status_filter=status)
    result = []
    for b in bookings:
        out = BookingListOut.model_validate(b)
        if b.room and b.room.hotel:
            out.hotel_name = b.room.hotel.name
            out.hotel_city = b.room.hotel.city
            out.hotel_id = b.room.hotel.id
        result.append(out)
    return result


@router.get("/me/favorites", response_model=list[FavoriteOut])
async def my_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    favs = await user_service.get_favorites(db, current_user.id)
    return [FavoriteOut.model_validate(f) for f in favs]


@router.post("/me/favorites/{hotel_id}", response_model=FavoriteOut, status_code=201)
async def add_favorite(
    hotel_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    fav = await user_service.add_favorite(db, current_user.id, hotel_id)
    return FavoriteOut.model_validate(fav)


@router.delete("/me/favorites/{hotel_id}", status_code=204)
async def remove_favorite(
    hotel_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    removed = await user_service.remove_favorite(db, current_user.id, hotel_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Favori bulunamadı")
