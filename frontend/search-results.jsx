// Search results page — sidebar filters + horizontal hotel cards

const { useState, useMemo, useEffect } = React;

// ── Data ──────────────────────────────────────────────────────────────
const RESULTS = [
  { id: 1, name: "Çırağan Palace Suites",       type: "5 Yıldız · Boutique",  district: "Beşiktaş",      stars: 5, rating: 9.4, reviews: 1284, price: 8400, ph: "ph-r1", featured: true,  amen: ["pool","spa","breakfast","wifi"], perks: ["Ücretsiz İptal","Kahvaltı Dahil"], cancel: true,  breakfast: true,  note: "luxe · waterfront" },
  { id: 2, name: "Pera Loft House",             type: "Butik Otel",            district: "Beyoğlu, Galata",stars: 4, rating: 8.7, reviews: 892,  price: 3200, ph: "ph-r2", featured: false, amen: ["wifi","breakfast"], perks: ["Ücretsiz İptal"], cancel: true,  breakfast: true,  note: "atelier · roof view" },
  { id: 3, name: "Bosphorus Bay Hotel",         type: "5 Yıldız",              district: "Sarıyer, Tarabya",stars: 5, rating: 9.1, reviews: 642,  price: 6400, ph: "ph-r3", featured: false, amen: ["pool","spa","breakfast","wifi"], perks: ["Kahvaltı Dahil","Spa"], cancel: false, breakfast: true,  note: "modern · sea" },
  { id: 4, name: "Hammam Heritage Sultanahmet", type: "Heritage · 4 Yıldız",   district: "Fatih, Sultanahmet",stars: 4, rating: 8.9, reviews: 1521, price: 2800, ph: "ph-r4", featured: false, amen: ["spa","breakfast","wifi"], perks: ["Ücretsiz İptal","Spa"], cancel: true,  breakfast: true,  note: "stone · old city" },
  { id: 5, name: "Karaköy Riverstone Hotel",    type: "Butik · 4 Yıldız",      district: "Karaköy",        stars: 4, rating: 8.5, reviews: 487,  price: 3650, ph: "ph-r5", featured: false, amen: ["wifi","breakfast"], perks: ["Kahvaltı Dahil"],  cancel: false, breakfast: true,  note: "stone · port" },
  { id: 6, name: "Maslak Tower Residences",     type: "5 Yıldız · İş Oteli",   district: "Sarıyer, Maslak",stars: 5, rating: 8.8, reviews: 318,  price: 4900, ph: "ph-r6", featured: false, amen: ["pool","wifi","breakfast"], perks: ["Havuz","Ücretsiz İptal"], cancel: true, breakfast: true,  note: "high-rise · skyline" },
  { id: 7, name: "Kadıköy Garden Inn",          type: "3 Yıldız",              district: "Kadıköy, Moda",  stars: 3, rating: 7.9, reviews: 256,  price: 1450, ph: "ph-r7", featured: false, amen: ["wifi"], perks: ["Bütçe Dostu"], cancel: false, breakfast: false, note: "garden · quiet" },
  { id: 8, name: "Suadiye Marina Residence",    type: "Butik · 4 Yıldız",      district: "Kadıköy, Suadiye",stars:4, rating: 8.3, reviews: 412,  price: 2950, ph: "ph-r8", featured: false, amen: ["pool","wifi","breakfast"], perks: ["Havuz","Kahvaltı Dahil"], cancel: false, breakfast: true, note: "marina · sea" },
];

const AMENITY_ICONS = { wifi: IconWifi, pool: IconPool, spa: IconSpa, breakfast: IconBreakfast };
const AMENITY_LABELS = { wifi: "WiFi", pool: "Havuz", spa: "Spa", breakfast: "Kahvaltı" };

// ── Verdict from rating ───────────────────────────────────────────────
function verdictFor(r) {
  if (r >= 9.0) return "Mükemmel";
  if (r >= 8.5) return "Çok İyi";
  if (r >= 8.0) return "İyi";
  if (r >= 7.5) return "Memnun Edici";
  return "Kabul Edilebilir";
}

// ── Helpers ───────────────────────────────────────────────────────────
const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);

