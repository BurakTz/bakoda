"""
Browser E2E — full user journeys (requires live app + seeded DB).

Run:
    BASE_URL=http://localhost:8000 poetry run pytest tests/e2e/test_ui_user_flows.py -v
    poetry run playwright install chromium
"""

from __future__ import annotations

import re

import pytest
from playwright.sync_api import Page, expect

from tests.e2e.helpers import (
    booking_url,
    discover_bookable_stay,
    fill_guest_step,
    fill_payment_step,
    register_user,
    set_auth_session,
    unique_email,
    wait_for_booking_guest_form,
)

pytestmark = pytest.mark.playwright


# ── Keşif & arama ─────────────────────────────────────────────────────


def test_search_results_load_hotels(page: Page) -> None:
    """Arama sonuçları API'den otel kartı listeler."""
    page.goto("/search-results.html?city=İstanbul")
    expect(page.get_by_role("main")).to_be_visible(timeout=20_000)
    expect(page.locator(".result-card").first).to_be_visible(timeout=20_000)
    expect(page.get_by_text(re.compile(r"otel bulundu", re.IGNORECASE))).to_be_visible()


def test_hotel_detail_from_search_results(page: Page) -> None:
    """Sonuç kartından otel detay sayfasına geçiş."""
    page.goto("/search-results.html?city=İstanbul")
    expect(page.locator(".result-card").first).to_be_visible(timeout=20_000)
    page.get_by_role("button", name=re.compile(r"Detayları Gör", re.IGNORECASE)).first.click()
    page.wait_for_url(re.compile(r"hotel-detail\.html"), timeout=15_000)
    expect(page.get_by_role("tab", name=re.compile(r"Genel Bakış", re.IGNORECASE))).to_be_visible(
        timeout=20_000
    )


def test_hotel_detail_direct_load(page: Page, page_request) -> None:
    """Doğrudan otel detay URL'si yüklenir."""
    stay = discover_bookable_stay(page_request, slot=1)
    page.goto(
        f"/hotel-detail.html?id={stay['hotel_id']}"
        f"&check_in={stay['check_in']}&check_out={stay['check_out']}"
    )
    expect(
        page.get_by_role(
            "button", name=re.compile(r"Rezervasyonu Tamamla|Genel Bakış", re.IGNORECASE)
        ).first
    ).to_be_visible(timeout=20_000)


# ── Kimlik doğrulama ──────────────────────────────────────────────────


def test_register_form_validation(page: Page) -> None:
    page.goto("/register.html")
    expect(page.get_by_role("heading", name="Hesap oluştur")).to_be_visible(timeout=15_000)
    page.get_by_role("button", name=re.compile(r"Hesap Oluştur", re.IGNORECASE)).click()
    expect(page.get_by_text("Ad gereklidir", exact=True)).to_be_visible()
    expect(page.get_by_text("Devam etmek için kabul edin", exact=True)).to_be_visible()


def test_register_success_redirects_home(page: Page) -> None:
    email = unique_email("reg")
    page.goto("/register.html")
    page.locator("#firstName").fill("Arif")
    page.locator("#lastName").fill("Test")
    page.locator("#email").fill(email)
    page.locator("#password").fill("Test1234!")
    page.locator("#confirm").fill("Test1234!")
    page.locator("label.terms input[type='checkbox']").check(force=True)
    with page.expect_navigation(url=re.compile(r"index\.html"), timeout=20_000):
        page.get_by_role("button", name=re.compile(r"Hesap Oluştur", re.IGNORECASE)).click()
    expect(page).to_have_url(re.compile(r"index\.html"))


def test_login_success_stores_token(page: Page, page_request) -> None:
    auth = register_user(page_request, email=unique_email("login"))
    page.goto("/login.html")
    page.locator("#email").fill(auth["email"])
    page.locator("#password").fill(auth["password"])
    with page.expect_navigation(url=re.compile(r"index\.html"), timeout=20_000):
        page.get_by_role("button", name=re.compile(r"giriş yap", re.IGNORECASE)).click()
    token = page.evaluate("() => localStorage.getItem('bakoda_token')")
    assert token


# ── Rezervasyon hunisi (misafir) ──────────────────────────────────────


def test_full_guest_booking_to_confirmation(page: Page, page_request) -> None:
    """Misafir: bilgiler → ödeme → onay sayfası."""
    stay = discover_bookable_stay(page_request, slot=2)
    guest_email = unique_email("book")
    page.goto(booking_url(stay))
    wait_for_booking_guest_form(page)
    fill_guest_step(page, email=guest_email)
    with page.expect_navigation(url=re.compile(r"payment\.html"), timeout=30_000):
        page.get_by_role("button", name=re.compile(r"Ödemeye Geç", re.IGNORECASE)).click()
    expect(page.locator("#card")).to_be_visible(timeout=20_000)
    fill_payment_step(page)
    with page.expect_navigation(url=re.compile(r"confirmation\.html"), timeout=30_000):
        page.get_by_role("button", name=re.compile(r"Rezervasyonu Tamamla", re.IGNORECASE)).click()
    expect(
        page.get_by_text(
            re.compile(r"Onaylandı|Rezervasyonunuz Onaylandı", re.IGNORECASE)
        ).first
    ).to_be_visible(timeout=15_000)


