import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_contact_submit_returns_ticket(client: AsyncClient):
    resp = await client.post("/api/contact", json={
        "name": "Test User",
        "email": "contact@test.com",
        "subject": "Question",
        "message": "Merhaba, bilgi almak istiyorum.",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["ticket_id"].startswith("TKT-")
