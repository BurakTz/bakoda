"""Factory Boy + Faker ile üretilen test verisinin doğruluğunu doğrular.

Bu testler factory'leri AKTİF olarak kullanır (build / build_batch / override)
ve ürettikleri verinin model değişmezlerini (capacity↔type, tarih sırası) korur.
"""

from src.models import BookingStatus, RoomStatus, RoomType
from tests.factories import BookingFactory, HotelFactory, RoomFactory, UserFactory


def test_room_factory_builds_realistic_room():
    room = RoomFactory()
    assert room.room_number
    assert room.type in (RoomType.single, RoomType.double, RoomType.suite)
    assert room.status == RoomStatus.available
    assert 50.0 <= room.price_per_night <= 500.0


def test_room_factory_capacity_matches_type():
    expected = {RoomType.single: 1, RoomType.double: 2, RoomType.suite: 4}
    for room in RoomFactory.build_batch(12):
        assert room.capacity == expected[room.type]


def test_room_factory_override():
    suite = RoomFactory(type=RoomType.suite, price_per_night=999.0)
    assert suite.type == RoomType.suite
    assert suite.capacity == 4
    assert suite.price_per_night == 999.0


def test_room_factory_batch_generates_distinct_data():
    rooms = RoomFactory.build_batch(8)
    assert len(rooms) == 8
    # Faker farklı oda numaraları üretir (çakışma olsa da en az birkaç farklı değer).
    assert len({r.room_number for r in rooms}) > 1


def test_booking_factory_dates_ordered_and_confirmed():
    booking = BookingFactory()
    assert booking.guest_name
    assert "@" in booking.guest_email
    assert booking.check_out >= booking.check_in
    assert booking.status == BookingStatus.confirmed
    assert 100.0 <= booking.total_price <= 2000.0


def test_booking_factory_override():
    booking = BookingFactory(guest_name="Ada Lovelace", status=BookingStatus.cancelled)
    assert booking.guest_name == "Ada Lovelace"
    assert booking.status == BookingStatus.cancelled


def test_hotel_factory_builds_realistic_hotel():
    hotel = HotelFactory()
    assert hotel.name
    assert hotel.city
    assert 1 <= hotel.stars <= 5
    assert 0.0 <= hotel.rating <= 10.0
    assert hotel.reviews_count >= 0
    assert hotel.price_per_night > 0


def test_hotel_factory_override():
    hotel = HotelFactory(name="Test Hotel", city="İstanbul", stars=5, price_per_night=500.0)
    assert hotel.name == "Test Hotel"
    assert hotel.city == "İstanbul"
    assert hotel.stars == 5
    assert hotel.price_per_night == 500.0


def test_hotel_factory_batch_generates_data():
    hotels = HotelFactory.build_batch(6)
    assert len(hotels) == 6
    assert all(h.price_per_night > 0 for h in hotels)
    assert all(1 <= h.stars <= 5 for h in hotels)


def test_user_factory_builds_required_fields():
    user = UserFactory()
    assert "@" in user.email
    assert user.password_hash
    assert user.first_name
    assert user.last_name
    assert user.country == "TR"
    assert user.language == "tr"
    assert user.currency == "TRY"


def test_user_factory_emails_unique_across_batch():
    users = UserFactory.build_batch(10)
    assert len({u.email for u in users}) == 10


def test_user_factory_override():
    user = UserFactory(email="fixed@bakoda.test", first_name="Ada", last_name="Lovelace")
    assert user.email == "fixed@bakoda.test"
    assert user.first_name == "Ada"
    assert user.last_name == "Lovelace"
