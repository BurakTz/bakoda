import uuid
from unittest.mock import patch

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
        patch(
            "src.routes.bookings.s3_service.upload_confirmation",
            return_value="confirmations/1.json",
        ),
        patch(
            "src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/presigned"
        ),
    )


@pytest.mark.asyncio
async def test_authenticated_booking_appears_in_my_bookings(
    client: AsyncClient,
    book_room: Room,
):
    token_resp = await client.post(
        "/api/auth/register",
        json={
            "email": "bookings-link@bakoda.com",
            "password": "Secure123",
            "first_name": "Booking",
            "last_name": "Tester",
        },
    )
    token = token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Booking Tester",
                "guest_email": "bookings-link@bakoda.com",
                "check_in": "2027-11-01",
                "check_out": "2027-11-04",
            },
            headers=headers,
        )
    assert create_resp.status_code == 201

    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=headers)
    assert list_resp.status_code == 200
    ids = [b["id"] for b in list_resp.json()]
    assert create_resp.json()["id"] in ids


@pytest.mark.asyncio
async def test_authenticated_booking_with_different_guest_email_still_lists(
    client: AsyncClient,
    book_room: Room,
):
    """Logged-in user sees booking even when form email differs from account email."""
    token_resp = await client.post(
        "/api/auth/register",
        json={
            "email": "account@bakoda.com",
            "password": "Secure123",
            "first_name": "Acc",
            "last_name": "Ount",
        },
    )
    headers = {"Authorization": f"Bearer {token_resp.json()['access_token']}"}

    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Acc Ount",
                "guest_email": "other-inbox@bakoda.com",
                "check_in": "2027-12-10",
                "check_out": "2027-12-12",
            },
            headers=headers,
        )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]
    assert create_resp.json()["user_id"] is not None

    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=headers)
    assert any(b["id"] == booking_id for b in list_resp.json())


@pytest.mark.asyncio
async def test_guest_booking_linked_by_email_after_login(
    client: AsyncClient,
    book_room: Room,
):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Guest User",
                "guest_email": "guest-link@bakoda.com",
                "check_in": "2027-12-01",
                "check_out": "2027-12-03",
            },
        )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]

    token_resp = await client.post(
        "/api/auth/register",
        json={
            "email": "guest-link@bakoda.com",
            "password": "Secure123",
            "first_name": "Guest",
            "last_name": "User",
        },
    )
    headers = {"Authorization": f"Bearer {token_resp.json()['access_token']}"}

    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=headers)
    assert list_resp.status_code == 200
    assert any(b["id"] == booking_id for b in list_resp.json())


