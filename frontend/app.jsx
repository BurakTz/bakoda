// bakoda — main app
// Components live in this file for editability. Sections are clearly delimited.

const { useState, useEffect, useRef, useMemo } = React;

// ── Data ──────────────────────────────────────────────────────────────
const DESTINATIONS = [
{ name: "İstanbul", country: "Türkiye", hotels: 1284, slug: "istanbul", ph: "ph-istanbul", marker: "ist · 41.0082°N" },
{ name: "Paris", country: "Fransa", hotels: 962, slug: "paris", ph: "ph-paris", marker: "cdg · 48.8566°N" },
{ name: "Bali", country: "Endonezya", hotels: 437, slug: "bali", ph: "ph-bali", marker: "dps · 8.3405°S" }];


const HOTELS = [
{ id: 1, name: "Çırağan Palace Suites", city: "İstanbul, Beşiktaş", rating: 4.9, reviews: 1284, price: 8400, currency: "₺", featured: true, ph: "ph-h1", tags: ["Boğaz Manzarası", "Spa", "Havuz"], note: "luxe · waterfront" },
{ id: 2, name: "Maison Lumière Marais", city: "Paris, 3. Bölge", rating: 4.8, reviews: 642, price: 4200, currency: "€", featured: true, ph: "ph-h2", tags: ["Şehir Merkezi", "Restoran"], note: "boutique · 18 oda" },
{ id: 3, name: "Villa Ananda Ubud", city: "Bali, Ubud", rating: 4.95, reviews: 318, price: 380, currency: "$", featured: true, ph: "ph-h4", tags: ["Pirinç Terası", "Yoga"], note: "retreat · jungle" },
{ id: 4, name: "The Cappadocia Cave Resort", city: "Nevşehir, Ürgüp", rating: 4.85, reviews: 891, price: 6200, currency: "₺", featured: false, ph: "ph-h3", tags: ["Mağara Oda", "Manzara"], note: "stone · honey" },
{ id: 5, name: "Casa Solana Riviera", city: "Antalya, Kalkan", rating: 4.7, reviews: 524, price: 5800, currency: "₺", featured: false, ph: "ph-h5", tags: ["Plaj", "Özel Havuz"], note: "terracotta · sea" },
{ id: 6, name: "Hôtel Aubépine Rive Gauche", city: "Paris, 6. Bölge", rating: 4.75, reviews: 412, price: 3650, currency: "€", featured: false, ph: "ph-h6", tags: ["Sanat", "Bahçe"], note: "atelier · garden" }];


const TRENDING_QUERIES = [
{ name: "Kapadokya", meta: "Mağara otelleri · Türkiye", ph: "ph-h3" },
{ name: "Bodrum", meta: "Sahil otelleri · Türkiye", ph: "ph-h4" },
{ name: "Roma", meta: "Şehir merkezi · İtalya", ph: "ph-h5" },
{ name: "Santorini", meta: "Kaldera manzarası · Yunanistan", ph: "ph-h2" }];


// ── Helpers ───────────────────────────────────────────────────────────
const fmtMoney = (n, c) => {
  const s = new Intl.NumberFormat("tr-TR").format(n);
  return c === "₺" ? `₺ ${s}` : c === "€" ? `€ ${s}` : `${c}${s}`;
};
const fmtDate = (d) => {
  if (!d) return null;
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};
const addDays = (d, n) => {const x = new Date(d);x.setDate(x.getDate() + n);return x;};
const today = () => {const d = new Date();d.setHours(0, 0, 0, 0);return d;};

// ── Navbar ────────────────────────────────────────────────────────────
// ── Navbar / Footer / Toast live in shared.jsx (loaded before this file) ──

