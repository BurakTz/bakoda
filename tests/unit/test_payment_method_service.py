import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.services import payment_method_service
from tests.factories import UserFactory


@pytest.mark.asyncio
async def test_create_and_list_cards(db_session: AsyncSession):
    user = UserFactory(email="cards-svc@bakoda.com", first_name="Card", last_name="Tester")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    card = await payment_method_service.create_card(
        db_session,
        user.id,
        {
            "brand": "visa",
            "last4": "4242",
            "holder_name": "Card Tester",
            "exp_month": 8,
            "exp_year": 27,
            "card_type": "Kredi",
            "is_default": True,
        },
    )
    assert card.is_default is True

    cards = await payment_method_service.list_cards(db_session, user.id)
    assert len(cards) == 1
    assert cards[0].last4 == "4242"


@pytest.mark.asyncio
async def test_upsert_billing_persists(db_session: AsyncSession):
    user = UserFactory(email="billing-svc@bakoda.com", first_name="Bill", last_name="Tester")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    saved = await payment_method_service.upsert_billing(
        db_session,
        user.id,
        {
            "name": "Bill Tester",
            "line": "Test Sok. 5",
            "district": "Beşiktaş",
            "city": "İstanbul",
            "zip_code": "34353",
            "country": "Türkiye",
        },
    )
    assert saved.line == "Test Sok. 5"

    loaded = await payment_method_service.get_billing(db_session, user.id)
    assert loaded is not None
    assert loaded.district == "Beşiktaş"
    assert loaded.zip_code == "34353"

    updated = await payment_method_service.upsert_billing(
        db_session,
        user.id,
        {"city": "Ankara"},
    )
    assert updated.city == "Ankara"
    assert updated.line == "Test Sok. 5"
