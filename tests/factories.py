import uuid

import factory
from faker import Faker

from src.models import Booking, BookingStatus, Hotel, Room, RoomStatus, RoomType, User

fake = Faker()

# Faker'ın gerçekçi ama Türkiye bağlamına yakın şehirleri.
_TR_CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bodrum", "Nevşehir", "Bursa"]


class HotelFactory(factory.Factory):
    class Meta:
        model = Hotel

    name = factory.LazyFunction(lambda: f"{fake.last_name()} Hotel")
    city = factory.Iterator(_TR_CITIES)
    district = factory.LazyFunction(lambda: fake.city())
    stars = factory.LazyFunction(lambda: fake.random_int(1, 5))
    rating = factory.LazyFunction(lambda: round(fake.pyfloat(min_value=0, max_value=10), 1))
    reviews_count = factory.LazyFunction(lambda: fake.random_int(0, 500))
    description = factory.LazyFunction(lambda: fake.sentence(nb_words=10))
    price_per_night = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=300, max_value=5000, right_digits=2), 2)
    )


class UserFactory(factory.Factory):
    class Meta:
        model = User

    email = factory.LazyFunction(lambda: f"{uuid.uuid4().hex[:12]}@bakoda.test")
    password_hash = factory.LazyFunction(lambda: fake.sha256())
    first_name = factory.LazyFunction(fake.first_name)
    last_name = factory.LazyFunction(fake.last_name)
    phone = factory.LazyFunction(lambda: fake.numerify("+90##########"))
    country = "TR"
    language = "tr"
    currency = "TRY"


class RoomFactory(factory.Factory):
    class Meta:
        model = Room

    # unique=True olduğu için DB insert'lerinde çakışmayacak şekilde benzersiz üret.
    room_number = factory.LazyFunction(lambda: uuid.uuid4().hex[:10].upper())
    type = factory.Iterator([RoomType.single, RoomType.double, RoomType.suite])
    capacity = factory.LazyAttribute(
        lambda o: 1 if o.type == RoomType.single else (2 if o.type == RoomType.double else 4)
    )
    price_per_night = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=50, max_value=500, right_digits=2), 2)
    )
    status = RoomStatus.available


class BookingFactory(factory.Factory):
    class Meta:
        model = Booking

    room_id = factory.Sequence(lambda n: n + 1)
    guest_name = factory.LazyFunction(fake.name)
    guest_email = factory.LazyFunction(fake.email)
    check_in = factory.LazyFunction(lambda: fake.future_date(end_date="+30d"))
    check_out = factory.LazyAttribute(
        lambda o: fake.date_between(start_date=o.check_in, end_date="+40d")
    )
    total_price = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=100, max_value=2000, right_digits=2), 2)
    )
    status = BookingStatus.confirmed
    confirmation_key = None
