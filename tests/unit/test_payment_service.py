from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models import Booking, BookingStatus
from src.services import booking_service
from src.services.payment_service import BookingNotFoundError, _make_transaction_id, create_payment


def _booking_stub(**kwargs) -> Booking:
    b = Booking()
    defaults = dict(id=1, status=BookingStatus.confirmed)
    defaults.update(kwargs)
    for k, v in defaults.items():
        setattr(b, k, v)
    return b


def test_make_transaction_id_format():
    txn = _make_transaction_id()
    assert txn.startswith("TXN-")
    assert len(txn) == len("TXN-") + 8


@pytest.mark.asyncio
async def test_create_payment_success_marks_booking_paid():
    booking = _booking_stub(id=9)
    db = AsyncMock()
    db.add = MagicMock()  # .add() senkron
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with (
        patch.object(booking_service, "get_booking", AsyncMock(return_value=booking)),
        patch.object(
            booking_service, "mark_booking_paid", AsyncMock(return_value=booking)
        ) as mark_paid,
    ):
        payment = await create_payment(db, booking_id=9, amount=1500.0, card_last4="4242")

    assert payment.booking_id == 9
    assert payment.amount == 1500.0
    assert payment.status == "success"
    assert payment.transaction_id.startswith("TXN-")
    assert payment.card_last4 == "4242"
    mark_paid.assert_awaited_once_with(db, 9)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_payment_booking_not_found():
    db = AsyncMock()
    with patch.object(
        booking_service,
        "get_booking",
        AsyncMock(side_effect=booking_service.BookingNotFoundError("missing")),
    ):
        with pytest.raises(BookingNotFoundError, match="Booking 404"):
            await create_payment(db, booking_id=404, amount=100.0)


@pytest.mark.asyncio
async def test_create_payment_failed_status_skips_mark_paid():
    booking = _booking_stub(id=2)
    db = AsyncMock()
    db.add = MagicMock()  # .add() senkron
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with (
        patch.object(booking_service, "get_booking", AsyncMock(return_value=booking)),
        patch.object(booking_service, "mark_booking_paid", AsyncMock()) as mark_paid,
    ):
        payment = await create_payment(db, booking_id=2, amount=50.0, status="failed")

    assert payment.status == "failed"
    mark_paid.assert_not_called()
