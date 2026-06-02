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

from src.services import s3_service

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_IMAGES_DIR = os.path.join(_PROJECT_ROOT, "hotel_images")

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@postgres:5432/bakoda"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 30 destinasyon: (şehir, ülke, bölge örnekleri)
LOCATIONS = [
    ("İstanbul", "Türkiye", ["Beşiktaş", "Sultanahmet"]),
    ("Antalya", "Türkiye", ["Kaleiçi", "Lara"]),
    ("Nevşehir", "Türkiye", ["Ürgüp", "Göreme"]),
    ("Bodrum", "Türkiye", ["Yalıkavak", "Merkez"]),
    ("Paris", "Fransa", ["Le Marais", "Saint-Germain"]),
    ("Roma", "İtalya", ["Trastevere", "Centro Storico"]),
    ("Barcelona", "İspanya", ["Gothic Quarter", "Eixample"]),
    ("Madrid", "İspanya", ["Salamanca", "Sol"]),
    ("Londra", "İngiltere", ["Covent Garden", "South Bank"]),
    ("Amsterdam", "Hollanda", ["Jordaan", "De Pijp"]),
    ("Berlin", "Almanya", ["Mitte", "Kreuzberg"]),
    ("Prag", "Çekya", ["Staré Město", "Malá Strana"]),
    ("Viyana", "Avusturya", ["Innere Stadt", "Leopoldstadt"]),
    ("Atina", "Yunanistan", ["Plaka", "Kolonaki"]),
    ("Santorini", "Yunanistan", ["Oia", "Fira"]),
    ("Dubai", "BAE", ["Downtown", "Palm Jumeirah"]),
    ("Tokyo", "Japonya", ["Shinjuku", "Shibuya"]),
    ("Kyoto", "Japonya", ["Gion", "Arashiyama"]),
    ("Bangkok", "Tayland", ["Sukhumvit", "Riverside"]),
    ("Singapur", "Singapur", ["Marina Bay", "Orchard"]),
    ("New York", "ABD", ["Midtown", "SoHo"]),
    ("Los Angeles", "ABD", ["Hollywood", "Santa Monica"]),
    ("Miami", "ABD", ["South Beach", "Brickell"]),
    ("Marrakech", "Fas", ["Medina", "Hivernage"]),
    ("Cape Town", "Güney Afrika", ["Waterfront", "Camps Bay"]),
    ("Sydney", "Avustralya", ["Circular Quay", "Bondi"]),
    ("Bali", "Endonezya", ["Ubud", "Seminyak"]),
    ("Rio de Janeiro", "Brezilya", ["Copacabana", "Ipanema"]),
    ("Buenos Aires", "Arjantin", ["Palermo", "San Telmo"]),
    ("Zürih", "İsviçre", ["Altstadt", "Seefeld"]),
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


_uploaded_keys: dict[str, str] = {}


def _city_to_slug(city: str) -> str:
    for src, dst in [
        ("İ", "i"), ("ı", "i"), ("Ş", "s"), ("ş", "s"), ("Ç", "c"), ("ç", "c"),
        ("Ğ", "g"), ("ğ", "g"), ("Ö", "o"), ("ö", "o"), ("Ü", "u"), ("ü", "u"),
    ]:
        city = city.replace(src, dst)
    return city.lower().replace(" ", "-")


def _image_key(city: str) -> str:
    """Yerel görsele karşılık gelen S3 anahtarını döndürür (ağ erişimi yok).

    Yalnızca dosya sistemine bakar; build_hotels() saf kalsın diye yükleme yapmaz.
    """
    slug = _city_to_slug(city)
    for ext in ("jpg", "jpeg", "png", "webp"):
        if os.path.exists(os.path.join(_IMAGES_DIR, f"{slug}.{ext}")):
            return f"hotel_images/{slug}.{ext}"
    return ""


def _upload_local_image(city: str) -> None:
    """Yerel görseli S3'e yükler. Yalnızca seed() çalışırken çağrılır."""
    slug = _city_to_slug(city)
    if slug in _uploaded_keys:
        return

    for ext in ("jpg", "jpeg", "png", "webp"):
        path = os.path.join(_IMAGES_DIR, f"{slug}.{ext}")
        if os.path.exists(path):
            key = f"hotel_images/{slug}.{ext}"
            content_type = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
            try:
                s3_service.ensure_bucket()
                with open(path, "rb") as f:
                    data = f.read()
                s3_service.upload_image(key, data, content_type)
                _uploaded_keys[slug] = key
                print(f"  ↑ S3: {key}")
            except Exception as exc:
                print(f"  ⚠ Resim yüklenemedi ({slug}): {exc}")
            return

    print(f"  - Resim bulunamadı: hotel_images/{slug}.[jpg|png|webp]")


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
    for city_idx, (city, country, districts) in enumerate(LOCATIONS):
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
                    "thumbnail": _image_key(city),
                    "rooms": rooms,
                    "amenities": AMENITY_SETS[slot % len(AMENITY_SETS)],
                    "reviews": reviews,
                }
            )
            hotel_id += 1
    return hotels


async def reset_database(db: AsyncSession) -> None:
    """Tüm otel ve rezervasyon verilerini temizle."""
    await db.execute(text("DELETE FROM hotel_reviews"))
    await db.execute(text("DELETE FROM hotel_amenities"))
    await db.execute(text("DELETE FROM favorites"))
    await db.execute(text("DELETE FROM bookings"))
    await db.execute(text("DELETE FROM rooms"))
    await db.execute(text("DELETE FROM hotels"))
    await db.execute(text("ALTER SEQUENCE hotels_id_seq RESTART WITH 1"))
    await db.execute(text("ALTER SEQUENCE rooms_id_seq RESTART WITH 1"))
    await db.commit()


async def _hotels_exist(db: AsyncSession) -> bool:
    result = await db.execute(text("SELECT EXISTS (SELECT 1 FROM hotels)"))
    return bool(result.scalar())


async def seed(if_empty: bool = False) -> None:
    # Tablolar yoksa seed çalışamaz; önce Alembic migration'larını uygula.
    from src.database import _run_alembic_upgrade

    await asyncio.to_thread(_run_alembic_upgrade)

    async with AsyncSessionLocal() as db:
        if if_empty and await _hotels_exist(db):
            print("⏭  Veritabanı dolu, seed atlandı (--if-empty).")
            return

        hotels = build_hotels()

        # Resimler S3'e burada yüklenir; yalnızca seed gerçekten çalışacaksa yapılır.
        for city in {h["city"] for h in hotels}:
            _upload_local_image(city)

        await reset_database(db)

        for h in hotels:
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
        for h in hotels:
            cities[h["city"]] = cities.get(h["city"], 0) + 1
            room_total += len(h["rooms"])
        print(
            f"✅ {len(hotels)} otel, {len(cities)} destinasyon, {room_total} oda eklendi:"
        )
        for city in sorted(cities):
            print(f"   {city}: {cities[city]} otel")


if __name__ == "__main__":
    asyncio.run(seed(if_empty="--if-empty" in sys.argv))
