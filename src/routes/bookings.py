import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import User
from src.schemas import BookingCreate, BookingListOut, BookingOut
from src.services import booking_service, s3_service
from src.services.auth_service import get_optional_user
from src.services.booking_service import (
    BookingAlreadyCancelledError,
    BookingNotFoundError,
    RoomNotAvailableError,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    try:
        booking = await booking_service.create_booking(
            db,
            room_id=payload.room_id,
            guest_name=payload.guest_name,
            guest_email=payload.guest_email,
            phone=payload.phone,
            check_in=payload.check_in,
            check_out=payload.check_out,
            guests=payload.guests,
            rooms_count=payload.rooms_count,
            preferences=payload.preferences,
            arrival_time=payload.arrival_time,
            trip_type=payload.trip_type,
            user_id=current_user.id if current_user else None,
        )
    except RoomNotAvailableError as e:
        raise HTTPException(status_code=409, detail=str(e))

    try:
        key = s3_service.upload_confirmation(
            booking.id,
            {
                "booking_id": booking.id,
                "confirmation_code": booking.confirmation_code,
                "room_id": booking.room_id,
                "guest_name": booking.guest_name,
                "guest_email": booking.guest_email,
                "check_in": booking.check_in.isoformat(),
                "check_out": booking.check_out.isoformat(),
                "total_price": booking.total_price,
            },
        )
        booking.confirmation_key = key
        await db.commit()
        await db.refresh(booking)
    except Exception:
        logger.warning("S3 upload failed for booking %s", booking.id)

    out = BookingOut.model_validate(booking)
    if booking.confirmation_key:
        try:
            out.confirmation_url = s3_service.get_presigned_url(booking.confirmation_key)
        except Exception:
            logger.warning("Could not generate presigned URL for booking %s", booking.id)
    return out


@router.get("/{booking_id}", response_model=BookingListOut)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    try:
        booking = await booking_service.get_booking_detail(db, booking_id)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    out = booking_service.booking_to_list_out(booking)
    if booking.confirmation_key:
        try:
            out.confirmation_url = s3_service.get_presigned_url(booking.confirmation_key)
        except Exception:
            logger.warning("Could not generate presigned URL for booking %s", booking.id)
    return out


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    try:
        booking = await booking_service.cancel_booking(db, booking_id)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BookingAlreadyCancelledError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return BookingOut.model_validate(booking)
