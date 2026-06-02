"""Comprehensive integration tests — raises coverage to ≥70%."""

import uuid

import pytest
from httpx import AsyncClient

from src.models import Hotel, Room

pytestmark = pytest.mark.asyncio


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _email() -> str:
    return f"test_{_uid()}@bakoda.com"


async def _register(client: AsyncClient, email: str, password: str = "Test1234!") -> str:
    """Register and return access token."""
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "first_name": "Test", "last_name": "User"},
    )
    return resp.json()["access_token"]


# ── Auth ──────────────────────────────────────────────────────────────────────


async def test_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={"email": _email(), "password": "Test1234!", "first_name": "A", "last_name": "B"},
    )
    assert resp.status_code == 201
    assert "access_token" in resp.json()


async def test_register_duplicate(client: AsyncClient):
    email = _email()
    payload = {"email": email, "password": "Test1234!", "first_name": "A", "last_name": "B"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


async def test_login_success(client: AsyncClient):
    email = _email()
    await _register(client, email)
    resp = await client.post("/api/auth/login", json={"email": email, "password": "Test1234!"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login_wrong_password(client: AsyncClient):
    email = _email()
    await _register(client, email)
    resp = await client.post("/api/auth/login", json={"email": email, "password": "Bad!"})
    assert resp.status_code == 401


async def test_login_unknown_user(client: AsyncClient):
    resp = await client.post(
        "/api/auth/login", json={"email": "nobody@bakoda.com", "password": "Test1234!"}
    )
    assert resp.status_code == 401


async def test_forgot_password_returns_dev_code(client: AsyncClient):
    email = _email()
    await _register(client, email)
    resp = await client.post("/api/auth/forgot-password", json={"email": email})
    assert resp.status_code == 200
    assert "dev_code" in resp.json()


async def test_verify_reset_code_valid(client: AsyncClient):
    email = _email()
    await _register(client, email)
    fp = await client.post("/api/auth/forgot-password", json={"email": email})
    code = fp.json()["dev_code"]
    resp = await client.post(
        "/api/auth/verify-reset-code", json={"email": email, "code": code}
    )
    assert resp.status_code == 200
    assert resp.json()["valid"] is True
    assert "reset_token" in resp.json()


async def test_verify_reset_code_invalid(client: AsyncClient):
    resp = await client.post(
        "/api/auth/verify-reset-code",
        json={"email": "nobody@bakoda.com", "code": "000000"},
    )
    assert resp.status_code == 400


async def test_reset_password_full_flow(client: AsyncClient):
    email = _email()
    await _register(client, email)
    fp = await client.post("/api/auth/forgot-password", json={"email": email})
    code = fp.json()["dev_code"]
    verify = await client.post(
        "/api/auth/verify-reset-code", json={"email": email, "code": code}
    )
    reset_token = verify.json()["reset_token"]

    reset_resp = await client.post(
        "/api/auth/reset-password",
        json={"reset_token": reset_token, "new_password": "NewPass999!"},
    )
    assert reset_resp.status_code == 200

    login_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "NewPass999!"}
    )
    assert login_resp.status_code == 200


async def test_reset_password_invalid_token(client: AsyncClient):
    resp = await client.post(
        "/api/auth/reset-password",
        json={"reset_token": "badtoken", "new_password": "NewPass999!"},
    )
    assert resp.status_code == 400


async def test_reset_password_bad_token_format(client: AsyncClient):
    resp = await client.post(
        "/api/auth/reset-password",
        json={"reset_token": "999:000000", "new_password": "NewPass999!"},
    )
    assert resp.status_code == 400


# ── Hotels ────────────────────────────────────────────────────────────────────


async def test_list_destinations(client: AsyncClient):
    resp = await client.get("/api/hotels/destinations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_search_locations_no_query(client: AsyncClient):
    resp = await client.get("/api/hotels/locations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_search_locations_with_query(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.get("/api/hotels/locations?q=İstanbul")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_list_hotels_no_filters(client: AsyncClient):
    resp = await client.get("/api/hotels")
    assert resp.status_code == 200
    data = resp.json()
    assert "hotels" in data and "total" in data and "page" in data


async def test_list_hotels_city_filter(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.get("/api/hotels?city=İstanbul")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["hotels"], list)


async def test_list_hotels_with_dates(client: AsyncClient):
    resp = await client.get("/api/hotels?check_in=2027-08-01&check_out=2027-08-05")
    assert resp.status_code == 200


async def test_list_hotels_bad_dates(client: AsyncClient):
    resp = await client.get("/api/hotels?check_in=2027-08-05&check_out=2027-08-01")
    assert resp.status_code == 400


async def test_list_hotels_price_sort(client: AsyncClient):
    resp = await client.get("/api/hotels?sort=price-asc")
    assert resp.status_code == 200


async def test_list_hotels_rating_sort(client: AsyncClient):
    resp = await client.get("/api/hotels?sort=rating")
    assert resp.status_code == 200


async def test_get_hotel_found(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.get(f"/api/hotels/{sample_hotel.id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == sample_hotel.name


async def test_get_hotel_not_found(client: AsyncClient):
    resp = await client.get("/api/hotels/999999")
    assert resp.status_code == 404


async def test_get_hotel_with_dates(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.get(
        f"/api/hotels/{sample_hotel.id}?check_in=2027-09-01&check_out=2027-09-05"
    )
    assert resp.status_code == 200


async def test_get_hotel_only_one_date(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.get(f"/api/hotels/{sample_hotel.id}?check_in=2027-09-01")
    assert resp.status_code == 400


async def test_get_hotel_bad_date_order(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.get(
        f"/api/hotels/{sample_hotel.id}?check_in=2027-09-05&check_out=2027-09-01"
    )
    assert resp.status_code == 400


async def test_create_review_requires_auth(client: AsyncClient, sample_hotel: Hotel):
    resp = await client.post(
        f"/api/hotels/{sample_hotel.id}/reviews",
        json={"rating": 7.5, "text": "Güzel otel."},
    )
    assert resp.status_code == 401


async def test_create_review_authenticated(auth_client, sample_hotel: Hotel):
    client, headers = auth_client
    resp = await client.post(
        f"/api/hotels/{sample_hotel.id}/reviews",
        json={"rating": 8.0, "text": "Çok iyi bir deneyimdi."},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["rating"] == 8.0


async def test_create_review_hotel_not_found(auth_client):
    client, headers = auth_client
    resp = await client.post(
        "/api/hotels/999999/reviews",
        json={"rating": 5.0, "text": "Test."},
        headers=headers,
    )
    assert resp.status_code == 404


# ── Bookings ──────────────────────────────────────────────────────────────────


async def test_create_booking_success(client: AsyncClient, sample_room: Room):
    resp = await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "Ahmet Yılmaz",
            "guest_email": "ahmet@example.com",
            "check_in": "2027-10-01",
            "check_out": "2027-10-05",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["room_id"] == sample_room.id
    assert data["status"] == "confirmed"
    assert data["total_price"] == sample_room.price_per_night * 4


async def test_get_booking_success(client: AsyncClient, sample_room: Room):
    create = await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "Guest",
            "guest_email": "g@example.com",
            "check_in": "2027-11-01",
            "check_out": "2027-11-03",
        },
    )
    booking_id = create.json()["id"]
    resp = await client.get(f"/api/bookings/{booking_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == booking_id


async def test_get_booking_not_found(client: AsyncClient):
    resp = await client.get("/api/bookings/999999")
    assert resp.status_code == 404


async def test_cancel_booking_success(client: AsyncClient, sample_room: Room):
    create = await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "Cancel User",
            "guest_email": "cancel@example.com",
            "check_in": "2027-12-01",
            "check_out": "2027-12-04",
        },
    )
    booking_id = create.json()["id"]
    cancel = await client.patch(f"/api/bookings/{booking_id}/cancel")
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"


async def test_cancel_booking_twice_returns_409(client: AsyncClient, sample_room: Room):
    create = await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "Double Cancel",
            "guest_email": "dcancel@example.com",
            "check_in": "2028-01-01",
            "check_out": "2028-01-03",
        },
    )
    booking_id = create.json()["id"]
    await client.patch(f"/api/bookings/{booking_id}/cancel")
    resp = await client.patch(f"/api/bookings/{booking_id}/cancel")
    assert resp.status_code == 409


async def test_create_booking_date_conflict(client: AsyncClient, sample_room: Room):
    await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "First",
            "guest_email": "first@example.com",
            "check_in": "2028-02-01",
            "check_out": "2028-02-10",
        },
    )
    resp = await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "Second",
            "guest_email": "second@example.com",
            "check_in": "2028-02-05",
            "check_out": "2028-02-15",
        },
    )
    assert resp.status_code == 409


