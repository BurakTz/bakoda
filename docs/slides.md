# Bakoda — Sunum Slaytları (7 slayt)
## MTH2526-B25 • 20 dk slot • ~10 dk slayt + 7 dk demo + 3 dk Q&A

> PDF export: Marp, Pandoc veya Google Slides'a kopyalayın → `docs/slides.pdf`

---

## Slayt 1 — Problem ve Çözüm (~1.5 dk)

**Başlık:** Bakoda — Otel Oda Rezervasyonu + Test Pipeline'ı

**Problem**
- Otel rezervasyonunda müsaitlik, çakışma ve onay belgesi kritik
- Production'da hata maliyeti yüksek → otomasyon şart

**Çözüm**
- **Konu #15:** Hotel Room Booking API (FastAPI)
- Odaları listele, rezervasyon oluştur/iptal et, onayı **S3**'e yaz
- Basit React UI + tam test/deploy/monitoring yığını

**Neden bu proje?**
- Ders odağı: pytest, Docker, K8s, CI, Grafana, k6, E2E — gerçek backend senaryosu

**Konuşmacı notu:** "Karmaşık ürün değil; endüstri standardında test altyapısı."

---

## Slayt 2 — Mimari Diyagram (~1.5 dk)

**Görsel:** `docs/architecture.svg`

**Bileşenler (tek sayfa)**
| Katman | Araç |
|--------|------|
| API | FastAPI + Uvicorn |
| DB | PostgreSQL 16 + SQLAlchemy + Alembic |
| Storage | LocalStack S3 (`bakoda-confirmations`) |
| Metrics | Prometheus → Grafana (3 panel) |
| Tracing | OpenTelemetry → Jaeger (**bonus**) |
| Run | docker-compose / Minikube (2 replica) |

**Veri akışı:** Client → API → PG; booking → S3 JSON; API → `/metrics` → Prometheus

**Konuşmacı notu:** Mimari diyagramı ekranda tam göster; S3 ve Jaeger'ı işaretle.

---

## Slayt 3 — Test Stratejisi (~1.5 dk)

**Test piramidi**

```
        ▲  E2E (5) — Playwright API
       ▲▲  Integration (~49) — Testcontainers PG
      ▲▲▲  Unit (~18) — services, schemas
```

- **Hedef coverage:** ≥70% (`pyproject.toml` `fail_under`)
- **Factory Boy:** `RoomFactory`, `BookingFactory` + Faker
- **Postman:** 7 istek → Newman (CI smoke)
- **Öne çıkan integration:** 409 çakışma, iptal sonrası müsaitlik

**Komutlar**
```bash
poetry run pytest --cov=src --ignore=tests/e2e
BASE_URL=http://localhost:8000 poetry run pytest tests/e2e/
```

**Konuşmacı notu:** "En çok değer servis + integration katmanında."

---

## Slayt 4 — CI/CD Pipeline (~1.5 dk)

**Hedef akış (şartname)**
```
push/PR → ruff lint → pytest --cov-fail-under=70
       → docker build → (deploy) → Newman smoke
```

**Mevcut durum**
- Multi-stage **Dockerfile** ✓
- **docker-compose.yml** (6 servis) ✓
- **k8s/** manifestleri ✓
- `.github/workflows/ci.yml` → **eklenecek** (rubrik 15 puan)

**Deploy**
- Lokal: `docker compose up --build`
- K8s: `minikube` + `kubectl apply -f k8s/`
- Probes: `/health` liveness & readiness

**Konuşmacı notu:** Demo'da PR → Actions yeşil (workflow hazır olunca).

---

## Slayt 5 — Monitoring ve Observability (~1.5 dk)

**Prometheus + Grafana**
- Scrape: `http://app:8000/metrics`
- Dashboard: `monitoring/grafana-dashboard.json`

**3 panel**
1. Latency p50 / **p95** / p99
2. 5xx error rate
3. Throughput (req/s by handler)

**Jaeger (bonus)**
- OTLP `:4317` — booking + SQL span'leri
- UI: `:16686`

**Konuşmacı notu:** Deploy sonrası Grafana'da p95 grafiğini göster.

---

## Slayt 6 — Sayılar (~1.5 dk)

| Metrik | Değer |
|--------|--------|
| Pytest toplam | ~72 (18 unit + 49 int + 5 e2e) |
| Postman istek | 7 |
| Coverage hedefi | ≥70% |
| k6 max VU | 50 |
| k6 p95 threshold | <500 ms |
| K8s replicas | 2 |
| Grafana panelleri | 3 |
| Docker compose servis | 6 |
| OTel bonus | ✓ Jaeger |

**Performans (k6 — `perf/load-test.js`)**
- Senaryo: health → rooms → book → cancel
- Örnek: p95 ~145 ms, error 0% (`perf/report.md`)

**Konuşmacı notu:** Rakamları ezberle; Q&A'da "coverage neden düşük?" hazır ol.

---

## Slayt 7 — Öğrendiklerim ve Zorluklar (~1.5 dk)

**3 öğrenilen ders**
1. Testcontainers ile gerçek PG — mock'tan daha güvenilir integration
2. Multi-stage Docker + non-root — küçük image + güvenlik
3. Metrik + trace birlikte — latency spike'ta Jaeger span'ine düşmek

**3 zorluk**
1. Async session/fixture yaşam döngüsü
2. S3 + DB entegrasyon testlerinde mock vs LocalStack
3. CI workflow'un repo'ya alınması (sonraki adım)

**Kapanış**
- Repo: README, `docs/final-report.md`, `docs/architecture.svg`
- Sorular?

---

## Demo akışı hatırlatıcı (7 dk — slayt dışı)

1. PR aç → CI tetikle (~1 dk)
2. Merge / image build (~1 dk)
3. `kubectl get pods` — Minikube (~1 dk)
4. Grafana metrikleri (~1 dk)
5. `k6 run perf/load-test.js` — p95 (~1 dk)
6. `pytest tests/e2e/` — 1 senaryo (~1.5 dk)
7. Yedek demo videosu (README linki)
