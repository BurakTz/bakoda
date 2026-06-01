"""full schema — users, hotels, amenities, reviews, favorites, reset codes + room/booking extensions

Revision ID: 002
Revises: 001
Create Date: 2026-05-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.String(length=300), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("birthday", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="TR"),
        sa.Column("language", sa.String(length=10), nullable=False, server_default="tr"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="TRY"),
        sa.Column("avatar_tone", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── hotels ───────────────────────────────────────────────────────────────
    op.create_table(
        "hotels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("district", sa.String(length=100), nullable=True),
        sa.Column("stars", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reviews_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_per_night", sa.Float(), nullable=False),
        sa.Column("check_in_time", sa.String(length=10), nullable=False, server_default="15:00"),
        sa.Column("check_out_time", sa.String(length=10), nullable=False, server_default="12:00"),
        sa.Column("thumbnail", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hotels_id", "hotels", ["id"])
    op.create_index("ix_hotels_city", "hotels", ["city"])

    # ── hotel_amenities ───────────────────────────────────────────────────────
    op.create_table(
        "hotel_amenities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("hotel_id", sa.Integer(), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("subtitle", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hotel_amenities_id", "hotel_amenities", ["id"])
    op.create_index("ix_hotel_amenities_hotel_id", "hotel_amenities", ["hotel_id"])

    # ── hotel_reviews ─────────────────────────────────────────────────────────
    op.create_table(
        "hotel_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("hotel_id", sa.Integer(), nullable=False),
        sa.Column("reviewer_name", sa.String(length=100), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("rating", sa.Float(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hotel_reviews_id", "hotel_reviews", ["id"])
    op.create_index("ix_hotel_reviews_hotel_id", "hotel_reviews", ["hotel_id"])

    # ── rooms — yeni sutunlar ─────────────────────────────────────────────────
    op.add_column("rooms", sa.Column("hotel_id", sa.Integer(), nullable=True))
    op.add_column("rooms", sa.Column("name", sa.String(length=100), nullable=True))
    op.add_column("rooms", sa.Column("bed_type", sa.String(length=50), nullable=True))
    op.add_column("rooms", sa.Column("view", sa.String(length=100), nullable=True))
    op.add_column("rooms", sa.Column("size_m2", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_rooms_hotel_id", "rooms", "hotels", ["hotel_id"], ["id"])
    op.create_index("ix_rooms_hotel_id", "rooms", ["hotel_id"])

    # ── bookings — yeni sutunlar ──────────────────────────────────────────────
    op.add_column("bookings", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("bookings", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("bookings", sa.Column("guests", sa.Integer(), nullable=False, server_default="1"))
    op.add_column(
        "bookings", sa.Column("rooms_count", sa.Integer(), nullable=False, server_default="1")
    )
    op.add_column("bookings", sa.Column("preferences", sa.Text(), nullable=True))
    op.add_column("bookings", sa.Column("arrival_time", sa.String(length=20), nullable=True))
    op.add_column("bookings", sa.Column("trip_type", sa.String(length=50), nullable=True))
    op.add_column("bookings", sa.Column("confirmation_code", sa.String(length=30), nullable=True))
    op.create_foreign_key("fk_bookings_user_id", "bookings", "users", ["user_id"], ["id"])
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])
    op.create_index("ix_bookings_check_in", "bookings", ["check_in"])
    op.create_index("ix_bookings_check_out", "bookings", ["check_out"])
    op.create_index("ix_bookings_confirmation_code", "bookings", ["confirmation_code"])

    # ── favorites ─────────────────────────────────────────────────────────────
    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("hotel_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "hotel_id", name="uq_user_hotel_favorite"),
    )
    op.create_index("ix_favorites_id", "favorites", ["id"])
    op.create_index("ix_favorites_user_id", "favorites", ["user_id"])
    op.create_index("ix_favorites_hotel_id", "favorites", ["hotel_id"])

    # ── password_reset_codes ──────────────────────────────────────────────────
    op.create_table(
        "password_reset_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_password_reset_codes_id", "password_reset_codes", ["id"])
    op.create_index("ix_password_reset_codes_email", "password_reset_codes", ["email"])


def downgrade() -> None:
    op.drop_table("password_reset_codes")
    op.drop_index("ix_favorites_hotel_id", table_name="favorites")
    op.drop_index("ix_favorites_user_id", table_name="favorites")
    op.drop_index("ix_favorites_id", table_name="favorites")
    op.drop_table("favorites")

    op.drop_index("ix_bookings_confirmation_code", table_name="bookings")
    op.drop_index("ix_bookings_check_out", table_name="bookings")
    op.drop_index("ix_bookings_check_in", table_name="bookings")
    op.drop_index("ix_bookings_user_id", table_name="bookings")
    op.drop_constraint("fk_bookings_user_id", "bookings", type_="foreignkey")
    for col in [
        "confirmation_code",
        "trip_type",
        "arrival_time",
        "preferences",
        "rooms_count",
        "guests",
        "phone",
        "user_id",
    ]:
        op.drop_column("bookings", col)

    op.drop_index("ix_rooms_hotel_id", table_name="rooms")
    op.drop_constraint("fk_rooms_hotel_id", "rooms", type_="foreignkey")
    for col in ["size_m2", "view", "bed_type", "name", "hotel_id"]:
        op.drop_column("rooms", col)

    op.drop_table("hotel_reviews")
    op.drop_table("hotel_amenities")
    op.drop_table("hotels")
    op.drop_table("users")
