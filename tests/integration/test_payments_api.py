from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from src.models import Booking, BookingStatus, Payment, Room


async def _create_booking(client: AsyncClient, room: Room) -> dict:
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        booking_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": room.id,
                "guest_name": "Payment Test",
                "guest_email": "payment@test.com",
                "check_in": "2027-08-01",
                "check_out": "2027-08-03",
            },
        )
    assert booking_resp.status_code == 201
    return booking_resp.json()


@pytest.mark.asyncio
async def test_process_payment_with_booking_id(client: AsyncClient, sample_room: Room):
    booking_payload = await _create_booking(client, sample_room)
    booking_id = booking_payload["id"]

    payment_resp = await client.post(
        "/api/payments",
        json={
            "booking_id": booking_id,
            "payment_method": "card",
            "total": booking_payload["total_price"],
        },
    )
    assert payment_resp.status_code == 200
    data = payment_resp.json()
    assert data["status"] == "success"
    assert data["transaction_id"].startswith("TXN-")


@pytest.mark.asyncio
async def test_process_payment_persists_record(
    client: AsyncClient, sample_room: Room, db_session
):
    booking_payload = await _create_booking(client, sample_room)
    booking_id = booking_payload["id"]

    payment_resp = await client.post(
        "/api/payments",
        json={
            "booking_id": booking_id,
            "payment_method": "card",
            "total": booking_payload["total_price"],
        },
    )
    assert payment_resp.status_code == 200
    txn_id = payment_resp.json()["transaction_id"]

    # A Payment row was persisted for this booking.
    result = await db_session.execute(
        select(Payment).where(Payment.booking_id == booking_id)
    )
    payment = result.scalar_one()
    assert payment.transaction_id == txn_id
    assert payment.status == "success"
    assert payment.amount == booking_payload["total_price"]
    assert payment.method == "card"

    # The booking is marked confirmed/paid.
    booking = await db_session.get(Booking, booking_id)
    assert booking.status == BookingStatus.confirmed


@pytest.mark.asyncio
async def test_process_payment_without_booking_id_is_graceful(client: AsyncClient):
    payment_resp = await client.post(
        "/api/payments",
        json={"payment_method": "card", "total": 100.0},
    )
    assert payment_resp.status_code == 200
    data = payment_resp.json()
    assert data["status"] == "success"
    assert data["transaction_id"].startswith("TXN-")
