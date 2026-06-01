# Canlı Demo Senaryosu (7 dk) — Bakoda Hotel Booking

**Proje:** Bakoda — Hotel Room Booking API (Konu #15)  
**Şartname referansı:** MTH2526-B25, Bölüm 8.4  
**Repo kökü:** `bakoda-main/` (iç klasör; `Dockerfile` ve `docker-compose.yml` burada)

Sunum slotunun **7–14. dakikası** için bu akış. Toplam **7 dakika** (+ ~30 sn yedek video). Her adımda ekranda ne gösterileceği ve söylenecek kısa cümleler yazılıdır.

---

## Sunum Öncesi Hazırlık (slot dışı, 5 dk önce)

| Hazırlık | Komut / Not |
|----------|-------------|
| Repo köküne geç | `cd C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main` |
| Stack ayakta | `docker compose up -d --build` |
| Minikube hazır | `docs/sunum-notlari.md` → Minikube bölümü |
| Image Minikube içinde | `bakoda:latest` (sunum günü önceden build) |
| Grafana sekmesi | http://localhost:3000 — kullanıcı `admin` / şifre `admin` |
| GitHub sekmesi | Açık PR veya hazır feature branch |
| Yedek video | README’deki demo video linki (canlı çökme buffer’ı) |
| Terminal 1 | Repo kökü — `kubectl`, `k6` |
| Terminal 2 | GitHub Actions / PR |

> **Not:** CI adımı için workflow dosyası `.github/workflows/ci.yml` olmalıdır. Yoksa sunumdan önce ekleyin veya “önceden yeşil koşmuş” bir PR ekran görüntüsü + canlıda sadece merge/deploy gösterin.

---

## Zaman Çizelgesi (8.4)

| Dakika | Adım | Süre |
|--------|------|------|
| 0:00–1:00 | PR aç → CI tetikle | 1 dk |
| 1:00–2:00 | Merge → image build / CD | 1 dk |
| 2:00–3:00 | Minikube’de yeni sürüm | 1 dk |
| 3:00–4:00 | Grafana metrikleri | 1 dk |
| 4:00–5:00 | k6 yük testi + p95 | 1 dk |
| 5:00–6:30 | E2E (1–2 senaryo) | 1,5 dk |
| 6:30–7:00 | Buffer / yedek video | 0,5 dk |

---

## Adım 1 — PR aç, CI tetikle (1 dk)

**Göster:** GitHub → repo → **Pull requests** → hazır branch’ten PR (ör. `demo/sunum-pipeline` → `main`).

**Söyle:**  
> “Küçük bir değişiklikle PR açıyorum; `pull_request` tetikleyicisi GitHub Actions’ı başlatıyor: lint → pytest (coverage ≥%70) → docker build → Newman → deploy/smoke.”

**Beklenen workflow yolu:** `.github/workflows/ci.yml`

**Ekranda işaretle:**
- `test` job: `poetry run pytest --cov=src --cov-fail-under=70` (veya `pip install -r requirements.txt` + pytest)
- `docker build -t bakoda:${{ github.sha }} .` — build context **repo kökü** ( `Dockerfile` ile aynı dizin)
- `newman run postman/collection.json` — `baseUrl` ortam değişkeni

**Hız için:** PR’ı sunumdan önce açıp CI’ın ilk koşusunu bitirin; canlıda sadece “Checks” sekmesinde yeşile dönüşü gösterin.

---

## Adım 2 — Merge, image build / CD (1 dk)

**Göster:** PR **Merge** → `main` push → workflow’un deploy/build adımları.

**Söyle:**  
> “Merge sonrası pipeline image üretiyor; Minikube tarafında `bakoda:latest` etiketiyle kullanıyoruz (`k8s/deployment.yaml` → `image: bakoda:latest`).”

**İlgili dosyalar:**
- `Dockerfile` — multi-stage (`builder` + `runtime`)
- `k8s/deployment.yaml` — `imagePullPolicy: IfNotPresent`

**Hız için:** Merge’i prova edin; canlıda “merge butonu + Actions’ta build adımı” yeterli.

---

## Adım 3 — Minikube’de deploy (1 dk)

**Önkoşul:** Minikube çalışıyor, image Minikube Docker daemon’unda.

**PowerShell (repo kökünde):**

```powershell
cd C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main

kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

kubectl rollout status deployment/bakoda
kubectl get pods -l app=bakoda
```

**Servis URL:**

```powershell
minikube service bakoda-service --url
# veya NodePort: http://$(minikube ip):30080
```

**Söyle:**  
> “Deployment iki replica, ConfigMap ortam değişkenleri, Service NodePort 30080. Health probe `/health` üzerinden.”

**Smoke (Minikube URL’si ile):**

```powershell
$base = "http://<minikube-service-url>"
Invoke-RestMethod "$base/health"
```

> API uçları **`/api` öneki** ile: `/api/rooms`, `/api/bookings` — README tablosundaki `/rooms` yolu güncel değil; bkz. pitfalls.

---

## Adım 4 — Grafana: latency & error rate (1 dk)

**Docker Compose ile izleme (sunumda en kolay yol):**

- Grafana: http://localhost:3000 (`admin` / `admin`)
- Prometheus: http://localhost:9090
- Dashboard: `monitoring/grafana-dashboard.json` (provision: `monitoring/grafana-provisioning/`)

**Söyle:**  
> “Deploy sonrası Prometheus `/metrics` scrape ediyor. Panel 1: p50/p95/p99 latency; Panel 2: 5xx error rate; Panel 3: request throughput.”

**Tetikleme:** Tarayıcıda `http://localhost:8000/docs` açıp birkaç istek veya k6’ya geçmeden önce:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod "http://localhost:8000/api/rooms"
```

**Göster:** Grafana’da son 5–10 dk zaman aralığı, deploy/k6 öncesi-sonrası karşılaştırma.

---

## Adım 5 — k6 yük testi, p95 (1 dk)

**Dosya:** `perf/load-test.js`  
**Rapor şablonu:** `perf/report.md`

**PowerShell (API docker compose ile 8000 portunda):**

```powershell
cd C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main
$env:BASE_URL = "http://localhost:8000"
k6 run perf/load-test.js
```

**Söyle:**  
> “Senaryo: health → `/api/rooms` → POST `/api/bookings` → PATCH cancel. Threshold: p95 < 500 ms, error rate < %5.”

**Ekranda vurgula:** Çıktıdaki `http_req_duration` satırındaki **p(95)=** değeri.

**Minikube’e karşı test:**

```powershell
$env:BASE_URL = "http://<minikube-service-url>"
k6 run perf/load-test.js
```

---

## Adım 6 — E2E: 1–2 senaryo (1,5 dk)

**Dosya:** `tests/e2e/test_booking_flow.py`  
**Araç:** Playwright API (`pytest-playwright`)

**Önkoşul:** Uygulama + PostgreSQL ayakta; odalar seed’li.

```powershell
cd C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main
docker compose up -d
# İlk kurulumda (container içinde seed gerekiyorsa):
# docker compose exec app python scripts/seed.py

$env:BASE_URL = "http://localhost:8000"
poetry run pytest tests/e2e/test_booking_flow.py::test_health_endpoint tests/e2e/test_booking_flow.py::test_full_booking_flow -v
```

**Söyle (test 1):** `test_health_endpoint` — smoke, `/health` → `{"status":"ok"}`.  
**Söyle (test 2):** `test_full_booking_flow` — listele → rezerve et → GET ile doğrula (`/api/...`).

**Alternatif tek komut (tüm E2E):**

```powershell
$env:BASE_URL = "http://localhost:8000"
poetry run pytest tests/e2e/ -v
```

**İsteğe bağlı 3. senaryo (zaman kalırsa):** `test_cancel_booking_flow` veya `test_double_booking_conflict` (409).

---

## Adım 7 — Buffer / yedek (0,5 dk)

**Söyle:**  
> “Canlı ortamda ağ gecikmesi olursa README’deki yedek demo videosunu oynatırız; pipeline ve metrikler slaytlarda da var.”

**Kapanış cümlesi:**  
> “PR’dan CI, container’dan K8s, Prometheus/Grafana’dan gözlemlenebilirlik, k6’dan p95, Playwright E2E’den uçtan uca güvence — tek repo `bakoda-main`.”

---

## Hızlı Referans — Proje Yolları

| Bileşen | Yol |
|---------|-----|
| Uygulama girişi | `src/main.py` |
| K8s | `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/configmap.yaml` |
| CI (beklenen) | `.github/workflows/ci.yml` |
| Postman | `postman/collection.json` |
| k6 | `perf/load-test.js` |
| E2E | `tests/e2e/test_booking_flow.py` |
| Monitoring | `monitoring/prometheus.yml`, `monitoring/grafana-dashboard.json` |
| Lokal stack | `docker-compose.yml` (kök dizin) |

---

## Sorun Çıkarsa (30 sn içinde kurtarma)

1. **CI kırmızı** → Actions log’da pytest veya Newman; slayttaki yeşil ekran görüntüsüne geç.
2. **Minikube pod CrashLoop** → `kubectl describe pod -l app=bakoda`; genelde DB/S3 bağımlılığı — demo için `docker compose` + localhost:8000 kullan.
3. **k6 / E2E 404** → URL’de `/api` önekini kontrol et.
4. **Boş oda listesi** → `scripts/seed.py` veya integration test seed fixture’ları.

Detaylı tuzaklar listesi: `docs/sunum-notlari.md`.
