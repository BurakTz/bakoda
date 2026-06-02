"""payments and contact messages

Revision ID: 005
Revises: 004
Create Date: 2026-06-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="TRY"),
        sa.Column("method", sa.String(length=30), nullable=False, server_default="card"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="success"),
        sa.Column("transaction_id", sa.String(length=40), nullable=False),
        sa.Column("card_last4", sa.String(length=4), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_id", "payments", ["id"])
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_transaction_id", "payments", ["transaction_id"], unique=True)

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("ticket_id", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contact_messages_id", "contact_messages", ["id"])
    op.create_index("ix_contact_messages_email", "contact_messages", ["email"])
    op.create_index(
        "ix_contact_messages_ticket_id", "contact_messages", ["ticket_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_contact_messages_ticket_id", table_name="contact_messages")
    op.drop_index("ix_contact_messages_email", table_name="contact_messages")
    op.drop_index("ix_contact_messages_id", table_name="contact_messages")
    op.drop_table("contact_messages")
    op.drop_index("ix_payments_transaction_id", table_name="payments")
    op.drop_index("ix_payments_booking_id", table_name="payments")
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")
