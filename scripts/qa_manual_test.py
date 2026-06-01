#!/usr/bin/env python3
"""Manual-style QA smoke test for Bakoda app."""

import json
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

BASE = "http://localhost:8000"
issues = []


def req(method, path, body=None, token=None, expect=None):
    url = BASE + path
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            status = resp.status
            raw = resp.read().decode()
            try:
                parsed = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                parsed = raw
            return status, parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        return e.code, parsed


def page(path):
    url = BASE + path
    r = urllib.request.Request(url, headers={"Accept": "text/html"})
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, len(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, 0


def fail(area, severity, msg, repro=""):
    issues.append({"area": area, "severity": severity, "msg": msg, "repro": repro})
    print(f"  [{severity}] {area}: {msg}")


def ok(msg):
    print(f"  OK: {msg}")


print("=== FRONTEND PAGES ===")
pages = [
    "/",
    "/index.html",
    "/search-results.html",
    "/hotel-detail.html",
    "/booking.html",
    "/payment.html",
    "/confirmation.html",
    "/login.html",
    "/register.html",
    "/forgot-password.html",
    "/profile.html",
    "/payment-methods.html",
    "/security.html",
    "/favorites.html",
    "/my-bookings.html",
    "/about.html",
    "/contact.html",
    "/nonexistent-page.html",
]
for p in pages:
    status, size = page(p)
    if p == "/nonexistent-page.html":
        if status != 404:
            fail("Navbar/Footer", "Medium", f"Expected 404 for missing page, got {status}")
        else:
            ok("404 for missing page")
    elif status != 200:
        fail("Pages", "Critical", f"{p} returned {status}")
    elif size < 100:
        fail("Pages", "High", f"{p} empty or tiny ({size} bytes)")
    else:
        ok(f"{p} -> {status} ({size}b)")

print("\n=== HOTELS API ===")
s, data = req("GET", "/api/hotels")
if s != 200:
    fail("Search", "Critical", f"GET /api/hotels -> {s}")
else:
    hotels = data.get("hotels", [])
    total = data.get("total", 0)
    ok(f"Hotels list: {len(hotels)} items, total={total}")
    if not hotels:
        fail("Home", "Critical", "No hotels in database - featured/search empty")

check_in = (date.today() + timedelta(days=60)).isoformat()
check_out = (date.today() + timedelta(days=63)).isoformat()

s, data = req(
    "GET",
    f"/api/hotels?location=Istanbul&check_in={check_in}&check_out={check_out}&guests=2&sort=price_asc",
)
if s != 200:
    fail("Search", "Critical", f"Search with filters -> {s}: {data}")
else:
    ok(f"Search filters: {data.get('total', 0)} results")

s, data = req("GET", f"/api/hotels?check_in={check_out}&check_out={check_in}")
if s != 400:
    fail("Search", "High", f"Invalid dates should 400, got {s}")
else:
    ok("Invalid date range rejected")

hotel_id = hotels[0]["id"] if hotels else 1
s, detail = req("GET", f"/api/hotels/{hotel_id}")
if s != 200:
    fail("Hotel Detail", "Critical", f"GET hotel {hotel_id} -> {s}")
else:
    ok(f"Hotel detail: {detail.get('name')}, reviews={len(detail.get('reviews', []))}")
    for r in detail.get("reviews", []):
        rating = r.get("rating")
        if rating is not None and (rating < 1 or rating > 10):
            fail("Hotel Detail", "High", f"Review rating out of 10-point scale: {rating}")

s, detail404 = req("GET", "/api/hotels/999999")
if s != 404:
    fail("Hotel Detail", "Medium", f"Missing hotel should 404, got {s}")

print("\n=== AUTH ===")
email = f"qatest_{date.today().strftime('%Y%m%d')}@test.com"
s, reg = req(
    "POST",
    "/api/auth/register",
    {"email": email, "password": "TestPass123!", "first_name": "QA", "last_name": "Tester"},
)
if s == 409:
    s, login = req("POST", "/api/auth/login", {"email": email, "password": "TestPass123!"})
    token = login.get("access_token") if s == 200 else None
    if not token:
        fail("Auth", "Critical", f"Login failed after 409: {s} {login}")
    else:
        ok("Login existing QA user")
elif s == 201:
    token = reg.get("access_token")
    ok(f"Registered {email}")
else:
    fail("Auth", "Critical", f"Register failed: {s} {reg}")
    token = None

s, bad = req("POST", "/api/auth/login", {"email": email, "password": "wrong"})
if s != 401:
    fail("Auth", "High", f"Bad password should 401, got {s}")
else:
    ok("Bad login rejected")

s, fp = req("POST", "/api/auth/forgot-password", {"email": email})
if s != 200:
    fail("Auth", "High", f"Forgot password -> {s}")
else:
    dev_code = fp.get("dev_code")
    ok(f"Forgot password, dev_code={'yes' if dev_code else 'no'}")
    if dev_code:
        s, verify = req("POST", "/api/auth/verify-reset-code", {"email": email, "code": dev_code})
        if s != 200 or not verify.get("valid"):
            fail("Auth", "High", f"Verify reset code failed: {s} {verify}")
        else:
            ok("Reset code verified")

print("\n=== USER PROFILE ===")
if token:
    s, me = req("GET", "/api/users/me", token=token)
    if s != 200:
        fail("Profile", "Critical", f"GET /me -> {s}")
    else:
        ok(f"Profile: {me.get('email')}")

    s, favs = req("GET", "/api/users/me/favorites", token=token)
    if s != 200:
        fail("Favorites", "Critical", f"GET favorites -> {s}")
    else:
        ok(f"Favorites: {len(favs)} items")

    if hotels:
        hid = hotels[0]["id"]
        s, fav = req("POST", f"/api/users/me/favorites/{hid}", token=token)
        if s not in (201, 409):
            fail("Favorites", "High", f"Add favorite -> {s}: {fav}")
        else:
            ok(f"Add favorite hotel {hid}")

    s, cards = req("GET", "/api/users/me/payment-methods", token=token)
    if s != 200:
        fail("Payment Methods", "Critical", f"GET payment methods -> {s}")
    else:
        ok(f"Payment methods: {len(cards)} cards")

    s, card = req(
        "POST",
        "/api/users/me/payment-methods",
        token=token,
        body={
            "brand": "visa",
            "last4": "4242",
            "holder_name": "QA Tester",
            "exp_month": 12,
            "exp_year": 28,
            "card_type": "Kredi",
            "is_default": True,
        },
    )
    if s != 201:
        fail("Payment Methods", "High", f"Add card -> {s}: {card}")
    else:
        ok(f"Added card id={card.get('id')}")

    s, billing = req("GET", "/api/users/me/billing-address", token=token)
    if s != 200:
        fail("Payment Methods", "High", f"Billing address -> {s}")
    else:
        ok("Billing address retrieved")

    s, pw = req(
        "POST",
        "/api/users/me/change-password",
        token=token,
        body={"current_password": "TestPass123!", "new_password": "TestPass123!"},
    )
    if s != 200:
        fail("Security", "Medium", f"Same password change -> {s}: {pw}")
    else:
        ok("Change password endpoint works")

print("\n=== BOOKING FLOW ===")
room_id = None
if detail and detail.get("rooms"):
    room_id = detail["rooms"][0]["id"]
elif hotels:
    s, d2 = req("GET", f"/api/hotels/{hotel_id}")
    if d2 and d2.get("rooms"):
        room_id = d2["rooms"][0]["id"]

if room_id:
    # Use unique dates per run to avoid 409 on repeated QA runs
    import random

    offset = random.randint(90, 365)
    check_in = (date.today() + timedelta(days=offset)).isoformat()
    check_out = (date.today() + timedelta(days=offset + 3)).isoformat()
    s, booking = req(
        "POST",
        "/api/bookings",
        body={
            "room_id": room_id,
            "guest_name": "QA Tester",
            "guest_email": email,
            "phone": "+905551234567",
            "check_in": check_in,
            "check_out": check_out,
            "guests": 2,
            "rooms_count": 1,
        },
        token=token,
    )
    if s != 201:
        fail("Booking", "Critical", f"Create booking -> {s}: {booking}")
    else:
        bid = booking.get("id")
        ok(f"Booking created id={bid}, code={booking.get('confirmation_code')}")
        s, got = req("GET", f"/api/bookings/{bid}")
        if s != 200:
            fail("Booking", "High", f"Get booking -> {s}")
        else:
            ok("Booking retrieval OK")

        s, pay = req(
            "POST",
            "/api/payments",
            body={"booking_id": bid, "payment_method": "card", "total": booking.get("total_price")},
        )
        if s != 200 or pay.get("status") != "success":
            fail("Payment", "Critical", f"Payment -> {s}: {pay}")
        else:
            ok(f"Payment success txn={pay.get('transaction_id')}")
else:
    fail("Booking", "Critical", "No room_id available for booking test")

print("\n=== CONTACT ===")
s, contact = req(
    "POST",
    "/api/contact",
    body={"name": "QA", "email": email, "subject": "Test", "message": "QA test message"},
)
if s not in (200, 201):
    fail("Contact", "High", f"Contact form -> {s}: {contact}")
else:
    ok("Contact form submitted")

print("\n=== REVIEWS (auth required) ===")
if token and hotels:
    s, review = req(
        "POST",
        f"/api/hotels/{hotel_id}/reviews",
        token=token,
        body={"rating": 8.5, "title": "QA Review", "text": "Automated test review"},
    )
    if s != 201:
        fail("Hotel Detail", "High", f"Create review -> {s}: {review}")
    else:
        ok(f"Review created rating={review.get('rating')}")

print("\n=== SUMMARY ===")
print(f"Total issues: {len(issues)}")
for i in issues:
    print(json.dumps(i, ensure_ascii=False))
sys.exit(1 if any(i["severity"] == "Critical" for i in issues) else 0)
