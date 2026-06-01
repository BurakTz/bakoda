# Bakoda — Hotel Room Booking API

<!-- CI badge: replace OWNER and REPO after pushing to GitHub
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)
-->

**MTH2526-B25 Dönem Projesi** • Konu #15 — Hotel Room Booking  
Marmara Üniversitesi • Bulut Mimarilerinde Test Mühendisliği • 2025–2026 Bahar

---

## Mimari

```
FastAPI App  ←→  PostgreSQL (SQLAlchemy)
     ↓                  
LocalStack S3  (onay belgeleri)
     ↓
Prometheus → Grafana  (monitoring)
     ↓
Jaeger  (OpenTelemetry tracing)
```

Kubernetes: Minikube üzerinde Deployment + Service + ConfigMap

---

## Kurulum

### Gereksinimler
- Python 3.12+
- Poetry
- Docker & Docker Compose
- (Opsiyonel) Minikube, kubectl, k6, Newman

### 1. Bağımlılıkları Yükle

```bash
poetry install
```

### 2. Ortam Değişkenleri

```bash
cp .env.example .env
# .env dosyasını düzenle (gerekirse)
```

### 3. Lokal Çalıştır (Docker Compose)

```bash
docker compose up --build
```

Servisler:
- **API**: http://localhost:8000
- **OpenAPI docs**: http://localhost:8000/docs
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Jaeger UI**: http://localhost:16686

---

## OpenTelemetry & Jaeger Tracing

Uygulama, dağıtık izleme için **OpenTelemetry** kullanır; span'ler Docker Compose içindeki **Jaeger** collector'a OTLP gRPC ile gönderilir.

| Bileşen | URL / Port | Açıklama |
|---|---|---|
| Jaeger UI | http://localhost:16686 | Trace arama ve görselleştirme |
| OTLP gRPC | `jaeger:4317` (compose içi) / `localhost:4317` (host) | Span exporter hedefi |
| Servis adı | `bakoda-hotel-booking` | Jaeger'da Service dropdown'ında görünür |

### Nasıl çalışır?

1. `docker compose up --build` ile stack'i başlatın (Jaeger servisi otomatik ayağa kalkar).
2. API'ye istek gönderin — örn. `GET http://localhost:8000/api/hotels` veya frontend üzerinden arama/rezervasyon akışı.
3. **Jaeger UI**'ı açın: http://localhost:16686
4. **Service** alanından `bakoda-hotel-booking` seçin → **Find Traces**.
5. Bir trace'e tıklayarak HTTP handler, SQLAlchemy sorguları ve alt span'leri inceleyin.

### Ortam değişkenleri

| Değişken | Varsayılan (compose) | Açıklama |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://jaeger:4317` | OTLP gRPC exporter adresi |

Instrumentasyon `src/main.py` içinde yapılandırılır: FastAPI + SQLAlchemy auto-instrumentation.

---

## Demo Videosu

Proje demo kaydını buraya ekleyin. Video **YouTube** veya **Google Drive** üzerinde herkese açık (unlisted veya public) olmalıdır.

**Placeholder formatı** — aşağıdaki satırlardan birini kendi linkinizle değiştirin:

```
YouTube: https://youtu.be/XXXXXXXXXXX
Drive:   https://drive.google.com/file/d/XXXXXXXXXXX/view?usp=sharing
```

### Video içeriği (önerilen akış)

1. `docker compose up --build` ile ortamın ayağa kalkması
2. Frontend: otel arama → detay → rezervasyon → onay
3. API docs (`/docs`) veya Postman ile endpoint demo
4. Grafana dashboard ve Jaeger trace görüntüleme (opsiyonel)

### Yükleme adımları

**YouTube**
1. [YouTube Studio](https://studio.youtube.com) → **Create** → **Upload videos**
2. Görünürlük: **Unlisted** (değerlendirme için yeterli) veya **Public**
3. Paylaşım linkini yukarıdaki placeholder satırına yapıştırın

**Google Drive**
1. Videoyu Drive'a yükleyin → sağ tık → **Share**
2. **General access**: *Anyone with the link* → **Viewer**
3. Linki kopyalayıp README'deki placeholder'a yapıştırın

> Henüz video yüklenmediyse placeholder satırlarını silmeyin; değerlendirici hangi formatta link beklediğini görebilsin.

---

## API Endpoints

| Method | Path | Açıklama |
|---|---|---|
| GET | `/health` | Sağlık kontrolü |
| GET | `/api/rooms` | Oda listesi (opsiyonel: `?check_in=&check_out=`) |
| GET | `/api/rooms/{id}` | Oda detayı |
| POST | `/api/bookings` | Rezervasyon oluştur |
| GET | `/api/bookings/{id}` | Rezervasyon detayı |
| PATCH | `/api/bookings/{id}/cancel` | Rezervasyon iptal |

---

## Test Komutları

```bash
# Unit + Integration testler (Testcontainers otomatik PG başlatır)
poetry run pytest --cov=src --cov-report=term-missing -v --ignore=tests/e2e

# E2E testler (app çalışırken)
BASE_URL=http://localhost:8000 poetry run pytest tests/e2e/ -v

# Postman / Newman
newman run postman/collection.json --env-var baseUrl=http://localhost:8000

# k6 Performans testi
k6 run perf/load-test.js
```

---

## Kubernetes (Minikube)

```bash
minikube start
eval $(minikube docker-env)
docker build -t bakoda:latest .
kubectl apply -f k8s/
kubectl get pods
minikube service bakoda-service --url
```

---

## Proje Yapısı

```
bakoda/
├── src/               FastAPI uygulama kodu
│   ├── main.py        App, OTel, Prometheus
│   ├── models.py      SQLAlchemy: Room, Booking
│   ├── schemas.py     Pydantic şemaları
│   ├── database.py    Async engine & session
│   └── services/      İş mantığı (room, booking, s3)
├── tests/
│   ├── unit/          Mock tabanlı birim testleri
│   ├── integration/   Testcontainers + PostgreSQL
│   └── e2e/           Playwright API testleri
├── postman/           Newman koleksiyonu
├── k8s/               Kubernetes manifestleri
├── perf/              k6 yük testi
├── monitoring/        Prometheus + Grafana
├── alembic/           DB migrations
└── .github/workflows/ CI/CD pipeline
```

---

## Teknoloji Yığını

| Katman | Araç |
|---|---|
| Framework | FastAPI + Uvicorn |
| Veritabanı | PostgreSQL + SQLAlchemy 2.x + Alembic |
| AWS | LocalStack S3 (boto3) |
| Monitoring | Prometheus + Grafana |
| Tracing | OpenTelemetry + Jaeger |
| Test | pytest + Testcontainers + Playwright + k6 |
| CI/CD | GitHub Actions |
| Container | Docker (multi-stage) + Kubernetes (Minikube) |

---

## Lisans

MIT — bkz. [LICENSE](LICENSE)
