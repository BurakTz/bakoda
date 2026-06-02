from datetime import date

import pytest
from pydantic import ValidationError

from src.schemas import (
    BookingCreate,
    BookingUpdate,
    ChangePasswordIn,
    HealthOut,
    RegisterIn,
    ResetPasswordIn,
    ReviewCreate,
    SavedCardCreate,
)


def test_register_password_min_length():
    user = RegisterIn(
        email="u@example.com",
        password="longenough",
        first_name="A",
        last_name="B",
    )
    assert user.password == "longenough"


def test_register_password_too_short():
    with pytest.raises(ValidationError):
        RegisterIn(email="u@example.com", password="short", first_name="A", last_name="B")


def test_booking_create_valid_dates():
    booking = BookingCreate(
        room_id=1,
        guest_name="Ali",
        guest_email="ali@example.com",
        check_in=date(2026, 8, 1),
        check_out=date(2026, 8, 5),
        guests=2,
        rooms_count=1,
    )
    assert booking.guests == 2


def test_booking_create_rejects_check_out_before_check_in():
    with pytest.raises(ValidationError):
        BookingCreate(
            room_id=1,
            guest_name="Ali",
            guest_email="ali@example.com",
            check_in=date(2026, 8, 5),
            check_out=date(2026, 8, 1),
        )


def test_booking_create_rejects_zero_guests():
    with pytest.raises(ValidationError):
        BookingCreate(
            room_id=1,
            guest_name="Ali",
            guest_email="ali@example.com",
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 3),
            guests=0,
        )


def test_booking_update_allows_none_counts():
    update = BookingUpdate(check_in=date(2026, 9, 1))
    assert update.guests is None


def test_booking_update_rejects_zero_guests():
    with pytest.raises(ValidationError):
        BookingUpdate(guests=0)


def test_review_create_strips_text_and_title():
    review = ReviewCreate(rating=7.5, title="  Başlık  ", text="  Metin  ")
    assert review.text == "Metin"
    assert review.title == "Başlık"


def test_review_create_rejects_blank_text():
    with pytest.raises(ValidationError):
        ReviewCreate(rating=5.0, text="   ")


def test_review_create_title_empty_becomes_none():
    review = ReviewCreate(rating=6.0, title="   ", text="Yorum")
    assert review.title is None


@pytest.mark.parametrize(
    ("brand", "last4", "month", "year"),
    [
        ("visa", "4242", 12, 28),
        ("mc", "5555", 1, 30),
        ("amex", "0001", 6, 29),
        ("troy", "9999", 3, 31),
    ],
)
def test_saved_card_create_accepts_valid_brands(brand, last4, month, year):
    card = SavedCardCreate(
        brand=brand,
        last4=last4,
        holder_name="Test",
        exp_month=month,
        exp_year=year,
    )
    assert card.brand == brand


def test_saved_card_create_rejects_invalid_brand():
    with pytest.raises(ValidationError):
        SavedCardCreate(
            brand="discover",
            last4="4242",
            holder_name="Test",
            exp_month=12,
            exp_year=28,
        )


def test_saved_card_create_rejects_bad_last4():
    with pytest.raises(ValidationError):
        SavedCardCreate(
            brand="visa",
            last4="42",
            holder_name="Test",
            exp_month=12,
            exp_year=28,
        )


def test_saved_card_create_rejects_invalid_month():
    with pytest.raises(ValidationError):
        SavedCardCreate(
            brand="visa",
            last4="4242",
            holder_name="Test",
            exp_month=13,
            exp_year=28,
        )


def test_reset_and_change_password_strength():
    with pytest.raises(ValidationError):
        ResetPasswordIn(reset_token="tok", new_password="abc")
    with pytest.raises(ValidationError):
        ChangePasswordIn(current_password="old", new_password="x")


def test_health_out_defaults():
    health = HealthOut(status="ok")
    assert health.version == "0.1.0"
