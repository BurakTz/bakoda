# Bakoda — Hotel Room Booking API

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

## API Endpoints

| Method | Path | Açıklama |
|---|---|---|
| GET | `/health` | Sağlık kontrolü |
| GET | `/rooms` | Oda listesi (opsiyonel: `?check_in=&check_out=`) |
| GET | `/rooms/{id}` | Oda detayı |
| POST | `/bookings` | Rezervasyon oluştur |
| GET | `/bookings/{id}` | Rezervasyon detayı |
| PATCH | `/bookings/{id}/cancel` | Rezervasyon iptal |

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
