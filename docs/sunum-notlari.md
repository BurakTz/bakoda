# Sunum Notları — Bakoda Hotel Booking

**Ders:** MTH2526-B25 — Bulut Mimarilerinde Test Mühendisliği  
**Proje:** Konu #15 — Hotel Room Booking  
**Repo kökü:** `C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main`  
**Toplam slot:** 20 dk (10 dk slayt + 7 dk demo + 3 dk Q&A)

Canlı demo adım adım akış: **`docs/demo-script.md`**

---

## Minikube Hazırlığı — Windows PowerShell

Sunumdan **en az 1 gün önce** ve slot **5 dakika öncesinde** çalıştırın. Amaç: canlıda `docker pull` / `minikube start` beklememek.

### Gereksinimler

- Docker Desktop (WSL2 backend önerilir)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- (Demo) [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- (E2E) Poetry + `poetry run playwright install`

### 1. Minikube’ü başlat

```powershell
minikube start --cpus 4 --memory 4096
minikube status
kubectl cluster-info
```

### 2. Shell’i Minikube Docker daemon’una bağla

Bash’teki `eval $(minikube docker-env)` yerine **PowerShell**:

```powershell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
docker context ls   # aktif context minikube olmalı
```

> **Tuzak:** Bu komutu **her yeni PowerShell penceresinde** tekrarlayın; aksi halde `docker build` image’ı Docker Desktop’a yazar, Kubernetes pod’u `ImagePullBackOff` verir.

### 3. Image’ı repo kökünden build et

```powershell
cd C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main

# Dockerfile bu dizinde olmalı — üst klasör (Downloads\bakoda-main) DEĞİL
docker build -t bakoda:latest .
docker images bakoda
```

### 4. Manifestleri uygula

```powershell
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

kubectl get all -l app=bakoda
kubectl rollout status deployment/bakoda
```

**Dosyalar:**
- `k8s/deployment.yaml` — `image: bakoda:latest`, `imagePullPolicy: IfNotPresent`
- `k8s/service.yaml` — `bakoda-service`, NodePort **30080**
- `k8s/configmap.yaml` — `bakoda-config` (DB_HOST, S3, OTEL)

### 5. Servise erişim

```powershell
minikube service bakoda-service --url
# Örnek çıktı: http://127.0.0.1:xxxxx

# Alternatif:
$ip = minikube ip
Write-Host "http://${ip}:30080"
```

### 6. Smoke test

```powershell
$base = "http://127.0.0.1:xxxxx"   # minikube service çıktısı
Invoke-RestMethod "$base/health"
Invoke-RestMethod "$base/api/rooms"
```

### 7. İzleme (demo için önerilen: Docker Compose)

Minikube manifestleri yalnızca **bakoda** uygulamasını içerir; `k8s/configmap.yaml` içindeki `postgres-service`, `localstack-service`, `jaeger-service` cluster’da yoksa pod sağlıklı görünse bile iş mantığı hata verebilir.

**Sunumda Grafana için pratik yol:**

```powershell
cd C:\Users\Lenovo\Downloads\bakoda-main\bakoda-main
docker compose up -d
# Grafana http://localhost:3000  |  API http://localhost:8000
```

Prometheus scrape hedefi `docker-compose.yml` içinde `app:8000` → `monitoring/prometheus.yml`.

### 8. Slot öncesi kontrol listesi (5 dk)

```powershell
minikube status
kubectl get pods -l app=bakoda
docker compose ps
Invoke-RestMethod http://localhost:8000/health
```

Tarayıcı sekmeleri: GitHub PR/Actions, Grafana, `localhost:8000/docs`, (yedek) demo video.

---

## 7 Slayt Konuşma Notları (~10 dk, ~1,5 dk/slayt)

Şartname Bölüm 8.3 ile uyumlu. Her slayt için **söyle** maddeleri.

### Slayt 1 — Problem & Çözüm

- **Söyle:** Otel oda rezervasyonu mini-servisi; asıl hedef “büyük ürün” değil, **endüstri standardında test ve dağıtım boru hattı**.
- **Söyle:** FastAPI + PostgreSQL + LocalStack S3 (onay belgeleri).
- **Grup ise:** Üye rolleri ve motivasyon (1 cümle/kişi).

### Slayt 2 — Mimari Diyagram

- **Göster:** `docs/architecture.png` (veya README’deki ASCII).
- **Söyle:** İstek → `src/main.py` → router’lar (`src/routes/`) → servisler (`src/services/`) → DB.
- **Söyle:** Yan bileşenler: LocalStack S3, Prometheus → Grafana, Jaeger (OpenTelemetry).
- **Söyle:** Deploy: Docker → Minikube (`k8s/`), CI: GitHub Actions.

### Slayt 3 — Test Stratejisi

- **Söyle:** Piramit — çok **unit** (`tests/unit/`), **integration** + Testcontainers (`tests/integration/`), az ama kritik **E2E** (`tests/e2e/`), **k6** (`perf/`).
- **Söyle:** Factory Boy + Faker → `tests/factories.py`.
- **Söyle:** Coverage hedefi ≥%70, `pytest --cov=src`.

### Slayt 4 — CI/CD Pipeline

- **Söyle:** Tek workflow `.github/workflows/ci.yml`: lint → pytest → docker build → Newman → deploy/smoke.
- **Söyle:** Postman koleksiyonu `postman/collection.json`, CI’da `newman run ... --env-var baseUrl=...`.
- **Söyle:** PR’da test, `main` merge’de image + deploy (şartname Ek B ile aynı mantık).

### Slayt 5 — Monitoring & Observability

- **Söyle:** `prometheus_fastapi_instrumentator` → `/metrics`.
- **Söyle:** Grafana dashboard `monitoring/grafana-dashboard.json` — en az 3 panel: **latency (p95)**, **error rate**, **throughput**.
- **Söyle:** Deploy veya k6 sonrası panellerde hareket gösterilecek (demo adım 4).

### Slayt 6 — Sayılar

- **Söyle:** Test sayısı (unit + integration + e2e), **coverage %** (son CI artifact veya lokal `pytest --cov`).
- **Söyle:** **p95 latency** — `k6 run perf/load-test.js` çıktısı, `perf/report.md` ile tutarlı.
- **Söyle:** Pipeline süreleri: ortalama build/deploy süresi (GitHub Actions’tan ekran görüntüsü).
- **Söyle:** Endpoint sayısı: `/health` + `/api` altında odalar, rezervasyonlar, auth, vb.

### Slayt 7 — Öğrendiklerim & Zorluklar

- **Söyle (3 madde örnek):**
  1. Testcontainers ile gerçek PostgreSQL’e integration test — mock’tan daha güvenilir, kurulum süresi artar.
  2. Multi-stage Dockerfile ile runtime image küçültme.
  3. `/api` prefix ve dokümantasyon tutarlılığı — Postman/k6/E2E aynı path’leri kullanmalı.
- **Söyle:** İleride Helm, KEDA, ArgoCD bonus konularına kapı açık.

---

## Pitfalls Checklist (Sunum Günü)

Aşağıdakileri sunum öncesi tek tek işaretleyin.

### Dizin ve Docker

- [ ] **`docker build` ve `docker compose` komutları repo kökünde** — `Dockerfile` ve `docker-compose.yml` olan `bakoda-main\bakoda-main` klasörü; üst `Downloads\bakoda-main` klasöründe değil.
- [ ] Minikube için `minikube docker-env` PowerShell’de **`Invoke-Expression` ile** uygulandı; image Minikube içinde `docker images | Select-String bakoda` ile görünüyor.
- [ ] Yanlış context’te build → pod `ErrImageNeverPull` / `ImagePullBackOff`.

### API yolları (`/api` öneki)

- [ ] Gerçek uçlar: `/health` (kök), **`/api/rooms`**, **`/api/bookings`**, `/api/bookings/{id}`, `/api/bookings/{id}/cancel` (`src/main.py` router prefix).
- [ ] README endpoint tablosu `/rooms` yazıyor — **güncel değil**; demo ve testlerde `/api/rooms` kullan.
- [ ] `perf/load-test.js` ve `tests/e2e/` çoğunlukla `/api/...` — doğru.
- [ ] `perf/report.md` metninde `/rooms` geçiyor — raporu doldururken `/api/rooms` yazın.
- [ ] `tests/e2e/test_booking_flow.py` içinde `test_double_booking_conflict` bir satırda `/rooms` kullanıyor — tam dosya koşulursa 404 riski; sunumda `test_full_booking_flow` + `test_health_endpoint` tercih edin.

### Veri ve bağımlılıklar

- [ ] E2E ve k6 için veritabanında **oda kaydı** gerekir; boş liste → test skip/hata. `docker compose up` sonrası gerekirse `docker compose exec app python scripts/seed.py`.
- [ ] Minikube yalnızca `k8s/` uyguladıysanız ConfigMap’teki `postgres-service` cluster’da yok — **demo API için docker compose (8000) daha güvenilir**.

### Araçlar ve portlar

- [ ] E2E: `$env:BASE_URL = "http://localhost:8000"` (PowerShell); Playwright kurulu: `poetry run playwright install`.
- [ ] k6: `$env:BASE_URL = "http://localhost:8000"` — `perf/load-test.js` varsayılanı aynı.
- [ ] Grafana **3000**, Prometheus **9090**, API **8000**, Jaeger UI **16686** — `docker-compose.yml` ile uyumlu.
- [ ] Newman: `newman run postman/collection.json --env-var baseUrl=http://localhost:8000`.

### CI/CD ve repo

- [ ] `.github/workflows/ci.yml` mevcut ve son koşu yeşil — PR demo’su için şart.
- [ ] PR’ı sunumdan önce açıp CI süresini bekleyin; canlıda sadece checklist animasyonu gösterin.
- [ ] README’de **yedek demo video linki** doldurulmuş olsun (şartname 8.2).

### Ekran ve zaman

- [ ] Meet ekran paylaşımı test edildi; 20 dk **hard cap**.
- [ ] Demo **7 dk** — uzarsa E2E’den tek test + k6 kısa koşu (`--duration` k6’da stages kısaltılamaz; prova ile süreyi bilin).
- [ ] Grup: her üye en az bir bölüm konuştu (`docs/work-distribution.md` varsa slayta referans).

### İç içe klasör karışıklığı

- [ ] Workspace yolu: `...\bakoda-main\bakoda-main` — dış klasörde `control.txt` olabilir; **kod ve Docker burada değil**, iç `bakoda-main` içinde.

---

## Demo Sorumlusu İçin Son Kontrol

| Sıra | Kontrol |
|------|---------|
| 1 | `docker compose up -d` → http://localhost:8000/health OK |
| 2 | Grafana açılıyor, Prometheus target UP |
| 3 | Minikube pod’lar Running (veya demo planı compose-only) |
| 4 | GitHub PR + yeşil CI |
| 5 | `k6 run perf/load-test.js` prova süresi ~2 dk biliniyor |
| 6 | `pytest tests/e2e/...` seçili 2 test yeşil |
| 7 | Yedek video linki hazır |

---

## İlgili Dosyalar

| Dosya | Amaç |
|-------|------|
| `docs/demo-script.md` | 7 dk canlı demo senaryosu |
| `docs/architecture.png` | Slayt 2 (teslim) |
| `docs/final-report.pdf` | Final rapor (teslim) |
| `docs/slides.pdf` | Slaytlar (teslim) |
| `docs/work-distribution.md` | Grup iş paylaşımı (grup ise zorunlu) |
| `README.md` | Kurulum ve test komutları |
| `control.txt` (üst klasör) | Şartname Bölüm 8.3–8.4 |
