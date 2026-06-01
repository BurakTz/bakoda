"""saved cards and billing addresses

Revision ID: 003
Revises: 002
Create Date: 2026-06-01

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_cards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("brand", sa.String(length=20), nullable=False),
        sa.Column("last4", sa.String(length=4), nullable=False),
        sa.Column("holder_name", sa.String(length=100), nullable=False),
        sa.Column("exp_month", sa.Integer(), nullable=False),
        sa.Column("exp_year", sa.Integer(), nullable=False),
        sa.Column("card_type", sa.String(length=20), nullable=False, server_default="Kredi"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_saved_cards_id", "saved_cards", ["id"])
    op.create_index("ix_saved_cards_user_id", "saved_cards", ["user_id"])

    op.create_table(
        "billing_addresses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("line", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("district", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("city", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("zip_code", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="Türkiye"),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_billing_address"),
    )
    op.create_index("ix_billing_addresses_id", "billing_addresses", ["id"])
    op.create_index("ix_billing_addresses_user_id", "billing_addresses", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_billing_addresses_user_id", table_name="billing_addresses")
    op.drop_index("ix_billing_addresses_id", table_name="billing_addresses")
    op.drop_table("billing_addresses")
    op.drop_index("ix_saved_cards_user_id", table_name="saved_cards")
    op.drop_index("ix_saved_cards_id", table_name="saved_cards")
    op.drop_table("saved_cards")
