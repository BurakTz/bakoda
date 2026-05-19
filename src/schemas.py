from datetime import date, datetime

from pydantic import BaseModel, EmailStr, field_validator

from src.models import BookingStatus, RoomStatus, RoomType


# ── Room schemas ────────────────────────────────────────────────────────────

class RoomOut(BaseModel):
    id: int
    room_number: str
    type: RoomType
    capacity: int
    price_per_night: float
    status: RoomStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Booking schemas ──────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    room_id: int
    guest_name: str
    guest_email: EmailStr
    check_in: date
    check_out: date

    @field_validator("check_out")
    @classmethod
    def check_out_after_check_in(cls, v, info):
        check_in = info.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("check_out must be after check_in")
        return v


class BookingOut(BaseModel):
    id: int
    room_id: int
    guest_name: str
    guest_email: str
    check_in: date
    check_out: date
    total_price: float
    status: BookingStatus
    confirmation_key: str | None
    confirmation_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Health schema ────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    version: str = "0.1.0"
