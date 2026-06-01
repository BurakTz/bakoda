# Bakoda — Hotel Room Booking API  
## Final Rapor (MTH2526-B25 Bulut Mimarilerinde Test Mühendisliği)

**Öğrenci:** Burak Tuzcu  
**Ders:** MTH2526-B25 — Bulut Mimarilerinde Test Mühendisliği  
**Konu:** #15 Hotel Room Booking  
**Repo:** `bakoda-main`  
**Tarih:** Haziran 2026  

---

## 1. Giriş

Bu dönem projesinin amacı, karmaşık bir iş uygulaması yazmaktan ziyade **basit bir mini-servis için endüstri standardında test ve dağıtım altyapısı** kurmaktır. Şartnamede (Marmara Üniversitesi, 2025–2026 Bahar) belirtildiği gibi; unit/integration/E2E testleri, containerization, LocalStack üzerinden AWS emülasyonu, Kubernetes manifestleri, monitoring, performans testi ve CI/CD boru hattı tek bir repoda birleştirilmiştir.

**Bakoda**, otel oda rezervasyonu domain'inde çalışan bir **FastAPI** mikroservisidir. Kullanıcılar otel ve oda arayabilir, tarih aralığına göre müsaitlik kontrolü yapabilir, rezervasyon oluşturup iptal edebilir; kimlik doğrulama, favoriler ve ödeme yöntemleri gibi genişletilmiş uç noktalar da sunulmaktadır. Rezervasyon onayı, **LocalStack S3** üzerinde JSON olarak saklanır (`confirmations/{booking_id}.json`).

Konu #15 (Hotel Room Booking) seçilmesinin gerekçesi: gerçek hayatta **çakışma kontrolü** (aynı oda/tarih), **durum makinesi** (confirmed/cancelled), harici depolama (S3) ve **ölçülebilir latency** gerektiren tipik bir backend senaryosunu test piramidi ve gözlemlenebilirlik araçlarıyla doğrulamaya uygundur. Proje **bireysel** olarak geliştirilmiştir (`pyproject.toml` yazar alanı: Burak Tuzcu); README'de grup üye listesi bulunmadığından iş paylaşımı dokümanı eklenmemiştir.

---

## 2. Mimari

### 2.1 Mimari diyagram

Sistem bileşenleri `docs/architecture.svg` dosyasında özetlenmiştir. Ana akış:

```
Tarayıcı (React statik UI) → FastAPI → PostgreSQL
                              ↓
                         LocalStack S3
                              ↓
              Prometheus → Grafana  |  Jaeger (OpenTelemetry)
```

### 2.2 Bileşen açıklamaları

| Bileşen | Teknoloji | Rol |
|--------|-----------|-----|
| **API** | FastAPI 0.115 + Uvicorn | REST API, `/health`, `/metrics`, OpenAPI `/docs` |
| **Veritabanı** | PostgreSQL 16, SQLAlchemy 2.x async, Alembic | `User`, `Hotel`, `Room`, `Booking`, `Favorite`, `SavedCard` vb. |
| **Object storage** | LocalStack S3 + boto3 | Rezervasyon onay belgeleri; bucket: `bakoda-confirmations` |
| **Monitoring** | prometheus-fastapi-instrumentator | HTTP latency, status, throughput metrikleri |
| **Dashboard** | Grafana 11 + Prometheus | 3 panel: p50/p95/p99 latency, 5xx error rate, req/s |
| **Tracing (bonus)** | OpenTelemetry OTLP → Jaeger | FastAPI + SQLAlchemy span'leri |
| **Container** | Multi-stage Dockerfile | Builder (gcc + pip) → runtime (non-root `appuser`) |
| **Orchestration** | docker-compose.yml | Lokal: app, postgres, localstack, prometheus, grafana, jaeger |
| **Kubernetes** | Minikube | `k8s/deployment.yaml` (2 replica), `service.yaml`, `configmap.yaml` |

### 2.3 İş mantığı özeti

- **Müsaitlik:** `booking_service._is_room_available` — onaylı rezervasyonlarla tarih aralığı çakışması kontrolü; çakışmada HTTP 409.
- **Rezervasyon oluşturma:** DB'ye yazım → `s3_service.upload_confirmation` ile S3'e JSON yükleme.
- **İptal:** `PATCH /api/bookings/{id}/cancel` — durum `cancelled`; aynı tarihler tekrar rezerve edilebilir.

### 2.4 Frontend

`frontend/` altında React (JSX) ile statik sayfalar (arama, otel detay, rezervasyon, profil, giriş) sunulur; FastAPI `StaticFiles` ile servis edilir. E2E testler Playwright **API** modunda çalışır (tarayıcı UI zorunlu değil).

---

## 3. Test Stratejisi

### 3.1 Test piramidi