// ── Search card ─────────────────────────────────────────────────────────────────────
function SearchCard({ onSearch }) {
  const [loc, setLoc] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [showCalendar, setShowCalendar] = useState(null); // "in" | "out" | null
  const [showGuests, setShowGuests] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const t0 = today();
  const [checkIn, setCheckIn] = useState(addDays(t0, 7));
  const [checkOut, setCheckOut] = useState(addDays(t0, 10));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const card = useRef(null);

  const filtered = useMemo(() => {
    const q = loc.trim().toLowerCase();
    if (!q) return TRENDING_QUERIES;
    return TRENDING_QUERIES.filter((d) => d.name.toLowerCase().includes(q) || d.meta.toLowerCase().includes(q));
  }, [loc]);

  // outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (card.current && !card.current.contains(e.target)) {
        setShowSuggest(false);setShowCalendar(null);setShowGuests(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickLoc = (d) => {setLoc(d.name);setShowSuggest(false);};
  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));

  return (
    <div className="search-card" ref={card} role="search" aria-label="Otel arama">
      {/* Location */}
      <div className="search-cell" onClick={() => {setShowSuggest(true);setShowCalendar(null);setShowGuests(false);}}>
        <label><IconMapPin size={13} /> Lokasyon</label>
        <input className="val" type="text" placeholder="Nereye gidiyorsunuz?" value={loc}
        onChange={(e) => {setLoc(e.target.value);setShowSuggest(true);}}
        onFocus={() => setShowSuggest(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {e.preventDefault();setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));}
          if (e.key === "ArrowUp") {e.preventDefault();setActiveIdx((i) => Math.max(0, i - 1));}
          if (e.key === "Enter" && filtered[activeIdx]) {pickLoc(filtered[activeIdx]);}
          if (e.key === "Escape") setShowSuggest(false);
        }} />
        {showSuggest &&
        <div className="suggest">
            <div style={{ padding: "6px 12px 4px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".12em", color: "var(--muted)", textTransform: "uppercase" }}>
              {loc ? "Sonuçlar" : "Popüler Aramalar"}
            </div>
            {filtered.map((d, i) =>
          <div key={d.name} className={`suggest-item ${i === activeIdx ? "active" : ""}`}
          onMouseEnter={() => setActiveIdx(i)} onClick={() => pickLoc(d)}>
                <div className={`ico ph ${d.ph}`} style={{ position: "relative" }}><IconMapPin size={14} /></div>
                <div>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  <div className="meta">{d.meta}</div>
                </div>
              </div>
          )}
            {filtered.length === 0 &&
          <div className="suggest-item" style={{ color: "var(--muted)" }}>Sonuç yok — başka bir lokasyon deneyin</div>
          }
          </div>
        }
      </div>

      {/* Check-in */}
      <div className="search-cell" onClick={() => {setShowCalendar("in");setShowSuggest(false);setShowGuests(false);}}>
        <label><IconCalendar size={13} /> Giriş</label>
        <div className="val">{fmtDate(checkIn)}</div>
        <div className="sub">{nights} gece</div>
        {showCalendar === "in" &&
        <Calendar value={checkIn} min={t0} onChange={(d) => {
          setCheckIn(d);if (d >= checkOut) setCheckOut(addDays(d, 1));
          setShowCalendar("out");
        }} />
        }
      </div>

      {/* Check-out */}
      <div className="search-cell" onClick={() => {setShowCalendar("out");setShowSuggest(false);setShowGuests(false);}}>
        <label><IconCalendar size={13} /> Çıkış</label>
        <div className="val">{fmtDate(checkOut)}</div>
        <div className="sub">{fmtDate(checkIn)} → {fmtDate(checkOut)}</div>
        {showCalendar === "out" &&
        <Calendar value={checkOut} min={addDays(checkIn, 1)} onChange={(d) => {setCheckOut(d);setShowCalendar(null);}} />
        }
      </div>

      {/* Guests */}
      <div className="search-cell" onClick={() => {setShowGuests(true);setShowSuggest(false);setShowCalendar(null);}}>
        <label><IconUsers size={13} /> Misafir</label>
        <div className="val">{adults + children} kişi · {rooms} oda</div>
        <div className="sub">{adults} yetişkin · {children} çocuk</div>
        {showGuests &&
        <div className="guest-pop" onClick={(e) => e.stopPropagation()}>
            <Stepper label="Yetişkin" sub="13+ yaş" val={adults} min={1} onChange={setAdults} />
            <Stepper label="Çocuk" sub="0–12 yaş" val={children} min={0} onChange={setChildren} />
            <Stepper label="Oda" sub="" val={rooms} min={1} max={6} onChange={setRooms} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ height: 34, padding: "0 14px", fontSize: 13 }} onClick={() => setShowGuests(false)}>Tamam</button>
            </div>
          </div>
        }
      </div>

      <div className="search-go">
        <button className="btn btn-cta" onClick={() => onSearch({ loc, checkIn, checkOut, adults, children, rooms })}>
          <IconSearch size={16} /> Otel Ara
        </button>
      </div>
    </div>);

}

