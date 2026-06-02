import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.models import ContactMessage


def _make_ticket_id() -> str:
    return f"TKT-{uuid.uuid4().hex[:6].upper()}"


async def create_contact_message(
    db: AsyncSession,
    name: str,
    email: str,
    message: str,
    subject: str | None = None,
) -> ContactMessage:
    """Persist a contact message with a generated ticket id."""
    contact = ContactMessage(
        name=name,
        email=email,
        subject=subject,
        message=message,
        ticket_id=_make_ticket_id(),
        status="open",
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact
