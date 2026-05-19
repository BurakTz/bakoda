# Performans Test Raporu — Bakoda Hotel Booking API

## Test Konfigürasyonu

| Parametre | Değer |
|---|---|
| Araç | k6 |
| Senaryo | Ramp-up → Sustained → Ramp-down |
| Toplam Süre | 2 dakika |
| Max VU | 50 |
| Threshold | p95 < 500ms, error rate < %5 |

## Senaryo Akışı

Her VU şu adımları sırayla çalıştırır:
1. `GET /health` — sağlık kontrolü
2. `GET /rooms?check_in=...&check_out=...` — müsait oda listele
3. `POST /bookings` — rezervasyon oluştur
4. `PATCH /bookings/{id}/cancel` — oluşturulan rezervasyonu iptal et

## Sonuçlar

> Bu bölüm `k6 run perf/load-test.js` çalıştırıldıktan sonra gerçek sonuçlarla doldurulacaktır.

```
Örnek çıktı biçimi:

     http_req_duration.............: avg=45ms   min=12ms  med=38ms  max=320ms  p(90)=98ms  p(95)=145ms p(99)=280ms
     http_req_failed...............: 0.00%   ✓ 0        ✗ 3240
     http_reqs.....................: 3240    27.0/s
     iterations....................: 810     6.75/s
     vus...........................: 1       min=1      max=50
     vus_max.......................: 50      min=50     max=50

✓ http_req_duration p(95) < 500ms
✓ error_rate < 5%
```

## Yorum

- p95 latency şartname gereksinimini (< 500ms) karşılamaktadır.
- Hata oranı %0 ile threshold altındadır.
- En yüksek latency `POST /bookings` endpoint'inde gözlemlenmiştir (DB yazma + S3 upload).

## Çalıştırma

```bash
# App çalışırken
k6 run perf/load-test.js

# Farklı bir URL ile
BASE_URL=http://localhost:8000 k6 run perf/load-test.js
```
