"""
Final raporu (docs/final-report.docx) üretir.
Çalıştırma: /usr/local/bin/python3.14 scripts/generate_report.py
"""
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "final-report.docx")


# ─── Helpers ────────────────────────────────────────────────────────────────

def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    run = p.runs[0] if p.runs else p.add_run(text)
    if level == 1:
        run.font.size = Pt(14)
        run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)
    elif level == 2:
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
    return p


def add_para(doc, text, bold=False, italic=False, size=10.5, space_before=0, space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    return p


def add_bullet(doc, text, size=10.5):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    run.font.size = Pt(size)
    return p


def add_code_block(doc, code_text):
    """Monospace code block via bordered table."""
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    cell = table.cell(0, 0)
    cell.paragraphs[0].clear()
    # light grey shading
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "F2F2F2")
    tcPr.append(shd)
    for line in code_text.strip().split("\n"):
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(line)
        run.font.name = "Courier New"
        run.font.size = Pt(8.5)
    # remove first empty para
    first = cell.paragraphs[0]
    if not first.text:
        first._element.getparent().remove(first._element)
    doc.add_paragraph()  # spacing after


def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header row
    hrow = table.rows[0]
    for i, h in enumerate(headers):
        cell = hrow.cells[i]
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(9)
        # header background
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "D6E4F0")
        tcPr.append(shd)
    # Data rows
    for ri, row_data in enumerate(rows):
        trow = table.rows[ri + 1]
        for ci, val in enumerate(row_data):
            cell = trow.cells[ci]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            run = p.add_run(str(val))
            run.font.size = Pt(9)
    # Column widths
    if col_widths:
        for ri in range(len(table.rows)):
            for ci, w in enumerate(col_widths):
                table.rows[ri].cells[ci].width = Inches(w)
    doc.add_paragraph()  # spacing after
    return table


def set_page_margins(doc, top=2.5, bottom=2.5, left=2.5, right=2.5):
    from docx.shared import Cm
    section = doc.sections[0]
    section.top_margin = Cm(top)
    section.bottom_margin = Cm(bottom)
    section.left_margin = Cm(left)
    section.right_margin = Cm(right)


# ─── Document ────────────────────────────────────────────────────────────────

doc = Document()
set_page_margins(doc, 2.5, 2.5, 2.5, 2.5)

# ── Title Page ───────────────────────────────────────────────────────────────

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Marmara Üniversitesi")
run.font.size = Pt(13)
run.bold = True

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Mühendislik Fakültesi — Bilgisayar Mühendisliği Bölümü")
run.font.size = Pt(11)

doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("MTH2526-B25 — Bulut Mimarilerinde Test Mühendisliği")
run.font.size = Pt(12)
run.bold = True

doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("DÖNEM PROJESİ FINAL RAPORU")
run.font.size = Pt(16)
run.bold = True
run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)

doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Konu #15 — Hotel Room Booking API")
run.font.size = Pt(13)
run.bold = True

doc.add_paragraph()

add_table(doc,
    ["Alan", "Bilgi"],
    [
        ["Öğrenci", "Burak Tuzcu"],
        ["Ders", "MTH2526-B25 Bulut Mimarilerinde Test Mühendisliği"],
        ["Eğitmen", "Büşra Ayaksız"],
        ["Teslim Tarihi", "4 Haziran 2026"],
        ["Proje Adı", "Bakoda Hotel Booking API"],
        ["GitHub Repo", "github.com/btuzcu/bakoda (public)"],
    ],
    col_widths=[1.8, 4.0],
)

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 1. GİRİŞ
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "1. Giriş", level=1)

add_para(doc,
    "Bu proje, MTH2526-B25 \"Bulut Mimarilerinde Test Mühendisliği\" dersi kapsamında konu havuzundaki #15 numaralı \"Hotel Room Booking\" konusu seçilerek bireysel olarak geliştirilmiştir. Projenin temel amacı karmaşık bir uygulama yazmak değil; gerçekçi bir mini servis üzerinde endüstri standardında test ve dağıtım altyapısı kurmaktır.",
    size=10.5
)

