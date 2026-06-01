from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import User
from src.schemas import (
    BillingAddressOut,
    BillingAddressUpdate,
    BookingListOut,
    ChangePasswordIn,
    FavoriteOut,
    SavedCardCreate,
    SavedCardOut,
    SavedCardUpdate,
    UserOut,
    UserUpdate,
)
from src.services.auth_service import get_current_user, hash_password, verify_password
from src.services import user_service, payment_method_service

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
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
    current_user.password_hash = hash_password(payload.new_password)
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


@router.get("/me/payment-methods", response_model=list[SavedCardOut])
async def list_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cards = await payment_method_service.list_cards(db, current_user.id)
    return [SavedCardOut(**payment_method_service.card_to_out(c)) for c in cards]


@router.post("/me/payment-methods", response_model=SavedCardOut, status_code=201)
async def add_payment_method(
    payload: SavedCardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    card = await payment_method_service.create_card(
        db, current_user.id, payload.model_dump()
    )
    return SavedCardOut(**payment_method_service.card_to_out(card))


@router.put("/me/payment-methods/{card_id}", response_model=SavedCardOut)
async def update_payment_method(
    card_id: int,
    payload: SavedCardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    card = await payment_method_service.update_card(
        db, current_user.id, card_id, payload.model_dump(exclude_none=True)
    )
    if not card:
        raise HTTPException(status_code=404, detail="Kart bulunamadı")
    return SavedCardOut(**payment_method_service.card_to_out(card))


@router.post("/me/payment-methods/{card_id}/default", response_model=SavedCardOut)
async def set_default_payment_method(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    card = await payment_method_service.set_default_card(db, current_user.id, card_id)
    if not card:
        raise HTTPException(status_code=400, detail="Kart bulunamadı veya süresi dolmuş")
    return SavedCardOut(**payment_method_service.card_to_out(card))


@router.delete("/me/payment-methods/{card_id}", status_code=204)
async def delete_payment_method(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    removed = await payment_method_service.delete_card(db, current_user.id, card_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Kart bulunamadı")


@router.get("/me/billing-address", response_model=BillingAddressOut)
async def get_billing_address(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    billing = await payment_method_service.get_billing(db, current_user.id)
    if not billing:
        return BillingAddressOut(
            name=f"{current_user.first_name} {current_user.last_name}".strip(),
            line="",
            district="",
            city="",
            zip_code="",
            country="Türkiye",
        )
    return BillingAddressOut.model_validate(billing)


@router.put("/me/billing-address", response_model=BillingAddressOut)
async def update_billing_address(
    payload: BillingAddressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    billing = await payment_method_service.upsert_billing(
        db, current_user.id, payload.model_dump(exclude_none=True)
    )
    return BillingAddressOut.model_validate(billing)
