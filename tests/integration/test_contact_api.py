import pytest
from httpx import AsyncClient
from sqlalchemy import select

from src.models import ContactMessage


@pytest.mark.asyncio
async def test_contact_submit_returns_ticket(client: AsyncClient):
    resp = await client.post(
        "/api/contact",
        json={
            "name": "Test User",
            "email": "contact@test.com",
            "subject": "Question",
            "message": "Merhaba, bilgi almak istiyorum.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["ticket_id"].startswith("TKT-")


@pytest.mark.asyncio
async def test_contact_submit_persists_message(client: AsyncClient, db_session):
    resp = await client.post(
        "/api/contact",
        json={
            "name": "Persist User",
            "email": "persist@test.com",
            "subject": "Persisted",
            "message": "Bu mesaj kaydedilmeli.",
        },
    )
    assert resp.status_code == 200
    ticket_id = resp.json()["ticket_id"]

    result = await db_session.execute(
        select(ContactMessage).where(ContactMessage.ticket_id == ticket_id)
    )
    contact = result.scalar_one()
    assert contact.name == "Persist User"
    assert contact.email == "persist@test.com"
    assert contact.subject == "Persisted"
    assert contact.message == "Bu mesaj kaydedilmeli."
    assert contact.status == "open"