add_para(doc,
    "Bakoda, otel arama, oda rezervasyonu, kullanıcı yönetimi ve ödeme yöntemi gibi temel işlevleri karşılayan bir otel rezervasyon REST API'sidir. FastAPI + PostgreSQL + LocalStack S3 kombinasyonu ile geliştirilmiş; pytest, Playwright, k6 ve GitHub Actions pipeline'ı ile uçtan uca test edilmiştir.",
    size=10.5
)

add_heading(doc, "1.1. Seçilen Teknoloji Yığını", level=2)

add_table(doc,
    ["Katman", "Teknoloji"],
    [
        ["Backend Framework", "FastAPI 0.115 + Uvicorn, Python 3.12"],
        ["Veritabanı", "PostgreSQL 16 + SQLAlchemy 2.x async + Alembic"],
        ["AWS (Yerel)", "LocalStack S3 (boto3) — rezervasyon onay belgeleri"],
        ["Test", "pytest + pytest-asyncio + Testcontainers + Factory Boy + Faker"],
        ["E2E Test", "Playwright (API context)"],
        ["Performans Testi", "k6 (Grafana/k6 Docker image)"],
        ["API Testi", "Postman + Newman"],
        ["Container", "Multi-stage Dockerfile + docker-compose"],
        ["Kubernetes", "Minikube (Deployment + Service + ConfigMap)"],
        ["CI/CD", "GitHub Actions (lint → pytest → docker build → newman → smoke)"],
        ["Monitoring", "Prometheus + Grafana (3 panel)"],
        ["Tracing", "OpenTelemetry + OTLP exporter (Jaeger) — Bonus"],
    ],
    col_widths=[1.8, 4.0],
)

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 2. MİMARİ
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "2. Mimari", level=1)

add_para(doc,
    "Sistem tek bir FastAPI uygulamasından oluşmaktadır. Statik frontend dosyaları doğrudan bu uygulama üzerinden servis edilmektedir. Uygulama PostgreSQL ile kalıcı veri saklar; S3 ile rezervasyon onay belgeleri (JSON) bulutta tutulur.",
    size=10.5
)

add_heading(doc, "2.1. Veri Modelleri (Entities)", level=2)

add_table(doc,
    ["Model", "Tablo", "Önemli Alanlar"],
    [
        ["User", "users", "id, email, password_hash, first_name, last_name, is_active"],
        ["Hotel", "hotels", "id, name, city, stars, rating, price_per_night"],
        ["Room", "rooms", "id, hotel_id, room_number, type (single/double/suite), price_per_night, status"],
        ["Booking", "bookings", "id, room_id, user_id, guest_name, check_in, check_out, total_price, status, confirmation_code"],
        ["Favorite", "favorites", "user_id + hotel_id (unique constraint)"],
        ["SavedCard", "saved_cards", "user_id, brand, last4, holder_name"],
        ["BillingAddress", "billing_addresses", "user_id, line, city, country"],
        ["PasswordResetCode", "password_reset_codes", "email, code (6 hane), expires_at"],
    ],
    col_widths=[1.2, 1.5, 3.1],
)

add_heading(doc, "2.2. REST Endpoint'ler", level=2)

add_table(doc,
    ["Prefix", "Endpoint Grubu", "Örnek Endpoint'ler"],
    [
        ["/api/auth", "Kimlik doğrulama", "POST /register, POST /login, POST /forgot-password, POST /reset-password"],
        ["/api/hotels", "Otel arama/listeleme", "GET /hotels, GET /hotels/{id}, GET /hotels/{id}/rooms"],
        ["/api/rooms", "Oda yönetimi", "GET /rooms, GET /rooms/{id}"],
        ["/api/bookings", "Rezervasyon", "POST /bookings, GET /bookings/{id}, PATCH /bookings/{id}/cancel"],
        ["/api/users", "Kullanıcı profili", "GET /users/me, PATCH /users/me, GET /users/me/bookings"],
        ["/api/payments", "Ödeme yöntemleri", "GET /payments/cards, POST /payments/cards, DELETE /payments/cards/{id}"],
        ["/api/contact", "İletişim formu", "POST /contact"],
        ["/health", "Sağlık kontrolü", "GET /health → {status: ok}"],
    ],
    col_widths=[1.2, 1.5, 3.1],
)

add_heading(doc, "2.3. Bileşen İlişkisi", level=2)