function Stepper({ label, sub, val, min = 0, max = 12, onChange }) {
  return (
    <div className="guest-row">
      <div>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
        {sub && <div style={{ color: "var(--muted)", fontSize: 12 }}>{sub}</div>}
      </div>
      <div className="step">
        <button onClick={() => onChange(Math.max(min, val - 1))} disabled={val <= min} aria-label={`${label} azalt`}>−</button>
        <span className="count">{val}</span>
        <button onClick={() => onChange(Math.min(max, val + 1))} disabled={val >= max} aria-label={`${label} arttır`}>+</button>
      </div>
    </div>);

}

// Mini calendar
function Calendar({ value, min, onChange }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const weekdays = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  return (
    <div className="guest-pop" style={{ width: 280 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button className="btn btn-ghost" style={{ height: 30, width: 30, padding: 0, borderRadius: 8 }}
        onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} aria-label="Önceki ay">
          <IconChevron size={14} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div style={{ fontWeight: 600, fontFamily: "var(--display)", fontSize: 15 }}>{months[view.getMonth()]} {view.getFullYear()}</div>
        <button className="btn btn-ghost" style={{ height: 30, width: 30, padding: 0, borderRadius: 8 }}
        onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Sonraki ay">
          <IconChevron size={14} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, fontSize: 11, color: "var(--muted)", marginBottom: 4, textAlign: "center" }}>
        {weekdays.map((w) => <div key={w} style={{ padding: "4px 0", fontFamily: "var(--mono)", letterSpacing: ".06em" }}>{w}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const disabled = min && d < min;
          const selected = d.toDateString() === value.toDateString();
          return (
            <button key={i} disabled={disabled} onClick={() => onChange(d)}
            style={{
              height: 34, border: 0, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
              background: selected ? "var(--primary)" : "transparent",
              color: selected ? "#fff" : disabled ? "var(--muted)" : "var(--text)",
              opacity: disabled ? .35 : 1,
              fontSize: 13, fontWeight: selected ? 600 : 400, fontVariantNumeric: "tabular-nums",
              transition: "background .12s"
            }}
            onMouseEnter={(e) => {if (!disabled && !selected) e.currentTarget.style.background = "var(--primary-10)";}}
            onMouseLeave={(e) => {if (!disabled && !selected) e.currentTarget.style.background = "transparent";}}>
              {d.getDate()}
            </button>);

        })}
      </div>
    </div>);

}

// ── Hero ──────────────────────────────────────────────────────────────
function Hero({ headline, onSearch }) {
  const split = headline.split(" ");
  const last = split.pop();
  const rest = split.join(" ");
  return (
    <header className="hero" data-screen-label="Hero">
      <div className="hero-bg" />
      <div className="hero-overlay" />
      <div className="hero-marker">[ bakoda · 2026 ]</div>
      <div className="container hero-content">
        <div className="hero-eyebrow"><i></i> 50.000+ Seçilmiş Konaklama</div>
        <h1 className="hero-title">{rest} <em>{last}</em></h1>
        <p className="hero-sub">Dünya genelinde dikkatle seçilmiş otel ve butik konaklama. Gerçek konuk yorumları, en iyi fiyat garantisi.</p>
        <SearchCard onSearch={onSearch} />
      </div>
    </header>);

}

