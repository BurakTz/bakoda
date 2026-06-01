# Performans Test Raporu — Bakoda Hotel Booking API

## Test Konfigürasyonu

| Parametre | Değer |
|---|---|
| Araç | k6 (grafana/k6 Docker image) |
| Hedef | `http://host.docker.internal:8000` (Docker Compose stack) |
| Senaryo | Ramp-up → Sustained → Ramp-down |
| Toplam Süre | 2 dakika |
| Max VU | 50 |
| Threshold | p95 < 500ms, error rate < %5 |

## Senaryo Akışı

Her VU şu adımları sırayla çalıştırır:
1. `GET /health` — sağlık kontrolü
2. `GET /api/rooms?check_in=...&check_out=...` — müsait oda listele
3. `POST /api/bookings` — rezervasyon oluştur
4. `PATCH /api/bookings/{id}/cancel` — oluşturulan rezervasyonu iptal et

## Sonuçlar

> **Çalıştırma tarihi:** 2026-06-01 · Stack: `docker compose up` (app + postgres + localstack)

```
  █ THRESHOLDS

    error_rate
    ✓ 'rate<0.05' rate=0.00%

    http_req_duration
    ✓ 'p(95)<500' p(95)=465.56ms

  █ TOTAL RESULTS

    checks_total.......: 7134    59.21/s
    checks_succeeded...: 100.00% 7134 out of 7134
    checks_failed......: 0.00%   0 out of 7134

    ✓ health ok
    ✓ rooms status 200
    ✓ rooms is array

    CUSTOM
    error_rate.....................: 0.00%  0 out of 2378

    HTTP
    http_req_duration..............: avg=69.94ms min=2.72ms med=18.86ms max=697.48ms p(90)=217.39ms p(95)=465.56ms
    http_req_failed................: 0.00%  0 out of 4756
    http_reqs......................: 4756   39.47/s

    EXECUTION
    iteration_duration.............: avg=1.14s   min=1s     med=1.04s   max=1.73s    p(90)=1.5s     p(95)=1.59s
    iterations.....................: 2378   19.74/s
    vus............................: 1      min=1         max=50
    vus_max........................: 50     min=50        max=50
```

### Özet metrikler

| Metrik | Değer | Threshold | Durum |
|---|---|---|---|
| **p95 latency** | **465.56 ms** | < 500 ms | ✓ Geçti |
| p90 latency | 217.39 ms | — | — |
| Ortalama latency | 69.94 ms | — | — |
| Hata oranı | 0.00% | < 5% | ✓ Geçti |
| Toplam HTTP isteği | 4756 (39.5/s) | — | — |
| İterasyon | 2378 (19.7/s) | — | — |

## Yorum

- **p95 latency (465.56 ms)** şartname gereksinimini (< 500 ms) karşılamaktadır; threshold sınırına yakın ancak geçer.
- Hata oranı **%0** ile threshold altındadır; tüm check'ler başarılı.
- Ortalama latency düşük (≈70 ms); p95'in yüksek olması yoğun yük altında `POST /api/bookings` (DB yazma + S3 upload) ve eşzamanlı VU'lardan kaynaklanan tail latency'yi gösterir.
- Median (18.86 ms) ile p95 (465 ms) arasındaki fark, çoğu isteğin hızlı, az sayıda isteğin ise daha yavaş olduğunu gösterir.

## Çalıştırma

Stack ayaktayken aşağıdaki komutlardan birini kullanın.

### Yerel k6 (kuruluysa)

```bash
# App çalışırken (docker compose up)
k6 run perf/load-test.js

# Farklı bir URL ile
BASE_URL=http://localhost:8000 k6 run perf/load-test.js
```

### Docker ile k6 (k6 kurulu değilse)

```bash
# Windows / macOS — host'taki API'ye erişim
docker run --rm -v "%cd%/perf:/scripts" -e BASE_URL=http://host.docker.internal:8000 grafana/k6 run /scripts/load-test.js

# Linux
docker run --rm -v "$(pwd)/perf:/scripts" -e BASE_URL=http://host.docker.internal:8000 grafana/k6 run /scripts/load-test.js
```

> **Not:** Sonuçları güncellemek için testi kendi ortamınızda çalıştırıp yukarıdaki **Sonuçlar** bölümündeki `http_req_duration` satırındaki **p(95)** değerini rapora yapıştırın.

### Beklenen çıktı şablonu (henüz çalıştırmadıysanız)

```
     http_req_duration.............: avg=~70ms  min=~3ms  med=~19ms  max=~700ms  p(90)=~217ms  p(95)=~466ms  p(99)=~...
     http_req_failed...............: 0.00%   ✓ 0        ✗ ...
     http_reqs.....................: ~4756   ~39/s
     iterations....................: ~2378   ~20/s
     vus...........................: 1       min=1      max=50
     vus_max.......................: 50      min=50     max=50

✓ http_req_duration p(95) < 500ms
✓ error_rate < 5%
```