add_para(doc,
    "HTTP İsteği → FastAPI Router → Service Katmanı → SQLAlchemy Async Session → PostgreSQL. "
    "Rezervasyon oluşturulduğunda ayrıca S3 Service → LocalStack S3 bucket'ına onay JSON'u yüklenir "
    "ve pre-signed URL yanıtta döner. Uygulama, Prometheus `/metrics` endpoint'ini expose eder; "
    "Grafana bu endpoint'i scrape ederek latency, hata oranı ve throughput panellerini çizer. "
    "OpenTelemetry SDK ile tüm FastAPI ve SQLAlchemy span'ları OTLP üzerinden Jaeger'e iletilir.",
    size=10.5
)

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 3. TEST STRATEJİSİ
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "3. Test Stratejisi", level=1)

add_para(doc,
    "Proje klasik test piramidini izlemektedir: taban katmanda çok sayıda hızlı unit test, orta katmanda gerçek veritabanına karşı çalışan integration test, tepe katmanda ise canlı stack gerektiren az sayıda E2E test.",
    size=10.5
)

add_table(doc,
    ["Katman", "Konum", "Araç", "Adet (yaklaşık)", "Bağımlılık"],
    [
        ["Unit", "tests/unit/", "pytest + unittest.mock", "~50 test", "Yok (tam izole)"],
        ["Integration", "tests/integration/", "pytest + Testcontainers/PG", "~60 test", "PostgreSQL (Testcontainers veya CI service)"],
        ["LocalStack", "tests/integration/test_s3_localstack.py", "pytest + boto3", "2 test (--localstack marker)", "LocalStack S3"],
        ["E2E", "tests/e2e/", "Playwright API context", "5 senaryo", "Canlı stack (docker compose)"],
        ["Performans", "perf/load-test.js", "k6", "1 senaryo", "Canlı stack"],
        ["API (CI)", "postman/collection.json", "Newman", "≥5 istek", "Canlı stack"],
    ],
    col_widths=[0.8, 1.4, 1.3, 1.2, 1.8],
)

add_heading(doc, "3.1. Test Altyapısı — conftest.py", level=2)

add_para(doc,
    "tests/conftest.py dosyası session-scoped fixture'lar ile hem yerel hem CI ortamını destekler: "
    "TEST_DATABASE_URL ortam değişkeni varsa mevcut PostgreSQL kullanılır, yoksa Testcontainers otomatik olarak "
    "postgres:16-alpine container'ı başlatır. Her test için bağımsız session sağlanır.",
    size=10.5
)

add_code_block(doc, """\
# tests/conftest.py (sadeleştirilmiş)
@pytest.fixture(scope="session")
def pg_container():
    if os.getenv("TEST_DATABASE_URL"):
        yield None          # CI: harici postgres:5432 kullan
        return
    from testcontainers.postgres import PostgresContainer
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg            # Local: Testcontainers container başlat

@pytest_asyncio.fixture(scope="session")
async def db_engine(pg_container):
    url = (
        _TEST_DB_URL if pg_container is None
        else pg_container.get_connection_url().replace("psycopg2", "asyncpg")
    )
    engine = create_async_engine(url, echo=False, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture()
async def client(session_factory):
    '''FastAPI test client - dependency injection ile DB override edilir.'''
    async def override_get_db():
        async with session_factory() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()\
""")

add_heading(doc, "3.2. Factory Boy + Faker — Test Verisi Üretimi", level=2)

add_para(doc,
    "Gerçekçi ve tekrarlanabilir test verisi Factory Boy + Faker kombinasyonu ile üretilmektedir. "
    "RoomFactory oda türüne göre kapasiteyi otomatik hesaplar; BookingFactory gelecek tarihler üretir.",
    size=10.5
)

