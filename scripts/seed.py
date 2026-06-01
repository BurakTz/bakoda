"""Seed script — 30 destinasyon, oteller, odalar ve yorumlar.

Veritabanını sıfırlayıp yeniden doldurmak için:
  docker compose down -v          # tüm volume'ları sil (temiz DB)
  docker compose up -d postgres   # postgres'i başlat
  docker compose run --rm app python scripts/seed.py

Mevcut veriyi sadece otel tablolarında sıfırlamak için seed.py doğrudan çalıştırılır;
kullanıcı ve rezervasyon kayıtları korunur (oda bağlantısı koparılır).
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@postgres:5432/bakoda"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 30 destinasyon: (şehir, ülke, unsplash photo id, bölge örnekleri)
# Unsplash photo IDs verified against images.unsplash.com (many legacy IDs now 404).
LOCATIONS = [
    ("İstanbul", "Türkiye", "photo-1552733407-5d5c46c3bb3b", ["Beşiktaş", "Sultanahmet"]),
    ("Antalya", "Türkiye", "photo-1566073771259-6a8506099945", ["Kaleiçi", "Lara"]),
    ("Nevşehir", "Türkiye", "photo-1445019980597-93fa8acb246c", ["Ürgüp", "Göreme"]),
    ("Bodrum", "Türkiye", "photo-1582719508461-905c673771fd", ["Yalıkavak", "Merkez"]),
    ("Paris", "Fransa", "photo-1502602898657-3e91760cbb34", ["Le Marais", "Saint-Germain"]),
    ("Roma", "İtalya", "photo-1552832230-c0197dd311b5", ["Trastevere", "Centro Storico"]),
    ("Barcelona", "İspanya", "photo-1539037116277-4db20889f2d4", ["Gothic Quarter", "Eixample"]),
    ("Madrid", "İspanya", "photo-1590490360182-c33d57733427", ["Salamanca", "Sol"]),
    ("Londra", "İngiltere", "photo-1513635269975-59663e0ac1ad", ["Covent Garden", "South Bank"]),
    ("Amsterdam", "Hollanda", "photo-1523906834658-6e24ef2386f9", ["Jordaan", "De Pijp"]),
    ("Berlin", "Almanya", "photo-1595867818082-083862f3d630", ["Mitte", "Kreuzberg"]),
    ("Prag", "Çekya", "photo-1469854523086-cc02fe5d8800", ["Staré Město", "Malá Strana"]),
    ("Viyana", "Avusturya", "photo-1571896349842-33c89424de2d", ["Innere Stadt", "Leopoldstadt"]),
    ("Atina", "Yunanistan", "photo-1555881400-74d7acaacd8b", ["Plaka", "Kolonaki"]),
    ("Santorini", "Yunanistan", "photo-1613395877344-13d4a8e0d49e", ["Oia", "Fira"]),
    ("Dubai", "BAE", "photo-1512453979798-5ea266f8880c", ["Downtown", "Palm Jumeirah"]),
    ("Tokyo", "Japonya", "photo-1540959733332-eab4deabeeaf", ["Shinjuku", "Shibuya"]),
    ("Kyoto", "Japonya", "photo-1542314831-068cd1dbfeeb", ["Gion", "Arashiyama"]),
    ("Bangkok", "Tayland", "photo-1631049307264-da0ec9d70304", ["Sukhumvit", "Riverside"]),
    ("Singapur", "Singapur", "photo-1582719478250-c89cae4dc85b", ["Marina Bay", "Orchard"]),
    ("New York", "ABD", "photo-1507525428034-b723cf961d3e", ["Midtown", "SoHo"]),
    ("Los Angeles", "ABD", "photo-1618773928121-c32242e63f39", ["Hollywood", "Santa Monica"]),
    ("Miami", "ABD", "photo-1506905925346-21bda4d32df4", ["South Beach", "Brickell"]),
    ("Marrakech", "Fas", "photo-1590490360182-c33d57733427", ["Medina", "Hivernage"]),
    ("Cape Town", "Güney Afrika", "photo-1571896349842-33c89424de2d", ["Waterfront", "Camps Bay"]),
    ("Sydney", "Avustralya", "photo-1469854523086-cc02fe5d8800", ["Circular Quay", "Bondi"]),
    ("Bali", "Endonezya", "photo-1507525428034-b723cf961d3e", ["Ubud", "Seminyak"]),
    ("Rio de Janeiro", "Brezilya", "photo-1483729558449-99ef09a8c325", ["Copacabana", "Ipanema"]),
    ("Buenos Aires", "Arjantin", "photo-1483729558449-99ef09a8c325", ["Palermo", "San Telmo"]),
    ("Zürih", "İsviçre", "photo-1542314831-068cd1dbfeeb", ["Altstadt", "Seefeld"]),
]

HOTEL_PREFIXES = ["Grand", "Boutique", "Royal", "Harbor", "Garden", "Heritage"]
HOTEL_SUFFIXES = ["Suites", "House", "Resort", "Hotel", "Retreat", "Palace"]
AMENITY_SETS = [
    [
        {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Tüm alanlarda"},
        {"icon": "breakfast", "title": "Kahvaltı", "subtitle": "07:00 – 10:30"},
        {"icon": "spa", "title": "Spa", "subtitle": "Randevu ile"},
    ],
    [
        {"icon": "pool", "title": "Havuz", "subtitle": "Açık veya kapalı"},
        {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Fiber internet"},
        {"icon": "gym", "title": "Fitness", "subtitle": "24 saat"},
        {"icon": "breakfast", "title": "Kahvaltı", "subtitle": "Açık büfe"},
    ],
]


def unsplash_url(photo_id: str, w: int = 600, h: int = 400) -> str:
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w={w}&h={h}"


def _rooms_for_hotel(
    hotel_id: int, base_price: float, stars: int, district: str, slot: int
) -> list[dict]:
    """5–10 fiziksel oda kaydı; her oda ayrı rezerve edilebilir birim."""
    templates = [
        ("Deluxe Oda", "double", 2, 0, "King", 40),
        ("Süit", "suite", 3, 1200, "King", 58),
        ("Standart Oda", "single", 1, -600, "Queen", 28),
        ("Superior Oda", "double", 2, 350, "Queen", 34),
        ("Aile Odası", "double", 4, 500, "Twin", 42),
        ("Executive Süit", "suite", 2, 1800, "King", 72),
        ("Ekonomi Oda", "single", 1, -900, "Single", 22),
        ("Corner Deluxe", "double", 2, 650, "King", 45),
        ("Bahçe Süiti", "suite", 4, 950, "King", 62),
        ("Studio Oda", "double", 2, 200, "Queen", 32),
    ]
    count = 10 if stars >= 5 else 7 if stars >= 4 else 5
    rooms = []
    for idx in range(count):
        name, rtype, cap, delta, bed, size = templates[idx % len(templates)]
        n = idx + 1
        rooms.append(
            {
                "room_number": f"H{hotel_id}R{n:02d}",
                "name": f"{name} {n}" if idx > 0 else name,
                "type": rtype,
                "capacity": cap,
                "price_per_night": float(max(400, base_price + delta)),
                "bed_type": bed,
                "view": f"{district} Manzarası" if idx % 2 == 0 else "Panoramik",
                "size_m2": size + slot * 2 + (idx % 3),
            }
        )
    return rooms


def aggregate_reviews(reviews: list[dict]) -> tuple[float, int]:
    """Otel rating ve reviews_count — yalnızca gerçek yorum kayıtlarından."""
    if not reviews:
        return 0.0, 0
    total = sum(float(r["rating"]) for r in reviews)
    return round(total / len(reviews), 2), len(reviews)


def build_hotels() -> list[dict]:
    hotels = []
    hotel_id = 1
    for city_idx, (city, country, photo_id, districts) in enumerate(LOCATIONS):
        for slot in range(2):
            district = districts[slot % len(districts)]
            stars = 5 if slot == 0 else 4
            base_price = 2000 + city_idx * 180 + slot * 400
            prefix = HOTEL_PREFIXES[(city_idx + slot) % len(HOTEL_PREFIXES)]
            suffix = HOTEL_SUFFIXES[(city_idx + slot) % len(HOTEL_SUFFIXES)]
            name = f"{prefix} {city} {suffix}"
            base_score = min(round(7.8 + (city_idx % 5) * 0.3 + slot * 0.2, 2), 9.9)

            rooms = _rooms_for_hotel(hotel_id, base_price, stars, district, slot)

            reviews = [
                {
                    "reviewer_name": "Doğrulanmış Misafir",
                    "country": country,
                    "rating": min(base_score + 0.2, 10.0),
                    "title": "Harika konaklama",
                    "text": (
                        f"{name} beklentilerimizi aştı. "
                        "Konum mükemmel, personel çok ilgili."
                    ),
                },
                {
                    "reviewer_name": "Alex M.",
                    "country": "İngiltere",
                    "rating": max(base_score - 0.3, 7.0),
                    "title": "Great stay",
                    "text": (
                        f"Loved our time in {city}. "
                        "Clean rooms and excellent breakfast."
                    ),
                },
            ]
            rating, reviews_count = aggregate_reviews(reviews)

            hotels.append(
                {
                    "id": hotel_id,
                    "name": name,
                    "city": city,
                    "district": district,
                    "stars": stars,
                    "rating": rating,
                    "reviews_count": reviews_count,
                    "description": (
                        f"{city}, {district} bölgesinde {stars} yıldızlı konfor. "
                        f"{country}'nin en sevilen duraklarından birinde modern olanaklar "
                        "ve sıcak misafirperverlik."
                    ),
                    "price_per_night": float(base_price),
                    "check_in_time": "15:00",
                    "check_out_time": "11:00",
                    "thumbnail": unsplash_url(photo_id),
                    "rooms": rooms,
                    "amenities": AMENITY_SETS[slot % len(AMENITY_SETS)],
                    "reviews": reviews,
                }
            )
            hotel_id += 1
    return hotels


HOTELS = build_hotels()


async def reset_database(db: AsyncSession) -> None:
    """Tüm otel verilerini temizle; rezervasyonları koru ama oda bağlantısını kopar."""
    await db.execute(text("DELETE FROM hotel_reviews"))
    await db.execute(text("DELETE FROM hotel_amenities"))
    await db.execute(text("DELETE FROM favorites"))
    await db.execute(text("UPDATE bookings SET room_id = NULL WHERE room_id IS NOT NULL"))
    await db.execute(text("DELETE FROM rooms"))
    await db.execute(text("DELETE FROM hotels"))
    await db.execute(text("ALTER SEQUENCE hotels_id_seq RESTART WITH 1"))
    await db.execute(text("ALTER SEQUENCE rooms_id_seq RESTART WITH 1"))
    await db.commit()


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        await reset_database(db)

        for h in HOTELS:
            result = await db.execute(
                text("""
                    INSERT INTO hotels (id, name, city, district, stars, rating, reviews_count,
                        description, price_per_night, check_in_time, check_out_time, thumbnail)
                    VALUES (:id, :name, :city, :district, :stars, :rating, :reviews_count,
                        :description, :price_per_night, :check_in_time, :check_out_time, :thumbnail)
                    RETURNING id
                """),
                {
                    "id": h["id"],
                    "name": h["name"],
                    "city": h["city"],
                    "district": h["district"],
                    "stars": h["stars"],
                    "rating": h["rating"],
                    "reviews_count": h["reviews_count"],
                    "description": h["description"],
                    "price_per_night": h["price_per_night"],
                    "check_in_time": h["check_in_time"],
                    "check_out_time": h["check_out_time"],
                    "thumbnail": h.get("thumbnail"),
                },
            )
            hotel_id = result.fetchone()[0]

            for room in h["rooms"]:
                await db.execute(
                    text("""
                        INSERT INTO rooms (hotel_id, room_number, name, type, capacity,
                            price_per_night, bed_type, view, size_m2, status)
                        VALUES (:hotel_id, :room_number, :name, :type, :capacity,
                            :price_per_night, :bed_type, :view, :size_m2, 'available')
                        ON CONFLICT (room_number) DO UPDATE SET hotel_id = EXCLUDED.hotel_id
                    """),
                    {**room, "hotel_id": hotel_id},
                )

            for a in h["amenities"]:
                await db.execute(
                    text("""
                        INSERT INTO hotel_amenities (hotel_id, icon, title, subtitle)
                        VALUES (:hotel_id, :icon, :title, :subtitle)
                    """),
                    {"hotel_id": hotel_id, **a},
                )

            for r in h["reviews"]:
                await db.execute(
                    text("""
                        INSERT INTO hotel_reviews (
                            hotel_id, reviewer_name, country, rating, title, text
                        )
                        VALUES (
                            :hotel_id, :reviewer_name, :country, :rating, :title, :text
                        )
                    """),
                    {"hotel_id": hotel_id, **r},
                )

        # hotels.rating / reviews_count — hotel_reviews ile tutarlı olsun
        await db.execute(
            text("""
                UPDATE hotels h
                SET
                    reviews_count = COALESCE(stats.cnt, 0),
                    rating = COALESCE(stats.avg_rating, 0)
                FROM (
                    SELECT
                        hotel_id,
                        COUNT(*)::int AS cnt,
                        ROUND(AVG(rating)::numeric, 2) AS avg_rating
                    FROM hotel_reviews
                    GROUP BY hotel_id
                ) stats
                WHERE h.id = stats.hotel_id
            """)
        )
        await db.execute(
            text("""
                UPDATE hotels
                SET reviews_count = 0, rating = 0
                WHERE id NOT IN (SELECT DISTINCT hotel_id FROM hotel_reviews)
            """)
        )

        await db.commit()

        cities = {}
        room_total = 0
        for h in HOTELS:
            cities[h["city"]] = cities.get(h["city"], 0) + 1
            room_total += len(h["rooms"])
        print(
            f"✅ {len(HOTELS)} otel, {len(cities)} destinasyon, {room_total} oda eklendi:"
        )
        for city in sorted(cities):
            print(f"   {city}: {cities[city]} otel")


if __name__ == "__main__":
    asyncio.run(seed())
