import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Payment
from src.services import booking_service


class BookingNotFoundError(Exception):
    pass


def _make_transaction_id() -> str:
    return f"TXN-{uuid.uuid4().hex[:8].upper()}"


async def create_payment(
    db: AsyncSession,
    booking_id: int,
    amount: float,
    method: str = "card",
    currency: str = "TRY",
    card_last4: str | None = None,
    status: str = "success",
) -> Payment:
    """Persist a payment for an existing booking and mark the booking paid.

    Raises ``BookingNotFoundError`` if the booking does not exist.
    """
    try:
        booking = await booking_service.get_booking(db, booking_id)
    except booking_service.BookingNotFoundError as exc:
        raise BookingNotFoundError(f"Booking {booking_id} not found") from exc

    payment = Payment(
        booking_id=booking.id,
        amount=amount,
        currency=currency,
        method=method,
        status=status,
        transaction_id=_make_transaction_id(),
        card_last4=card_last4,
    )
    db.add(payment)
    await db.flush()

    if status == "success":
        await booking_service.mark_booking_paid(db, booking.id)

    await db.commit()
    await db.refresh(payment)
    return payment