add_code_block(doc, """\
# tests/factories.py
import factory
from faker import Faker
from src.models import Booking, BookingStatus, Room, RoomStatus, RoomType

fake = Faker()

class RoomFactory(factory.Factory):
    class Meta:
        model = Room
    room_number = factory.LazyFunction(
        lambda: f"{fake.random_int(1, 9)}{fake.bothify('##')}"
    )
    type = factory.Iterator([RoomType.single, RoomType.double, RoomType.suite])
    capacity = factory.LazyAttribute(
        lambda o: 1 if o.type == RoomType.single else (
            2 if o.type == RoomType.double else 4
        )
    )
    price_per_night = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=50, max_value=500, right_digits=2), 2)
    )
    status = RoomStatus.available

class BookingFactory(factory.Factory):
    class Meta:
        model = Booking
    guest_name  = factory.LazyFunction(fake.name)
    guest_email = factory.LazyFunction(fake.email)
    check_in    = factory.LazyFunction(lambda: fake.future_date(end_date="+30d"))
    check_out   = factory.LazyAttribute(
        lambda o: fake.date_between(start_date=o.check_in, end_date="+40d")
    )
    total_price = factory.LazyFunction(
        lambda: round(fake.pyfloat(min_value=100, max_value=2000, right_digits=2), 2)
    )
    status = BookingStatus.confirmed\
""")

add_heading(doc, "3.3. Unit Testler — Booking Service", level=2)

add_para(doc,
    "Servis katmanı, AsyncMock ile veritabanı tamamen taklit edilerek test edilmektedir. "
    "Böylece testler milisaniyeler içinde koşar ve hiçbir dış bağımlılık gerektirmez.",
    size=10.5
)

add_code_block(doc, """\
# tests/unit/test_booking_service.py (seçilmiş testler)

@pytest.mark.asyncio
async def test_create_booking_success():
    room = _room(hotel_id=10)
    # DB sırası: oda bulundu, tarih çakışması yok, 3 oda müsait
    db = _db_returning(room, None, 3)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush   = AsyncMock()
    booking = await create_booking(
        db, 1, "Ali", "ali@x.com", date(2026, 7, 1), date(2026, 7, 3)
    )
    db.add.assert_called_once()
    assert booking.total_price == 200.0          # 2 gece × 100 TL

@pytest.mark.asyncio
async def test_create_booking_date_conflict():
    room     = _room(hotel_id=10)
    existing = _booking()
    db = _db_returning(room, existing)           # çakışma var
    with pytest.raises(RoomNotAvailableError):
        await create_booking(db, 1, "Ali", "ali@x.com",
                             date(2027, 9, 1), date(2027, 9, 3))

@pytest.mark.asyncio
async def test_create_booking_insufficient_hotel_inventory():
    room = _room(hotel_id=10)
    db   = _db_returning(room, None, 1)          # sadece 1 oda müsait
    with pytest.raises(RoomNotAvailableError):
        await create_booking(db, 1, "Ali", "ali@x.com",
                             date(2027, 10, 1), date(2027, 10, 3),
                             rooms_count=2)      # 2 oda isteniyor

@pytest.mark.asyncio
async def test_cancel_booking_already_cancelled():
    b  = _booking(status=BookingStatus.cancelled)
    db = _db_returning(b)
    with pytest.raises(BookingAlreadyCancelledError):
        await cancel_booking(db, 1)\
""")

add_heading(doc, "3.4. Integration Testler — Bookings API", level=2)

add_para(doc,
    "Integration testler gerçek PostgreSQL'e karşı çalışır. S3 çağrıları unittest.mock.patch "
    "ile izole edilir; bu sayede testler LocalStack'siz de sorunsuz koşar.",
    size=10.5
)

