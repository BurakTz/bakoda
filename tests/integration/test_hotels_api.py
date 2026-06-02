import uuid
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from src.models import (
    Hotel,
    HotelAmenity,
    HotelReview,
    Room,
    RoomStatus,
    RoomType,
)
from tests.factories import BookingFactory, HotelFactory, RoomFactory


@pytest.fixture()
async def istanbul_hotel(session_factory) -> Hotel:
    async with session_factory() as session:
        # Şehir/yıldız/fiyat assert'lere bağlı; açık kwarg ile sabit, gerisi Faker.
        hotel = HotelFactory(
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

        session.add_all(
            [
                HotelAmenity(hotel_id=hotel.id, icon="wifi", title="Wi-Fi"),
                HotelAmenity(hotel_id=hotel.id, icon="pool", title="Havuz"),
                HotelReview(hotel_id=hotel.id, reviewer_name="Ali", rating=9.8, text="Harika"),
                RoomFactory(
                    hotel_id=hotel.id,
                    type=RoomType.double,
                    capacity=2,
                    price_per_night=3000.0,
                    status=RoomStatus.available,
                ),
            ]
        )
        await session.commit()
        await session.refresh(hotel)
    return hotel


@pytest.fixture()
async def limited_capacity_hotel(session_factory) -> Hotel:
    async with session_factory() as session:
        hotel = HotelFactory(
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
            RoomFactory(
                hotel_id=hotel.id,
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
        hotel = HotelFactory(
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
            RoomFactory(
                hotel_id=hotel.id,
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
async def test_list_destinations(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels/destinations?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(d["name"] == "İstanbul" for d in data)


@pytest.mark.asyncio
async def test_search_locations(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels/locations?q=istanbul")
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["name"] == "İstanbul" for item in data)


@pytest.mark.asyncio
async def test_search_locations_turkish_prefix(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels/locations", params={"q": "İsta"})
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["name"] == "İstanbul" for item in data)


@pytest.mark.asyncio
async def test_search_locations_ascii_prefix(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels/locations", params={"q": "ist"})
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["name"] == "İstanbul" for item in data)


@pytest.mark.asyncio
async def test_search_locations_popular_without_query(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get("/api/hotels/locations?limit=8")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(item["kind"] == "city" for item in data)


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
async def test_list_hotels_filter_location_alias_matches_district(
    client: AsyncClient, istanbul_hotel: Hotel
):
    resp = await client.get("/api/hotels?location=besiktas")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert istanbul_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_filter_city_is_turkish_case_insensitive(
    client: AsyncClient, istanbul_hotel: Hotel
):
    resp = await client.get("/api/hotels?city=istanbul")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert istanbul_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_filter_location_handles_diacritics(
    client: AsyncClient, urgup_hotel: Hotel
):
    resp = await client.get("/api/hotels?location=urgup")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert urgup_hotel.id in hotel_ids


@pytest.mark.asyncio
async def test_list_hotels_returns_distinct_city_fields(
    client: AsyncClient, istanbul_hotel: Hotel, urgup_hotel: Hotel
):
    resp = await client.get("/api/hotels")
    assert resp.status_code == 200
    by_id = {h["id"]: h for h in resp.json()["hotels"]}
    assert by_id[istanbul_hotel.id]["city"] == "İstanbul"
    assert by_id[urgup_hotel.id]["city"] == "Nevşehir"


@pytest.mark.asyncio
async def test_list_hotels_filter_city_excludes_other_cities(
    client: AsyncClient, istanbul_hotel: Hotel, urgup_hotel: Hotel
):
    resp = await client.get("/api/hotels?city=İstanbul")
    assert resp.status_code == 200
    hotel_ids = {h["id"] for h in resp.json()["hotels"]}
    assert istanbul_hotel.id in hotel_ids
    assert urgup_hotel.id not in hotel_ids


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
async def test_get_hotel_detail_requires_both_dates(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get(f"/api/hotels/{istanbul_hotel.id}?check_in=2027-06-01")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_hotel_detail_invalid_date_range(client: AsyncClient, istanbul_hotel: Hotel):
    resp = await client.get(
        f"/api/hotels/{istanbul_hotel.id}?check_in=2027-06-05&check_out=2027-06-01"
    )
    assert resp.status_code == 400


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
    assert data["min_price"] == 3000.0


@pytest.mark.asyncio
async def test_get_hotel_detail_min_price_from_available_rooms(
    client: AsyncClient, istanbul_hotel: Hotel
):
    resp = await client.get(
        f"/api/hotels/{istanbul_hotel.id}?check_in=2027-09-01&check_out=2027-09-05&guests=2"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["available_rooms_count"] == 1
    assert data["min_price"] == data["rooms"][0]["price_per_night"]


@pytest.mark.asyncio
async def test_list_hotels_invalid_dates(client: AsyncClient):
    resp = await client.get("/api/hotels?check_in=2027-06-05&check_out=2027-06-01")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_hotels_filters_by_guests_capacity(
    client: AsyncClient, limited_capacity_hotel: Hotel
):
    resp = await client.get("/api/hotels?city=Testopolis&guests=3")
    assert resp.status_code == 200
    assert resp.json()["hotels"] == []


@pytest.mark.asyncio
async def test_list_hotels_includes_available_room_count_with_dates(
    client: AsyncClient,
    session_factory,
    istanbul_hotel: Hotel,
):
    unique_city = "AvailableRoomsCountTest"
    async with session_factory() as session:
        result = await session.execute(select(Hotel).where(Hotel.id == istanbul_hotel.id))
        hotel = result.scalar_one()
        hotel.city = unique_city
        for _ in range(2):
            session.add(
                RoomFactory(
                    hotel_id=istanbul_hotel.id,
                    type=RoomType.double,
                    capacity=2,
                    price_per_night=3000.0,
                    status=RoomStatus.available,
                )
            )
        await session.commit()

    resp = await client.get(
        f"/api/hotels?city={unique_city}&check_in=2027-09-01&check_out=2027-09-05"
    )
    assert resp.status_code == 200
    hotels = [h for h in resp.json()["hotels"] if h["id"] == istanbul_hotel.id]
    assert len(hotels) == 1
    assert hotels[0]["available_rooms_count"] == 3


@pytest.mark.asyncio
async def test_get_hotel_detail_filters_rooms_by_availability(
    client: AsyncClient,
    session_factory,
    istanbul_hotel: Hotel,
):
    async with session_factory() as session:
        result = await session.execute(select(Room).where(Room.hotel_id == istanbul_hotel.id))
        room = result.scalars().first()
        session.add(
            BookingFactory(
                room_id=room.id,
                guest_name="Blocker",
                guest_email="block@test.com",
                check_in=date(2027, 8, 1),
                check_out=date(2027, 8, 5),
                total_price=100.0,
            )
        )
        await session.commit()

    resp = await client.get(
        f"/api/hotels/{istanbul_hotel.id}?check_in=2027-08-01&check_out=2027-08-05"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["available_rooms_count"] == 0
    assert data["rooms"] == []


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


@pytest.mark.asyncio
async def test_factory_seeded_hotels_filter_by_city(client: AsyncClient, session_factory):
    """Faker ile üretilmiş çok sayıda otel; benzersiz şehir ile listeleme akışı."""
    unique_city = f"FactoryCity-{uuid.uuid4().hex[:8]}"
    async with session_factory() as session:
        # 5 otelin tamamı aynı (benzersiz) şehirde; gerisi Faker rastgele.
        hotels = HotelFactory.build_batch(5, city=unique_city)
        session.add_all(hotels)
        await session.commit()

    resp = await client.get(f"/api/hotels?city={unique_city}")
    assert resp.status_code == 200
    listed = resp.json()["hotels"]
    assert len(listed) == 5
    assert all(h["city"] == unique_city for h in listed)


@pytest.mark.asyncio
async def test_factory_hotel_detail_lists_factory_rooms(client: AsyncClient, session_factory):
    """Faker ile üretilmiş otel + odalar; otel detayında odaların listelenmesi."""
    async with session_factory() as session:
        hotel = HotelFactory()
        session.add(hotel)
        await session.flush()
        rooms = RoomFactory.build_batch(
            3, hotel_id=hotel.id, status=RoomStatus.available
        )
        session.add_all(rooms)
        await session.commit()
        await session.refresh(hotel)
        hotel_id = hotel.id

    resp = await client.get(f"/api/hotels/{hotel_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == hotel_id
    assert len(data["rooms"]) == 3
