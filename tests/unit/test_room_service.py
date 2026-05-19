from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models import Room, RoomStatus, RoomType
from src.services import room_service


def _make_room(**kwargs) -> Room:
    defaults = dict(
        id=1,
        room_number="101",
        type=RoomType.double,
        capacity=2,
        price_per_night=150.0,
        status=RoomStatus.available,
    )
    defaults.update(kwargs)
    r = Room()
    for k, v in defaults.items():
        setattr(r, k, v)
    return r


@pytest.mark.asyncio
async def test_list_rooms_no_filter_returns_available():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [_make_room()]
    mock_db.execute.return_value = mock_result

    rooms = await room_service.list_rooms(mock_db)
    assert len(rooms) == 1
    assert rooms[0].status == RoomStatus.available


@pytest.mark.asyncio
async def test_list_rooms_with_dates_passes_filter():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    rooms = await room_service.list_rooms(mock_db, date(2026, 6, 1), date(2026, 6, 5))
    assert rooms == []
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_room_found():
    mock_db = AsyncMock()
    room = _make_room(id=42)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = room
    mock_db.execute.return_value = mock_result

    result = await room_service.get_room(mock_db, 42)
    assert result is room


@pytest.mark.asyncio
async def test_get_room_not_found():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await room_service.get_room(mock_db, 999)
    assert result is None


@pytest.mark.asyncio
async def test_create_room():
    mock_db = AsyncMock()
    room = await room_service.create_room(
        mock_db,
        room_number="202",
        type=RoomType.suite,
        capacity=4,
        price_per_night=400.0,
        status=RoomStatus.available,
    )
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()