@pytest.mark.asyncio
async def test_create_booking_success(client: AsyncClient, book_room: Room):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Ayşe Demir",
                "guest_email": "ayse@test.com",
                "check_in": "2027-03-01",
                "check_out": "2027-03-05",
            },
        )
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
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        await client.post("/api/bookings", json=payload)
        resp = await client.post("/api/bookings", json={**payload, "guest_email": "b@test.com"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_booking_rejects_insufficient_rooms(
    client: AsyncClient,
    session_factory,
    sample_hotel,
):
    async with session_factory() as session:
        lone = Room(
            hotel_id=sample_hotel.id,
            room_number=f"L{uuid.uuid4().hex[:6].upper()}",
            type=RoomType.double,
            capacity=2,
            price_per_night=200.0,
            status=RoomStatus.available,
        )
        session.add(lone)
        await session.commit()
        await session.refresh(lone)
        room_id = lone.id

    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        resp = await client.post(
            "/api/bookings",
            json={
                "room_id": room_id,
                "guest_name": "Multi Room",
                "guest_email": "multi@test.com",
                "check_in": "2027-08-10",
                "check_out": "2027-08-12",
                "rooms_count": 2,
            },
        )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_booking_invalid_dates(client: AsyncClient, book_room: Room):
    resp = await client.post(
        "/api/bookings",
        json={
            "room_id": book_room.id,
            "guest_name": "Test",
            "guest_email": "t@test.com",
            "check_in": "2027-05-05",
            "check_out": "2027-05-01",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_booking_not_found(client: AsyncClient):
    resp = await client.get("/api/bookings/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cancel_booking(client: AsyncClient, book_room: Room):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Cancel Me",
                "guest_email": "cancel@test.com",
                "check_in": "2027-06-01",
                "check_out": "2027-06-03",
            },
        )
    booking_id = create_resp.json()["id"]
    cancel_resp = await client.patch(f"/api/bookings/{booking_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_create_booking_survives_s3_upload_failure(client: AsyncClient, book_room: Room):
    with patch(
        "src.routes.bookings.s3_service.upload_confirmation", side_effect=RuntimeError("s3 down")
    ):
        resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "S3 Fail",
                "guest_email": "s3fail@test.com",
                "check_in": "2027-09-01",
                "check_out": "2027-09-03",
            },
        )
    assert resp.status_code == 201
    assert resp.json()["confirmation_url"] is None


@pytest.mark.asyncio
async def test_get_booking_presigned_url_failure_still_returns_booking(
    client: AsyncClient,
    book_room: Room,
):
    with (
        patch(
            "src.routes.bookings.s3_service.upload_confirmation",
            return_value="confirmations/x.json",
        ),
        patch(
            "src.routes.bookings.s3_service.get_presigned_url", side_effect=RuntimeError("s3 down")
        ),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Presign Fail",
                "guest_email": "presign@test.com",
                "check_in": "2027-10-01",
                "check_out": "2027-10-03",
            },
        )
    booking_id = create_resp.json()["id"]

    with patch(
        "src.routes.bookings.s3_service.get_presigned_url", side_effect=RuntimeError("s3 down")
    ):
        resp = await client.get(f"/api/bookings/{booking_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == booking_id
    assert resp.json().get("confirmation_url") is None


@pytest.mark.asyncio
async def test_cancel_booking_not_found(client: AsyncClient):
    resp = await client.patch("/api/bookings/99999/cancel")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cancel_booking_twice(client: AsyncClient, book_room: Room):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Cancel Twice",
                "guest_email": "twice@test.com",
                "check_in": "2027-07-01",
                "check_out": "2027-07-03",
            },
        )
    booking_id = create_resp.json()["id"]
    await client.patch(f"/api/bookings/{booking_id}/cancel")
    resp = await client.patch(f"/api/bookings/{booking_id}/cancel")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_booking_includes_hotel_fields(
    client: AsyncClient,
    book_room: Room,
    sample_hotel,
):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Detail Guest",
                "guest_email": "detail@test.com",
                "check_in": "2027-12-01",
                "check_out": "2027-12-04",
            },
        )
    booking_id = create_resp.json()["id"]

    resp = await client.get(f"/api/bookings/{booking_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == booking_id
    assert body["hotel_name"] == sample_hotel.name
    assert body["hotel_id"] == sample_hotel.id
    assert body["confirmation_code"] == f"BKD-{booking_id:04d}-2026"
    assert body["guests"] == 1
    assert body["total_price"] > 0
    assert body["room_name"]


@pytest.mark.asyncio
async def test_my_booking_detail_requires_auth(client: AsyncClient, book_room: Room):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Auth Guest",
                "guest_email": "auth-detail@test.com",
                "check_in": "2028-01-01",
                "check_out": "2028-01-03",
            },
        )
    booking_id = create_resp.json()["id"]

    unauth = await client.get(f"/api/users/me/bookings/{booking_id}")
    assert unauth.status_code == 401


