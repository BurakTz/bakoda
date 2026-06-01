from datetime import date, datetime

from pydantic import BaseModel, EmailStr, field_validator

from src.models import BookingStatus, RoomStatus, RoomType


# ── Room schemas ─────────────────────────────────────────────────────────────

class RoomOut(BaseModel):
    id: int
    room_number: str
    name: str | None = None
    type: RoomType
    capacity: int
    price_per_night: float
    bed_type: str | None = None
    view: str | None = None
    size_m2: int | None = None
    status: RoomStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Hotel schemas ─────────────────────────────────────────────────────────────

class AmenityOut(BaseModel):
    id: int
    icon: str
    title: str
    subtitle: str | None = None

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    reviewer_name: str
    country: str | None = None
    rating: float
    title: str | None = None
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HotelOut(BaseModel):
    id: int
    name: str
    city: str
    district: str | None = None
    stars: int
    rating: float
    reviews_count: int
    description: str | None = None
    price_per_night: float
    check_in_time: str
    check_out_time: str
    thumbnail: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HotelDetailOut(HotelOut):
    rooms: list[RoomOut] = []
    amenities: list[AmenityOut] = []
    reviews: list[ReviewOut] = []


# ── Auth schemas ──────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalı")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class VerifyResetCodeIn(BaseModel):
    email: EmailStr
    code: str


class VerifyResetCodeOut(BaseModel):
    valid: bool
    reset_token: str


class ResetPasswordIn(BaseModel):
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalı")
        return v


class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str | None = None
    birthday: date | None = None
    gender: str | None = None
    country: str
    language: str
    currency: str
    avatar_tone: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    birthday: date | None = None
    gender: str | None = None
    country: str | None = None
    language: str | None = None
    currency: str | None = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalı")
        return v


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Booking schemas ───────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    room_id: int
    guest_name: str
    guest_email: EmailStr
    phone: str | None = None
    check_in: date
    check_out: date
    guests: int = 1
    rooms_count: int = 1
    preferences: str | None = None
    arrival_time: str | None = None
    trip_type: str | None = None

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
    user_id: int | None = None
    guest_name: str
    guest_email: str
    phone: str | None = None
    check_in: date
    check_out: date
    guests: int
    rooms_count: int
    total_price: float
    status: BookingStatus
    confirmation_code: str | None = None
    confirmation_key: str | None = None
    confirmation_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingListOut(BookingOut):
    hotel_name: str | None = None
    hotel_city: str | None = None
    hotel_id: int | None = None


# ── Favorite schemas ──────────────────────────────────────────────────────────

class FavoriteOut(BaseModel):
    id: int
    hotel: HotelOut
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Health schema ─────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    version: str = "0.1.0"