// ── Destinations ──────────────────────────────────────────────────────
function Destinations() {
  return (
    <section data-screen-label="Destinations">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Popüler Destinasyonlar</div>
            <h2 className="section-title">Trend olan şehirler</h2>
            <p className="section-sub">Konuklarımızın bu sezon en çok keşfettiği üç durak. Yerel rehberlik, taşıma ve kahvaltı dahil.</p>
          </div>
          <a className="btn btn-secondary" href="search-results.html">Tüm destinasyonlar <IconArrow size={14} /></a>
        </div>

        <div className="dest-grid">
          {DESTINATIONS.map((d, i) =>
          <a key={d.slug} className="dest-card fade-in" href="search-results.html" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`dest-img ph ${d.ph}`} />
              <div className="dest-marker">{d.marker}</div>
              <div className="dest-body">
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>
                  {d.country}
                </div>
                <div className="dest-name">{d.name}</div>
                <div className="dest-meta">
                  <span>{new Intl.NumberFormat("tr-TR").format(d.hotels)} otel</span>
                  <span className="pill">Keşfet →</span>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </section>);

}

// ── Hotel card ────────────────────────────────────────────────────────
function HotelCard({ h, fav, onFav, onView }) {
  return (
    <article className="hotel-card" onClick={onView}>
      <div className="hotel-img">
        <div className={`ph ${h.ph}`} />
        <div className="ph-label">[ {h.note} ]</div>
        {h.featured && <span className="hotel-badge">Öne Çıkan</span>}
        <button className={`fav ${fav ? "on" : ""}`} type="button" aria-label="Favorilere ekle"
        onClick={(e) => {e.stopPropagation();onFav();}}>
          <IconHeart filled={fav} />
        </button>
      </div>
      <div className="hotel-body">
        <div className="hotel-rating">
          <span className="stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => <IconStar key={i} size={13} filled={i < Math.round(h.rating)} />)}
          </span>
          <b>{h.rating.toFixed(2)}</b>
          <span className="reviews">({new Intl.NumberFormat("tr-TR").format(h.reviews)} yorum)</span>
        </div>
        <h3 className="hotel-name">{h.name}</h3>
        <div className="hotel-loc"><IconMapPin size={13} /> {h.city}</div>
        <div className="hotel-amen">
          <span><IconWifi size={14} /> WiFi</span>
          <span><IconPool size={14} /> Havuz</span>
          <span><IconSpa size={14} /> Spa</span>
          <span><IconBreakfast size={14} /> Kahvaltı</span>
        </div>
        <div className="hotel-foot">
          <div className="hotel-price">
            <b>{fmtMoney(h.price, h.currency)}</b>
            <span className="per">/ gece</span>
          </div>
          <button className="btn btn-primary" onClick={(e) => {e.stopPropagation();onView();}}>İncele</button>
        </div>
      </div>
    </article>);

}

// ── Featured ──────────────────────────────────────────────────────────
function Featured({ cols, onView }) {
  const [favs, setFavs] = useState(new Set());
  const toggleFav = (id) => setFavs((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);else next.add(id);
    return next;
  });
  return (
    <section style={{ background: "var(--bg)" }} data-screen-label="Featured Hotels">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">Öne Çıkan Oteller</div>
            <h2 className="section-title">Editörlerimizin seçimi</h2>
            <p className="section-sub">Mimarisi, hizmeti ve konumuyla öne çıkan altı konaklama. Her biri editörlerimiz tarafından bizzat ziyaret edildi.</p>
          </div>
          <a className="btn btn-secondary" href="search-results.html">Tüm oteller <IconArrow size={14} /></a>
        </div>

        <div className={`hotel-grid ${cols === 2 ? "cols-2" : ""}`}>
          {HOTELS.map((h, i) =>
          <div key={h.id} className="fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <HotelCard h={h} fav={favs.has(h.id)} onFav={() => toggleFav(h.id)} onView={() => onView(h)} />
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ── Why us ────────────────────────────────────────────────────────────
const WHY = [
{ ico: IconShield, title: "Güvenli Ödeme", text: "256-bit şifreleme. Kartınız sadece konaklama sırasında işlenir." },
{ ico: IconTag, title: "En İyi Fiyat", text: "Daha düşük bir fiyat bulursanız aradaki farkı geri ödüyoruz." },
{ ico: IconHeadset, title: "7/24 Destek", text: "Konuk hizmetleri ekibimiz Türkçe ve İngilizce, gece gündüz hizmetinizde." },
{ ico: IconRefresh, title: "Ücretsiz İptal", text: "Çoğu rezervasyonda girişe 48 saat kalana dek tam iade." }];


function WhyUs() {
  return (
    <section className="why" data-screen-label="Why Us">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 32 }}>
          <div>
            <div className="section-eyebrow">Neden bakoda</div>
            <h2 className="section-title">Kaygısız bir konaklama deneyimi</h2>
          </div>
        </div>
        <div className="why-grid">
          {WHY.map(({ ico: I, title, text }) =>
          <div className="why-item" key={title}>
              <div className="why-ico"><I size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [toast, setToast] = useState({ on: false, msg: "" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast((s) => ({ ...s, on: false })), 2400);
  };

  // Apply tweak palette + font to CSS variables
  useEffect(() => {
    const r = document.documentElement.style;
    const [primary, accent] = t.palette;
    r.setProperty("--primary", primary);
    r.setProperty("--accent", accent);
    // Derived shades
    r.setProperty("--primary-10", mix(primary, "#ffffff", 0.92));
    r.setProperty("--primary-90", mix(primary, "#ffffff", 0.10));
    r.setProperty("--accent-dark", mix(accent, "#000000", 0.15));
    r.setProperty("--display", `"${t.displayFont}", Georgia, serif`);
    r.setProperty("--hero-overlay", String(t.heroOverlay));
  }, [t.palette, t.displayFont, t.heroOverlay]);

  return (
    <>
      <Navbar active="Keşfet" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />
      <Hero headline={t.heroHeadline} onSearch={() => { window.location.href = "search-results.html"; }} />
      <Destinations />
      <Featured cols={t.featuredCols} onView={() => { window.location.href = "hotel-detail.html"; }} />
      {t.showWhyUs && <WhyUs />}
      <Footer />
      <Toast on={toast.on} msg={toast.msg} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Marka">
          <TweakColor label="Palet" value={t.palette}
          options={[
          ["#0F2A2A", "#D7A86E"],
          ["#1A3B5D", "#C9A96E"],
          ["#2B2C3B", "#B08968"],
          ["#3A2E2A", "#C9A96E"],
          ["#1E3A2F", "#D4B062"]]
          }
          onChange={(v) => setTweak("palette", v)} />
          <TweakSelect label="Başlık Yazı Tipi" value={t.displayFont}
          options={["Fraunces", "Playfair Display", "Cormorant Garamond"]}
          onChange={(v) => setTweak("displayFont", v)} />
        </TweakSection>
        <TweakSection label="Hero">
          <TweakText label="Başlık" value={t.heroHeadline}
          onChange={(v) => setTweak("heroHeadline", v)} />
          <TweakSlider label="Overlay" value={t.heroOverlay} min={0} max={0.85} step={0.05}
          onChange={(v) => setTweak("heroOverlay", v)} />
        </TweakSection>
        <TweakSection label="Düzen">
          <TweakRadio label="Otel Grid" value={t.featuredCols}
          options={[{ value: 2, label: "2 sütun" }, { value: 3, label: "3 sütun" }]}
          onChange={(v) => setTweak("featuredCols", v)} />
          <TweakToggle label="Neden Biz" value={t.showWhyUs}
          onChange={(v) => setTweak("showWhyUs", v)} />
        </TweakSection>
      </TweaksPanel>
    </>);

}

// Hex mix helper for derived shades
function mix(a, b, w) {
  const pa = parseHex(a),pb = parseHex(b);
  const m = pa.map((c, i) => Math.round(c * (1 - w) + pb[i] * w));
  return "#" + m.map((c) => c.toString(16).padStart(2, "0")).join("");
}
function parseHex(h) {
  let s = h.replace("#", "");if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);