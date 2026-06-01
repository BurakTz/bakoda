"""Seed script — tüm şehirler: İstanbul, Paris, Bali"""

import asyncio
import os
import sys

sys.path.insert(0, "/app")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@postgres:5432/bakoda"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# picsum.photos seed-bazlı URL — aynı seed her zaman aynı fotoğrafı verir
def thumb(hotel_id, idx=0):
    return f"https://picsum.photos/seed/hotel_{hotel_id}_{idx}/600/400"


HOTELS = [
    # ── İstanbul ─────────────────────────────────────────────────────────
    {
        "id": 1,
        "name": "Çırağan Palace Suites",
        "city": "İstanbul",
        "district": "Beşiktaş",
        "stars": 5,
        "rating": 9.56,
        "reviews_count": 1284,
        "description": (
            "Boğaz kıyısında tarihi bir sarayda lüks konaklama. "
            "Osmanlı mimarisi ve modern konforun buluşma noktası."
        ),
        "price_per_night": 8400.0,
        "check_in_time": "15:00",
        "check_out_time": "12:00",
        "thumbnail": thumb(1),
        "rooms": [
            {
                "room_number": "101",
                "name": "Deluxe Süit, Park Manzaralı",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 8400.0,
                "bed_type": "King",
                "view": "Park Manzarası",
                "size_m2": 65,
            },
            {
                "room_number": "102",
                "name": "Boğaz Manzaralı Deluxe",
                "type": "double",
                "capacity": 2,
                "price_per_night": 6800.0,
                "bed_type": "King",
                "view": "Boğaz Manzarası",
                "size_m2": 52,
            },
            {
                "room_number": "103",
                "name": "Standart Oda",
                "type": "single",
                "capacity": 1,
                "price_per_night": 4200.0,
                "bed_type": "Queen",
                "view": "Bahçe Manzarası",
                "size_m2": 38,
            },
        ],
        "amenities": [
            {"icon": "pool", "title": "Açık Yüzme Havuzu", "subtitle": "Boğaz manzaralı"},
            {"icon": "spa", "title": "Çırağan Spa", "subtitle": "Hamam, sauna, masaj"},
            {"icon": "breakfast", "title": "Açık Büfe Kahvaltı", "subtitle": "06:30 – 11:00"},
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Tüm alanlarda"},
            {"icon": "gym", "title": "Fitness Merkezi", "subtitle": "24 saat açık"},
            {"icon": "parking", "title": "Vale Parking", "subtitle": "Ücretsiz"},
        ],
        "reviews": [
            {
                "reviewer_name": "Doğrulanmış Misafir",
                "country": "Türkiye",
                "rating": 9.8,
                "title": "Hayatımın en güzel tatili",
                "text": (
                    "Her şey mükemmeldi. Personelin ilgisi, odaların temizliği ve yemekler" 
                    "inanılmazdı. Kesinlikle tekrar geleceğim."),
            },
            {
                "reviewer_name": "Marco B.",
                "country": "İtalya",
                "rating": 9.6,
                "title": "Stunning views, perfect service",
                "text": (
                    "The Bosphorus view from our room was breathtaking. "
                    "Staff went above and beyond to make our stay special."
                ),
            },
            {
                "reviewer_name": "Elif Y.",
                "country": "Türkiye",
                "rating": 9.8,
                "title": "Eşsiz bir deneyim",
                "text": "Spa harikaydı, yemekler muhteşemdi. Balayı için ideal bir mekan.",
            },
            {
                "reviewer_name": "James H.",
                "country": "İngiltere",
                "rating": 9.4,
                "title": "Worth every penny",
                "text": (
                    "Expensive but absolutely worth it. The pool area is stunning and "
                    "the breakfast is exceptional."
                ),
            },
            {
                "reviewer_name": "Leila M.",
                "country": "Fransa",
                "rating": 9.2,
                "title": "Cadre exceptionnel",
                "text": (
                    "Vue imprenable sur le Bosphore, service impeccable. Un palace" 
                    "digne de ce nom."),
            },
        ],
    },
    {
        "id": 2,
        "name": "Pera Loft House",
        "city": "İstanbul",
        "district": "Beyoğlu",
        "stars": 4,
        "rating": 8.4,
        "reviews_count": 487,
        "description": (
            "Galata'nın tarihi dokusunda şık bir butik otel. Sanat eserleriyle bezeli odalar ve" 
            "çatı katından İstanbul manzarası."),
        "price_per_night": 3200.0,
        "check_in_time": "14:00",
        "check_out_time": "12:00",
        "thumbnail": thumb(2),
        "rooms": [
            {
                "room_number": "201",
                "name": "Loft Süit",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 3200.0,
                "bed_type": "King",
                "view": "Galata Kulesi",
                "size_m2": 48,
            },
            {
                "room_number": "202",
                "name": "Standart Oda",
                "type": "double",
                "capacity": 2,
                "price_per_night": 2400.0,
                "bed_type": "Double",
                "view": "İç Avlu",
                "size_m2": 32,
            },
        ],
        "amenities": [
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Fiber internet"},
            {"icon": "breakfast", "title": "Türk Kahvaltısı", "subtitle": "07:00 – 10:30"},
            {"icon": "bar", "title": "Çatı Bar", "subtitle": "İstanbul manzaralı"},
        ],
        "reviews": [
            {
                "reviewer_name": "Doğrulanmış Misafir",
                "country": "Türkiye",
                "rating": 8.8,
                "title": "Harika konum",
                "text": (
                    "Galata'ya yürüme mesafesinde, şehrin tam ortasında. Personel çok" 
                    "yardımseverdi."),
            },
            {
                "reviewer_name": "Pierre L.",
                "country": "Fransa",
                "rating": 8.0,
                "title": "Très bien situé",
                "text": (
                    "Très bien situé dans le quartier bohème de Beyoğlu. Petit-déjeuner" 
                    "excellent."),
            },
            {
                "reviewer_name": "Burak M.",
                "country": "Türkiye",
                "rating": 8.6,
                "title": "Sanat dolu atmosfer",
                "text": "Her odada farklı bir sanat eseri var. Sabah kahvaltısı çok kaliteliydi.",
            },
        ],
    },
    {
        "id": 3,
        "name": "Bosphorus Bay Hotel",
        "city": "İstanbul",
        "district": "Sarıyer",
        "stars": 5,
        "rating": 8.96,
        "reviews_count": 642,
        "description": (
            "Boğaz'ın sakin kuzeyinde, suyun kenarında modern bir 5 yıldızlı otel. Deniz manzaralı" 
            "infinity havuz."),
        "price_per_night": 6400.0,
        "check_in_time": "15:00",
        "check_out_time": "11:00",
        "thumbnail": thumb(3),
        "rooms": [
            {
                "room_number": "301",
                "name": "Boğaz Manzaralı Süit",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 6400.0,
                "bed_type": "King",
                "view": "Boğaz Manzarası",
                "size_m2": 70,
            },
            {
                "room_number": "302",
                "name": "Superior Oda",
                "type": "double",
                "capacity": 2,
                "price_per_night": 4800.0,
                "bed_type": "King",
                "view": "Deniz",
                "size_m2": 45,
            },
            {
                "room_number": "303",
                "name": "Standart Oda",
                "type": "single",
                "capacity": 1,
                "price_per_night": 3200.0,
                "bed_type": "Twin",
                "view": "Bahçe",
                "size_m2": 35,
            },
        ],
        "amenities": [
            {"icon": "pool", "title": "Infinity Havuz", "subtitle": "Boğaz manzaralı, tüm yıl"},
            {"icon": "spa", "title": "Deniz Spa", "subtitle": "Thalasso terapi"},
            {"icon": "breakfast", "title": "Açık Büfe Kahvaltı", "subtitle": "Dahil"},
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Tüm alanlarda"},
            {"icon": "restaurant", "title": "Fine Dining", "subtitle": "Japon-Türk füzyon"},
        ],
        "reviews": [
            {
                "reviewer_name": "Can Ö.",
                "country": "Türkiye",
                "rating": 9.2,
                "title": "Infinity havuz muhteşem",
                "text": (
                    "Havuzdan Boğaz'a bakarken güneş batışını izlemek inanılmazdı. Kesinlikle" 
                    "tavsiye ederim."),
            },
            {
                "reviewer_name": "Anna S.",
                "country": "Almanya",
                "rating": 8.8,
                "title": "Perfect getaway",
                "text": "Beautiful location, exceptional service. The spa treatments were divine.",
            },
            {
                "reviewer_name": "Tarık Y.",
                "country": "Türkiye",
                "rating": 8.6,
                "title": "Güzel ama pahalı",
                "text": (
                    "Konum ve manzara harika ama fiyatı biraz yüksek. Yemeklerin kalitesi" 
                    "artabilir."),
            },
        ],
    },
    {
        "id": 4,
        "name": "Hammam Heritage Sultanahmet",
        "city": "İstanbul",
        "district": "Fatih",
        "stars": 4,
        "rating": 8.84,
        "reviews_count": 1521,
        "description": (
            "Sultanahmet'in tarihi kalbinde, Osmanlı mirasını yaşatan butik otel. Ayasofya ve" 
            "Topkapı'ya yürüme mesafesinde."),
        "price_per_night": 2800.0,
        "check_in_time": "14:00",
        "check_out_time": "12:00",
        "thumbnail": thumb(4),
        "rooms": [
            {
                "room_number": "401",
                "name": "Heritage Süit",
                "type": "suite",
                "capacity": 3,
                "price_per_night": 2800.0,
                "bed_type": "King",
                "view": "Ayasofya",
                "size_m2": 55,
            },
            {
                "room_number": "402",
                "name": "Klasik Oda",
                "type": "double",
                "capacity": 2,
                "price_per_night": 2000.0,
                "bed_type": "Double",
                "view": "Tarihi Sokak",
                "size_m2": 30,
            },
        ],
        "amenities": [
            {"icon": "spa", "title": "Özel Türk Hamamı", "subtitle": "Osmanlı geleneği"},
            {"icon": "breakfast", "title": "Türk Kahvaltısı", "subtitle": "Geleneksel tarif"},
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Tüm alanlarda"},
            {"icon": "tour", "title": "Tarihi Tur", "subtitle": "Rehberli günlük tur"},
        ],
        "reviews": [
            {
                "reviewer_name": "Doğrulanmış Misafir",
                "country": "Türkiye",
                "rating": 9.4,
                "title": "Tarihin içinde konaklama",
                "text": "Odamızdan Ayasofya'yı görebiliyorduk. Hamam deneyimi de harikaydı.",
            },
            {
                "reviewer_name": "Sophie M.",
                "country": "Fransa",
                "rating": 8.4,
                "title": "Magnifique emplacement",
                "text": (
                    "Idéalement situé pour visiter les sites historiques. Le hammam est une" 
                    "expérience unique."),
            },
            {
                "reviewer_name": "Robert K.",
                "country": "ABD",
                "rating": 8.6,
                "title": "Authentic Istanbul experience",
                "text": (
                    "The hammam was outstanding. Staff was incredibly helpful with all our touring" 
                    "needs."),
            },
            {
                "reviewer_name": "Hana Y.",
                "country": "Japonya",
                "rating": 9.0,
                "title": "素晴らしい体験",
                "text": "ハマムの体験が最高でした。スタッフは親切で、場所も観光に便利。",
            },
        ],
    },
    {
        "id": 7,
        "name": "Kadıköy Garden Boutique",
        "city": "İstanbul",
        "district": "Kadıköy",
        "stars": 3,
        "rating": 7.7,
        "reviews_count": 256,
        "description": (
            "Moda sahiline 5 dakika yürüme mesafesinde, bahçeli butik otel. Anadolu yakasının en" 
            "canlı semtinde."),
        "price_per_night": 2200.0,
        "check_in_time": "14:00",
        "check_out_time": "11:00",
        "thumbnail": thumb(7),
        "rooms": [
            {
                "room_number": "701",
                "name": "Bahçe Süit",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 2200.0,
                "bed_type": "King",
                "view": "Özel Bahçe",
                "size_m2": 42,
            },
            {
                "room_number": "702",
                "name": "Standart Oda",
                "type": "double",
                "capacity": 2,
                "price_per_night": 1600.0,
                "bed_type": "Double",
                "view": "Sokak",
                "size_m2": 28,
            },
            {
                "room_number": "703",
                "name": "Ekonomi Oda",
                "type": "single",
                "capacity": 1,
                "price_per_night": 1100.0,
                "bed_type": "Single",
                "view": "İç Avlu",
                "size_m2": 20,
            },
        ],
        "amenities": [
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Fiber"},
            {
                "icon": "breakfast",
                "title": "Ev Yapımı Kahvaltı",
                "subtitle": "Organik, yerel ürünler",
            },
            {"icon": "garden", "title": "Özel Bahçe", "subtitle": "Açık hava kahvaltısı"},
            {"icon": "bike", "title": "Bisiklet Kiralama", "subtitle": "Ücretsiz"},
        ],
        "reviews": [
            {
                "reviewer_name": "Zeynep K.",
                "country": "Türkiye",
                "rating": 8.0,
                "title": "Kadıköy'ün incisi",
                "text": (
                    "Pazar yerine 3 dakika yürüdük. Otel küçük ama tertemiz, personel" 
                    "çok sıcak."),
            },
            {
                "reviewer_name": "Ali R.",
                "country": "Türkiye",
                "rating": 7.6,
                "title": "Sakin ve merkezi",
                "text": "Moda'ya yürüme mesafesi harika ama oda biraz küçüktü.",
            },
            {
                "reviewer_name": "Emma L.",
                "country": "Hollanda",
                "rating": 7.4,
                "title": "Lovely local feel",
                "text": "Great alternative to staying in the touristy side. Good value for money.",
            },
        ],
    },
    # ── Paris ─────────────────────────────────────────────────────────────
    {
        "id": 5,
        "name": "Maison Lumière Marais",
        "city": "Paris",
        "district": "Le Marais",
        "stars": 4,
        "rating": 8.64,
        "reviews_count": 642,
        "description": (
            "Paris'in en şık semtinde, tarihi bir konakta butik otel. "
            "Sanat galerileri ve kafelerle çevrili, Centre Pompidou'ya yürüme mesafesinde."
        ),
        "price_per_night": 14200.0,
        "check_in_time": "15:00",
        "check_out_time": "11:00",
        "thumbnail": thumb(5),
        "rooms": [
            {
                "room_number": "501",
                "name": "Deluxe Chambre",
                "type": "double",
                "capacity": 2,
                "price_per_night": 14200.0,
                "bed_type": "King",
                "view": "Bahçe",
                "size_m2": 40,
            },
            {
                "room_number": "502",
                "name": "Standart Chambre",
                "type": "single",
                "capacity": 1,
                "price_per_night": 9800.0,
                "bed_type": "Double",
                "view": "Sokak",
                "size_m2": 28,
            },
        ],
        "amenities": [
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Fiber"},
            {
                "icon": "breakfast",
                "title": "Fransız Kahvaltısı",
                "subtitle": "Croissant ve daha fazlası",
            },
            {"icon": "bar", "title": "Wine Bar", "subtitle": "Fransız şarapları"},
            {"icon": "concierge", "title": "Konserje", "subtitle": "7/24 hizmet"},
        ],
        "reviews": [
            {
                "reviewer_name": "Isabelle D.",
                "country": "Fransa",
                "rating": 9.0,
                "title": "Parfait!",
                "text": (
                    "Un hôtel charmant dans un quartier magnifique. Le petit-déjeuner est" 
                    "exceptionnel."),
            },
            {
                "reviewer_name": "Tom W.",
                "country": "İngiltere",
                "rating": 8.4,
                "title": "Great location",
                "text": (
                    "Perfect base for exploring Paris. Staff were very helpful with restaurant" 
                    "recommendations."),
            },
            {
                "reviewer_name": "Merve S.",
                "country": "Türkiye",
                "rating": 8.6,
                "title": "Paris'in kalbi",
                "text": (
                    "Louvre ve Notre-Dame'a kolayca ulaştık. Oda küçüktü ama şehrin ruhunu" 
                    "yansıtıyordu."),
            },
            {
                "reviewer_name": "Klaus M.",
                "country": "Almanya",
                "rating": 8.2,
                "title": "Typisch Pariser Flair",
                "text": (
                    "Kleines, charmantes Hotel im schönsten Viertel von Paris." 
                    "Frühstück sehr gut."),
            },
        ],
    },
    {
        "id": 8,
        "name": "Hôtel Aubépine Rive Gauche",
        "city": "Paris",
        "district": "Saint-Germain",
        "stars": 4,
        "rating": 8.56,
        "reviews_count": 412,
        "description": (
            "Seine kıyısında, Rive Gauche'nin edebi atmosferinde butik otel. Cafés de Flore ve" 
            "Musée d'Orsay'a yürüme mesafesinde."),
        "price_per_night": 12400.0,
        "check_in_time": "15:00",
        "check_out_time": "12:00",
        "thumbnail": thumb(8),
        "rooms": [
            {
                "room_number": "801",
                "name": "Chambre Deluxe Seine Manzaralı",
                "type": "double",
                "capacity": 2,
                "price_per_night": 12400.0,
                "bed_type": "King",
                "view": "Seine Nehri",
                "size_m2": 36,
            },
            {
                "room_number": "802",
                "name": "Classic Room",
                "type": "single",
                "capacity": 1,
                "price_per_night": 8600.0,
                "bed_type": "Double",
                "view": "Bahçe",
                "size_m2": 24,
            },
            {
                "room_number": "803",
                "name": "Junior Suite",
                "type": "suite",
                "capacity": 3,
                "price_per_night": 18200.0,
                "bed_type": "King",
                "view": "Seine Nehri",
                "size_m2": 52,
            },
        ],
        "amenities": [
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Tüm alanlarda"},
            {
                "icon": "breakfast",
                "title": "Continental Kahvaltı",
                "subtitle": "Bahçede veya odada",
            },
            {"icon": "bar", "title": "Kütüphane Bar", "subtitle": "Kokteyller ve şaraplar"},
            {"icon": "spa", "title": "Masaj Odası", "subtitle": "Randevu ile"},
        ],
        "reviews": [
            {
                "reviewer_name": "Claire B.",
                "country": "Fransa",
                "rating": 8.8,
                "title": "L'adresse parfaite à Paris",
                "text": (
                    "Hôtel plein de charme dans le 6e. Vue sur la Seine depuis notre chambre," 
                    "personnel très attentionné."),
            },
            {
                "reviewer_name": "Olivia R.",
                "country": "ABD",
                "rating": 8.6,
                "title": "Romantic Parisian escape",
                "text": (
                    "Every detail was perfect. The garden breakfast was a highlight. Will" 
                    "definitely return."),
            },
            {
                "reviewer_name": "Deniz A.",
                "country": "Türkiye",
                "rating": 8.0,
                "title": "Paris'in özü",
                "text": (
                    "Cafés de Flore'a yürüdük, Shakespeare and Company'ye uğradık. Küçük ama şık" 
                    "odalar."),
            },
            {
                "reviewer_name": "Erik H.",
                "country": "İsveç",
                "rating": 8.6,
                "title": "Wonderful stay",
                "text": (
                    "The location on the Left Bank is unbeatable. Cozy rooms and" 
                    "excellent service."),
            },
        ],
    },
    {
        "id": 9,
        "name": "Le Grand Palais Opéra",
        "city": "Paris",
        "district": "9. Arrondissement",
        "stars": 5,
        "rating": 9.24,
        "reviews_count": 876,
        "description": (
            "Opéra Garnier'in hemen karşısında, Haussmann mimarisinin şaheseri içinde 5 yıldızlı" 
            "lüks otel. Paris'in kalbinde unmatched bir konum."),
        "price_per_night": 28600.0,
        "check_in_time": "15:00",
        "check_out_time": "12:00",
        "thumbnail": thumb(9),
        "rooms": [
            {
                "room_number": "901",
                "name": "Grand Suite Opéra Manzaralı",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 28600.0,
                "bed_type": "King",
                "view": "Opéra Garnier",
                "size_m2": 85,
            },
            {
                "room_number": "902",
                "name": "Deluxe Chambre",
                "type": "double",
                "capacity": 2,
                "price_per_night": 19400.0,
                "bed_type": "King",
                "view": "İç Bahçe",
                "size_m2": 48,
            },
            {
                "room_number": "903",
                "name": "Prestige Room",
                "type": "double",
                "capacity": 2,
                "price_per_night": 22800.0,
                "bed_type": "King",
                "view": "Boulevard Haussmann",
                "size_m2": 55,
            },
        ],
        "amenities": [
            {"icon": "spa", "title": "Spa & Wellness", "subtitle": "Hamam, sauna, masaj"},
            {"icon": "pool", "title": "Kapalı Yüzme Havuzu", "subtitle": "Isıtmalı"},
            {"icon": "breakfast", "title": "Gastronomik Kahvaltı", "subtitle": "07:00 – 11:30"},
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "1 Gbps"},
            {
                "icon": "restaurant",
                "title": "Michelin Yıldızlı Restoran",
                "subtitle": "Executive şef",
            },
            {"icon": "concierge", "title": "Butik Konserje", "subtitle": "7/24 kişisel asistan"},
        ],
        "reviews": [
            {
                "reviewer_name": "Antoine V.",
                "country": "Fransa",
                "rating": 9.6,
                "title": "Le summum du luxe parisien",
                "text": (
                    "Vue sur l'Opéra depuis le lit, service discret et attentionné. Une expérience" 
                    "inoubliable."),
            },
            {
                "reviewer_name": "Yuki T.",
                "country": "Japonya",
                "rating": 9.4,
                "title": "最高のパリ体験",
                "text": "オペラ座の目の前という立地が最高。スタッフのサービスも申し分なし。",
            },
            {
                "reviewer_name": "Canan D.",
                "country": "Türkiye",
                "rating": 9.0,
                "title": "Rüya gibi bir konaklama",
                "text": (
                    "Opéra Garnier manzaralı oda inanılmazdı. Her sabah kahvaltı bir" 
                    "şölen gibiydi."),
            },
            {
                "reviewer_name": "William C.",
                "country": "İngiltere",
                "rating": 9.2,
                "title": "Finest Paris has to offer",
                "text": (
                    "Michelin restaurant was extraordinary. "
                    "The suite overlooking the Opera is pure Paris magic."
                ),
            },
        ],
    },
    # ── Bali ──────────────────────────────────────────────────────────────
    {
        "id": 6,
        "name": "Villa Ananda Ubud",
        "city": "Bali",
        "district": "Ubud",
        "stars": 5,
        "rating": 9.44,
        "reviews_count": 318,
        "description": (
            "Ubud'un pirinç teraslarına bakan butik retreat. Yoga, meditasyon ve geleneksel Bali" 
            "masajı ile tam dinginlik."),
        "price_per_night": 11200.0,
        "check_in_time": "14:00",
        "check_out_time": "11:00",
        "thumbnail": thumb(6),
        "rooms": [
            {
                "room_number": "601",
                "name": "Villa Süit, Pirinç Terası Manzaralı",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 11200.0,
                "bed_type": "King",
                "view": "Pirinç Terası",
                "size_m2": 80,
            },
            {
                "room_number": "602",
                "name": "Garden Room",
                "type": "double",
                "capacity": 2,
                "price_per_night": 7400.0,
                "bed_type": "King",
                "view": "Jungle",
                "size_m2": 45,
            },
        ],
        "amenities": [
            {"icon": "pool", "title": "Infinity Havuz", "subtitle": "Orman manzaralı"},
            {"icon": "spa", "title": "Bali Masajı", "subtitle": "Geleneksel terapi"},
            {"icon": "breakfast", "title": "Organik Kahvaltı", "subtitle": "Yerel ürünler"},
            {"icon": "yoga", "title": "Yoga Stüdyosu", "subtitle": "Günlük seans"},
            {"icon": "wifi", "title": "Wi-Fi", "subtitle": "Ortak alanlarda"},
        ],
        "reviews": [
            {
                "reviewer_name": "Luna R.",
                "country": "Avustralya",
                "rating": 10.0,
                "title": "Pure paradise",
                "text": (
                    "The most peaceful place I've ever stayed. "
                    "Morning yoga with rice terrace views was magical."
                ),
            },
            {
                "reviewer_name": "Kemal B.",
                "country": "Türkiye",
                "rating": 9.0,
                "title": "Huzurun adresi",
                "text": "Her şeyi bırakıp gelmeye değer. Masajlar olağanüstüydü, doğa muhteşemdi.",
            },
            {
                "reviewer_name": "Sarah J.",
                "country": "ABD",
                "rating": 9.6,
                "title": "Life-changing retreat",
                "text": (
                    "I came for a week and wanted to stay forever. "
                    "The staff, the food, the setting — all perfect."
                ),
            },
            {
                "reviewer_name": "Noa B.",
                "country": "İsrail",
                "rating": 9.2,
                "title": "Spiritual and beautiful",
                "text": (
                    "The yoga sessions at sunrise were incredible. A truly transformative" 
                    "experience."),
            },
        ],
    },
    {
        "id": 10,
        "name": "Seminyak Ocean Club",
        "city": "Bali",
        "district": "Seminyak",
        "stars": 5,
        "rating": 9.1,
        "reviews_count": 524,
        "description": (
            "Seminyak'ın gün batımı sahilinde, tropikal bahçeler içinde butik resort. Bali'nin en" 
            "prestijli plaj kulübüne özel erişim."),
        "price_per_night": 16800.0,
        "check_in_time": "14:00",
        "check_out_time": "12:00",
        "thumbnail": thumb(10),
        "rooms": [
            {
                "room_number": "1001",
                "name": "Ocean Villa",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 16800.0,
                "bed_type": "King",
                "view": "Hint Okyanusu",
                "size_m2": 95,
            },
            {
                "room_number": "1002",
                "name": "Garden Pool Villa",
                "type": "suite",
                "capacity": 3,
                "price_per_night": 13200.0,
                "bed_type": "King",
                "view": "Özel Havuz",
                "size_m2": 75,
            },
            {
                "room_number": "1003",
                "name": "Deluxe Room",
                "type": "double",
                "capacity": 2,
                "price_per_night": 9600.0,
                "bed_type": "King",
                "view": "Bahçe",
                "size_m2": 52,
            },
        ],
        "amenities": [
            {"icon": "pool", "title": "Sonsuzluk Havuzu", "subtitle": "Okyanus manzaralı"},
            {"icon": "spa", "title": "Jamu Spa", "subtitle": "Geleneksel Bali ritüelleri"},
            {
                "icon": "breakfast",
                "title": "Tropic Kahvaltı",
                "subtitle": "Tropikal meyveler ve daha fazlası",
            },
            {"icon": "wifi", "title": "Ücretsiz Wi-Fi", "subtitle": "Tüm villaları kapsıyor"},
            {"icon": "beach", "title": "Özel Plaj Erişimi", "subtitle": "Seminyak plaj kulübü"},
            {
                "icon": "restaurant",
                "title": "Açık Hava Restoran",
                "subtitle": "Deniz ürünleri ve Bali mutfağı",
            },
        ],
        "reviews": [
            {
                "reviewer_name": "Jessica P.",
                "country": "Avustralya",
                "rating": 9.4,
                "title": "Best sunset of my life",
                "text": (
                    "The infinity pool at sunset was surreal. Staff remembered our names from day" 
                    "one — outstanding."),
            },
            {
                "reviewer_name": "Hiroshi K.",
                "country": "Japonya",
                "rating": 9.2,
                "title": "完璧なリゾート体験",
                "text": "スタッフのホスピタリティが素晴らしく、プールと海の景色が最高でした。",
            },
            {
                "reviewer_name": "Doğrulanmış Misafir",
                "country": "Türkiye",
                "rating": 8.8,
                "title": "Hayal ettiğimizden güzel",
                "text": (
                    "Gün batımını havuzdan izlemek inanılmazdı. Jamu spa deneyimi hayat" 
                    "değiştirici."),
            },
            {
                "reviewer_name": "Michael B.",
                "country": "ABD",
                "rating": 9.0,
                "title": "Luxury done right",
                "text": (
                    "Every detail was perfect. The ocean villa was breathtaking and the food was" 
                    "excellent."),
            },
        ],
    },
    {
        "id": 11,
        "name": "Nusa Dua Reef Resort",
        "city": "Bali",
        "district": "Nusa Dua",
        "stars": 4,
        "rating": 8.36,
        "reviews_count": 387,
        "description": (
            "Nusa Dua'nın korunaklı koyunda, mercan resiflerine sıfır butik resort. Snorkeling ve" 
            "dalış meraklıları için cennet."),
        "price_per_night": 8400.0,
        "check_in_time": "15:00",
        "check_out_time": "11:00",
        "thumbnail": thumb(11),
        "rooms": [
            {
                "room_number": "1101",
                "name": "Beachfront Bungalow",
                "type": "suite",
                "capacity": 2,
                "price_per_night": 8400.0,
                "bed_type": "King",
                "view": "Doğrudan Plaj",
                "size_m2": 60,
            },
            {
                "room_number": "1102",
                "name": "Garden Bungalow",
                "type": "double",
                "capacity": 2,
                "price_per_night": 5800.0,
                "bed_type": "Queen",
                "view": "Tropikal Bahçe",
                "size_m2": 42,
            },
        ],
        "amenities": [
            {"icon": "pool", "title": "Lagün Havuzu", "subtitle": "Çocuk bölümü dahil"},
            {"icon": "spa", "title": "Spa", "subtitle": "Hint Okyanusu esintisi"},
            {"icon": "breakfast", "title": "Kahvaltı Dahil", "subtitle": "07:00 – 10:00"},
            {"icon": "wifi", "title": "Wi-Fi", "subtitle": "Tüm alanlarda"},
            {"icon": "beach", "title": "Snorkeling Ekipmanı", "subtitle": "Ücretsiz"},
        ],
        "reviews": [
            {
                "reviewer_name": "David L.",
                "country": "İngiltere",
                "rating": 8.6,
                "title": "Snorkeling paradise",
                "text": (
                    "The reef just off the beach was stunning. Great value for a Bali beach" 
                    "holiday."),
            },
            {
                "reviewer_name": "Doğrulanmış Misafir",
                "country": "Türkiye",
                "rating": 8.0,
                "title": "Güzel ama ulaşım zor",
                "text": "Resort güzel ve temiz ama Ubud'a uzak. Plaj ve snorkeling mükemmeldi.",
            },
            {
                "reviewer_name": "Riko T.",
                "country": "Japonya",
                "rating": 8.4,
                "title": "静かなリゾート",
                "text": "静かで落ち着いた雰囲気のリゾートです。スノーケリングが最高でした。",
            },
        ],
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM hotel_reviews"))
        await db.execute(text("DELETE FROM hotel_amenities"))
        await db.execute(text("DELETE FROM favorites"))
        await db.execute(text("UPDATE bookings SET room_id = NULL WHERE room_id IS NOT NULL"))
        await db.execute(text("DELETE FROM rooms"))
        await db.execute(text("DELETE FROM hotels"))
        await db.commit()

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

        await db.commit()

        cities = {}
        for h in HOTELS:
            cities[h["city"]] = cities.get(h["city"], 0) + 1
        print(f"✅ {len(HOTELS)} otel eklendi:")
        for city, count in cities.items():
            print(f"   {city}: {count} otel")


if __name__ == "__main__":
    asyncio.run(seed())
