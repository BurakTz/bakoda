"""My-bookings list filters and account linking edge cases."""
import uuid
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from src.models import Room, RoomStatus, RoomType


@pytest.fixture()
async def book_room(session_factory, sample_hotel) -> Room:
    async with session_factory() as session:
        r = Room(
            hotel_id=sample_hotel.id,
            room_number=f"M{uuid.uuid4().hex[:6].upper()}",
            type=RoomType.suite,
            capacity=4,
            price_per_night=300.0,
            status=RoomStatus.available,
        )
        session.add(r)
        await session.commit()
        await session.refresh(r)
        return r


def _s3():
    return (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    )


@pytest.mark.asyncio
async def test_ongoing_stay_appears_in_upcoming(client: AsyncClient, book_room: Room):
    """Stay started before today but not yet checked out must show under upcoming."""
    token_resp = await client.post(
        "/api/auth/register",
        json={
            "email": "ongoing@bakoda.com",
            "password": "Secure123",
            "first_name": "On",
            "last_name": "Going",
        },
    )
    headers = {"Authorization": f"Bearer {token_resp.json()['access_token']}"}
    check_in = (date.today() - timedelta(days=1)).isoformat()
    check_out = (date.today() + timedelta(days=2)).isoformat()

    with _s3()[0], _s3()[1]:
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "On Going",
                "guest_email": "ongoing@bakoda.com",
                "check_in": check_in,
                "check_out": check_out,
            },
            headers=headers,
        )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]

    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=headers)
    assert list_resp.status_code == 200
    assert any(b["id"] == booking_id for b in list_resp.json())


@pytest.mark.asyncio
async def test_register_links_prior_guest_booking(client: AsyncClient, book_room: Room):
    """Guest booking before account exists is listed after register (no second booking)."""
    email = f"guest-only-{uuid.uuid4().hex[:8]}@bakoda.com"
    check_in = (date.today() + timedelta(days=60)).isoformat()
    check_out = (date.today() + timedelta(days=63)).isoformat()

    with _s3()[0], _s3()[1]:
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Guest Only",
                "guest_email": email,
                "check_in": check_in,
                "check_out": check_out,
            },
        )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]
    assert create_resp.json()["user_id"] is None

    reg = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "Secure123",
            "first_name": "Guest",
            "last_name": "Only",
        },
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=headers)
    assert any(b["id"] == booking_id for b in list_resp.json())


@pytest.mark.asyncio
async def test_backfill_does_not_steal_other_users_orphan(
    client: AsyncClient,
    session_factory,
    sample_hotel,
):
    """Logged-in booking must not attach another guest's orphan by form email alone."""
    email = f"victim-{uuid.uuid4().hex[:8]}@bakoda.com"
    check_in_a = (date.today() + timedelta(days=70)).isoformat()
    check_out_a = (date.today() + timedelta(days=72)).isoformat()
    check_in_b = (date.today() + timedelta(days=80)).isoformat()
    check_out_b = (date.today() + timedelta(days=82)).isoformat()

    async with session_factory() as session:
        room_a = Room(
            hotel_id=sample_hotel.id,
            room_number=f"A{uuid.uuid4().hex[:6].upper()}",
            type=RoomType.double,
            capacity=2,
            price_per_night=200.0,
            status=RoomStatus.available,
        )
        room_b = Room(
            hotel_id=sample_hotel.id,
            room_number=f"B{uuid.uuid4().hex[:6].upper()}",
            type=RoomType.double,
            capacity=2,
            price_per_night=200.0,
            status=RoomStatus.available,
        )
        session.add(room_a)
        session.add(room_b)
        await session.commit()
        await session.refresh(room_a)
        await session.refresh(room_b)

    with _s3()[0], _s3()[1]:
        orphan_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": room_a.id,
                "guest_name": "Victim",
                "guest_email": email,
                "check_in": check_in_a,
                "check_out": check_out_a,
            },
        )
    assert orphan_resp.status_code == 201
    orphan_id = orphan_resp.json()["id"]

    attacker_reg = await client.post(
        "/api/auth/register",
        json={
            "email": f"attacker-{uuid.uuid4().hex[:8]}@bakoda.com",
            "password": "Secure123",
            "first_name": "Attacker",
            "last_name": "User",
        },
    )
    attacker_headers = {"Authorization": f"Bearer {attacker_reg.json()['access_token']}"}

    with _s3()[0], _s3()[1]:
        await client.post(
            "/api/bookings",
            json={
                "room_id": room_b.id,
                "guest_name": "Attacker",
                "guest_email": email,
                "check_in": check_in_b,
                "check_out": check_out_b,
            },
            headers=attacker_headers,
        )

    victim_reg = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "Secure123",
            "first_name": "Victim",
            "last_name": "User",
        },
    )
    assert victim_reg.status_code == 201
    victim_headers = {"Authorization": f"Bearer {victim_reg.json()['access_token']}"}

    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=victim_headers)
    ids = [b["id"] for b in list_resp.json()]
    assert orphan_id in ids