add_code_block(doc, """\
# tests/integration/test_bookings_api.py (seçilmiş testler)

@pytest.mark.asyncio
async def test_create_booking_success(client: AsyncClient, book_room: Room):
    with (
        patch("src.routes.bookings.s3_service.upload_confirmation", return_value="k"),
        patch("src.routes.bookings.s3_service.get_presigned_url", return_value="http://s3/p"),
    ):
        resp = await client.post("/api/bookings", json={
            "room_id": book_room.id,
            "guest_name":  "Ayşe Demir",
            "guest_email": "ayse@test.com",
            "check_in":    "2027-03-01",
            "check_out":   "2027-03-05",
        })
    assert resp.status_code == 201
    assert resp.json()["total_price"]  == 1200.0   # 4 gece × 300 TL
    assert resp.json()["status"]       == "confirmed"
    assert resp.json()["confirmation_code"].startswith("BKD-")

@pytest.mark.asyncio
async def test_create_booking_conflict(client: AsyncClient, book_room: Room):
    payload = { "room_id": book_room.id, "check_in": "2027-04-01",
                "check_out": "2027-04-05", ... }
    with patch_s3():
        await client.post("/api/bookings", json=payload)
        resp = await client.post("/api/bookings", json={
            **payload, "guest_email": "b@test.com"   # aynı tarihe ikinci rezervasyon
        })
    assert resp.status_code == 409   # çakışma algılandı

@pytest.mark.asyncio
async def test_create_booking_survives_s3_upload_failure(client: AsyncClient, book_room: Room):
    '''S3 çökse bile rezervasyon kaydedilmeli, confirmation_url None döner.'''
    with patch("src.routes.bookings.s3_service.upload_confirmation",
               side_effect=RuntimeError("s3 down")):
        resp = await client.post("/api/bookings", json={...})
    assert resp.status_code == 201
    assert resp.json()["confirmation_url"] is None

@pytest.mark.asyncio
async def test_guest_booking_linked_by_email_after_login(client, book_room):
    \"\"\"Misafir olarak yapılan rezervasyon, aynı e-posta ile kayıt sonrası
    kullanıcı listemde görünmeli.\"\"\"
    # 1. Misafir rezervasyonu yap
    create_resp = await client.post("/api/bookings", json={
        "guest_email": "guest-link@bakoda.com", ...
    })
    booking_id = create_resp.json()["id"]
    # 2. Aynı e-posta ile kayıt ol
    token_resp = await client.post("/api/auth/register", json={
        "email": "guest-link@bakoda.com", ...
    })
    headers = {"Authorization": f"Bearer {token_resp.json()['access_token']}"}
    # 3. /me/bookings'de görünmeli
    list_resp = await client.get("/api/users/me/bookings?status=upcoming", headers=headers)
    assert any(b["id"] == booking_id for b in list_resp.json())\
""")

add_heading(doc, "3.5. LocalStack S3 Integration Testleri", level=2)

add_para(doc,
    "S3_ENDPOINT_URL ortam değişkeni yoksa Testcontainers LocalStack container'ı otomatik başlatılır. "
    "Bu testler --localstack markeri ile işaretlenmiş olup normal pytest çalıştırmalarından ayrılır.",
    size=10.5
)

add_code_block(doc, """\
# tests/integration/test_s3_localstack.py

@pytest.fixture(scope="session")
def localstack_container():
    if _EXTERNAL_ENDPOINT:
        yield None        # docker-compose'da zaten ayakta
        return
    from testcontainers.localstack import LocalStackContainer
    with LocalStackContainer(image="localstack/localstack:3") as ls:
        yield ls

@pytest.mark.localstack
def test_upload_confirmation_stores_json_in_bucket(s3_bucket):
    payload = {"booking_id": 9001, "guest_name": "Integration Test"}
    key     = s3_service.upload_confirmation(9001, payload)
    assert key == "confirmations/9001.json"
    # Gerçek S3 bucket'ından okuyarak doğrula
    obj = _s3_client().get_object(Bucket=s3_bucket, Key=key)
    assert json.loads(obj["Body"].read()) == payload

@pytest.mark.localstack
def test_get_presigned_url_allows_download(s3_bucket):
    key = s3_service.upload_confirmation(9002, {"status": "confirmed"})
    url = s3_service.get_presigned_url(key, expires_in=300)
    # Pre-signed URL gerçekten indirilebilir mi?
    resp = httpx.get(url, follow_redirects=True)
    resp.raise_for_status()
    assert resp.json()["status"] == "confirmed"\
""")

add_heading(doc, "3.6. E2E Testler — Playwright", level=2)

add_para(doc,
    "E2E testler Playwright API context kullanarak canlı stack'e karşı koşar. "
    "5 senaryo: smoke/health, oda listeleme, tam rezervasyon akışı, çakışma tespiti, iptal akışı.",
    size=10.5
)

