// Hotel detail — API-driven

const { useState, useEffect, useRef } = React;
const HOTEL_DETAIL_FALLBACK_TITLE = "Otel Detayı — bakoda";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DISCOUNT_PCT = 8;
const CLEANING_FEE = 500;
const DETAIL_I18N = {
  tr: {
    common: {
      loading: "Otel bilgileri yükleniyor…",
      loadFailed: "Otel bilgisi yüklenemedi",
      retry: "Tekrar Dene",
      backToSearch: "Aramaya Dön",
      home: "Anasayfa",
      hotels: "Oteller",
      share: "Paylaş",
      removedFav: "Favorilerden çıkarıldı",
      addedFav: "Favorilere eklendi",
      saved: "Kaydedildi",
      save: "Kaydet",
      guestFavorite: "Misafir Favorisi",
      showOnMap: "Haritada göster",
      reviews: "değerlendirme",
      loadingErrorDefault: "Lütfen daha sonra tekrar deneyin.",
    },
    tabs: {
      overview: "Genel Bakış",
      rooms: "Odalar",
      amenities: "Olanaklar",
      reviews: "Yorumlar",
    },
  },
  en: {
    common: {
      loading: "Loading hotel details…",
      loadFailed: "Failed to load hotel details",
      retry: "Retry",
      backToSearch: "Back to search",
      home: "Home",
      hotels: "Hotels",
      share: "Share",
      removedFav: "Removed from favorites",
      addedFav: "Added to favorites",
      saved: "Saved",
      save: "Save",
      guestFavorite: "Guest Favorite",
      showOnMap: "Show on map",
      reviews: "reviews",
      loadingErrorDefault: "Please try again later.",
    },
    tabs: {
      overview: "Overview",
      rooms: "Rooms",
      amenities: "Amenities",
      reviews: "Reviews",
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────
const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const fmtDate = (d) => {
  if (!d) return "";
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const initials = (name) => name.split(/\s+/).map(s => s[0]).join("").slice(0,2).toUpperCase();

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseIsoDate = (value) => {
  const txt = String(value || "").trim();
  if (!ISO_DATE_RE.test(txt)) return null;
  const d = new Date(`${txt}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toIsoDate = (d) => (
  d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ""
);

function verdictFor(rating) {
  if (rating >= 9.0) return "Mükemmel";
  if (rating >= 8.5) return "Çok İyi";
  if (rating >= 8.0) return "İyi";
  if (rating >= 7.5) return "Memnun Edici";
  return "Kabul Edilebilir";
}

function calcPricing(checkIn, checkOut, pricePerNight, rooms = 1) {
  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));
  const roomCount = Math.max(1, parsePositiveInt(rooms, 1));
  const subtotal = Math.max(0, Number(pricePerNight || 0)) * nights * roomCount;
  const discount = nights >= 3 ? Math.round(subtotal * DISCOUNT_PCT / 100) : 0;
  const taxable = subtotal - discount + CLEANING_FEE;
  const taxes = Math.round(taxable * 0.10);
  const total = taxable + taxes;
  return { nights, subtotal, discount, cleaning: CLEANING_FEE, taxes, total };
}

function readInitialStay() {
  const qs = new URLSearchParams(window.location.search);
  const t0 = today();
  const fromUrlIn = parseIsoDate(qs.get("check_in") || sessionStorage.getItem("bakoda_checkin"));
  const fromUrlOut = parseIsoDate(qs.get("check_out") || sessionStorage.getItem("bakoda_checkout"));
  const checkIn = fromUrlIn && fromUrlIn >= t0 ? fromUrlIn : addDays(t0, 7);
  let checkOut = fromUrlOut && fromUrlOut > checkIn ? fromUrlOut : addDays(checkIn, 3);
  if (checkOut <= checkIn) checkOut = addDays(checkIn, 1);
  const adults = parsePositiveInt(
    qs.get("adults") || qs.get("guests") || sessionStorage.getItem("bakoda_adults"),
    2
  );
  const rooms = parsePositiveInt(qs.get("rooms") || sessionStorage.getItem("bakoda_rooms"), 1);
  return { checkIn, checkOut, adults, children: 0, rooms };
}

// ── Mini calendar ─────────────────────────────────────────────────────
function MiniCal({ value, min, onPick }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const weekdays = ["Pt","Sa","Ça","Pe","Cu","Ct","Pz"];
  const offset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
  const ndays = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i=0;i<offset;i++) cells.push(null);
  for (let d=1; d<=ndays; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  return (
    <div className="cal" onClick={(e)=>e.stopPropagation()}>
      <div className="cal-head">
        <button type="button" onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()-1, 1))}><IconChevron size={14} style={{transform:"rotate(90deg)"}} /></button>
        <div className="title">{months[view.getMonth()]} {view.getFullYear()}</div>
        <button type="button" onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()+1, 1))}><IconChevron size={14} style={{transform:"rotate(-90deg)"}} /></button>
      </div>
      <div className="cal-wk">{weekdays.map(w => <div key={w}>{w}</div>)}</div>
      <div className="cal-days">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const disabled = min && d < min;
          const sel = d.toDateString() === value.toDateString();
          return (
            <button type="button" key={i} className={`cal-day ${sel?"sel":""}`} disabled={disabled} onClick={()=>onPick(d)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────
function hotelImages(hotel) {
  const src = hotel.thumbnail;
  return Array(5).fill(src);
}

function Gallery({ hotel, onOpen }) {
  const imgs = hotelImages(hotel);
  return (
    <div className="container gallery">
      <div className="gallery-grid">
        {imgs.map((src, i) => (
          <div key={i} className={`g ${i===0 ? "main":""}`} onClick={() => onOpen(i)}
               style={{ position:"relative", overflow:"hidden", background:"var(--line)" }}>
            <img src={src} alt={`${hotel.name} - ${i+1}`}
                 style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                 loading="lazy" />
            {i === 4 && (
              <button className="more" type="button">
                <IconSearch size={14} /> + 24 fotoğraf
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ hotel, idx, onClose, onNav }) {
  const imgs = hotelImages(hotel);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  onNav(-1);
      if (e.key === "ArrowRight") onNav(+1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav]);
  return (
    <div className="lightbox" onClick={onClose}>
      <div className="stage" onClick={(e)=>e.stopPropagation()}>
        <img src={imgs[idx]} alt={`${hotel.name} - ${idx+1}`}
             style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8 }} />
        <button className="close" onClick={onClose}><IconX size={16} /></button>
        <button className="nav-btn prev" onClick={()=>onNav(-1)}><IconChevron size={18} style={{transform:"rotate(90deg)"}} /></button>
        <button className="nav-btn next" onClick={()=>onNav(+1)}><IconChevron size={18} style={{transform:"rotate(-90deg)"}} /></button>
        <div className="counter">{idx+1} / {imgs.length}</div>
      </div>
    </div>
  );
}

// ── Tabs / panels ─────────────────────────────────────────────────────
function OverviewPanel({ hotel, go }) {
  const { t } = useI18n(DETAIL_I18N);
  return (
    <>
      <div className="panel" id="overview">
        <h2>Bu konaklama hakkında</h2>
        <p>{hotel.description}</p>
        <div className="desc-meta">
          {hotel.meta.map(m => (
            <div className="item" key={m.lbl}>
              <div className="lbl">{m.lbl}</div>
              <div className="val">{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Öne çıkan olanaklar</h2>
        <div className="amen-grid">
          {hotel.amenities.slice(0, 8).map(a => {
            const Ico = window[a.ico] || IconCheck;
            return (
              <div className="amen" key={a.title}>
                <div className="ico"><Ico size={20} /></div>
                <div className="ttl">{a.title}</div>
                <div className="sub">{a.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel" id="reviews-summary">
        <h2>Misafir yorumları</h2>
        <div className="reviews-summary">
          <div>
            <div className="big">{hotel.rating.toFixed(1)}/10<small>{hotel.verdict} · {new Intl.NumberFormat("tr-TR").format(hotel.reviews)} yorum</small></div>
          </div>
          <div className="review-bars">
            {hotel.ratingBars.map(b => (
              <div className="review-bar" key={b.label}>
                <div className="label">{b.label}</div>
                <div className="track"><div className="fill" style={{ width: (b.value/10)*100 + "%" }} /></div>
                <div className="num">{b.value.toFixed(1)}/10</div>
              </div>
            ))}
          </div>
        </div>
        <div className="review-list">
          {hotel.reviewList.slice(0, 2).map(rv => <ReviewCard rv={rv} key={rv.name} />)}
        </div>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => go("reviews")}>{t("tabs.reviews", "Yorumlar")} · {new Intl.NumberFormat("tr-TR").format(hotel.reviews)} <IconArrow size={14} /></button>
        </div>
      </div>
    </>
  );
}

function RoomsPanel({ hotel, nights }) {
  return (
    <div className="panel" id="rooms">
      <h2>Süit & oda seçenekleri</h2>
      <p className="muted" style={{ fontSize:14, marginBottom: 20 }}>
        {nights > 1 ? `${nights} gece` : "1 gece"} konaklama için gösterilen gecelik fiyatlar.
      </p>
      <div className="rooms">
        {hotel.rooms.map(r => (
          <article className="room" key={r.name || r.id}>
            <div className="img">
              <img src={hotel.thumbnail} alt={r.name}
                   style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
            </div>
            <div className="body">
              <h3>{r.name}</h3>
              <div className="feats">
                <span><IconUsers size={13} /> {r.capacity || 2} kişi</span>
                {r.size && <span>· {r.size}</span>}
                {r.bed && <span>· {r.bed}</span>}
                {r.view && <span>· {r.view}</span>}
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, padding:"3px 9px", borderRadius:999, background:"rgba(46,204,113,.10)", color:"#1e8e51", fontWeight:500 }}>✓ Ücretsiz iptal</span>
                <span style={{ fontSize:11, padding:"3px 9px", borderRadius:999, background:"rgba(215,168,110,.15)", color:"var(--accent-dark)", fontWeight:500 }}>✓ Kahvaltı dahil</span>
              </div>
            </div>
            <div className="side">
              <div className="price">{fmtTL(r.price)}</div>
              <div className="per">/ gece</div>
              <button
                className="btn btn-cta"
                style={{ marginTop:8, height:38, padding:"0 16px", fontSize:13 }}
                disabled={hotel.availableRoomsCount === 0}
                onClick={() => {
                const ci = toIsoDate(hotel.stayCheckIn);
                const co = toIsoDate(hotel.stayCheckOut);
                window.location.href = `booking.html?room_id=${r.id || ""}&hotel_id=${hotel.id}&check_in=${ci}&check_out=${co}&adults=${hotel.stayAdults}&rooms=${hotel.stayRooms}`;
              }}>
                Rezervasyon
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AmenitiesPanel({ hotel }) {
  return (
    <div className="panel" id="amenities">
      <h2>Tüm olanaklar</h2>
      <div className="amen-grid">
        {hotel.amenities.map(a => {
          const Ico = window[a.ico] || IconCheck;
          return (
            <div className="amen" key={a.title}>
              <div className="ico"><Ico size={20} /></div>
              <div className="ttl">{a.title}</div>
              <div className="sub">{a.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewCard({ rv }) {
  return (
    <div className="review">
      <div className="review-head">
        <div className="who">
          <div className="avatar">{initials(rv.name)}</div>
          <div>
            <div className="name">{rv.name}</div>
            <div className="when">{rv.country} · {rv.when}</div>
          </div>
        </div>
        <div className="pill">{rv.rating.toFixed(1)}/10</div>
      </div>
      <div className="review-title">{rv.title}</div>
      <div className="review-text">"{rv.text}"</div>
    </div>
  );
}

function ReviewsPanel({ hotel, onSubmitReview }) {
  const [rating, setRating] = useState(10);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const isAuthenticated = !!localStorage.getItem("bakoda_token");

  const submit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setFormError("Yorum eklemek için önce giriş yapmalısınız.");
      return;
    }
    if (!text.trim()) {
      setFormError("Yorum metni boş olamaz.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    const result = await onSubmitReview({
      rating,
      title: title.trim(),
      text: text.trim(),
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error || "Yorum gönderilemedi.");
      return;
    }
    setRating(10);
    setTitle("");
    setText("");
  };

  return (
    <div className="panel" id="reviews">
      <h2>Tüm yorumlar ({new Intl.NumberFormat("tr-TR").format(hotel.reviews)})</h2>
      <div className="reviews-summary">
        <div>
          <div className="big">{hotel.rating.toFixed(1)}/10<small>{hotel.verdict}</small></div>
        </div>
        <div className="review-bars">
          {hotel.ratingBars.map(b => (
            <div className="review-bar" key={b.label}>
              <div className="label">{b.label}</div>
              <div className="track"><div className="fill" style={{ width: (b.value/10)*100 + "%" }} /></div>
              <div className="num">{b.value.toFixed(1)}/10</div>
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={submit}
        style={{ marginBottom:24, padding:18, border:"1px solid var(--line)", borderRadius:12, background:"#fff", display:"grid", gap:10 }}
      >
        <h3 style={{ margin:0, fontSize:18, fontFamily:"var(--display)", color:"var(--primary)" }}>Yorum ekle</h3>
        {!isAuthenticated && (
          <div style={{ fontSize:13, color:"var(--muted)" }}>
            Yorum göndermek için <a href="login.html" style={{ color:"var(--primary)", textDecoration:"underline" }}>giriş yapın</a>.
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:10, alignItems:"center" }}>
          <label htmlFor="review-rating" style={{ fontSize:13, color:"var(--muted)" }}>Puan (1-10)</label>
          <input
            id="review-rating"
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            disabled={!isAuthenticated || submitting}
            style={{ height:38, border:"1px solid var(--line)", borderRadius:8, padding:"0 10px" }}
          />
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isAuthenticated || submitting}
          placeholder="Başlık (opsiyonel)"
          style={{ height:38, border:"1px solid var(--line)", borderRadius:8, padding:"0 10px" }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isAuthenticated || submitting}
          rows={4}
          placeholder="Deneyiminizi paylaşın"
          style={{ border:"1px solid var(--line)", borderRadius:8, padding:"10px", resize:"vertical", fontFamily:"var(--body)" }}
        />
        {formError && <div style={{ color:"var(--error)", fontSize:13 }}>{formError}</div>}
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button className="btn btn-primary" type="submit" disabled={!isAuthenticated || submitting}>
            {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
          </button>
        </div>
      </form>

      <div className="review-list">
        {hotel.reviewList.length > 0 ? (
          hotel.reviewList.map((rv, idx) => <ReviewCard rv={rv} key={`${rv.name}-${rv.when}-${idx}`} />)
        ) : (
          <div style={{ gridColumn:"1 / -1", background:"#fff", border:"1px solid var(--line)", borderRadius:12, padding:16, color:"var(--muted)" }}>
            Bu otel için henüz yorum bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Booking panel ─────────────────────────────────────────────────────
function BookingPanel({ hotel, stay, onStayChange, stayLoading }) {
  const { checkIn, checkOut, adults, children, rooms } = stay;
  const [pop, setPop] = useState(null);
  const panel = useRef(null);
  const t0 = today();

  useEffect(() => {
    const onDoc = (e) => { if (panel.current && !panel.current.contains(e.target)) setPop(null); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { nights, subtotal, discount, cleaning, taxes, total } = calcPricing(
    checkIn,
    checkOut,
    hotel.pricePerNight,
    rooms
  );
  const guestsTotal = adults + children;
  const noRooms = hotel.availableRoomsCount === 0;
  const bookDisabled = stayLoading || noRooms || !hotel.pricePerNight;

  return (
    <aside className="book" ref={panel}>
      <div className="from">Başlangıç</div>
      <div className="price">
        <b>{fmtTL(hotel.pricePerNight)}</b><span className="per">/ gece</span>
        {stayLoading && (
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>güncelleniyor…</span>
        )}
      </div>
      {hotel.availableRoomsCount != null && (
        <div
          style={{
            fontSize: 13,
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: hotel.availableRoomsCount > 0 ? "rgba(46,204,113,.10)" : "rgba(231,76,60,.08)",
            color: hotel.availableRoomsCount > 0 ? "#1e8e51" : "var(--error)",
            fontWeight: 500,
          }}
        >
          {hotel.availableRoomsCount > 0
            ? `${hotel.availableRoomsCount} boş oda`
            : "Seçilen tarihlerde müsait oda yok"}
        </div>
      )}
      <div className="promo"><IconTag size={14} /> 3+ gece için %{DISCOUNT_PCT} indirim</div>

      <div className="field-row">
        <div
          className={`field ${pop === "in" ? "open" : ""}`}
          role="button"
          tabIndex={0}
          aria-expanded={pop === "in"}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPop(pop === "in" ? null : "in"); } }}
          onClick={() => setPop(pop === "in" ? null : "in")}
        >
          <div className="lbl">Giriş</div>
          <div className="val">{fmtDate(checkIn)}</div>
          {pop === "in" && (
            <div className="pop">
              <MiniCal value={checkIn} min={t0} onPick={(d) => {
                const nextOut = d >= checkOut ? addDays(d, 1) : checkOut;
                onStayChange({ checkIn: d, checkOut: nextOut });
                setPop("out");
              }} />
            </div>
          )}
        </div>
        <div
          className={`field ${pop === "out" ? "open" : ""}`}
          role="button"
          tabIndex={0}
          aria-expanded={pop === "out"}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPop(pop === "out" ? null : "out"); } }}
          onClick={() => setPop(pop === "out" ? null : "out")}
        >
          <div className="lbl">Çıkış</div>
          <div className="val">{fmtDate(checkOut)}</div>
          {pop === "out" && (
            <div className="pop">
              <MiniCal value={checkOut} min={addDays(checkIn,1)} onPick={(d) => {
                onStayChange({ checkOut: d });
                setPop(null);
              }} />
            </div>
          )}
        </div>
      </div>

      <div className="field-row single">
        <div
          className={`field ${pop === "guests" ? "open" : ""}`}
          role="button"
          tabIndex={0}
          aria-expanded={pop === "guests"}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPop(pop === "guests" ? null : "guests"); } }}
          onClick={() => setPop(pop === "guests" ? null : "guests")}
        >
          <div className="lbl">Misafir</div>
          <div className="val">{guestsTotal} kişi · {rooms} oda</div>
          {pop === "guests" && (
            <div className="pop" onClick={(e)=>e.stopPropagation()}>
              <Step label="Yetişkin"  sub="13+ yaş"  val={adults}   min={1} onChange={(v) => onStayChange({ adults: v })} />
              <Step label="Çocuk"     sub="0–12 yaş" val={children} min={0} onChange={(v) => onStayChange({ children: v })} />
              <Step label="Oda"       sub=""         val={rooms}    min={1} max={6} onChange={(v) => onStayChange({ rooms: v })} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" className="btn btn-ghost" style={{ height:34, padding:"0 14px", fontSize:13 }} onClick={()=>setPop(null)}>Tamam</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="breakdown">
        <div className="row">
          <span className="label"><u>{nights} gece × {fmtTL(hotel.pricePerNight)}</u></span>
          <span>{fmtTL(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="row discount">
            <span className="label">Kampanya (-%{DISCOUNT_PCT})</span>
            <span>−{fmtTL(discount)}</span>
          </div>
        )}
        <div className="row">
          <span className="label">Temizlik ücreti</span>
          <span>{fmtTL(cleaning)}</span>
        </div>
        <div className="row">
          <span className="label">Vergi ve hizmet</span>
          <span>{fmtTL(taxes)}</span>
        </div>
        <hr />
        <div className="row total">
          <span>Toplam</span>
          <span className="num">{fmtTL(total)}</span>
        </div>
      </div>

      <button
        className="btn btn-cta cta"
        disabled={bookDisabled}
        onClick={() => {
        const roomId = hotel.rooms[0]?.id || "";
        const ci = toIsoDate(checkIn);
        const co = toIsoDate(checkOut);
        sessionStorage.setItem("bakoda_hotel_id", String(hotel.id));
        sessionStorage.setItem("bakoda_room_id", String(roomId));
        sessionStorage.setItem("bakoda_checkin", ci);
        sessionStorage.setItem("bakoda_checkout", co);
        sessionStorage.setItem("bakoda_adults", String(adults));
        sessionStorage.setItem("bakoda_rooms", String(rooms));
        window.location.href = `booking.html?room_id=${roomId}&hotel_id=${hotel.id}&check_in=${ci}&check_out=${co}&adults=${adults}&rooms=${rooms}`;
      }}>
        {noRooms ? "Müsait oda yok" : "Rezervasyonu Tamamla"} <IconArrow size={16} />
      </button>

      <div className="perks">
        <span className="perk"><IconCheck size={16} /> Ücretsiz iptal · girişe 48 saat kala</span>
        <span className="perk"><IconCheck size={16} /> Şimdi ödeme yapma · oteldeki check-in'de öde</span>
        <span className="perk"><IconCheck size={16} /> En iyi fiyat garantisi · daha düşük bulursanız iade</span>
      </div>
    </aside>
  );
}

function Step({ label, sub, val, min=0, max=12, onChange }) {
  return (
    <div className="guest-row">
      <div>
        <div style={{ fontWeight:500, fontSize:14 }}>{label}</div>
        {sub && <div style={{ color:"var(--muted)", fontSize:12 }}>{sub}</div>}
      </div>
      <div className="step">
        <button type="button" onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, val - 1)); }} disabled={val <= min}>−</button>
        <span className="count">{val}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, val + 1)); }} disabled={val >= max}>+</button>
      </div>
    </div>
  );
}

// ── API verisi → component'lerin beklediği formata dönüştür ───────────
function mapReview(rv) {
  return {
    name: rv.reviewer_name,
    country: rv.country || "",
    when: new Date(rv.created_at || Date.now()).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    rating: parseFloat(Number(rv.rating || 0).toFixed(1)),
    title: rv.title || "",
    text: rv.text,
  };
}

function resolveMinPrice(data) {
  if (typeof data.min_price === "number" && data.min_price > 0) return data.min_price;
  const roomPrices = (data.rooms || [])
    .map((rm) => Number(rm.price_per_night))
    .filter((p) => Number.isFinite(p) && p > 0);
  if (roomPrices.length) return Math.min(...roomPrices);
  return Number(data.price_per_night) || 0;
}

function transformHotel(data, stay = null) {
  const r = Number(data.rating) || 0;
  const reviewsCount = data.reviews_count || 0;
  const minPrice = resolveMinPrice(data);
  return {
    id: data.id,
    name: data.name,
    thumbnail: data.thumbnail,
    stars: data.stars,
    district: `${data.city}${data.district ? ", " + data.district : ""}`,
    rating: parseFloat(Number(r).toFixed(1)),
    verdict: reviewsCount === 0 ? "Henüz puan yok" : verdictFor(r),
    reviews: reviewsCount,
    pricePerNight: minPrice,
    stayCheckIn: stay?.checkIn || null,
    stayCheckOut: stay?.checkOut || null,
    stayAdults: stay?.adults ?? 2,
    stayRooms: stay?.rooms ?? 1,
    description: data.description || "",
    meta: [
      { lbl: "Konaklama Tipi", val: `${data.stars} Yıldız` },
      { lbl: "Giriş / Çıkış",  val: `${data.check_in_time} / ${data.check_out_time}` },
    ],
    amenities: (data.amenities || []).map(a => ({ ico: "IconWifi", title: a.title, sub: a.subtitle || "" })),
    rooms: (data.rooms || []).map(rm => ({
      id: rm.id,
      name: rm.name || rm.type,
      capacity: rm.capacity || 2,
      size: rm.size_m2 ? `${rm.size_m2} m²` : "",
      bed: rm.bed_type || "",
      view: rm.view || "",
      price: rm.price_per_night,
    })),
    ratingBars: [
      { label: "Genel Puan", value: parseFloat(Number(r).toFixed(1)) },
    ],
    reviewList: [...(data.reviews || [])]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(mapReview),
    availableRoomsCount:
      typeof data.available_rooms_count === "number" ? data.available_rooms_count : null,
  };
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const { t, lang } = useI18n(DETAIL_I18N);
  const [hotel, setHotel] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [stay, setStay] = useState(readInitialStay);
  const [stayLoading, setStayLoading] = useState(false);
  const [tab, setTab]     = useState("overview");
  const [fav, setFav]     = useState(false);
  const [lightIdx, setLightIdx] = useState(null);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);
  const hadHotelRef = useRef(false);

  const qs = new URLSearchParams(window.location.search);
  const rawHotelId = (qs.get("id") || qs.get("hotel_id") || sessionStorage.getItem("bakoda_hotel_id") || "").trim();
  const isHotelIdValid = /^[1-9]\d*$/.test(rawHotelId);
  const hotelId = isHotelIdValid ? Number(rawHotelId) : NaN;

  const stayKey = `${toIsoDate(stay.checkIn)}|${toIsoDate(stay.checkOut)}|${stay.adults + stay.children}|${stay.rooms}`;

  const onStayChange = (patch) => {
    setStay((prev) => {
      const next = { ...prev, ...patch };
      const t0 = today();
      if (next.checkIn instanceof Date) {
        const d = new Date(next.checkIn);
        d.setHours(0, 0, 0, 0);
        next.checkIn = d < t0 ? t0 : d;
      }
      if (next.checkOut instanceof Date) {
        const d = new Date(next.checkOut);
        d.setHours(0, 0, 0, 0);
        next.checkOut = d;
      }
      if (next.checkOut <= next.checkIn) {
        next.checkOut = addDays(next.checkIn, 1);
      }
      return next;
    });
  };

  const fetchHotelDetail = async (targetHotelId, stayParams, signal) => {
    const params = new URLSearchParams();
    const ci = toIsoDate(stayParams.checkIn);
    const co = toIsoDate(stayParams.checkOut);
    const guests = Math.max(1, (stayParams.adults || 0) + (stayParams.children || 0));
    if (ci) params.set("check_in", ci);
    if (co) params.set("check_out", co);
    params.set("guests", String(guests));
    const query = params.toString();
    const r = await fetch(`/api/hotels/${targetHotelId}?${query}`, { signal });
    let payload = null;
    try { payload = await r.json(); } catch {}
    if (!r.ok) {
      const detail = payload && typeof payload.detail === "string" ? payload.detail : "";
      throw new Error(detail || "Otel bilgileri alınamadı.");
    }
    return payload;
  };

  useEffect(() => {
    if (status === "ready" && hotel?.name) {
      document.title = `${hotel.name} — bakoda`;
      return;
    }
    document.title = HOTEL_DETAIL_FALLBACK_TITLE;
  }, [hotel?.name, hotelId, status]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fail = (msg) => {
      if (!isMounted) return;
      setHotel(null);
      setStatus("error");
      setLoadError(msg);
    };

    if (!isHotelIdValid) {
      fail("Geçersiz otel bağlantısı. Lütfen sonuç listesinden tekrar deneyin.");
      return () => {
        isMounted = false;
        controller.abort();
      };
    }

    if (!hadHotelRef.current) {
      setStatus("loading");
      setLoadError("");
      setHotel(null);
    } else {
      setStayLoading(true);
    }

    fetchHotelDetail(hotelId, stay, controller.signal)
      .then((data) => {
        if (!isMounted) return;
        if (!data || !data.id) throw new Error("Beklenmeyen otel verisi alındı.");
        sessionStorage.setItem("bakoda_hotel_id", String(data.id));
        sessionStorage.setItem("bakoda_checkin", toIsoDate(stay.checkIn));
        sessionStorage.setItem("bakoda_checkout", toIsoDate(stay.checkOut));
        sessionStorage.setItem("bakoda_adults", String(stay.adults));
        sessionStorage.setItem("bakoda_rooms", String(stay.rooms));
        hadHotelRef.current = true;
        setHotel(transformHotel(data, stay));
        setStatus("ready");
        setStayLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || !isMounted) return;
        setStayLoading(false);
        if (!hadHotelRef.current) {
          fail(err?.message || "Otel bilgileri alınırken bir hata oluştu.");
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [hotelId, isHotelIdValid, retryTick, stayKey]);

  useEffect(() => {
    hadHotelRef.current = false;
  }, [hotelId, retryTick]);

  useEffect(() => {
    if (!isHotelIdValid) return;
    const next = new URLSearchParams(window.location.search);
    next.set("id", String(hotelId));
    const ci = toIsoDate(stay.checkIn);
    const co = toIsoDate(stay.checkOut);
    const guests = Math.max(1, stay.adults + stay.children);
    if (ci) next.set("check_in", ci);
    if (co) next.set("check_out", co);
    next.set("guests", String(guests));
    next.set("adults", String(stay.adults));
    next.set("rooms", String(stay.rooms));
    const nextQuery = next.toString();
    const currentQuery = window.location.search.replace(/^\?/, "");
    if (nextQuery !== currentQuery) {
      const url = "hotel-detail.html" + (nextQuery ? `?${nextQuery}` : "");
      window.history.replaceState({}, "", url);
    }
    sessionStorage.setItem("bakoda_checkin", ci);
    sessionStorage.setItem("bakoda_checkout", co);
    sessionStorage.setItem("bakoda_adults", String(stay.adults));
    sessionStorage.setItem("bakoda_rooms", String(stay.rooms));
  }, [stayKey, hotelId, isHotelIdValid, stay.adults, stay.children, stay.rooms]);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const navLight = (delta) => setLightIdx(i => (i + delta + 5) % 5);

  const submitReview = async ({ rating, title, text }) => {
    const token = localStorage.getItem("bakoda_token");
    if (!token) {
      return { ok:false, error:"Yorum eklemek için giriş yapmalısınız." };
    }
    try {
      const res = await fetch(`/api/hotels/${hotel.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, title: title || null, text }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok:false, error: payload?.detail || "Yorum gönderilemedi." };
      }
      const refreshed = await fetchHotelDetail(hotel.id, stay);
      setHotel(transformHotel(refreshed, stay));
      flash("Yorumunuz kaydedildi.");
      return { ok:true };
    } catch (err) {
      return { ok:false, error: err?.message || "Bağlantı hatası. Tekrar deneyin." };
    }
  };

  if (status === "loading") return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", fontFamily:"var(--body)", color:"var(--muted)", fontSize:16 }}>
      {t("common.loading")}
    </div>
  );

  if (status === "error") return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:"24px" }}>
      <div style={{ maxWidth:560, width:"100%", textAlign:"center", background:"#fff", border:"1px solid var(--line)", borderRadius:16, padding:"28px 24px" }}>
        <div style={{ fontFamily:"var(--display)", color:"var(--primary)", fontSize:26, marginBottom:8 }}>{t("common.loadFailed")}</div>
        <p style={{ margin:"0 0 18px", color:"var(--muted)" }}>{loadError || t("common.loadingErrorDefault")}</p>
        <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
          <button className="btn btn-primary" type="button" onClick={() => setRetryTick(x => x + 1)}>
            {t("common.retry")}
          </button>
          <a className="btn btn-secondary" href="search-results.html">{t("common.backToSearch")}</a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Navbar active="nav.hotels" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <div className="crumbs-nav">
              <a href="index.html">{t("common.home")}</a>
              <span className="sep">/</span>
              <a href="search-results.html">{hotel.district ? hotel.district.split(",")[0] : t("common.hotels")}</a>
              <span className="sep">/</span>
              <span className="here">{hotel.name}</span>
            </div>
            <div className="crumbs-actions">
              <button type="button"><IconShare size={13} /> {t("common.share")}</button>
              <button type="button" className={fav ? "on":""} onClick={() => { setFav(!fav); flash(fav ? t("common.removedFav") : t("common.addedFav")); }}>
                <IconHeart size={13} filled={fav} /> {fav ? t("common.saved") : t("common.save")}
              </button>
            </div>
          </div>
        </div>

        <Gallery hotel={hotel} onOpen={(i) => setLightIdx(i)} />

        <div className="container">
          <div className="detail">
            <main>
              <header className="h-head">
                <div className="h-meta">
                  <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <span className="h-stars" aria-label={`${hotel.stars} yıldız`}>
                      {Array.from({length: hotel.stars}).map((_, i) => <IconStar key={i} size={15} filled />)}
                    </span>
                    <span className="h-badge"><IconHeart size={12} filled /> {t("common.guestFavorite")}</span>
                  </div>
                  <h1 className="h-name">{hotel.name}</h1>
                  <div className="h-loc"><IconMapPin size={14} /> {hotel.district} · <a href={`https://maps.google.com/?q=${encodeURIComponent(`${hotel.name} ${hotel.district}`)}`} target="_blank" rel="noreferrer">{t("common.showOnMap")}</a></div>
                  {hotel.availableRoomsCount != null && (
                    <div style={{ marginTop: 8, fontSize: 14, color: hotel.availableRoomsCount > 0 ? "#1e8e51" : "var(--error)", fontWeight: 500 }}>
                      {hotel.availableRoomsCount > 0
                        ? `${hotel.availableRoomsCount} boş oda (seçilen tarihler)`
                        : "Seçilen tarihlerde müsait oda yok"}
                    </div>
                  )}
                </div>
                <div className="h-score">
                  <div className="meta">
                    <div className="verdict">{hotel.verdict}</div>
                    <div className="reviews"><a href="#reviews" onClick={(e)=>{e.preventDefault(); setTab("reviews");}}>{new Intl.NumberFormat(lang === "en" ? "en-US" : "tr-TR").format(hotel.reviews)} {t("common.reviews")}</a></div>
                  </div>
                  <div className="badge">{hotel.reviews > 0 ? `${hotel.rating.toFixed(1)}/10` : "—"}</div>
                </div>
              </header>

              <div className="tabs" role="tablist">
                {["overview", "rooms", "amenities", "reviews"].map((tabId) => (
                  <button key={tabId} role="tab" aria-selected={tab === tabId}
                    className={`tab ${tab === tabId ? "active":""}`}
                    onClick={() => setTab(tabId)}>{t(`tabs.${tabId}`)}</button>
                ))}
              </div>

              {tab === "overview"  && <OverviewPanel hotel={hotel} go={setTab} />}
              {tab === "rooms"     && <RoomsPanel hotel={hotel} nights={calcPricing(stay.checkIn, stay.checkOut, hotel.pricePerNight, stay.rooms).nights} />}
              {tab === "amenities" && <AmenitiesPanel hotel={hotel} />}
              {tab === "reviews"   && <ReviewsPanel hotel={hotel} onSubmitReview={submitReview} />}
            </main>

            <BookingPanel hotel={hotel} stay={stay} onStayChange={onStayChange} stayLoading={stayLoading} />
          </div>
        </div>

        <Footer />
      </div>

      <Toast on={toast.on} msg={toast.msg} />
      {lightIdx != null && <Lightbox hotel={hotel} idx={lightIdx} onClose={() => setLightIdx(null)} onNav={navLight} />}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
