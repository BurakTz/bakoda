// bakoda — main app
// Components live in this file for editability. Sections are clearly delimited.

const { useState, useEffect, useRef, useMemo } = React;
const APP_I18N = {
  tr: {
    search: {
      aria: "Otel arama",
      location: "Lokasyon",
      locationPlaceholder: "Nereye gidiyorsunuz?",
      results: "Sonuçlar",
      popular: "Popüler Aramalar",
      noResult: "Sonuç yok — başka bir lokasyon deneyin",
      checkIn: "Giriş",
      checkOut: "Çıkış",
      guest: "Misafir",
      person: "kişi",
      room: "oda",
      adult: "yetişkin",
      child: "çocuk",
      done: "Tamam",
      searchHotel: "Otel Ara",
      night: "gece",
      validationCity: "Lütfen bir şehir veya bölge girin.",
      validationDates: "Lütfen geçerli giriş ve çıkış tarihleri seçin.",
      validationOrder: "Çıkış tarihi giriş tarihinden sonra olmalı.",
    },
    hero: {
      eyebrow: "50.000+ Seçilmiş Konaklama",
      sub: "Dünya genelinde dikkatle seçilmiş otel ve butik konaklama. Gerçek konuk yorumları, en iyi fiyat garantisi.",
    },
    destinations: {
      eyebrow: "Popüler Destinasyonlar",
      title: "Trend olan şehirler",
      sub: "Konuklarımızın bu sezon en çok keşfettiği üç durak. Yerel rehberlik, taşıma ve kahvaltı dahil.",
      all: "Tüm destinasyonlar",
      hotelSuffix: "otel",
      explore: "Keşfet",
    },
    hotel: {
      featured: "Öne Çıkan",
      addFav: "Favorilere ekle",
      reviews: "yorum",
      pool: "Havuz",
      breakfast: "Kahvaltı",
      perNight: "/ gece",
      inspect: "İncele",
    },
    featured: {
      eyebrow: "Öne Çıkan Oteller",
      title: "Editörlerimizin seçimi",
      sub: "Mimarisi, hizmeti ve konumuyla öne çıkan altı konaklama. Her biri editörlerimiz tarafından bizzat ziyaret edildi.",
      allHotels: "Tüm oteller",
    },
    why: {
      eyebrow: "Neden bakoda",
      title: "Kaygısız bir konaklama deneyimi",
      secure: "Güvenli Ödeme",
      secureText: "256-bit şifreleme. Kartınız sadece konaklama sırasında işlenir.",
      best: "En İyi Fiyat",
      bestText: "Daha düşük bir fiyat bulursanız aradaki farkı geri ödüyoruz.",
      support: "7/24 Destek",
      supportText: "Konuk hizmetleri ekibimiz Türkçe ve İngilizce, gece gündüz hizmetinizde.",
      cancel: "Ücretsiz İptal",
      cancelText: "Çoğu rezervasyonda girişe 48 saat kalana dek tam iade.",
    },
  },
  en: {
    search: {
      aria: "Hotel search",
      location: "Location",
      locationPlaceholder: "Where are you going?",
      results: "Results",
      popular: "Popular Searches",
      noResult: "No results — try another location",
      checkIn: "Check-in",
      checkOut: "Check-out",
      guest: "Guests",
      person: "people",
      room: "room",
      adult: "adults",
      child: "children",
      done: "Done",
      searchHotel: "Search Hotels",
      night: "night",
      validationCity: "Please enter a city or district.",
      validationDates: "Please pick valid check-in and check-out dates.",
      validationOrder: "Check-out must be after check-in.",
    },
    hero: {
      eyebrow: "50,000+ Curated Stays",
      sub: "Carefully selected hotels and boutique stays around the world. Real guest reviews and best price guarantee.",
    },
    destinations: {
      eyebrow: "Popular Destinations",
      title: "Trending cities",
      sub: "Three places our guests explored most this season. Local guidance, transport, and breakfast included.",
      all: "All destinations",
      hotelSuffix: "hotels",
      explore: "Explore",
    },
    hotel: {
      featured: "Featured",
      addFav: "Add to favorites",
      reviews: "reviews",
      pool: "Pool",
      breakfast: "Breakfast",
      perNight: "/ night",
      inspect: "View",
    },
    featured: {
      eyebrow: "Featured Hotels",
      title: "Editors' picks",
      sub: "Six properties selected for their architecture, service, and location.",
      allHotels: "All hotels",
    },
    why: {
      eyebrow: "Why bakoda",
      title: "A worry-free stay experience",
      secure: "Secure Payment",
      secureText: "256-bit encryption. Your card is processed only during stay.",
      best: "Best Price",
      bestText: "If you find a lower rate, we refund the difference.",
      support: "24/7 Support",
      supportText: "Our guest support team is available in Turkish and English.",
      cancel: "Free Cancellation",
      cancelText: "Full refund for most bookings up to 48 hours before check-in.",
    },
  },
};

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
const SEARCH_STATE_KEY = "bakoda_last_search";
const isValidDateObj = (d) => d instanceof Date && !Number.isNaN(d.getTime());
const toIsoDate = (d) => (isValidDateObj(d) ? d.toISOString().slice(0, 10) : "");