add_code_block(doc, """\
# tests/e2e/test_booking_flow.py

def test_full_booking_flow(api_context: APIRequestContext):
    \"\"\"Happy path: oda listele → rezervasyon yap → GET ile doğrula.\"\"\"
    rooms   = api_context.get("/api/rooms?check_in=2027-03-01&check_out=2027-03-05").json()
    room_id = rooms[0]["id"]

    resp = api_context.post("/api/bookings", data={
        "room_id":     room_id,
        "guest_name":  "E2E Guest",
        "guest_email": "e2e@test.com",
        "check_in":    "2027-03-01",
        "check_out":   "2027-03-05",
    })
    assert resp.status == 201
    booking_id = resp.json()["id"]

    get_resp = api_context.get(f"/api/bookings/{booking_id}")
    assert get_resp.ok
    assert get_resp.json()["id"] == booking_id

def test_cancel_booking_flow(api_context: APIRequestContext):
    \"\"\"İptal sonrası aynı tarihler tekrar müsait olmalı.\"\"\"
    room_id = api_context.get("/api/rooms").json()[0]["id"]
    booking_id = api_context.post("/api/bookings", data={
        "room_id": room_id, "check_in": "2027-05-01", "check_out": "2027-05-02", ...
    }).json()["id"]

    cancel = api_context.patch(f"/api/bookings/{booking_id}/cancel")
    assert cancel.json()["status"] == "cancelled"

    # İptal sonrası oda müsaitlere geri döndü mü?
    available_ids = [r["id"] for r in api_context.get(
        "/api/rooms?check_in=2027-05-01&check_out=2027-05-02"
    ).json()]
    assert room_id in available_ids\
""")

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 4. PIPELINE & DEPLOY
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "4. Pipeline & Deploy", level=1)

add_heading(doc, "4.1. GitHub Actions CI/CD", level=2)

add_para(doc,
    "Pipeline üç paralel olmayan job'dan oluşur: lint → test → docker-smoke-newman. "
    "Her aşama bir öncekinin başarılı tamamlanmasına bağlıdır (needs). "
    "Concurrency grubu sayesinde aynı ref üzerinde birden fazla çalışma çakışmaz.",
    size=10.5
)

add_table(doc,
    ["Job", "Adımlar", "Notlar"],
    [
        ["lint", "ruff check .", "Python 3.12, Poetry, venv cache ile hızlı"],
        ["test", "pytest --cov=src --cov-fail-under=70", "postgres:16-alpine service container; Testcontainers devre dışı"],
        ["docker-smoke-newman", "docker build → compose up → /health smoke → seed → Newman", "Postman koleksiyonu gerçek stack'e karşı koşar"],
    ],
    col_widths=[1.4, 2.4, 2.0],
)

add_code_block(doc, """\
# .github/workflows/ci.yml (özet)
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - uses: snok/install-poetry@v1
      - uses: actions/cache@v4         # .venv cache — build süresi ↓
        with:
          path: .venv
          key: venv-${{ runner.os }}-py312-${{ hashFiles('**/poetry.lock') }}
      - run: poetry run ruff check .

  test:
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:  { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres,
                POSTGRES_DB: bakoda_test }
        ports: ["5432:5432"]
    env:
      TEST_DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/bakoda_test
    steps:
      - run: poetry run pytest --cov=src --cov-fail-under=70 -v --ignore=tests/e2e

  docker-smoke-newman:
    needs: test
    steps:
      - run: docker build -t bakoda:${{ github.sha }} .
      - run: docker compose up -d --build
      - run: |            # /health yeşil olana kadar bekle (60 deneme)
          for i in $(seq 1 60); do
            curl -sf http://localhost:8000/health | grep -q '"status":"ok"' && exit 0
            sleep 5
          done; exit 1
      - run: newman run postman/collection.json --env-var baseUrl=http://localhost:8000\
""")

add_heading(doc, "4.2. Docker — Multi-Stage Dockerfile", level=2)

add_para(doc,
    "İki stage'li Dockerfile; builder stage'de bağımlılıkları derler, runtime stage'de "
    "sadece çalıştırma için gereken dosyaları kopyalar. Non-root kullanıcı ve HEALTHCHECK eklenmiştir.",
    size=10.5
)

add_code_block(doc, """\
# Dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc \\
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
COPY --from=builder /install /usr/local
COPY src ./src
COPY frontend ./frontend
COPY alembic ./alembic
COPY alembic.ini ./
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
USER appuser
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]\
""")

add_heading(doc, "4.3. Kubernetes — Minikube", level=2)

add_para(doc,
    "k8s/ klasöründe üç manifest bulunmaktadır: Deployment (2 replica), Service (NodePort 30800), "
    "ConfigMap (uygulama ortam değişkenleri). Minikube üzerinde deploy:",
    size=10.5
)

