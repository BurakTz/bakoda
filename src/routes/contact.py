from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.services import contact_service

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    subject: str | None = None
    message: str


@router.post("", status_code=200)
async def send_contact(payload: ContactIn, db: AsyncSession = Depends(get_db)):
    contact = await contact_service.create_contact_message(
        db,
        name=payload.name,
        email=str(payload.email),
        message=payload.message,
        subject=payload.subject,
    )
    return {
        "success": True,
        "ticket_id": contact.ticket_id,
    }
