"""
Browser E2E tests against the static frontend served by FastAPI.

Run (app must be up on BASE_URL):
    BASE_URL=http://localhost:8000 poetry run pytest tests/e2e/test_ui_booking.py -v

Install Playwright browsers once:
    poetry run playwright install chromium
"""

from __future__ import annotations

import re
from datetime import date, timedelta

import pytest
from playwright.sync_api import Page, expect

pytestmark = pytest.mark.playwright


def _future_stay() -> tuple[str, str]:
    start = date.today() + timedelta(days=45)
    end = start + timedelta(days=3)
    return start.isoformat(), end.isoformat()


def test_homepage_loads(page: Page) -> None:
    """Homepage serves index.html and renders the hero search UI."""
    page.goto("/")
    expect(page).to_have_title(re.compile(r"bakoda", re.IGNORECASE))
    search = page.get_by_role("search", name=re.compile(r"otel arama", re.IGNORECASE))
    expect(search).to_be_visible(timeout=15_000)
    expect(page.get_by_placeholder(re.compile(r"nereye", re.IGNORECASE))).to_be_visible()
    expect(page.get_by_role("button", name=re.compile(r"otel ara", re.IGNORECASE))).to_be_visible()


def test_homepage_search_navigates_to_results(page: Page) -> None:
    """Hero search submits to search-results.html with query params."""
    page.goto("/")
    page.get_by_role("button", name=re.compile(r"otel ara", re.IGNORECASE)).click()
    page.wait_for_url(re.compile(r"search-results\.html"), timeout=15_000)
    expect(page).to_have_url(re.compile(r"search-results\.html\?"))
    expect(page.get_by_role("main")).to_be_visible(timeout=15_000)
    expect(page.get_by_role("heading", level=1)).to_contain_text(
        re.compile(r"İstanbul", re.IGNORECASE)
    )


def test_destination_navigates_to_city_search(page: Page) -> None:
    """Destination cards link to filtered search results."""
    page.goto("/")
    dest = page.locator('a.dest-card[href*="search-results.html"]').first
    expect(dest).to_be_visible(timeout=15_000)
    dest.click()
    page.wait_for_url(re.compile(r"search-results\.html\?city="), timeout=15_000)


def test_login_form_renders_and_validates(page: Page) -> None:
    """Login page shows email/password fields and client-side validation."""
    page.goto("/login.html")
    expect(page).to_have_title(re.compile(r"giriş", re.IGNORECASE))
    expect(page.get_by_role("heading", name="Tekrar hoş geldin")).to_be_visible(timeout=15_000)
    expect(page.locator("#email")).to_be_visible()
    expect(page.locator("#password")).to_be_visible()
    page.get_by_role("button", name=re.compile(r"giriş yap", re.IGNORECASE)).click()
    expect(page.get_by_text("E-posta gereklidir")).to_be_visible()


def test_booking_page_accepts_dates_in_query(page: Page) -> None:
    """Booking flow page loads with check-in/out from URL and shows stay summary."""
    check_in, check_out = _future_stay()
    page.goto(
        f"/booking.html?hotel_id=1&room_id=1&check_in={check_in}&check_out={check_out}"
        f"&adults=2&rooms=1"
    )
    expect(page).to_have_title(re.compile(r"rezervasyon", re.IGNORECASE))
    expect(page.locator(".stepper")).to_be_visible(timeout=15_000)
    expect(page.get_by_text("Giriş", exact=False).first).to_be_visible()
    expect(page.get_by_text("Çıkış", exact=False).first).to_be_visible()
    # Either guest form (API + seed OK) or a recoverable error card — page must render booking UI
    booking_main = page.locator(".form-card, .step-pad").first
    expect(booking_main).to_be_visible(timeout=20_000)