add_code_block(doc, """\
# Minikube deploy adımları
minikube start
minikube image load bakoda:latest
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl rollout status deployment/bakoda
minikube service bakoda-service --url\
""")

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 5. PERFORMANS & GÖZLEMLENEBİLİRLİK
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "5. Performans & Gözlemlenebilirlik", level=1)

add_heading(doc, "5.1. k6 Yük Testi", level=2)

add_para(doc,
    "k6 senaryosu 3 aşamadan oluşur: 30s ramp-up (0→10 VU), 1dk sustained load (50 VU), "
    "30s ramp-down. Her VU sırayla health → list rooms → create booking → cancel booking adımlarını çalıştırır.",
    size=10.5
)

add_code_block(doc, """\
// perf/load-test.js (özet)
export const options = {
  stages: [
    { duration: "30s", target: 10 },    // ramp-up
    { duration: "1m",  target: 50 },    // sustained load
    { duration: "30s", target: 0  },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],   // p95 < 500ms
    error_rate:        ["rate<0.05"],   // hata oranı < %5
  },
};

export default function () {
  const roomsRes = http.get(`${BASE_URL}/api/rooms?check_in=2027-07-01&check_out=2027-07-05`);
  const roomId   = roomsRes.json()[0].id;

  const bookingRes = http.post(`${BASE_URL}/api/bookings`, JSON.stringify({
    room_id:     roomId,
    guest_name:  `Guest ${__VU}-${__ITER}`,
    guest_email: `guest${__VU}${__ITER}@test.com`,
    check_in:    "2027-07-01",
    check_out:   "2027-07-05",
  }), { headers: { "Content-Type": "application/json" } });

  if (bookingRes.status === 201)
    http.patch(`${BASE_URL}/api/bookings/${bookingRes.json().id}/cancel`);

  sleep(1);
}\
""")

add_heading(doc, "5.2. Test Sonuçları", level=2)

add_table(doc,
    ["Metrik", "Değer", "Eşik", "Durum"],
    [
        ["p95 Latency", "465.56 ms", "< 500 ms", "✓ Geçti"],
        ["p90 Latency", "217.39 ms", "—", "—"],
        ["Ortalama Latency", "69.94 ms", "—", "—"],
        ["Medyan Latency", "18.86 ms", "—", "—"],
        ["Hata Oranı", "0.00%", "< %5", "✓ Geçti"],
        ["Toplam HTTP İsteği", "4756 (39.5/s)", "—", "—"],
        ["Toplam İterasyon", "2378 (19.7/s)", "—", "—"],
    ],
    col_widths=[1.5, 1.4, 1.2, 1.2],
)

add_para(doc,
    "p95 latency (465 ms) eşiği geçer ancak sınıra yakındır. "
    "Bunun başlıca nedeni yoğun VU yükünde POST /api/bookings'in PostgreSQL yazma + S3 yükleme işlemlerini "
    "senkron olarak yapmasıdır. Medyan ile p95 arasındaki büyük fark (19 ms ↔ 466 ms) tail latency'yi gösterir; "
    "S3 yüklemesini arka plana alarak bu iyileştirilebilir.",
    size=10.5
)

add_heading(doc, "5.3. Prometheus + Grafana Monitoring", level=2)

add_para(doc,
    "prometheus-fastapi-instrumentator kütüphanesi /metrics endpoint'ini otomatik oluşturur. "
    "Grafana 3 panel içerir:",
    size=10.5
)

add_bullet(doc, "HTTP Request Duration p95 (histogram_quantile(0.95, rate(...[5m])))")
add_bullet(doc, "Request Rate — HTTP 2xx/4xx/5xx (rate[1m])")
add_bullet(doc, "Active Requests — anlık işlem sayısı (gauge)")

add_para(doc,
    "OpenTelemetry SDK (Bonus +5): FastAPIInstrumentor ve SQLAlchemyInstrumentor otomatik "
    "span üretir; OTLP exporter ile Jaeger'e gönderilir. Her rezervasyon isteği için "
    "HTTP span → DB span zinciri Jaeger UI'da görülebilir.",
    size=10.5
)

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 6. SONUÇ & ÖĞRENİLENLER
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "6. Sonuç & Öğrenilenler", level=1)