| Katman | Konum | Yaklaşık test sayısı | Araç |
|--------|-------|----------------------|------|
| **Unit** | `tests/unit/` | ~18 | pytest, mock/patch |
| **Integration** | `tests/integration/` | ~49 | pytest-asyncio, httpx `AsyncClient`, Testcontainers PG |
| **E2E** | `tests/e2e/` | 5 | Playwright `APIRequestContext` |
| **API contract / smoke** | `postman/` | 7 istek | Newman (CI'da planlanıyor) |
| **Performans** | `perf/load-test.js` | 1 senaryo | k6 |

**Toplam otomatik test (unit + integration + e2e):** yaklaşık **72** test fonksiyonu.

### 3.2 Coverage hedefi

`pyproject.toml` içinde `fail_under = 70` tanımlıdır. Coverage ölçümü `src` paketi üzerinden yapılır; `src/__init__.py` omit edilir. En yüksek değer **servis katmanında** (`booking_service`, `room_service`, `hotel_service`); route katmanı integration testlerle, şemalar unit testlerle desteklenir.

Komut:

```bash
poetry run pytest --cov=src --cov-report=term-missing -v --ignore=tests/e2e
```

### 3.3 Integration test altyapısı

`tests/conftest.py`:

- **Testcontainers:** `PostgresContainer("postgres:16-alpine")` — CI veya lokal Docker yoksa `TEST_DATABASE_URL` ile mevcut PG kullanılabilir.
- Her test için temiz şema: `Base.metadata.create_all` / session factory.
- `sample_hotel`, `sample_room` fixture'ları ile gerçekçi veri.

Örnek integration kapsamı: `test_bookings_api.py` (oluşturma, get, iptal, 409 çakışma), `test_hotels_api.py`, `test_auth_api.py`, `test_users_api.py`.

### 3.4 Test verisi üretimi

`tests/factories.py` — **Factory Boy** + **Faker**:

- `RoomFactory`: oda numarası, tip (single/double/suite), kapasite, fiyat.
- `BookingFactory`: misafir adı/e-posta, tarih aralığı, `BookingStatus`.

### 3.5 E2E senaryoları (`tests/e2e/test_booking_flow.py`)

1. `test_health_endpoint` — `/health` → `status: ok`
2. `test_list_rooms_returns_array` — `GET /api/rooms`
3. `test_full_booking_flow` — listele → POST booking → GET doğrula
4. `test_double_booking_conflict` — ikinci rezervasyon 409
5. `test_cancel_booking_flow` — iptal sonrası müsaitlik geri gelir

Çalıştırma: `BASE_URL=http://localhost:8000 poetry run pytest tests/e2e/ -v` (önce `docker compose up`).

### 3.6 Postman / Newman

`postman/collection.json` — **7 istek:** Health, List Rooms, List with Availability, Get Room, Create Booking, Get Booking, Cancel Booking. Newman komutu README'de belgelenmiştir.

---

## 4. Pipeline ve Deploy

### 4.1 Docker

**Multi-stage Dockerfile:**

1. **builder:** `python:3.12-slim`, gcc, `pip install --prefix=/install`
2. **runtime:** sadece runtime bağımlılıkları, `appuser` (non-root), `HEALTHCHECK` → `/health`

**docker-compose.yml** servisleri: `app`, `postgres`, `localstack` (S3), `jaeger`, `prometheus`, `grafana`. Uygulama `depends_on` ile PG ve LocalStack sağlık kontrollerini bekler.

### 4.2 Kubernetes (Minikube)

| Manifest | İçerik |
|----------|--------|
| `k8s/deployment.yaml` | 2 replica, resource limits, liveness/readiness `/health`, Prometheus scrape annotations |
| `k8s/service.yaml` | ClusterIP, port 8000 |
| `k8s/configmap.yaml` | DB host, S3 endpoint, bucket, OTEL endpoint |

Deploy akışı (README):

```bash
minikube start
eval $(minikube docker-env)
docker build -t bakoda:latest .
kubectl apply -f k8s/
```

### 4.3 CI/CD (GitHub Actions)

Şartname gereği pipeline: **lint → pytest (coverage ≥70%) → docker build → deploy → smoke (Newman)**.

Repo yapısında `.github/workflows/ci.yml` henüz eklenmemiştir; README ve şartname Ek B'deki örnek workflow hedeflenmektedir. Planlanan adımlar:

1. **Ruff** lint (`pyproject.toml` — E, F, I kuralları)
2. **pytest** + `postgres:16` service container veya Testcontainers
3. **docker build** — image tag `${{ github.sha }}`
4. **Newman** — `postman/collection.json` smoke
5. **kubectl** (opsiyonel job) — Minikube veya kind üzerinde smoke deploy

Bu rapor tesliminde CI dosyasının eklenmesi rubric'teki "CI/CD Pipeline" (15 puan) kalemi için kritiktir.

---

## 5. Performans ve Gözlemlenebilirlik

### 5.1 k6 yük testi

Dosya: `perf/load-test.js`

| Parametre | Değer |
|-----------|--------|
| Aşamalar | 30s→10 VU, 1m→50 VU, 30s→0 |
| Threshold | `http_req_duration p(95)<500`, `error_rate<0.05` |
| Akış | GET `/health` → GET `/api/rooms?...` → POST `/api/bookings` → PATCH cancel |

Detaylı sonuç tablosu `perf/report.md` içinde şablon olarak tutulur; örnek hedef çıktı:

```
http_req_duration p(95) ≈ 145ms  (threshold: <500ms ✓)
http_req_failed: 0.00%
```

En yüksek gecikme genelde **POST /bookings** (DB commit + S3 `put_object`) üzerinde beklenir.

### 5.2 Grafana panelleri

`monitoring/grafana-dashboard.json` — **3 panel:**

1. **Request Latency** — p50, p95, p99 (`histogram_quantile` on `http_request_duration_seconds_bucket`)
2. **Error Rate** — 5xx / total requests
3. **Request Throughput** — req/s by handler

Prometheus scrape: `monitoring/prometheus.yml` → app `:8000/metrics`.

### 5.3 Dağıtık izleme (bonus +5)

`src/main.py` — OpenTelemetry `TracerProvider`, OTLP gRPC exporter → Jaeger (`OTEL_EXPORTER_OTLP_ENDPOINT`). FastAPI ve SQLAlchemy otomatik enstrümantasyon. Jaeger UI: `http://localhost:16686`.

---

## 6. Sonuç ve Öğrenilenler

### 6.1 Sayısal özet

| Metrik | Değer |
|--------|--------|
| Domain | Hotel Room Booking (#15) |
| Ana entity'ler | Hotel, Room, Booking, User (+ favori, ödeme) |
| REST router'lar | auth, hotels, users, bookings, payments, contact, rooms |
| Pytest (unit+integration+e2e) | ~72 test |
| Postman istekleri | 7 |
| E2E (Playwright API) | 5 senaryo |
| Coverage hedefi | ≥70% (`pyproject.toml`) |
| k6 p95 hedefi | <500 ms |
| Grafana panelleri | 3 |
| K8s manifestleri | Deployment + Service + ConfigMap |
| Bonus | OpenTelemetry + Jaeger |

### 6.2 Karşılaşılan zorluklar

1. **Async SQLAlchemy + Testcontainers:** Session scope ve `NullPool` ile test izolasyonu; integration fixture'ların doğru sıralanması.
2. **S3 + DB birlikte:** Rezervasyon testlerinde `upload_confirmation` mock'lanması veya LocalStack'in compose ile ayağa kalkması.
3. **E2E path tutarlılığı:** Bazı E2E testler `/bookings`, bazıları `/api/bookings` kullanır — canlı demo öncesi base URL ve route prefix'lerinin hizalanması gerekir.
4. **CI workflow eksikliği:** Tüm testler lokal çalışsa da, yeşil pipeline için `.github/workflows/ci.yml` eklenmelidir.

### 6.3 İleride yapılabilecekler

- GitHub Actions workflow'un tamamlanması ve Newman smoke adımı
- Helm chart veya ArgoCD ile GitOps (bonus)
- E2E'de gerçek tarayıcı UI (Playwright browser mode) ile `frontend/booking.html` akışı
- k6 sonuçlarının CI artefact olarak `perf/report.md`'ye otomatik yazılması
- KEDA ile event-driven autoscaling (bonus)

---

## 8. Kaynaklar

- FastAPI dokümantasyonu: https://fastapi.tiangolo.com/
- pytest & pytest-asyncio: https://docs.pytest.org/
- Testcontainers Python: https://testcontainers-python.rapidly.dev/
- Factory Boy: https://factoryboy.readthedocs.io/
- LocalStack S3: https://docs.localstack.cloud/user-guide/aws/s3/
- Prometheus FastAPI instrumentator: https://github.com/trallnag/prometheus-fastapi-instrumentator
- OpenTelemetry Python: https://opentelemetry.io/docs/languages/python/
- k6: https://grafana.com/docs/k6/latest/
- Playwright Python: https://playwright.dev/python/
- Newman: https://learning.postman.com/docs/collections/using-newman-cli/
- Kubernetes docs (Deployments, Services, ConfigMaps): https://kubernetes.io/docs/
- Marmara MTH2526-B25 Dönem Projesi Şartnamesi (`control.txt`, Bölüm 3–9)
- Proje README: `README.md`

---

*Bu belge Markdown olarak `docs/final-report.md` konumundadır; şartname gereği PDF'e export edilerek `docs/final-report.pdf` olarak da teslim edilmelidir.*
