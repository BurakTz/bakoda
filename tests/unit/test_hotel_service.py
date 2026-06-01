from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.hotel_service import search_hotels


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
