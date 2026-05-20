import uuid

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    subject: str | None = None
    message: str


@router.post("", status_code=200)
async def send_contact(payload: ContactIn):
    return {
        "success": True,
        "ticket_id": f"TKT-{uuid.uuid4().hex[:6].upper()}",
    }
