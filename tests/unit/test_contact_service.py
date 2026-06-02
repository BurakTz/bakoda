from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.contact_service import _make_ticket_id, create_contact_message


def test_make_ticket_id_format():
    tid = _make_ticket_id()
    assert tid.startswith("TKT-")
    assert len(tid) == len("TKT-") + 6
    assert tid[4:].isalnum()


def test_make_ticket_id_unique():
    assert _make_ticket_id() != _make_ticket_id()


@pytest.mark.asyncio
async def test_create_contact_message_persists_fields():
    db = AsyncMock()
    db.add = MagicMock()  # .add() senkron
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    msg = await create_contact_message(
        db,
        name="Test User",
        email="user@example.com",
        message="Merhaba, bu bir test mesajıdır.",
        subject="Destek",
    )

    assert msg.name == "Test User"
    assert msg.email == "user@example.com"
    assert msg.subject == "Destek"
    assert msg.status == "open"
    assert msg.ticket_id.startswith("TKT-")
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(msg)


@pytest.mark.asyncio
async def test_create_contact_message_optional_subject():
    db = AsyncMock()
    db.add = MagicMock()  # .add() senkron
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    msg = await create_contact_message(db, "A", "a@example.com", "Mesaj gövdesi yeterince uzun.")

    assert msg.subject is None
