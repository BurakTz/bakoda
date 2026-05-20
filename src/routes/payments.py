import uuid

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentIn(BaseModel):
    booking_id: int | None = None
    payment_method: str = "card"
    total: float | None = None


@router.post("", status_code=200)
async def process_payment(payload: PaymentIn):
    return {
        "status": "success",
        "transaction_id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
    }