@pytest.mark.asyncio
async def test_my_booking_detail_returns_full_booking(
    client: AsyncClient,
    book_room: Room,
    sample_hotel,
):
    token_resp = await client.post(
        "/api/auth/register",
        json={
            "email": "detail-owner@bakoda.com",
            "password": "Secure123",
            "first_name": "Detail",
            "last_name": "Owner",
        },
    )
    headers = {"Authorization": f"Bearer {token_resp.json()['access_token']}"}

    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Detail Owner",
                "guest_email": "detail-owner@bakoda.com",
                "check_in": "2028-02-01",
                "check_out": "2028-02-05",
                "guests": 2,
                "rooms_count": 1,
            },
            headers=headers,
        )
    booking_id = create_resp.json()["id"]

    resp = await client.get(f"/api/users/me/bookings/{booking_id}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == booking_id
    assert body["hotel_name"] == sample_hotel.name
    assert body["status"] == "confirmed"
    assert body["guests"] == 2
    assert body["check_in"] == "2028-02-01"
    assert body["check_out"] == "2028-02-05"


async def _register(client: AsyncClient, email: str) -> dict:
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "Secure123",
            "first_name": "Up",
            "last_name": "Date",
        },
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _create_booking(client: AsyncClient, room_id: int, email: str, headers=None, **overrides):
    payload = {
        "room_id": room_id,
        "guest_name": "Update Guest",
        "guest_email": email,
        "check_in": "2029-01-01",
        "check_out": "2029-01-04",
    }
    payload.update(overrides)
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        resp = await client.post("/api/bookings", json=payload, headers=headers or {})
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_update_booking_success(client: AsyncClient, book_room: Room):
    headers = await _register(client, "update-owner@bakoda.com")
    created = await _create_booking(
        client, book_room.id, "update-owner@bakoda.com", headers,
        check_in="2029-02-01", check_out="2029-02-04",
    )
    original_price = created["total_price"]

    with patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"):
        resp = await client.patch(
            f"/api/bookings/{created['id']}",
            json={"check_in": "2029-02-01", "check_out": "2029-02-08", "guests": 2},
            headers=headers,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["check_out"] == "2029-02-08"
    assert body["guests"] == 2
    # 7 nights vs 3 nights => price grew
    assert body["total_price"] > original_price
    assert body["total_price"] == book_room.price_per_night * 7


@pytest.mark.asyncio
async def test_update_booking_room_not_available(client: AsyncClient, book_room: Room):
    headers = await _register(client, "update-conflict@bakoda.com")
    # First booking blocks the dates we'll move the second one onto.
    await _create_booking(
        client, book_room.id, "update-conflict@bakoda.com", headers,
        check_in="2029-05-10", check_out="2029-05-15",
    )
    second = await _create_booking(
        client, book_room.id, "update-conflict@bakoda.com", headers,
        check_in="2029-06-01", check_out="2029-06-03",
    )

    resp = await client.patch(
        f"/api/bookings/{second['id']}",
        json={"check_in": "2029-05-11", "check_out": "2029-05-13"},
        headers=headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_booking_not_found(client: AsyncClient):
    headers = await _register(client, "update-missing@bakoda.com")
    resp = await client.patch(
        "/api/bookings/99999",
        json={"guests": 2},
        headers=headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_cancelled_booking_rejected(client: AsyncClient, book_room: Room):
    headers = await _register(client, "update-cancelled@bakoda.com")
    created = await _create_booking(
        client, book_room.id, "update-cancelled@bakoda.com", headers,
        check_in="2029-07-01", check_out="2029-07-03",
    )
    await client.patch(f"/api/bookings/{created['id']}/cancel")

    resp = await client.patch(
        f"/api/bookings/{created['id']}",
        json={"guests": 2},
        headers=headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_booking_other_user_forbidden(client: AsyncClient, book_room: Room):
    owner_headers = await _register(client, "update-real-owner@bakoda.com")
    created = await _create_booking(
        client, book_room.id, "update-real-owner@bakoda.com", owner_headers,
        check_in="2029-08-01", check_out="2029-08-03",
    )
    other_headers = await _register(client, "update-intruder@bakoda.com")

    resp = await client.patch(
        f"/api/bookings/{created['id']}",
        json={"guests": 2},
        headers=other_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_booking_requires_auth(client: AsyncClient, book_room: Room):
    created = await _create_booking(
        client, book_room.id, "update-noauth@bakoda.com",
        check_in="2029-09-01", check_out="2029-09-03",
    )
    resp = await client.patch(
        f"/api/bookings/{created['id']}",
        json={"guests": 2},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_my_booking_detail_not_visible_to_other_user(
    client: AsyncClient,
    book_room: Room,
):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        create_resp = await client.post(
            "/api/bookings",
            json={
                "room_id": book_room.id,
                "guest_name": "Private Guest",
                "guest_email": "private@test.com",
                "check_in": "2028-03-01",
                "check_out": "2028-03-03",
            },
        )
    booking_id = create_resp.json()["id"]

    other = await client.post(
        "/api/auth/register",
        json={
            "email": "other-user@bakoda.com",
            "password": "Secure123",
            "first_name": "Other",
            "last_name": "User",
        },
    )
    headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    resp = await client.get(f"/api/users/me/bookings/{booking_id}", headers=headers)
    assert resp.status_code == 404
