"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_number", sa.String(length=10), nullable=False),
        sa.Column(
            "type",
            sa.Enum("single", "double", "suite", name="roomtype"),
            nullable=False,
        ),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("price_per_night", sa.Float(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("available", "maintenance", name="roomstatus"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rooms_id", "rooms", ["id"])
    op.create_index("ix_rooms_room_number", "rooms", ["room_number"], unique=True)

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("guest_name", sa.String(length=100), nullable=False),
        sa.Column("guest_email", sa.String(length=200), nullable=False),
        sa.Column("check_in", sa.Date(), nullable=False),
        sa.Column("check_out", sa.Date(), nullable=False),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("confirmed", "cancelled", name="bookingstatus"),
            nullable=False,
        ),
        sa.Column("confirmation_key", sa.String(length=300), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bookings_id", "bookings", ["id"])
    op.create_index("ix_bookings_room_id", "bookings", ["room_id"])


def downgrade() -> None:
    op.drop_index("ix_bookings_room_id", table_name="bookings")
    op.drop_index("ix_bookings_id", table_name="bookings")
    op.drop_table("bookings")
    op.drop_index("ix_rooms_room_number", table_name="rooms")
    op.drop_index("ix_rooms_id", table_name="rooms")
    op.drop_table("rooms")
    op.execute("DROP TYPE IF EXISTS bookingstatus")
    op.execute("DROP TYPE IF EXISTS roomstatus")
    op.execute("DROP TYPE IF EXISTS roomtype")
