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
            rating=4.8,
            reviews_count=200,
            price_per_night=3000.0,
        )
        session.add(hotel)
        await session.flush()

        session.add_all([
            HotelAmenity(hotel_id=hotel.id, icon="wifi", title="Wi-Fi"),
            HotelAmenity(hotel_id=hotel.id, icon="pool", title="Havuz"),
            HotelReview(hotel_id=hotel.id, reviewer_name="Ali", rating=4.9, text="Harika"),
            Room(hotel_id=hotel.id, room_number=f"H{uuid.uuid4().hex[:6].upper()}", type=RoomType.double,
                 capacity=2, price_per_night=3000.0, status=RoomStatus.available),
        ])
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
    hotels = resp.json()["hotels"]
    assert all("İstanbul" in h["city"] for h in hotels)


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