// ── Price slider (dual-thumb) ─────────────────────────────────────────
function PriceSlider({ min = 500, max = 20000, step = 100, value, onChange }) {
  const [lo, hi] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const setLo = (v) => onChange([Math.min(v, hi - step), hi]);
  const setHi = (v) => onChange([lo, Math.max(v, lo + step)]);
  return (
    <div>
      <div className="price-row">
        <div>
          <div className="sub">En Düşük</div>
          <div className="val">{fmtTL(lo)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div className="sub">En Yüksek</div>
          <div className="val">{fmtTL(hi)}</div>
        </div>
      </div>
      <div className="slider-track">
        <div className="slider-range" style={{ left: pct(lo) + "%", right: 100 - pct(hi) + "%" }} />
        <input className="slider-input" type="range" min={min} max={max} step={step} value={lo}
               onChange={(e) => setLo(Number(e.target.value))} aria-label="En düşük fiyat" />
        <input className="slider-input" type="range" min={min} max={max} step={step} value={hi}
               onChange={(e) => setHi(Number(e.target.value))} aria-label="En yüksek fiyat" />
      </div>
      <div className="slider-axis"><span>{fmtTL(min)}</span><span>{fmtTL(max)}</span></div>
    </div>
  );
}

// ── Checkmark ─────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.2 5.8 10 11 4.2" />
  </svg>
);

