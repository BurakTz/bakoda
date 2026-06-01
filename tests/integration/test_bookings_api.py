from unittest.mock import patch

import uuid

import pytest
from httpx import AsyncClient

from src.models import Room, RoomStatus, RoomType


@pytest.fixture()
async def book_room(session_factory, sample_hotel) -> Room:
    async with session_factory() as session:
        r = Room(
            hotel_id=sample_hotel.id,
            room_number=f"B{uuid.uuid4().hex[:6].upper()}",
            type=RoomType.suite,
            capacity=4,
            price_per_night=300.0,
            status=RoomStatus.available,
        )
        session.add(r)
        await session.commit()
        await session.refresh(r)
        return r


def _s3_patch():
    return (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="confirmations/1.json"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/presigned"),
    )


@pytest.mark.asyncio
async def test_create_booking_success(client: AsyncClient, book_room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        resp = await client.post("/api/bookings", json={
            "room_id": book_room.id,
            "guest_name": "Ayşe Demir",
            "guest_email": "ayse@test.com",
            "check_in": "2027-03-01",
            "check_out": "2027-03-05",
        })
    assert resp.status_code == 201
    data = resp.json()
    assert data["room_id"] == book_room.id
    assert data["total_price"] == 1200.0
    assert data["status"] == "confirmed"
    assert data["confirmation_code"].startswith("BKD-")


@pytest.mark.asyncio
async def test_create_booking_conflict(client: AsyncClient, book_room: Room):
    payload = {
        "room_id": book_room.id,
        "guest_name": "Guest A",
        "guest_email": "a@test.com",
        "check_in": "2027-04-01",
        "check_out": "2027-04-05",
    }
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        await client.post("/api/bookings", json=payload)
        resp = await client.post("/api/bookings", json={**payload, "guest_email": "b@test.com"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_booking_invalid_dates(client: AsyncClient, book_room: Room):
    resp = await client.post("/api/bookings", json={
        "room_id": book_room.id,
        "guest_name": "Test",
        "guest_email": "t@test.com",
        "check_in": "2027-05-05",
        "check_out": "2027-05-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_booking_not_found(client: AsyncClient):
    resp = await client.get("/api/bookings/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cancel_booking(client: AsyncClient, book_room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        create_resp = await client.post("/api/bookings", json={
            "room_id": book_room.id,
            "guest_name": "Cancel Me",
            "guest_email": "cancel@test.com",
            "check_in": "2027-06-01",
            "check_out": "2027-06-03",
        })
    booking_id = create_resp.json()["id"]
    cancel_resp = await client.patch(f"/api/bookings/{booking_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_booking_twice(client: AsyncClient, book_room: Room):
    with patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"), \
         patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        create_resp = await client.post("/api/bookings", json={
            "room_id": book_room.id,
            "guest_name": "Cancel Twice",
            "guest_email": "twice@test.com",
            "check_in": "2027-07-01",
            "check_out": "2027-07-03",
        })
    booking_id = create_resp.json()["id"]
    await client.patch(f"/api/bookings/{booking_id}/cancel")
    resp = await client.patch(f"/api/bookings/{booking_id}/cancel")
    assert resp.status_code == 409
