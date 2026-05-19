// Hotel detail — Çırağan Palace Suites

const { useState, useEffect, useRef } = React;

// ── Hotel data ────────────────────────────────────────────────────────
const HOTEL = {
  name: "Çırağan Palace Suites",
  stars: 5,
  district: "İstanbul, Beşiktaş",
  rating: 9.4,
  verdict: "Mükemmel",
  reviews: 1284,
  pricePerNight: 8400,
  cleaning: 500,
  description:
    "Boğaz'ın hemen kıyısında, Yıldız Sarayı'na komşu 19. yüzyıl yalısında konumlanan bir butik konaklama. Beşiktaş'ın hareketli rıhtımına yürüme mesafesinde, sessiz bir bahçe ve kişisel butler hizmetiyle ünlü 24 süitten oluşan bir koleksiyon. Mimar Sarkis Balyan'ın orijinal taş işçiliği titizlikle restore edildi.",
  meta: [
    { lbl: "Konaklama Tipi", val: "Butik · 5 Yıldız" },
    { lbl: "Toplam Süit",    val: "24 Süit" },
    { lbl: "Giriş / Çıkış",  val: "15:00 / 12:00" },
  ],
  amenities: [
    { ico: "IconPool",       title: "Açık & Kapalı Havuz",   sub: "Boğaz manzaralı" },
    { ico: "IconSpa",        title: "Spa & Hammam",          sub: "Geleneksel ritüel" },
    { ico: "IconBreakfast",  title: "Kahvaltı Dahil",        sub: "Yerli & kıta usulü" },
    { ico: "IconRestaurant", title: "Restoran",              sub: "İki Michelin önerisi" },
    { ico: "IconParking",    title: "Vale Otopark",          sub: "24 saat hizmet" },
    { ico: "IconBar",        title: "Lobi Bar & Kütüphane",  sub: "Curated şarap listesi" },
    { ico: "IconBell",       title: "7/24 Resepsiyon",       sub: "Çok dilli ekip" },
    { ico: "IconHeadset",    title: "Concierge",             sub: "Şehir rehberliği" },
  ],
  rooms: [
    { name: "Deluxe Süit, Park Manzaralı", size: "48 m²", bed: "1 King yatak", view: "Park manzarası", price: 8400, ph: "ph-room-1" },
    { name: "Premier Süit, Boğaz Manzaralı", size: "62 m²", bed: "1 King yatak", view: "Boğaz manzarası", price: 12200, ph: "ph-room-2" },
    { name: "Pasha Suite, Kişisel Butler",   size: "98 m²", bed: "2 oda · King", view: "Panoramik Boğaz", price: 24800, ph: "ph-room-3" },
  ],
  ratingBars: [
    { label: "Personel",   value: 9.6 },
    { label: "Temizlik",   value: 9.5 },
    { label: "Konfor",     value: 9.4 },
    { label: "Kahvaltı",   value: 9.7 },
    { label: "Konum",      value: 9.8 },
    { label: "Fiyat / Performans", value: 8.6 },
  ],
  reviewList: [
    {
      name: "Selin K.", country: "Türkiye", when: "Mart 2026", rating: 9.8,
      title: "Boğaz manzaralı kahvaltı unutulmaz",
      text: "Üç gece kaldık ve baştan sona kusursuz bir deneyimdi. Süitin tarihi detayları, havuzun manzarası ve özellikle kahvaltıdaki yerli peynir seçkisi — hepsi titizlikle kürate edilmiş. Personel hem yardımsever hem son derece zarif.",
    },
    {
      name: "Marc D.", country: "Fransa", when: "Şubat 2026", rating: 9.2,
      title: "Heritage meets modern comfort",
      text: "Beşiktaş'a yürüme mesafesinde sessiz bir vaha. Akşam concierge'in önerdiği yerel meyhane mükemmeldi. Süitin akustiği şehir gürültüsünü tamamen yutuyor. Restorasyon kalitesi ayrı bir başarı.",
    },
    {
      name: "Aylin B.", country: "İstanbul", when: "Ocak 2026", rating: 9.5,
      title: "Şehir içinde gerçek bir kaçış",
      text: "Doğum günümü kutlamak için seçtim, hiçbir konuda hayal kırıklığına uğratmadılar. Hamam ritüeli özellikle önerilir.",
    },
    {
      name: "James P.", country: "Birleşik Krallık", when: "Ocak 2026", rating: 9.0,
      title: "Spotless and graceful",
      text: "The service is genuinely warm without being intrusive. The pool deck at sunset is a moment I'll remember. Breakfast spread is enormous.",
    },
  ],
};

