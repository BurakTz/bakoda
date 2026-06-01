import factory
from faker import Faker

from src.models import Booking, BookingStatus, Room, RoomStatus, RoomType

fake = Faker()


class RoomFactory(factory.Factory):
    class Meta:
        model = Room

    room_number = factory.LazyFunction(lambda: f"{fake.random_int(1, 9)}{fake.bothify('##')}")
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