add_heading(doc, "6.1. Sayısal Özet", level=2)

add_table(doc,
    ["Ölçüt", "Değer"],
    [
        ["Kaynak kod dosyası", "~45 Python + JS dosyası"],
        ["Unit test sayısı", "~50 test (tests/unit/)"],
        ["Integration test sayısı", "~60 test (tests/integration/)"],
        ["E2E senaryo sayısı", "5 senaryo (tests/e2e/)"],
        ["Coverage hedefi", "≥ %70 (CI'da --cov-fail-under=70 ile zorunlu)"],
        ["p95 Latency", "465.56 ms (threshold: < 500 ms)"],
        ["k6 Hata Oranı", "%0.00"],
        ["CI Pipeline aşamaları", "lint → test → docker build → smoke → Newman"],
        ["Kubernetes manifest", "Deployment (2 replica) + Service + ConfigMap"],
        ["Grafana panel", "3 panel (latency, error rate, throughput)"],
        ["Postman koleksiyonu", "≥5 istek, Newman ile CI'da koşar"],
    ],
    col_widths=[2.5, 3.3],
)

add_heading(doc, "6.2. Karşılaşılan Zorluklar", level=2)

add_bullet(doc,
    "Async SQLAlchemy + Testcontainers entegrasyonu: session scope ile fixture bağımlılıklarının "
    "doğru sıralanması ve NullPool kullanımı gerekti."
)
add_bullet(doc,
    "S3 hata toleransı: S3 yüklemesi başarısız olduğunda rezervasyonun yine de kaydedilmesi "
    "gerekiyordu. Try/except + None confirmation_key stratejisiyle çözüldü."
)
add_bullet(doc,
    "Misafir rezervasyonu bağlantısı: Misafir e-postasıyla yapılan rezervasyonun "
    "sonradan aynı e-postayla kayıt olan kullanıcıya gösterilmesi için "
    "user_id veya guest_email üzerinden çift yönlü sorgu yazıldı."
)
add_bullet(doc,
    "k6 tail latency: p95 eşiğe yakın çıktı. S3 yüklemesini arka plana almanın "
    "latency'yi iyileştireceği gözlemlendi ancak kapsam dışında bırakıldı."
)

add_heading(doc, "6.3. İleride Yapılabilecekler", level=2)

add_bullet(doc, "S3 yüklemesini background task'e taşıyarak p95 latency'yi ~100ms düşürmek")
add_bullet(doc, "Helm chart ile Kubernetes dağıtımını paketlemek (Bonus)")
add_bullet(doc, "KEDA ile yoğun rezervasyon saatlerinde event-driven autoscaling (Bonus)")
add_bullet(doc, "ArgoCD ile GitOps deploy akışı (Bonus)")

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 7. KAYNAKLAR
# ─────────────────────────────────────────────────────────────────────────────

add_heading(doc, "7. Kaynaklar", level=1)

add_bullet(doc, "FastAPI Documentation — https://fastapi.tiangolo.com")
add_bullet(doc, "SQLAlchemy 2.x Async Docs — https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html")
add_bullet(doc, "Testcontainers Python — https://testcontainers-python.readthedocs.io")
add_bullet(doc, "Factory Boy Documentation — https://factoryboy.readthedocs.io")
add_bullet(doc, "k6 Documentation — https://grafana.com/docs/k6/latest/")
add_bullet(doc, "Playwright Python — https://playwright.dev/python/")
add_bullet(doc, "LocalStack Documentation — https://docs.localstack.cloud")
add_bullet(doc, "OpenTelemetry Python — https://opentelemetry.io/docs/languages/python/")
add_bullet(doc, "Prometheus FastAPI Instrumentator — https://github.com/trallnag/prometheus-fastapi-instrumentator")
add_bullet(doc, "GitHub Actions Documentation — https://docs.github.com/en/actions")
add_bullet(doc, "Kubernetes Documentation — https://kubernetes.io/docs/home/")

# ─────────────────────────────────────────────────────────────────────────────
# Save
# ─────────────────────────────────────────────────────────────────────────────

os.makedirs(os.path.dirname(OUT), exist_ok=True)
doc.save(OUT)
print(f"Rapor oluşturuldu: {OUT}")