def test_authenticated_booking_appears_in_my_bookings(page: Page, page_request) -> None:
    """Giriş yapmış kullanıcı rezervasyonu Rezervasyonlarım'da görür."""
    auth = register_user(page_request, email=unique_email("mybk"))
    stay = discover_bookable_stay(page_request, slot=3)
    set_auth_session(page, auth)

    page.goto(booking_url(stay))
    wait_for_booking_guest_form(page)
    fill_guest_step(page, email=auth["email"], first_name="Burak", last_name="Test")
    with page.expect_navigation(url=re.compile(r"payment\.html"), timeout=30_000):
        page.get_by_role("button", name=re.compile(r"Ödemeye Geç", re.IGNORECASE)).click()
    fill_payment_step(page)
    with page.expect_navigation(url=re.compile(r"confirmation\.html"), timeout=30_000):
        page.get_by_role("button", name=re.compile(r"Rezervasyonu Tamamla", re.IGNORECASE)).click()

    page.goto("/my-bookings.html")
    expect(page.get_by_role("heading", name="Rezervasyonlarım")).to_be_visible(timeout=15_000)
    expect(page.locator(".booking").first).to_be_visible(timeout=20_000)
    if stay.get("hotel_name"):
        expect(
            page.get_by_text(stay["hotel_name"], exact=False).first
        ).to_be_visible(timeout=10_000)


def test_cancel_booking_from_my_bookings(page: Page, page_request) -> None:
    """Yaklaşan rezervasyon UI'dan iptal edilebilir."""
    auth = register_user(page_request, email=unique_email("cancel"))
    stay = discover_bookable_stay(page_request, slot=4)
    set_auth_session(page, auth)

    page.goto(booking_url(stay))
    wait_for_booking_guest_form(page)
    fill_guest_step(page, email=auth["email"])
    with page.expect_navigation(url=re.compile(r"payment\.html"), timeout=30_000):
        page.get_by_role("button", name=re.compile(r"Ödemeye Geç", re.IGNORECASE)).click()
    fill_payment_step(page)
    with page.expect_navigation(url=re.compile(r"confirmation\.html"), timeout=30_000):
        page.get_by_role("button", name=re.compile(r"Rezervasyonu Tamamla", re.IGNORECASE)).click()

    page.goto("/my-bookings.html")
    expect(page.locator(".booking").first).to_be_visible(timeout=20_000)
    page.get_by_role("button", name="İptal Et").first.click()
    expect(
        page.get_by_text(re.compile(r"iptal edildi", re.IGNORECASE))
    ).to_be_visible(timeout=10_000)


# ── Profil & içerik sayfaları ─────────────────────────────────────────


def test_my_bookings_requires_login_message(page: Page) -> None:
    page.goto("/my-bookings.html")
    expect(
        page.get_by_role("heading", name=re.compile(r"giriş yapın", re.IGNORECASE))
    ).to_be_visible(timeout=15_000)


def test_favorites_empty_state_when_logged_in(page: Page, page_request) -> None:
    auth = register_user(page_request, email=unique_email("fav"))
    set_auth_session(page, auth)
    page.goto("/favorites.html")
    expect(
        page.get_by_role("heading", name=re.compile(r"Kaydettiğim Oteller", re.IGNORECASE))
    ).to_be_visible(timeout=15_000)
    expect(page.get_by_text(re.compile(r"Henüz favori", re.IGNORECASE))).to_be_visible()


def test_contact_form_validation(page: Page) -> None:
    page.goto("/contact.html")
    expect(
        page.get_by_role("heading", name=re.compile(r"yardımcı olabiliriz", re.IGNORECASE))
    ).to_be_visible(timeout=15_000)
    page.get_by_role("button", name=re.compile(r"Gönder", re.IGNORECASE)).click()
    expect(page.get_by_text("Adınızı girin")).to_be_visible()
    expect(page.get_by_text(re.compile(r"en az 10 karakter", re.IGNORECASE))).to_be_visible()


def test_contact_form_submit_success(page: Page) -> None:
    page.goto("/contact.html")
    page.locator("#name").fill("E2E İletişim")
    page.locator("#email").fill(unique_email("contact"))
    page.locator("textarea").fill("Bu bir otomatik E2E test mesajıdır — en az on karakter.")
    page.get_by_role("button", name=re.compile(r"Gönder", re.IGNORECASE)).click()
    expect(
        page.get_by_text(re.compile(r"Mesajınız alındı", re.IGNORECASE))
    ).to_be_visible(timeout=10_000)


def test_about_page_loads(page: Page) -> None:
    page.goto("/about.html")
    expect(
        page.get_by_text(re.compile(r"Hakkımızda", re.IGNORECASE)).first
    ).to_be_visible(timeout=15_000)
    expect(page.get_by_text("Arif Batuhan Bahar")).to_be_visible()
    expect(page.get_by_text("Burak Tuzcu")).to_be_visible()


def test_forgot_password_page_loads(page: Page) -> None:
    page.goto("/forgot-password.html")
    expect(
        page.get_by_role("heading", name=re.compile(r"Şifreni mi unuttun", re.IGNORECASE))
    ).to_be_visible(timeout=15_000)


@pytest.fixture
def page_request(page: Page):
    """Playwright API client bound to BASE_URL (same session as browser tests)."""
    return page.request
