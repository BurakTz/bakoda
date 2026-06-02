from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.models import Hotel, Room, RoomStatus, RoomType
from src.services.hotel_service import (
    CITY_COUNTRY,
    _city_slug,
    _destination_image,
    _normalize_location_term,
    create_hotel_review,
    get_hotel_detail,
    list_destinations,
    search_locations,
)


def test_city_slug_spaces_to_hyphens():
    assert _city_slug("New York") == "new-york"
    assert _city_slug("Rio de Janeiro") == "rio-de-janeiro"


def test_destination_image_for_known_and_unknown_cities():
    url = _destination_image("İstanbul")
    assert url is not None
    assert "unsplash.com" in url
    assert _destination_image("Nonexistent City XYZ") is None


def test_city_country_map_has_istanbul():
    assert CITY_COUNTRY.get("İstanbul") == "Türkiye"


def test_normalize_location_strips_and_collapses_spaces():
    assert _normalize_location_term("  İstanbul  ") == "istanbul"


@pytest.mark.asyncio
async def test_list_destinations_maps_rows():
    mock_db = AsyncMock()
    row_result = MagicMock()
    row_result.all.return_value = [("İstanbul", 5), ("Paris", 2)]
    mock_db.execute.return_value = row_result

    destinations = await list_destinations(mock_db, limit=5)

    assert len(destinations) == 2
    assert destinations[0]["name"] == "İstanbul"
    assert destinations[0]["country"] == "Türkiye"
    assert destinations[0]["hotels"] == 5
    assert destinations[0]["slug"] == "istanbul"
    assert destinations[0]["image"]


@pytest.mark.asyncio
async def test_search_locations_without_query_returns_cities():
    mock_db = AsyncMock()
    city_rows = MagicMock()
    city_rows.all.return_value = [("Paris", 3)]
    district_rows = MagicMock()
    district_rows.all.return_value = []
    hotel_rows = MagicMock()
    hotel_rows.all.return_value = []
    mock_db.execute.side_effect = [city_rows, district_rows, hotel_rows]

    locations = await search_locations(mock_db, q=None, limit=5)

    assert len(locations) == 1
    assert locations[0]["kind"] == "city"
    assert locations[0]["name"] == "Paris"


@pytest.mark.asyncio
async def test_get_hotel_detail_not_found():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db = AsyncMock()
    db.execute.return_value = result

    hotel, count = await get_hotel_detail(db, 999)

    assert hotel is None
    assert count is None


@pytest.mark.asyncio
async def test_get_hotel_detail_without_dates_filters_available_rooms():
    hotel = Hotel(
        id=1, name="H", city="İstanbul", stars=4, rating=8.0,
        reviews_count=1, price_per_night=100.0,
    )
    available = Room(
        id=1,
        hotel_id=1,
        room_number="A1",
        type=RoomType.double,
        capacity=2,
        price_per_night=100.0,
        status=RoomStatus.available,
    )
    maintenance = Room(
        id=2,
        hotel_id=1,
        room_number="A2",
        type=RoomType.single,
        capacity=1,
        price_per_night=80.0,
        status=RoomStatus.maintenance,
    )
    hotel.rooms = [available, maintenance]

    result = MagicMock()
    result.scalar_one_or_none.return_value = hotel
    db = AsyncMock()
    db.execute.return_value = result

    out, count = await get_hotel_detail(db, 1)

    assert out is hotel
    assert count == 1
    assert len(out.rooms) == 1
    assert out.rooms[0].id == 1


@pytest.mark.asyncio
async def test_get_hotel_detail_with_dates_delegates_to_room_service(monkeypatch):
    hotel = Hotel(
        id=2, name="H2", city="Paris", stars=5, rating=9.0,
        reviews_count=2, price_per_night=200.0,
    )
    hotel.rooms = []
    result = MagicMock()
    result.scalar_one_or_none.return_value = hotel
    db = AsyncMock()
    db.execute.return_value = result

    rooms = [
        Room(
            id=10,
            hotel_id=2,
            room_number="R10",
            type=RoomType.double,
            capacity=2,
            price_per_night=200.0,
            status=RoomStatus.available,
        )
    ]

    async def _fake_list_available(*_args, **_kwargs):
        return rooms

    from src.services import room_service

    monkeypatch.setattr(room_service, "list_available_hotel_rooms", _fake_list_available)

    out, count = await get_hotel_detail(
        db, 2, check_in=date(2027, 1, 1), check_out=date(2027, 1, 5), guests=2
    )

    assert count == 1
    assert out.rooms == rooms


@pytest.mark.asyncio
async def test_create_hotel_review_updates_hotel_stats(db_session):
    hotel = Hotel(
        name="Review Hotel",
        city="İstanbul",
        district="Beşiktaş",
        stars=4,
        rating=0.0,
        reviews_count=0,
        price_per_night=500.0,
    )
    db_session.add(hotel)
    await db_session.commit()
    await db_session.refresh(hotel)

    review = await create_hotel_review(
        db_session,
        hotel.id,
        reviewer_name="Ayşe",
        country="TR",
        rating=9.0,
        title="Harika",
        text="  Çok güzel bir otel.  ",
    )

    assert review is not None
    assert review.text == "Çok güzel bir otel."
    await db_session.refresh(hotel)
    assert hotel.reviews_count == 1
    assert hotel.rating == 9.0


@pytest.mark.asyncio
async def test_create_hotel_review_returns_none_for_missing_hotel():
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)

    review = await create_hotel_review(
        db, 99999, "X", None, 8.0, None, "Yorum"
    )

    assert review is None
