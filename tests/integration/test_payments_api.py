from unittest.mock import patch

import pytest
from httpx import AsyncClient

from src.models import Room


@pytest.mark.asyncio
async def test_process_payment_with_booking_id(client: AsyncClient, sample_room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        booking_resp = await client.post("/api/bookings", json={
            "room_id": sample_room.id,
            "guest_name": "Payment Test",
            "guest_email": "payment@test.com",
            "check_in": "2027-08-01",
            "check_out": "2027-08-03",
        })

    assert booking_resp.status_code == 201
    booking_payload = booking_resp.json()
    booking_id = booking_payload["id"]

    payment_resp = await client.post("/api/payments", json={
        "booking_id": booking_id,
        "payment_method": "card",
        "total": booking_payload["total_price"],
    })
    assert payment_resp.status_code == 200
    data = payment_resp.json()
    assert data["status"] == "success"
    assert data["transaction_id"].startswith("TXN-")
