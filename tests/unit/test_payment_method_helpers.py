from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import SavedCard
from src.services.payment_method_service import (
    _card_expired,
    card_to_out,
    create_card,
    delete_card,
    get_card,
    set_default_card,
    update_card,
)
from tests.factories import UserFactory


def test_card_expired_past_year():
    fixed = datetime(2026, 6, 1, tzinfo=timezone.utc)
    with patch("src.services.payment_method_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        assert _card_expired(12, 25) is True


def test_card_expired_past_month_same_year():
    fixed = datetime(2026, 6, 1, tzinfo=timezone.utc)
    with patch("src.services.payment_method_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        assert _card_expired(5, 26) is True


def test_card_expired_future():
    fixed = datetime(2026, 6, 1, tzinfo=timezone.utc)
    with patch("src.services.payment_method_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        assert _card_expired(12, 30) is False


def test_card_expired_four_digit_year():
    fixed = datetime(2026, 6, 1, tzinfo=timezone.utc)
    with patch("src.services.payment_method_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        assert _card_expired(7, 2030) is False


def test_card_to_out_includes_expired_flag():
    card = SavedCard(
        id=1,
        user_id=1,
        brand="visa",
        last4="4242",
        holder_name="Test",
        exp_month=1,
        exp_year=20,
        card_type="Kredi",
        is_default=True,
    )
    with patch("src.services.payment_method_service._card_expired", return_value=True):
        data = card_to_out(card)

    assert data["expired"] is True
    assert data["last4"] == "4242"


@pytest.mark.asyncio
async def test_get_card_returns_none_for_wrong_user(db_session: AsyncSession):
    user = UserFactory(email="cardget@example.com", first_name="A", last_name="B")
    other = UserFactory(email="othercard@example.com", first_name="C", last_name="D")
    db_session.add_all([user, other])
    await db_session.commit()

    card = SavedCard(
        user_id=user.id,
        brand="visa",
        last4="1111",
        holder_name="Holder",
        exp_month=12,
        exp_year=30,
        card_type="Kredi",
        is_default=True,
    )
    db_session.add(card)
    await db_session.commit()

    found = await get_card(db_session, other.id, card.id)

    assert found is None


@pytest.mark.asyncio
async def test_update_card_changes_holder(db_session: AsyncSession):
    user = UserFactory(email="cardupd@example.com", first_name="A", last_name="B")
    db_session.add(user)
    await db_session.commit()

    card = await create_card(
        db_session,
        user.id,
        {
            "brand": "visa",
            "last4": "4242",
            "holder_name": "Before",
            "exp_month": 8,
            "exp_year": 28,
        },
    )

    updated = await update_card(db_session, user.id, card.id, {"holder_name": "After"})

    assert updated is not None
    assert updated.holder_name == "After"


@pytest.mark.asyncio
async def test_set_default_card_rejects_expired(db_session: AsyncSession):
    user = UserFactory(email="expired@example.com", first_name="A", last_name="B")
    db_session.add(user)
    await db_session.commit()

    card = SavedCard(
        user_id=user.id,
        brand="visa",
        last4="9999",
        holder_name="Expired",
        exp_month=1,
        exp_year=20,
        card_type="Kredi",
        is_default=False,
    )
    db_session.add(card)
    await db_session.commit()

    with patch("src.services.payment_method_service._card_expired", return_value=True):
        result = await set_default_card(db_session, user.id, card.id)

    assert result is None


@pytest.mark.asyncio
async def test_delete_default_promotes_next_card(db_session: AsyncSession):
    user = UserFactory(email="deldef@example.com", first_name="A", last_name="B")
    db_session.add(user)
    await db_session.commit()

    first = await create_card(
        db_session,
        user.id,
        {
            "brand": "visa",
            "last4": "1111",
            "holder_name": "One",
            "exp_month": 12,
            "exp_year": 30,
        },
    )
    second = await create_card(
        db_session,
        user.id,
        {
            "brand": "mc",
            "last4": "2222",
            "holder_name": "Two",
            "exp_month": 11,
            "exp_year": 31,
            "is_default": False,
        },
    )

    assert first.is_default is True

    removed = await delete_card(db_session, user.id, first.id)

    assert removed is True
    promoted = await get_card(db_session, user.id, second.id)
    assert promoted is not None
    assert promoted.is_default is True
