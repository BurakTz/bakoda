# İş Paylaşımı — Bakoda (Konu #15: Hotel Room Booking)

**Ders:** MTH2526-B25 — Bulut Mimarilerinde Test Mühendisliği  
**Repo:** `bakoda` — Marmara Üniversitesi, 2025–2026 Bahar

---

## Üyeler

- **Arif Batuhan Bahar** ([170423037]) — UI (React statik frontend), test piramidi (unit/integration/E2E), QA senaryoları
- **Burak Tuzcu** ([170423042]) — Backend (FastAPI), veritabanı, DevOps (Docker/K8s/CI), gözlemlenebilirlik, repo sahibi

---

## Modül Sorumluluğu

| Modül | Sorumlu | Yardımcı |
|-------|---------|----------|
| **Frontend** (`frontend/` — arama, otel detay, rezervasyon, ödeme, profil, auth sayfaları) | Arif | Burak |
| **REST API — otel/oda** (`src/routes/hotels.py`, `rooms.py`, ilgili servisler) | Burak | Arif |
| **REST API — rezervasyon** (`bookings.py`, `booking_service.py`, çakışma/durum makinesi) | Burak | Arif |
| **REST API — kullanıcı & auth** (`auth.py`, `users.py`, `auth_service.py`, `user_service.py`) | Burak | Arak |
| **REST API — ödeme yöntemleri** (`payments.py`, `payment_method_service.py`) | Burak | Arif |
| **REST API — iletişim** (`contact.py`) | Burak | Arif |
| **DB modelleri & şema** (`src/models.py`, `schemas.py`) | Burak | Arif |
| **Alembic migrasyonları** (`alembic/`) | Burak | — |
| **Seed & test verisi** (`scripts/seed.py`) | Burak | Arif |
| **LocalStack S3** (`s3_service.py`, onay belgeleri) | Burak | Arif |
| **OpenTelemetry + Jaeger entegrasyonu** (`src/main.py`, compose) | Burak | Arif |
| **Unit testler** (`tests/unit/`) | Arif | Burak |
| **Integration testler** (`tests/integration/`) | Arif | Burak |
| **E2E testler** (`tests/e2e/` — UI + rezervasyon akışı) | Arif | Burak |
| **Test altyapısı** (`tests/conftest.py`, `factories.py`, `qa_manual_test.py`) | Arif | Burak |
| **Docker + Compose** (`docker-compose.yml`, `Dockerfile`) | Burak | Arif |
| **Kubernetes manifestleri** (`k8s/`) | Burak | — |
| **GitHub Actions CI** (`.github/workflows/ci.yml`) | Arif | Burak |
| **Monitoring** (`monitoring/` — Prometheus, Grafana dashboard) | Burak | Arif |
| **Performans (k6)** (`perf/load-test.js`, `perf/report.md`) | Burak | Arif |
| **Mimari & dokümantasyon** (`docs/architecture.svg`, `README.md`) | Burak | Arif |
| **Final rapor & sunum slaytları** (`docs/final-report.md`, `slides.md`, `demo-script.md`) | Burak + Arif | — |

> **Not:** Arif UI ve test katmanında birincil sorumlu; API sözleşmesi ve entegrasyon noktalarında Burak ile eşleşir. Burak backend ve altyapıda birincil sorumlu; her modül için Arif ilgili testleri yazar veya gözden geçirir.

---

## Sunum Sorumluluğu (20 dk slot)

- **0–7 dk:** Problem tanımı + mimari + test stratejisi (piramit, coverage hedefi) → **Burak** (mimari/altyapı), **Arif** (test stratejisi — kısa ekleme)
- **7–14 dk:** Canlı demo (PR → CI → `docker compose` → metrikler → E2E/UI akışı) → **Burak** (CI, deploy, Prometheus/Grafana), **Arif** (frontend rezervasyon akışı + E2E)
- **14–17 dk:** Sayılar (coverage, k6 sonuçları) + öğrenilenler → **Arif** (test metrikleri), **Burak** (perf/observability)
- **17–20 dk:** Soru-cevap → **Hep birlikte**

---

## Özet rol dağılımı

| Alan | Arif Batuhan Bahar | Burak Tuzcu |
|------|-------------------|-------------|
| UI | Birincil | API desteği |
| Test | Birincil | Backend fixture / servis desteği |
| Backend | Test & entegrasyon odaklı | Birincil |
| DevOps / Cloud | Demo & E2E ortamı | Birincil |