function CheckOpt({ label, count, checked, onChange, leading }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="label">
        <span className="box"><CheckIcon /></span>
        {leading}{label}
      </span>
      {count != null && <span className="count">{count}</span>}
    </label>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ filters, setFilters, onApply, results = [] }) {
  const toggle = (key, value) => {
    const arr = filters[key];
    setFilters({ ...filters, [key]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] });
  };
  const set = (key, value) => setFilters({ ...filters, [key]: value });
  const clear = () => setFilters({
    price: [500, 20000], stars: [], amenities: [], minScore: null,
  });

  return (
    <aside className="sidebar" aria-label="Filtreler">
      <div className="sidebar-inner">
        <div className="sb-head">
          <h3>Filtreler</h3>
          <button className="clear" onClick={clear}>Temizle</button>
        </div>

        <div className="sb-sep" />

        <div className="filter-block">
          <div className="filter-label">Fiyat Aralığı (gece)</div>
          <PriceSlider value={filters.price} onChange={(v) => set("price", v)} />
        </div>

        <div className="sb-sep" />

        <div className="filter-block">
          <div className="filter-label">Yıldız Sayısı</div>
          {[5,4,3].map(s => (
            <CheckOpt key={s}
              checked={filters.stars.includes(s)}
              onChange={() => toggle("stars", s)}
              label={null}
              leading={
                <span className="stars" aria-label={`${s} yıldız`}>
                  {Array.from({ length: s }).map((_, i) => <IconStar key={i} size={13} filled />)}
                </span>
              }
              count={results.filter(r => r.stars === s).length}
            />
          ))}
        </div>

        <div className="sb-sep" />

        <div className="filter-block">
          <div className="filter-label">Özellikler</div>
          {[
            { k: "pool",      l: "Havuz" },
            { k: "spa",       l: "Spa" },
            { k: "breakfast", l: "Kahvaltı Dahil" },
            { k: "cancel",    l: "Ücretsiz İptal" },
          ].map(({ k, l }) => (
            <CheckOpt key={k}
              checked={filters.amenities.includes(k)}
              onChange={() => toggle("amenities", k)}
              label={l}
              count={RESULTS.filter(r => k === "cancel" ? r.cancel : r.amen.includes(k)).length}
            />
          ))}
        </div>

        <div className="sb-sep" />

        <div className="filter-block">
          <div className="filter-label">Misafir Puanı</div>
          <div className="chips" role="radiogroup">
            {[
              { v: 7, l: "İyi 7+" },
              { v: 8, l: "Çok İyi 8+" },
              { v: 9, l: "Mükemmel 9+" },
            ].map(o => (
              <button key={o.v} className="chip" type="button"
                aria-pressed={filters.minScore === o.v}
                onClick={() => set("minScore", filters.minScore === o.v ? null : o.v)}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-cta apply" onClick={onApply}>
          <IconSearch size={16} /> Filtrele
        </button>
      </div>
    </aside>
  );
}

// ── Result card ───────────────────────────────────────────────────────
function ResultCard({ r, fav, onFav, onView }) {
  const v = verdictFor(r.rating);
  return (
    <article className="result-card fade-in" onClick={onView}>
      <div className="rc-img">
        <img src={r.thumbnail || `https://picsum.photos/seed/hotel_${r.id}_0/600/400`} alt={r.name}
             style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
        {r.featured && <span className="rc-badge">Öne Çıkan</span>}
        {r.featured && <span className="rc-badge">Öne Çıkan</span>}
        <button className={`rc-fav ${fav ? "on":""}`} type="button" aria-label="Favorilere ekle"
                onClick={(e) => { e.stopPropagation(); onFav(); }}>
          <IconHeart size={17} filled={fav} />
        </button>
      </div>

      <div className="rc-body">
        <div className="rc-main">
          <div className="rc-type">{r.type}</div>
          <div className="rc-rating">
            <span className="rc-stars" aria-hidden="true">
              {Array.from({ length: r.stars }).map((_, i) => <IconStar key={i} size={12} filled />)}
            </span>
          </div>
          <h3 className="rc-name">{r.name}</h3>
          <div className="rc-loc">
            <IconMapPin size={13} /> İstanbul, {r.district} · <a href="#">Haritada göster</a>
          </div>
          <div className="rc-amen">
            {r.amen.map(a => {
              const I = AMENITY_ICONS[a];
              return <span key={a}><I size={13} /> {AMENITY_LABELS[a]}</span>;
            })}
          </div>
          <div className="rc-perks">
            {r.perks.map((p, i) => (
              <span key={p} className={`rc-perk ${i === 1 ? "warn" : ""}`}>✓ {p}</span>
            ))}
          </div>
        </div>

        <div className="rc-side">
          <div className="rc-score">
            <div className="meta">
              <div className="verdict">{v}</div>
              <div className="reviews">{new Intl.NumberFormat("tr-TR").format(r.reviews)} yorum</div>
            </div>
            <div className={`badge ${r.rating >= 9 ? "gold" : ""}`}>{r.rating.toFixed(1)}</div>
          </div>
          <div className="rc-price">
            <div className="from">başlangıç</div>
            <b>{fmtTL(r.price)}</b>
            <span className="per">/ gece</span>
            <div className="total">3 gece · {fmtTL(r.price * 3)} toplam</div>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onView(); }}>
              Detayları Gör <IconArrow size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const _qs = new URLSearchParams(window.location.search);
  const _urlCity    = _qs.get("city") || "";
  const _urlCheckIn = _qs.get("check_in")  || "";
  const _urlCheckOut= _qs.get("check_out") || "";
  const _urlAdults  = parseInt(_qs.get("adults") || "2", 10);
  const _urlRooms   = parseInt(_qs.get("rooms")  || "1", 10);

  const [city, setCity] = useState(_urlCity);
  const [checkIn, setCheckIn]   = useState(_urlCheckIn);
  const [checkOut, setCheckOut] = useState(_urlCheckOut);
  const [adults, setAdults]     = useState(_urlAdults);
  const [rooms, setRooms]       = useState(_urlRooms);
  const [filters, setFilters] = useState({
    price: [500, 20000], stars: [], amenities: [], minScore: null,
  });
  const [sort, setSort] = useState("recommended");
  const [favs, setFavs] = useState(new Set());
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = React.useRef(null);
  const [results, setResults] = useState([]);
  const [totalInCity, setTotalInCity] = useState(0);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2200);
  };

  useEffect(() => {
    const params = new URLSearchParams({ sort, page });
    if (city) params.set("city", city);
    if (checkIn) params.set("check_in", checkIn);
    if (checkOut) params.set("check_out", checkOut);
    if (adults > 1) params.set("min_capacity", adults);
    if (filters.price[0] > 500) params.set("price_min", filters.price[0]);
    if (filters.price[1] < 20000) params.set("price_max", filters.price[1]);
    if (filters.stars.length === 1) params.set("stars", filters.stars[0]);
    fetch(`/api/hotels?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.hotels) {
          setResults(d.hotels.map(h => ({
            id: h.id, name: h.name, type: `${h.stars} Yıldız`, district: h.district || h.city,
            stars: h.stars, rating: h.rating * 2, reviews: h.reviews_count,
            price: h.price_per_night, thumbnail: h.thumbnail, featured: false,
            amen: [], perks: [], cancel: false, breakfast: false, note: "",
          })));
          setTotalInCity(d.total);
        }
      })
      .catch(() => {});
  }, [city, checkIn, checkOut, adults, filters, sort, page]);

  const filtered = useMemo(() => {
    let xs = results.filter(r =>
      r.price >= filters.price[0] && r.price <= filters.price[1] &&
      (filters.stars.length === 0 || filters.stars.includes(r.stars)) &&
      (filters.minScore == null || r.rating >= filters.minScore)
    );
    if (sort === "price-asc")  xs = [...xs].sort((a,b) => a.price - b.price);
    if (sort === "price-desc") xs = [...xs].sort((a,b) => b.price - a.price);
    if (sort === "rating")     xs = [...xs].sort((a,b) => b.rating - a.rating);
    if (sort === "stars")      xs = [...xs].sort((a,b) => b.stars - a.stars);
    return xs;
  }, [results, filters, sort]);

  const toggleFav = async (id) => {
    const token = localStorage.getItem("bakoda_token");
    setFavs(p => {
      const n = new Set(p);
      if (n.has(id)) { n.delete(id); if (token) fetch(`/api/users/me/favorites/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }
      else { n.add(id); if (token) fetch(`/api/users/me/favorites/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }
      return n;
    });
  };

  // Active filter chips
  const activeChips = [];
  if (filters.price[0] > 500 || filters.price[1] < 20000) {
    activeChips.push({ k:"price", label: `${fmtTL(filters.price[0])} – ${fmtTL(filters.price[1])}`, clear: () => setFilters({...filters, price:[500,20000]}) });
  }
  filters.stars.forEach(s => activeChips.push({ k:"stars-"+s, label: `${s} yıldız`, clear: () => setFilters({...filters, stars: filters.stars.filter(x=>x!==s)}) }));
  filters.amenities.forEach(a => activeChips.push({ k:"am-"+a, label: ({pool:"Havuz",spa:"Spa",breakfast:"Kahvaltı",cancel:"Ücretsiz İptal"})[a], clear: () => setFilters({...filters, amenities: filters.amenities.filter(x=>x!==a)}) }));
  if (filters.minScore) activeChips.push({ k:"score", label: `Puan ${filters.minScore}+`, clear: () => setFilters({...filters, minScore:null}) });

  return (
    <>
      <Navbar active="Oteller" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <a href="index.html">Anasayfa</a>
            <span className="sep">/</span>
            <span className="here">{city || "Tüm Oteller"}</span>
          </div>
        </div>

        <div className="container">
          <div className="results-wrap">
            <Sidebar filters={filters} setFilters={setFilters} results={results} onApply={() => flash(`${filtered.length} otel filtrelendi`)} />

            <main>
              <div className="summary">
                <div>
                  <h1>{city ? `${city}'da` : "Tüm otellerde"} <b>{totalInCity}</b> otel bulundu</h1>
                  <p>
                    {city || "Tüm şehirler"}
                    {checkIn && checkOut && ` · ${checkIn} → ${checkOut}`}
                    {adults > 1 && ` · ${adults} misafir`}
                    {rooms > 1 && ` · ${rooms} oda`}
                  </p>
                </div>
                <div className="sort">
                  <label htmlFor="sort">Sırala</label>
                  <select id="sort" className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="recommended">Önerilenler</option>
                    <option value="price-asc">Fiyat: Artan</option>
                    <option value="price-desc">Fiyat: Azalan</option>
                    <option value="rating">Konuk Puanı</option>
                    <option value="stars">Yıldız Sayısı</option>
                  </select>
                </div>
              </div>

              {activeChips.length > 0 && (
                <div className="active-filters">
                  {activeChips.map(c => (
                    <span key={c.k} className="active-chip">{c.label}
                      <button onClick={c.clear} aria-label="Kaldır"><IconX size={11} /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="result-list">
                {filtered.map(r => (
                  <ResultCard key={r.id} r={r}
                    fav={favs.has(r.id)} onFav={() => toggleFav(r.id)}
                    onView={() => { window.location.href = "hotel-detail.html?id=" + r.id; }} />
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding:60, textAlign:"center", color:"var(--muted)", background:"#fff", borderRadius:16, border:"1px solid var(--line)" }}>
                    <div style={{ fontFamily:"var(--display)", fontSize:22, color:"var(--primary)", marginBottom:8 }}>Sonuç bulunamadı</div>
                    Filtreleri değiştirip yeniden deneyin.
                  </div>
                )}
              </div>

              {filtered.length > 0 && (
                <div className="pag">
                  <button className="arrow" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>‹</button>
                  {[1,2,3,4,5].map(p => (
                    <button key={p} className={p === page ? "on":""} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="arrow" onClick={() => setPage(p => p+1)}>›</button>
                </div>
              )}
            </main>
          </div>
        </div>

        <Footer />
      </div>

      <Toast on={toast.on} msg={toast.msg} />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