const GALLERY = [
  { ph: "ph-g1", label: "[ ana cephe · gün batımı ]" },
  { ph: "ph-g2", label: "[ havuz · boğaz manzarası ]" },
  { ph: "ph-g3", label: "[ deluxe süit · iç mekan ]" },
  { ph: "ph-g4", label: "[ hamam · mermer detay ]" },
  { ph: "ph-g5", label: "[ kahvaltı terası ]" },
];

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
        <button onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()-1, 1))}><IconChevron size={14} style={{transform:"rotate(90deg)"}} /></button>
        <div className="title">{months[view.getMonth()]} {view.getFullYear()}</div>
        <button onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()+1, 1))}><IconChevron size={14} style={{transform:"rotate(-90deg)"}} /></button>
      </div>
      <div className="cal-wk">{weekdays.map(w => <div key={w}>{w}</div>)}</div>
      <div className="cal-days">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const disabled = min && d < min;
          const sel = d.toDateString() === value.toDateString();
          return (
            <button key={i} className={`cal-day ${sel?"sel":""}`} disabled={disabled} onClick={()=>onPick(d)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────
function Gallery({ onOpen }) {
  return (
    <div className="container gallery">
      <div className="gallery-grid">
        {GALLERY.map((g, i) => (
          <div key={i} className={`g ${i===0 ? "main":""}`} onClick={() => onOpen(i)}>
            <div className={`ph ${g.ph}`} />
            <div className="ph-label">{g.label}</div>
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

function Lightbox({ idx, onClose, onNav }) {
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
        <div className={`ph ${GALLERY[idx].ph}`} />
        <button className="close" onClick={onClose}><IconX size={16} /></button>
        <button className="nav-btn prev" onClick={()=>onNav(-1)}><IconChevron size={18} style={{transform:"rotate(90deg)"}} /></button>
        <button className="nav-btn next" onClick={()=>onNav(+1)}><IconChevron size={18} style={{transform:"rotate(-90deg)"}} /></button>
        <div className="counter">{idx+1} / {GALLERY.length}</div>
      </div>
    </div>
  );
}

// ── Tabs / panels ─────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Genel Bakış" },
  { id: "rooms",      label: "Odalar" },
  { id: "amenities",  label: "Olanaklar" },
  { id: "reviews",    label: "Yorumlar" },
];

function OverviewPanel({ go }) {
  return (
    <>
      <div className="panel" id="overview">
        <h2>Bu konaklama hakkında</h2>
        <p>{HOTEL.description}</p>
        <div className="desc-meta">
          {HOTEL.meta.map(m => (
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
          {HOTEL.amenities.slice(0, 8).map(a => {
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
            <div className="big">{HOTEL.rating.toFixed(1)}<small>{HOTEL.verdict} · {new Intl.NumberFormat("tr-TR").format(HOTEL.reviews)} yorum</small></div>
          </div>
          <div className="review-bars">
            {HOTEL.ratingBars.map(b => (
              <div className="review-bar" key={b.label}>
                <div className="label">{b.label}</div>
                <div className="track"><div className="fill" style={{ width: (b.value/10)*100 + "%" }} /></div>
                <div className="num">{b.value.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="review-list">
          {HOTEL.reviewList.slice(0, 2).map(rv => <ReviewCard rv={rv} key={rv.name} />)}
        </div>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => go("reviews")}>Tüm {new Intl.NumberFormat("tr-TR").format(HOTEL.reviews)} yorumu gör <IconArrow size={14} /></button>
        </div>
      </div>
    </>
  );
}

function RoomsPanel({ onBook }) {
  return (
    <div className="panel" id="rooms">
      <h2>Süit & oda seçenekleri</h2>
      <p className="muted" style={{ fontSize:14, marginBottom: 20 }}>Tüm fiyatlar 3 gece konaklama için, kahvaltı dahil.</p>
      <div className="rooms">
        {HOTEL.rooms.map(r => (
          <article className="room" key={r.name}>
            <div className="img"><div className={`ph ${r.ph}`} /></div>
            <div className="body">
              <h3>{r.name}</h3>
              <div className="feats">
                <span><IconUsers size={13} /> 2 kişi</span>
                <span>· {r.size}</span>
                <span>· {r.bed}</span>
                <span>· {r.view}</span>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, padding:"3px 9px", borderRadius:999, background:"rgba(46,204,113,.10)", color:"#1e8e51", fontWeight:500 }}>✓ Ücretsiz iptal</span>
                <span style={{ fontSize:11, padding:"3px 9px", borderRadius:999, background:"rgba(215,168,110,.15)", color:"var(--accent-dark)", fontWeight:500 }}>✓ Kahvaltı dahil</span>
              </div>
            </div>
            <div className="side">
              <div className="price">{fmtTL(r.price)}</div>
              <div className="per">/ gece</div>
              <button className="btn btn-cta" style={{ marginTop:8, height:38, padding:"0 16px", fontSize:13 }} onClick={onBook}>
                Rezervasyon
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AmenitiesPanel() {
  return (
    <div className="panel" id="amenities">
      <h2>Tüm olanaklar</h2>
      <div className="amen-grid">
        {HOTEL.amenities.map(a => {
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
        <div className="pill">{rv.rating.toFixed(1)}</div>
      </div>
      <div className="review-title">{rv.title}</div>
      <div className="review-text">"{rv.text}"</div>
    </div>
  );
}

function ReviewsPanel() {
  return (
    <div className="panel" id="reviews">
      <h2>Tüm yorumlar ({new Intl.NumberFormat("tr-TR").format(HOTEL.reviews)})</h2>
      <div className="reviews-summary">
        <div>
          <div className="big">{HOTEL.rating.toFixed(1)}<small>{HOTEL.verdict}</small></div>
        </div>
        <div className="review-bars">
          {HOTEL.ratingBars.map(b => (
            <div className="review-bar" key={b.label}>
              <div className="label">{b.label}</div>
              <div className="track"><div className="fill" style={{ width: (b.value/10)*100 + "%" }} /></div>
              <div className="num">{b.value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="review-list">
        {HOTEL.reviewList.map(rv => <ReviewCard rv={rv} key={rv.name} />)}
      </div>
    </div>
  );
}

// ── Booking panel ─────────────────────────────────────────────────────
function BookingPanel({ onBook }) {
  const t0 = today();
  const [checkIn, setCheckIn]   = useState(addDays(t0, 7));
  const [checkOut, setCheckOut] = useState(addDays(t0, 10));
  const [adults, setAdults]     = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms]       = useState(1);
  const [pop, setPop]           = useState(null); // "in" | "out" | "guests"
  const panel = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (panel.current && !panel.current.contains(e.target)) setPop(null); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));
  const subtotal = HOTEL.pricePerNight * nights;
  const discount = nights >= 3 ? Math.round(subtotal * 0.08) : 0;
  const cleaning = HOTEL.cleaning;
  const taxes = Math.round((subtotal - discount) * 0.10);
  const total = subtotal - discount + cleaning + taxes;

  return (
    <aside className="book" ref={panel}>
      <div className="from">Başlangıç</div>
      <div className="price"><b>{fmtTL(HOTEL.pricePerNight)}</b><span className="per">/ gece</span></div>
      <div className="promo"><IconTag size={14} /> 3+ gece için %8 indirim · Mart kampanyası</div>

      <div className="field-row">
        <div className="field" onClick={() => setPop(pop==="in" ? null : "in")}>
          <div className="lbl">Giriş</div>
          <div className="val">{fmtDate(checkIn)}</div>
          {pop === "in" && (
            <div className="pop">
              <MiniCal value={checkIn} min={t0} onPick={(d) => {
                setCheckIn(d); if (d >= checkOut) setCheckOut(addDays(d, 1)); setPop("out");
              }} />
            </div>
          )}
        </div>
        <div className="field" onClick={() => setPop(pop==="out" ? null : "out")}>
          <div className="lbl">Çıkış</div>
          <div className="val">{fmtDate(checkOut)}</div>
          {pop === "out" && (
            <div className="pop">
              <MiniCal value={checkOut} min={addDays(checkIn,1)} onPick={(d) => { setCheckOut(d); setPop(null); }} />
            </div>
          )}
        </div>
      </div>

      <div className="field-row single">
        <div className="field" onClick={() => setPop(pop==="guests" ? null : "guests")}>
          <div className="lbl">Misafir</div>
          <div className="val">{adults + children} kişi · {rooms} oda</div>
          {pop === "guests" && (
            <div className="pop" onClick={(e)=>e.stopPropagation()}>
              <Step label="Yetişkin"  sub="13+ yaş"  val={adults}   min={1} onChange={setAdults} />
              <Step label="Çocuk"     sub="0–12 yaş" val={children} min={0} onChange={setChildren} />
              <Step label="Oda"       sub=""         val={rooms}    min={1} max={6} onChange={setRooms} />
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                <button className="btn btn-ghost" style={{ height:34, padding:"0 14px", fontSize:13 }} onClick={()=>setPop(null)}>Tamam</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="breakdown">
        <div className="row">
          <span className="label"><u>{nights} gece × {fmtTL(HOTEL.pricePerNight)}</u></span>
          <span>{fmtTL(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="row discount">
            <span className="label">Mart kampanyası (-%8)</span>
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

      <button className="btn btn-cta cta" onClick={() => { window.location.href = "booking.html"; }}>
        Rezervasyonu Tamamla <IconArrow size={16} />
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
        <button onClick={() => onChange(Math.max(min, val-1))} disabled={val <= min}>−</button>
        <span className="count">{val}</span>
        <button onClick={() => onChange(Math.min(max, val+1))} disabled={val >= max}>+</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState("overview");
  const [fav, setFav] = useState(false);
  const [lightIdx, setLightIdx] = useState(null);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const navLight = (delta) => setLightIdx(i => (i + delta + GALLERY.length) % GALLERY.length);

  return (
    <>
      <Navbar active="Oteller" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

      <div className="page">
        {/* Crumbs / favorite + share */}
        <div className="crumbs">
          <div className="container crumbs-inner">
            <div className="crumbs-nav">
              <a href="index.html">Anasayfa</a>
              <span className="sep">/</span>
              <a href="search-results.html">İstanbul</a>
              <span className="sep">/</span>
              <span className="here">Çırağan Palace Suites</span>
            </div>
            <div className="crumbs-actions">
              <button type="button"><IconShare size={13} /> Paylaş</button>
              <button type="button" className={fav ? "on":""} onClick={() => { setFav(!fav); flash(fav ? "Favorilerden çıkarıldı" : "Favorilere eklendi"); }}>
                <IconHeart size={13} filled={fav} /> {fav ? "Kaydedildi" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>

        <Gallery onOpen={(i) => setLightIdx(i)} />

        <div className="container">
          <div className="detail">
            <main>
              {/* Header */}
              <header className="h-head">
                <div className="h-meta">
                  <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <span className="h-stars" aria-label={`${HOTEL.stars} yıldız`}>
                      {Array.from({length: HOTEL.stars}).map((_, i) => <IconStar key={i} size={15} filled />)}
                    </span>
                    <span className="h-badge"><IconHeart size={12} filled /> Misafir Favorisi</span>
                  </div>
                  <h1 className="h-name">{HOTEL.name}</h1>
                  <div className="h-loc"><IconMapPin size={14} /> {HOTEL.district} · <a href="#">Haritada göster</a></div>
                </div>
                <div className="h-score">
                  <div className="meta">
                    <div className="verdict">{HOTEL.verdict}</div>
                    <div className="reviews"><a href="#reviews" onClick={(e)=>{e.preventDefault(); setTab("reviews");}}>{new Intl.NumberFormat("tr-TR").format(HOTEL.reviews)} değerlendirme</a></div>
                  </div>
                  <div className="badge">{HOTEL.rating.toFixed(1)}</div>
                </div>
              </header>

              {/* Tabs */}
              <div className="tabs" role="tablist">
                {TABS.map(t => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id}
                    className={`tab ${tab === t.id ? "active":""}`}
                    onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>

              {/* Panels */}
              {tab === "overview"  && <OverviewPanel go={setTab} />}
              {tab === "rooms"     && <RoomsPanel onBook={() => { window.location.href = "booking.html"; }} />}
              {tab === "amenities" && <AmenitiesPanel />}
              {tab === "reviews"   && <ReviewsPanel />}
            </main>

            <BookingPanel onBook={(total) => flash(`Rezervasyon başlatıldı · ${fmtTL(total)}`)} />
          </div>
        </div>

        <Footer />
      </div>

      <Toast on={toast.on} msg={toast.msg} />
      {lightIdx != null && <Lightbox idx={lightIdx} onClose={() => setLightIdx(null)} onNav={navLight} />}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
