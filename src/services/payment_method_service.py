from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import BillingAddress, SavedCard


def _card_expired(exp_month: int, exp_year: int) -> bool:
    today = datetime.now(timezone.utc).date()
    year = 2000 + exp_year if exp_year < 100 else exp_year
    if year < today.year:
        return True
    if year == today.year and exp_month < today.month:
        return True
    return False


def card_to_out(card: SavedCard) -> dict:
    data = {
        "id": card.id,
        "brand": card.brand,
        "last4": card.last4,
        "holder_name": card.holder_name,
        "exp_month": card.exp_month,
        "exp_year": card.exp_year,
        "card_type": card.card_type,
        "is_default": card.is_default,
        "expired": _card_expired(card.exp_month, card.exp_year),
        "created_at": card.created_at,
    }
    return data


async def list_cards(db: AsyncSession, user_id: int) -> list[SavedCard]:
    result = await db.execute(
        select(SavedCard)
        .where(SavedCard.user_id == user_id)
        .order_by(SavedCard.is_default.desc(), SavedCard.created_at.desc())
    )
    return list(result.scalars().all())


async def _clear_default(db: AsyncSession, user_id: int) -> None:
    await db.execute(update(SavedCard).where(SavedCard.user_id == user_id).values(is_default=False))


async def create_card(db: AsyncSession, user_id: int, data: dict) -> SavedCard:
    cards = await list_cards(db, user_id)
    is_default = data.get("is_default", False) or len(cards) == 0

    if is_default:
        await _clear_default(db, user_id)

    card = SavedCard(
        user_id=user_id,
        brand=data["brand"],
        last4=data["last4"],
        holder_name=data["holder_name"],
        exp_month=data["exp_month"],
        exp_year=data["exp_year"],
        card_type=data.get("card_type", "Kredi"),
        is_default=is_default,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


async def get_card(db: AsyncSession, user_id: int, card_id: int) -> SavedCard | None:
    result = await db.execute(
        select(SavedCard).where(SavedCard.id == card_id, SavedCard.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_card(db: AsyncSession, user_id: int, card_id: int, data: dict) -> SavedCard | None:
    card = await get_card(db, user_id, card_id)
    if not card:
        return None

    if data.get("is_default"):
        await _clear_default(db, user_id)
        card.is_default = True

    for key in ("holder_name", "exp_month", "exp_year", "card_type"):
        if data.get(key) is not None:
            setattr(card, key, data[key])

    await db.commit()
    await db.refresh(card)
    return card


async def set_default_card(db: AsyncSession, user_id: int, card_id: int) -> SavedCard | None:
    card = await get_card(db, user_id, card_id)
    if not card:
        return None
    if _card_expired(card.exp_month, card.exp_year):
        return None
    await _clear_default(db, user_id)
    card.is_default = True
    await db.commit()
    await db.refresh(card)
    return card


async def delete_card(db: AsyncSession, user_id: int, card_id: int) -> bool:
    card = await get_card(db, user_id, card_id)
    if not card:
        return False
    was_default = card.is_default
    await db.delete(card)
    await db.commit()

    if was_default:
        remaining = await list_cards(db, user_id)
        if remaining:
            await set_default_card(db, user_id, remaining[0].id)
    return True


async def get_billing(db: AsyncSession, user_id: int) -> BillingAddress | None:
    result = await db.execute(select(BillingAddress).where(BillingAddress.user_id == user_id))
    return result.scalar_one_or_none()


async def upsert_billing(db: AsyncSession, user_id: int, data: dict) -> BillingAddress:
    billing = await get_billing(db, user_id)
    if not billing:
        billing = BillingAddress(user_id=user_id)
        db.add(billing)

    for key, value in data.items():
        if value is not None:
            setattr(billing, key, value)

    await db.commit()
    await db.refresh(billing)
    return billing
