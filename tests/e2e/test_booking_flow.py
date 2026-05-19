"""
E2E tests using Playwright against a live running app (BASE_URL env var).
These tests expect the app + postgres to be up (e.g. via docker compose).
Run with: BASE_URL=http://localhost:8000 pytest tests/e2e/
"""
import os

import pytest
from playwright.sync_api import APIRequestContext, Playwright, expect

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


@pytest.fixture(scope="session")
def api_context(playwright: Playwright) -> APIRequestContext:
    context = playwright.request.new_context(base_url=BASE_URL)
    yield context
    context.dispose()


def test_health_endpoint(api_context: APIRequestContext):
    """Smoke test: health endpoint returns ok."""
    resp = api_context.get("/health")
    assert resp.ok
    assert resp.json()["status"] == "ok"


def test_list_rooms_returns_array(api_context: APIRequestContext):
    """GET /rooms returns a JSON array."""
    resp = api_context.get("/rooms")
    assert resp.ok
    data = resp.json()
    assert isinstance(data, list)


def test_full_booking_flow(api_context: APIRequestContext):
    """Happy path: list rooms → book → get → confirm status."""
    # List available rooms for our dates
    resp = api_context.get("/rooms?check_in=2027-03-01&check_out=2027-03-05")
    assert resp.ok
    rooms = resp.json()
    assert len(rooms) > 0, "No rooms available — seed at least one room"

    room_id = rooms[0]["id"]

    # Create a booking
    resp = api_context.post("/bookings", data={
        "room_id": room_id,
        "guest_name": "E2E Guest",
        "guest_email": "e2e@test.com",
        "check_in": "2027-03-01",
        "check_out": "2027-03-05",
    })
    assert resp.status == 201
    booking = resp.json()
    assert booking["status"] == "confirmed"
    booking_id = booking["id"]

    # Get the booking
    get_resp = api_context.get(f"/bookings/{booking_id}")
    assert get_resp.ok
    assert get_resp.json()["id"] == booking_id


def test_double_booking_conflict(api_context: APIRequestContext):
    """Two bookings for the same room/dates → second returns 409."""
    resp = api_context.get("/rooms?check_in=2027-04-01&check_out=2027-04-03")
    assert resp.ok
    rooms = resp.json()
    assert len(rooms) > 0

    room_id = rooms[0]["id"]
    payload = {
        "room_id": room_id,
        "guest_name": "First Guest",
        "guest_email": "first@test.com",
        "check_in": "2027-04-01",
        "check_out": "2027-04-03",
    }

    r1 = api_context.post("/bookings", data=payload)
    assert r1.status == 201

    r2 = api_context.post("/bookings", data={**payload, "guest_email": "second@test.com"})
    assert r2.status == 409


def test_cancel_booking_flow(api_context: APIRequestContext):
    """Book a room then cancel → status becomes cancelled."""
    resp = api_context.get("/rooms")
    assert resp.ok
    rooms = resp.json()
    assert len(rooms) > 0

    room_id = rooms[0]["id"]
    create = api_context.post("/bookings", data={
        "room_id": room_id,
        "guest_name": "Cancel Guest",
        "guest_email": "cancel_e2e@test.com",
        "check_in": "2027-05-01",
        "check_out": "2027-05-02",
    })
    booking_id = create.json()["id"]

    cancel = api_context.patch(f"/bookings/{booking_id}/cancel")
    assert cancel.ok
    assert cancel.json()["status"] == "cancelled"

    # After cancel, same dates should be bookable again
    rebooking = api_context.get(f"/rooms?check_in=2027-05-01&check_out=2027-05-02")
    assert rebooking.ok
    available_ids = [r["id"] for r in rebooking.json()]
    assert room_id in available_ids