async def test_create_booking_authenticated(auth_client, sample_room: Room):
    client, headers = auth_client
    resp = await client.post(
        "/api/bookings",
        json={
            "room_id": sample_room.id,
            "guest_name": "Auth User",
            "guest_email": "fixture_user@bakoda.com",
            "check_in": "2028-03-01",
            "check_out": "2028-03-03",
        },
        headers=headers,
    )
    assert resp.status_code == 201


# ── Users ─────────────────────────────────────────────────────────────────────


async def test_get_me(auth_client):
    client, headers = auth_client
    resp = await client.get("/api/users/me", headers=headers)
    assert resp.status_code == 200
    assert "email" in resp.json()


async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/users/me")
    assert resp.status_code == 401


async def test_update_me(auth_client):
    client, headers = auth_client
    resp = await client.put(
        "/api/users/me",
        json={"first_name": "Updated", "country": "TR"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Updated"


async def test_change_password_wrong_current(auth_client):
    client, headers = auth_client
    resp = await client.post(
        "/api/users/me/change-password",
        json={"current_password": "WrongPass!", "new_password": "NewPass999!"},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_change_password_success(client: AsyncClient):
    email = _email()
    token = await _register(client, email)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post(
        "/api/users/me/change-password",
        json={"current_password": "Test1234!", "new_password": "NewPass999!"},
        headers=headers,
    )
    assert resp.status_code == 200


async def test_delete_me(client: AsyncClient):
    email = _email()
    token = await _register(client, email)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.delete("/api/users/me", headers=headers)
    assert resp.status_code == 204


async def test_my_bookings_empty(auth_client):
    client, headers = auth_client
    resp = await client.get("/api/users/me/bookings", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_my_bookings_status_filter(auth_client):
    client, headers = auth_client
    for status in ("upcoming", "past", "cancelled"):
        resp = await client.get(f"/api/users/me/bookings?status={status}", headers=headers)
        assert resp.status_code == 200


async def test_favorites_flow(auth_client, sample_hotel: Hotel):
    client, headers = auth_client

    add = await client.post(f"/api/users/me/favorites/{sample_hotel.id}", headers=headers)
    assert add.status_code == 201
    assert add.json()["hotel"]["id"] == sample_hotel.id

    lst = await client.get("/api/users/me/favorites", headers=headers)
    assert lst.status_code == 200
    assert any(f["hotel"]["id"] == sample_hotel.id for f in lst.json())

    rm = await client.delete(f"/api/users/me/favorites/{sample_hotel.id}", headers=headers)
    assert rm.status_code == 204

    rm_again = await client.delete(
        f"/api/users/me/favorites/{sample_hotel.id}", headers=headers
    )
    assert rm_again.status_code == 404


async def test_add_favorite_same_hotel_twice(auth_client, sample_hotel: Hotel):
    client, headers = auth_client
    r1 = await client.post(f"/api/users/me/favorites/{sample_hotel.id}", headers=headers)
    r2 = await client.post(f"/api/users/me/favorites/{sample_hotel.id}", headers=headers)
    assert r1.status_code == 201
    assert r2.status_code == 201


async def test_payment_methods_full_flow(client: AsyncClient):
    email = _email()
    token = await _register(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    # Empty list
    lst = await client.get("/api/users/me/payment-methods", headers=headers)
    assert lst.status_code == 200
    assert lst.json() == []

    # Add first card
    add = await client.post(
        "/api/users/me/payment-methods",
        json={
            "brand": "visa",
            "last4": "4242",
            "holder_name": "Test User",
            "exp_month": 12,
            "exp_year": 28,
        },
        headers=headers,
    )
    assert add.status_code == 201
    card_id = add.json()["id"]
    assert add.json()["is_default"] is True  # first card becomes default

    # Add second card
    add2 = await client.post(
        "/api/users/me/payment-methods",
        json={
            "brand": "mc",
            "last4": "5555",
            "holder_name": "Test User",
            "exp_month": 6,
            "exp_year": 27,
        },
        headers=headers,
    )
    assert add2.status_code == 201

    # Set first as default
    def_resp = await client.post(
        f"/api/users/me/payment-methods/{card_id}/default", headers=headers
    )
    assert def_resp.status_code == 200

    # Update card
    upd = await client.put(
        f"/api/users/me/payment-methods/{card_id}",
        json={"holder_name": "Updated Name"},
        headers=headers,
    )
    assert upd.status_code == 200
    assert upd.json()["holder_name"] == "Updated Name"

    # Delete card
    dl = await client.delete(f"/api/users/me/payment-methods/{card_id}", headers=headers)
    assert dl.status_code == 204

    # Delete non-existent
    dl2 = await client.delete(f"/api/users/me/payment-methods/{card_id}", headers=headers)
    assert dl2.status_code == 404


async def test_update_payment_method_not_found(auth_client):
    client, headers = auth_client
    resp = await client.put(
        "/api/users/me/payment-methods/999999",
        json={"holder_name": "X"},
        headers=headers,
    )
    assert resp.status_code == 404


async def test_set_default_card_not_found(auth_client):
    client, headers = auth_client
    resp = await client.post(
        "/api/users/me/payment-methods/999999/default", headers=headers
    )
    assert resp.status_code == 400


async def test_billing_address_flow(client: AsyncClient):
    email = _email()
    token = await _register(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    get = await client.get("/api/users/me/billing-address", headers=headers)
    assert get.status_code == 200

    put = await client.put(
        "/api/users/me/billing-address",
        json={
            "name": "Test User",
            "line": "Atatürk Cad. No:5",
            "district": "Kadıköy",
            "city": "İstanbul",
            "zip_code": "34710",
            "country": "Türkiye",
        },
        headers=headers,
    )
    assert put.status_code == 200
    assert put.json()["city"] == "İstanbul"

    get2 = await client.get("/api/users/me/billing-address", headers=headers)
    assert get2.status_code == 200
    assert get2.json()["city"] == "İstanbul"


# ── Payments & Contact ────────────────────────────────────────────────────────


async def test_process_payment(client: AsyncClient):
    resp = await client.post(
        "/api/payments",
        json={"booking_id": 1, "payment_method": "card", "total": 750.0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "transaction_id" in data


async def test_send_contact(client: AsyncClient):
    resp = await client.post(
        "/api/contact",
        json={
            "name": "Mehmet Demir",
            "email": "mehmet@example.com",
            "subject": "Soru",
            "message": "Bu bir test mesajıdır.",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert "ticket_id" in resp.json()