function persistSearchState(state) {
  try { sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state)); } catch {}
  try { localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state)); } catch {}
}

// ── Navbar ────────────────────────────────────────────────────────────
// ── Navbar / Footer / Toast live in shared.jsx (loaded before this file) ──

// ── Search card ─────────────────────────────────────────────────────────────────────
function SearchCard({ onSearch }) {
  const { t } = useI18n(APP_I18N);
  const [loc, setLoc] = useState("");
  const [trending, setTrending] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showCalendar, setShowCalendar] = useState(null); // "in" | "out" | null
  const [showGuests, setShowGuests] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState("");
  const t0 = today();
  const [checkIn, setCheckIn] = useState(addDays(t0, 7));
  const [checkOut, setCheckOut] = useState(addDays(t0, 10));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const card = useRef(null);

  useEffect(() => {
    fetch("/api/hotels/locations?limit=8")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrending(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = loc.trim();
    if (!q) {
      setLocations([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q, limit: "8" });
      fetch(`/api/hotels/locations?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setLocations(data); })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loc]);

  const filtered = useMemo(() => (loc.trim() ? locations : trending), [loc, locations, trending]);

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

  const pickLoc = (d) => {
    if (d.kind === "district") setLoc(d.name);
    else if (d.kind === "hotel") setLoc(d.city);
    else setLoc(d.name);
    setShowSuggest(false);
  };
  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));
  const submitSearch = () => {
    const city = String(loc || "").trim();
    if (!city) {
      setError(t("search.validationCity"));
      return;
    }
    if (!isValidDateObj(checkIn) || !isValidDateObj(checkOut)) {
      setError(t("search.validationDates"));
      return;
    }
    if (checkOut <= checkIn) {
      setError(t("search.validationOrder"));
      return;
    }
    setError("");
    onSearch({
      city,
      checkIn,
      checkOut,
      guests: Math.max(1, Number.parseInt(adults, 10) || 1),
      rooms: Math.max(1, Number.parseInt(rooms, 10) || 1),
    });
  };

  return (
    <div className="search-card" ref={card} role="search" aria-label={t("search.aria")}>
      {/* Location */}
      <div className="search-cell" onClick={() => {setShowSuggest(true);setShowCalendar(null);setShowGuests(false);}}>
        <label><IconMapPin size={13} /> {t("search.location")}</label>
        <input className="val" type="text" placeholder={t("search.locationPlaceholder")} value={loc}
        onChange={(e) => {setLoc(e.target.value);setShowSuggest(true);setActiveIdx(0);if (error) setError("");}}
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
              {loc.trim() ? t("search.results") : t("search.popular")}
            </div>
            {filtered.map((d, i) =>
          <div key={`${d.kind}-${d.name}-${d.city}`} className={`suggest-item ${i === activeIdx ? "active" : ""}`}
          onMouseEnter={() => setActiveIdx(i)} onClick={() => pickLoc(d)}>
                <div className="ico ph ph-h1" style={{ position: "relative" }}><IconMapPin size={14} /></div>
                <div>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  <div className="meta">
                    {d.kind === "district" ? `${d.city} · ${d.country}`
                      : d.kind === "hotel" ? `${d.city} · ${d.country}`
                      : `${d.country} · ${d.hotels} otel`}
                  </div>
                </div>
              </div>
          )}
            {filtered.length === 0 &&
          <div className="suggest-item" style={{ color: "var(--muted)" }}>{t("search.noResult")}</div>
          }
          </div>
        }
      </div>

      {/* Check-in */}
      <div className="search-cell" onClick={() => {setShowCalendar("in");setShowSuggest(false);setShowGuests(false);}}>
        <label><IconCalendar size={13} /> {t("search.checkIn")}</label>
        <div className="val">{fmtDate(checkIn)}</div>
        <div className="sub">{nights} {t("search.night")}</div>
        {showCalendar === "in" &&
        <Calendar value={checkIn} min={t0} onChange={(d) => {
          setCheckIn(d);if (d >= checkOut) setCheckOut(addDays(d, 1));
          setShowCalendar("out");
        }} />
        }
      </div>

      {/* Check-out */}
      <div className="search-cell" onClick={() => {setShowCalendar("out");setShowSuggest(false);setShowGuests(false);}}>
        <label><IconCalendar size={13} /> {t("search.checkOut")}</label>
        <div className="val">{fmtDate(checkOut)}</div>
        <div className="sub">{fmtDate(checkIn)} → {fmtDate(checkOut)}</div>
        {showCalendar === "out" &&
        <Calendar value={checkOut} min={addDays(checkIn, 1)} onChange={(d) => {setCheckOut(d);setShowCalendar(null);}} />
        }
      </div>

      {/* Guests */}
      <div className="search-cell" onClick={() => {setShowGuests(true);setShowSuggest(false);setShowCalendar(null);}}>
        <label><IconUsers size={13} /> {t("search.guest")}</label>
        <div className="val">{adults + children} {t("search.person")} · {rooms} {t("search.room")}</div>
        <div className="sub">{adults} {t("search.adult")} · {children} {t("search.child")}</div>
        {showGuests &&
        <div className="guest-pop" onClick={(e) => e.stopPropagation()}>
            <Stepper label="Yetişkin" sub="13+ yaş" val={adults} min={1} onChange={setAdults} />
            <Stepper label="Çocuk" sub="0–12 yaş" val={children} min={0} onChange={setChildren} />
            <Stepper label="Oda" sub="" val={rooms} min={1} max={6} onChange={setRooms} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ height: 34, padding: "0 14px", fontSize: 13 }} onClick={() => setShowGuests(false)}>{t("search.done")}</button>
            </div>
          </div>
        }
      </div>

      <div className="search-go">
        <button className="btn btn-cta" onClick={submitSearch}>
          <IconSearch size={16} /> {t("search.searchHotel")}
        </button>
        {error && <div className="sub" style={{ color: "var(--error)", marginTop: 8, textAlign: "center" }}>{error}</div>}
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
  const { t } = useI18n(APP_I18N);
  const split = headline.split(" ");
  const last = split.pop();
  const rest = split.join(" ");
  return (
    <header className="hero" data-screen-label="Hero">
      <div className="hero-bg" />
      <div className="hero-overlay" />
      <div className="hero-marker">[ bakoda · 2026 ]</div>
      <div className="container hero-content">
        <div className="hero-eyebrow"><i></i> {t("hero.eyebrow")}</div>
        <h1 className="hero-title">{rest} <em>{last}</em></h1>
        <p className="hero-sub">{t("hero.sub")}</p>
        <SearchCard onSearch={onSearch} />
      </div>
    </header>);

}

// ── Destinations ──────────────────────────────────────────────────────
function Destinations() {
  const { t, lang } = useI18n(APP_I18N);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    fetch("/api/hotels/destinations?limit=6")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDestinations(data); })
      .catch(() => {});
  }, []);

  return (
    <section data-screen-label="Destinations">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">{t("destinations.eyebrow")}</div>
            <h2 className="section-title">{t("destinations.title")}</h2>
            <p className="section-sub">{t("destinations.sub")}</p>
          </div>
          <a className="btn btn-secondary" href="search-results.html">{t("destinations.all")} <IconArrow size={14} /></a>
        </div>

        <div className="dest-grid">
          {destinations.map((d, i) =>
          <a key={d.slug} className="dest-card fade-in" href={`search-results.html?city=${encodeURIComponent(d.name)}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="dest-img" style={{ background: `url(${d.image || `https://picsum.photos/seed/dest_${d.slug}/600/400`}) center/cover` }} />
              <div className="dest-marker">{d.slug} · {d.country}</div>
              <div className="dest-body">
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>
                  {d.country}
                </div>
                <div className="dest-name">{d.name}</div>
                <div className="dest-meta">
                  <span>{new Intl.NumberFormat(lang === "en" ? "en-US" : "tr-TR").format(d.hotels)} {t("destinations.hotelSuffix")}</span>
                  <span className="pill">{t("destinations.explore")} →</span>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </section>);

}

// ── Hotel card ────────────────────────────────────────────────────────
function hotelImgFallback(id) {
  return `https://picsum.photos/seed/hotel_${id}_0/600/400`;
}

function HotelCard({ h, fav, onFav, onView }) {
  const { t, lang } = useI18n(APP_I18N);
  const fallback = hotelImgFallback(h.id);
  return (
    <article className="hotel-card" onClick={onView}>
      <div className="hotel-img">
        <img
          src={h.thumbnail || fallback}
          alt={h.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallback; }}
        />
        {h.featured && <span className="hotel-badge">{t("hotel.featured")}</span>}
        <button className={`fav ${fav ? "on" : ""}`} type="button" aria-label={t("hotel.addFav")}
        onClick={(e) => {e.stopPropagation();onFav();}}>
          <IconHeart filled={fav} />
        </button>
      </div>
      <div className="hotel-body">
        <div className="hotel-rating">
          <span className="stars" aria-hidden="true">
            {Array.from({ length: h.stars || 0 }).map((_, i) => <IconStar key={i} size={13} filled />)}
          </span>
          {(h.reviews > 0) && <b>{h.rating.toFixed(1)}/10</b>}
          <span className="reviews">({new Intl.NumberFormat(lang === "en" ? "en-US" : "tr-TR").format(h.reviews)} {t("hotel.reviews")})</span>
        </div>
        <h3 className="hotel-name">{h.name}</h3>
        <div className="hotel-loc"><IconMapPin size={13} /> {h.city}</div>
        <div className="hotel-amen">
          <span><IconWifi size={14} /> WiFi</span>
          <span><IconPool size={14} /> {t("hotel.pool")}</span>
          <span><IconSpa size={14} /> Spa</span>
          <span><IconBreakfast size={14} /> {t("hotel.breakfast")}</span>
        </div>
        <div className="hotel-foot">
          <div className="hotel-price">
            <b>{fmtMoney(h.price, h.currency)}</b>
            <span className="per">{t("hotel.perNight")}</span>
          </div>
          <button className="btn btn-primary" onClick={(e) => {e.stopPropagation();onView();}}>{t("hotel.inspect")}</button>
        </div>
      </div>
    </article>);

}

// ── Featured ──────────────────────────────────────────────────────────
function Featured({ cols, onView }) {
  const { t } = useI18n(APP_I18N);
  const [favs, setFavs] = useState(new Set());
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    fetch("/api/hotels?sort=rating&page=1")
      .then(r => r.json())
      .then(d => { if (d.hotels && d.hotels.length) setHotels(d.hotels.slice(0, 6).map(h => ({
        id: h.id, name: h.name, city: `${h.city}${h.district ? ", " + h.district : ""}`,
        rating: Number(h.rating) || 0,
        reviews: Number(h.reviews_count) || 0, price: h.price_per_night, currency: "₺",
        stars: h.stars,
        featured: true, thumbnail: h.thumbnail, tags: [], note: "",
      }))); })
      .catch(() => {});
  }, []);

  const toggleFav = async (id) => {
    const token = localStorage.getItem("bakoda_token");
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); if (token) fetch(`/api/users/me/favorites/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }
      else { next.add(id); if (token) fetch(`/api/users/me/favorites/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }
      return next;
    });
  };
  return (
    <section style={{ background: "var(--bg)" }} data-screen-label="Featured Hotels">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">{t("featured.eyebrow")}</div>
            <h2 className="section-title">{t("featured.title")}</h2>
            <p className="section-sub">{t("featured.sub")}</p>
          </div>
          <a className="btn btn-secondary" href="search-results.html">{t("featured.allHotels")} <IconArrow size={14} /></a>
        </div>

        <div className={`hotel-grid ${cols === 2 ? "cols-2" : ""}`}>
          {hotels.map((h, i) =>
          <div key={h.id} className="fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <HotelCard h={h} fav={favs.has(h.id)} onFav={() => toggleFav(h.id)} onView={() => onView(h)} />
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ── Why us ────────────────────────────────────────────────────────────
function WhyUs() {
  const { t } = useI18n(APP_I18N);
  const items = [
    { ico: IconShield, title: t("why.secure"), text: t("why.secureText") },
    { ico: IconTag, title: t("why.best"), text: t("why.bestText") },
    { ico: IconHeadset, title: t("why.support"), text: t("why.supportText") },
    { ico: IconRefresh, title: t("why.cancel"), text: t("why.cancelText") },
  ];
  return (
    <section className="why" data-screen-label="Why Us">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 32 }}>
          <div>
            <div className="section-eyebrow">{t("why.eyebrow")}</div>
            <h2 className="section-title">{t("why.title")}</h2>
          </div>
        </div>
        <div className="why-grid">
          {items.map(({ ico: I, title, text }) =>
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
      <Navbar active="nav.explore" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />
      <Hero headline={t.heroHeadline} onSearch={({ city, checkIn, checkOut, guests, rooms }) => {
        const p = new URLSearchParams();
        const checkInIso = toIsoDate(checkIn);
        const checkOutIso = toIsoDate(checkOut);
        p.set("city", city);
        p.set("location", city);
        if (checkInIso) p.set("check_in", checkInIso);
        if (checkOutIso) p.set("check_out", checkOutIso);
        p.set("guests", String(Math.max(1, Number.parseInt(guests, 10) || 1)));
        p.set("rooms", String(Math.max(1, Number.parseInt(rooms, 10) || 1)));
        persistSearchState({
          city,
          location: city,
          check_in: checkInIso,
          check_out: checkOutIso,
          guests: Math.max(1, Number.parseInt(guests, 10) || 1),
          rooms: Math.max(1, Number.parseInt(rooms, 10) || 1),
        });
        window.location.assign("search-results.html" + (p.toString() ? "?" + p.toString() : ""));
      }} />
      <Destinations />
      <Featured cols={t.featuredCols} onView={(h) => { window.location.href = "hotel-detail.html?id=" + (h.id || 1); }} />
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