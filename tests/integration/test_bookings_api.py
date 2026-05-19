from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Room, RoomStatus, RoomType


@pytest.fixture()
async def room(db_session: AsyncSession) -> Room:
    r = Room(room_number="501", type=RoomType.suite, capacity=4, price_per_night=300.0, status=RoomStatus.available)
    db_session.add(r)
    await db_session.commit()
    await db_session.refresh(r)
    return r


@pytest.mark.asyncio
async def test_create_booking_success(client: AsyncClient, room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="confirmations/1.json"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/presigned"):
        resp = await client.post("/bookings", json={
            "room_id": room.id,
            "guest_name": "Ayşe Demir",
            "guest_email": "ayse@test.com",
            "check_in": "2026-09-01",
            "check_out": "2026-09-05",
        })
    assert resp.status_code == 201
    data = resp.json()
    assert data["room_id"] == room.id
    assert data["total_price"] == 1200.0
    assert data["status"] == "confirmed"


@pytest.mark.asyncio
async def test_create_booking_conflict(client: AsyncClient, room: Room):
    payload = {
        "room_id": room.id,
        "guest_name": "Guest A",
        "guest_email": "a@test.com",
        "check_in": "2026-10-01",
        "check_out": "2026-10-05",
    }
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        await client.post("/bookings", json=payload)
        resp = await client.post("/bookings", json={**payload, "guest_email": "b@test.com"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_booking_invalid_dates(client: AsyncClient, room: Room):
    resp = await client.post("/bookings", json={
        "room_id": room.id,
        "guest_name": "Test",
        "guest_email": "t@test.com",
        "check_in": "2026-09-05",
        "check_out": "2026-09-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_booking_not_found(client: AsyncClient):
    resp = await client.get("/bookings/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cancel_booking(client: AsyncClient, room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        create_resp = await client.post("/bookings", json={
            "room_id": room.id,
            "guest_name": "Cancel Me",
            "guest_email": "cancel@test.com",
            "check_in": "2026-11-01",
            "check_out": "2026-11-03",
        })
    booking_id = create_resp.json()["id"]

    cancel_resp = await client.patch(f"/bookings/{booking_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_booking_twice(client: AsyncClient, room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        create_resp = await client.post("/bookings", json={
            "room_id": room.id,
            "guest_name": "Cancel Twice",
            "guest_email": "twice@test.com",
            "check_in": "2026-12-01",
            "check_out": "2026-12-03",
        })
    booking_id = create_resp.json()["id"]
    await client.patch(f"/bookings/{booking_id}/cancel")
    resp = await client.patch(f"/bookings/{booking_id}/cancel")
    assert resp.status_code == 409
