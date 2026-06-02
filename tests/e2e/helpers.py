"""Shared helpers for live-stack E2E tests (BASE_URL must be reachable)."""

from __future__ import annotations

import json
import os
import re
import uuid
from datetime import date, timedelta
from typing import Any

from playwright.sync_api import APIRequestContext, Page, expect

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")


def future_stay(days_ahead: int = 45, nights: int = 3, *, slot: int = 0) -> tuple[str, str]:
    """ISO check-in/out; slot spreads dates across tests to reduce booking conflicts."""
    start = date.today() + timedelta(days=days_ahead + (slot % 120))
    end = start + timedelta(days=nights)
    return start.isoformat(), end.isoformat()


def unique_email(prefix: str = "e2e") -> str:
    """RFC-valid domain (`.test` TLD is rejected by Pydantic EmailStr)."""
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.com"


def register_user(
    request: APIRequestContext,
    *,
    email: str | None = None,
    password: str = "Test1234!",
    first_name: str = "E2E",
    last_name: str = "Tester",
) -> dict[str, Any]:
    """Register via API; returns token payload (re-login on 409)."""
    email = email or unique_email()
    payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }
    headers = {"Content-Type": "application/json"}
    resp = request.post("/api/auth/register", headers=headers, data=json.dumps(payload))
    if resp.status == 409:
        resp = request.post(
            "/api/auth/login",
            headers=headers,
            data=json.dumps({"email": email, "password": password}),
        )
    assert resp.ok, f"auth setup failed: {resp.status} {resp.text()}"
    data = resp.json()
    assert "access_token" in data
    return {
        "email": email,
        "password": password,
        "access_token": data["access_token"],
        "user": data.get("user")
        or {"email": email, "first_name": first_name, "last_name": last_name},
    }


def set_auth_session(page: Page, auth: dict[str, Any]) -> None:
    page.goto("/")
    page.evaluate(
        """([token, user]) => {
            localStorage.setItem("bakoda_token", token);
            localStorage.setItem("bakoda_user", JSON.stringify(user));
        }""",
        [auth["access_token"], auth["user"]],
    )


def discover_bookable_stay(
    request: APIRequestContext,
    *,
    city: str = "İstanbul",
    slot: int = 0,
) -> dict[str, Any]:
    """Find hotel + room available for the given stay window."""
    check_in, check_out = future_stay(70, 4, slot=slot)
    resp = request.get(
        f"/api/hotels?city={city}&check_in={check_in}&check_out={check_out}&guests=2&rooms=1"
    )
    assert resp.ok, f"hotel search failed: {resp.status} {resp.text()}"
    hotels = resp.json().get("hotels") or []
    assert hotels, "No hotels in DB — run scripts/seed.py against the live database"

    hotel_id = hotels[0]["id"]
    detail = request.get(
        f"/api/hotels/{hotel_id}?check_in={check_in}&check_out={check_out}&guests=2"
    )
    assert detail.ok, detail.text()
    rooms = detail.json().get("rooms") or []
    assert rooms, f"Hotel {hotel_id} has no available rooms for {check_in}–{check_out}"

    return {
        "hotel_id": hotel_id,
        "room_id": rooms[0]["id"],
        "check_in": check_in,
        "check_out": check_out,
        "hotel_name": detail.json().get("name") or hotels[0].get("name"),
    }


def wait_for_booking_guest_form(page: Page, *, timeout: float = 25_000) -> None:
    expect(
        page.get_by_role("heading", name=re.compile(r"Misafir Bilgileri", re.IGNORECASE))
    ).to_be_visible(timeout=timeout)


def fill_guest_step(
    page: Page, *, email: str, first_name: str = "E2E", last_name: str = "Misafir"
) -> None:
    page.locator("#firstName").fill(first_name)
    page.locator("#lastName").fill(last_name)
    page.locator("#email").fill(email)
    page.locator("#phone").fill("5551112233")
    page.locator("form.form-card .check-list label.check").first.locator("input").check(force=True)


def fill_payment_step(page: Page) -> None:
    page.locator("#card").fill("4111 1111 1111 1111")
    page.locator("#cname").fill("E2E TEST")
    page.locator("#exp").fill("12/30")
    page.locator("#cvv").fill("123")


def booking_url(stay: dict[str, Any]) -> str:
    return (
        f"/booking.html?hotel_id={stay['hotel_id']}&room_id={stay['room_id']}"
        f"&check_in={stay['check_in']}&check_out={stay['check_out']}&adults=2&rooms=1"
    )
