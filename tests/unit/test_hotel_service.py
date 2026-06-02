from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.hotel_service import _normalize_location_term, search_hotels


def test_normalize_location_term_turkish():
    assert _normalize_location_term("İsta") == "ista"
    assert _normalize_location_term("İstanbul") == "istanbul"
    assert _normalize_location_term("Nevşehir") == "nevsehir"
    assert _normalize_location_term("ist") == "ist"


@pytest.mark.asyncio
async def test_search_hotels_count_uses_scalar_count():
    mock_db = AsyncMock()
    list_result = MagicMock()
    list_result.scalars.return_value.all.return_value = []
    count_result = MagicMock()
    count_result.scalar_one.return_value = 7
    mock_db.execute.side_effect = [count_result, list_result]

    hotels, total = await search_hotels(mock_db, city="istanbul")
    assert hotels == []
    assert total == 7
    assert mock_db.execute.call_count == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("sort", ["price-asc", "price-desc", "rating", "recommended"])
async def test_search_hotels_accepts_sort_options(sort: str):
    mock_db = AsyncMock()
    list_result = MagicMock()
    list_result.scalars.return_value.all.return_value = []
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    mock_db.execute.side_effect = [count_result, list_result]

    hotels, total = await search_hotels(mock_db, sort=sort)

    assert hotels == []
    assert total == 0


@pytest.mark.asyncio
async def test_search_hotels_with_price_and_stars_filters():
    mock_db = AsyncMock()
    list_result = MagicMock()
    list_result.scalars.return_value.all.return_value = []
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    mock_db.execute.side_effect = [count_result, list_result]

    hotels, total = await search_hotels(
        mock_db, price_min=100.0, price_max=500.0, stars=4, page=2, page_size=5
    )

    assert total == 1
    assert hotels == []
