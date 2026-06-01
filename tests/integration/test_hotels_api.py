import uuid

import pytest
from httpx import AsyncClient

from src.models import Hotel, HotelAmenity, HotelReview, Room, RoomStatus, RoomType


@pytest.fixture()
async def istanbul_hotel(session_factory) -> Hotel:
    async with session_factory() as session:
        hotel = Hotel(
            name="İstanbul Test Hotel",
            city="İstanbul",
            district="Beşiktaş",
            stars=5,
            rating=9.6,
            reviews_count=200,
            price_per_night=3000.0,
        )
        session.add(hotel)
        await session.flush()

        session.add_all([
            HotelAmenity(hotel_id=hotel.id, icon="wifi", title="Wi-Fi"),
            HotelAmenity(hotel_id=hotel.id, icon="pool", title="Havuz"),
            HotelReview(hotel_id=hotel.id, reviewer_name="Ali", rating=9.8, text="Harika"),
            Room(hotel_id=hotel.id, room_number=f"H{uuid.uuid4().hex[:6].upper()}", type=RoomType.double,
                 capacity=2, price_per_night=3000.0, status=RoomStatus.available),
        ])
        await session.commit()
        await session.refresh(hotel)
    return hotel


@pytest.fixture()
async def limited_capacity_hotel(session_factory) -> Hotel:
    async with session_factory() as session:
        hotel = Hotel(
            name="Capacity Test Hotel",
            city="Testopolis",
            district="Center",
            stars=4,
            rating=8.2,
            reviews_count=8,
            price_per_night=1800.0,
        )
        session.add(hotel)
        await session.flush()

        session.add(
            Room(
                hotel_id=hotel.id,
                room_number=f"C{uuid.uuid4().hex[:6].upper()}",
                type=RoomType.double,
                capacity=2,
                price_per_night=1800.0,
                status=RoomStatus.available,
            )
        )
        await session.commit()
        await session.refresh(hotel)
    return hotel


@pytest.fixture()
async def urgup_hotel(session_factory) -> Hotel:
    async with session_factory() as session:
        hotel = Hotel(
            name="Ürgüp Cave Suites",
            city="Nevşehir",
            district="Ürgüp",
            stars=4,
            rating=9.2,
            reviews_count=54,
            price_per_night=2400.0,
        )
        session.add(hotel)
        await session.flush()
        session.add(
            Room(
                hotel_id=hotel.id,
                room_number=f"U{uuid.uuid4().hex[:6].upper()}",
                type=RoomType.double,
                capacity=2,
                price_per_night=2400.0,
                status=RoomStatus.available,
            )
        )
        await session.commit()
        await session.refresh(hotel)
    return hotel


@pytest.mark.asyncio
async def test_list_hotels_returns_ok(client: AsyncClient):
    resp = await client.get("/api/hotels")
    assert resp.status_code == 200
    assert "hotels" in resp.json()
    assert "total" in resp.json()


@pytest.mark.asyncio
async def test_list_hotels_contains_seeded(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels")
    assert resp.status_code == 200
    names = [h["name"] for h in resp.json()["hotels"]]
    assert istanbul_hotel.name in names


@pytest.mark.asyncio
async def test_list_hotels_filter_city(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels?city=İstanbul")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert istanbul_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_filter_location_alias_matches_district(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels?location=besiktas")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert istanbul_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_filter_city_is_turkish_case_insensitive(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels?city=istanbul")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert istanbul_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_filter_location_handles_diacritics(client: AsyncClient, urgup_hotel: Hotel):
    resp = await client.get("/api/hotels?location=urgup")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert urgup_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_filter_stars(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels?stars=5")
    assert resp.status_code == 200
    assert all(h["stars"] == 5 for h in resp.json()["hotels"])


@pytest.mark.asyncio
async def test_list_hotels_filter_price(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels?price_max=1000")
    assert resp.status_code == 200
    assert all(h["price_per_night"] <= 1000 for h in resp.json()["hotels"])


@pytest.mark.asyncio
async def test_get_hotel_not_found(client: AsyncClient):
    resp = await client.get("/api/hotels/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_hotel_detail(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get(f"/api/hotels/{istanbul_hotel.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == istanbul_hotel.id
    assert data["name"] == istanbul_hotel.name
    assert len(data["amenities"]) == 2
    assert len(data["reviews"]) == 1
    assert len(data["rooms"]) == 1


@pytest.mark.asyncio
async def test_list_hotels_invalid_dates(client: AsyncClient):
    resp = await client.get("/api/hotels?check_in=2027-06-05&check_out=2027-06-01")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_hotels_filters_by_guests_capacity(client: AsyncClient, limited_capacity_hotel: Hotel):
    resp = await client.get("/api/hotels?city=Testopolis&guests=3")
    assert resp.status_code == 200
    assert resp.json()["hotels"] == []


@pytest.mark.asyncio
async def test_create_hotel_review_requires_auth(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.post(
        f"/api/hotels/{istanbul_hotel.id}/reviews",
        json={"rating": 9.0, "title": "İyi", "text": "Genel olarak memnun kaldım."},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_hotel_review_rejects_out_of_range_rating(
    auth_client,
    istanbul_hotel: Hotel,
):
    client, headers = auth_client
    resp = await client.post(
        f"/api/hotels/{istanbul_hotel.id}/reviews",
        json={"rating": 11.0, "title": "Geçersiz puan", "text": "10 üzerinden deneme."},
        headers=headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_hotel_review_accepts_valid_ten_point_rating(
    auth_client,
    istanbul_hotel: Hotel,
):
    client, headers = auth_client
    resp = await client.post(
        f"/api/hotels/{istanbul_hotel.id}/reviews",
        json={"rating": 8.0, "title": "Yüksek puan", "text": "10 üzerinden deneme."},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["rating"] == 8.0


@pytest.mark.asyncio
async def test_hotel_detail_rating_stays_on_ten_point_scale(
    client: AsyncClient,
    istanbul_hotel: Hotel,
):
    resp = await client.get(f"/api/hotels/{istanbul_hotel.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert 0 <= data["rating"] <= 10
    assert all(0 <= review["rating"] <= 10 for review in data["reviews"])


@pytest.mark.asyncio
async def test_create_hotel_review_persists_and_updates_rating(
    auth_client,
    istanbul_hotel: Hotel,
):
    client, headers = auth_client
    resp = await client.post(
        f"/api/hotels/{istanbul_hotel.id}/reviews",
        json={"rating": 8.0, "title": "Güzel konaklama", "text": "Temiz ve merkezi bir otel."},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["rating"] == 8.0
    assert data["title"] == "Güzel konaklama"

    detail_resp = await client.get(f"/api/hotels/{istanbul_hotel.id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["reviews_count"] == 2
    assert pytest.approx(detail["rating"], rel=1e-6) == 8.9
    assert any(r["text"] == "Temiz ve merkezi bir otel." for r in detail["reviews"])
