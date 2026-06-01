import src.models  # noqa: F401
from src.database import Base


def test_payment_tables_registered_in_metadata():
    assert "saved_cards" in Base.metadata.tables
    assert "billing_addresses" in Base.metadata.tables

    saved_cards = Base.metadata.tables["saved_cards"]
    billing_addresses = Base.metadata.tables["billing_addresses"]
    assert "user_id" in saved_cards.c
    assert "user_id" in billing_addresses.c
