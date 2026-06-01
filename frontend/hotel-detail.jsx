// Hotel detail — Çırağan Palace Suites

const { useState, useEffect, useRef } = React;

// API verisi gelene kadar gösterilecek skeleton / placeholder
const LOADING_HOTEL = null;

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
// Otel ID'sine göre tutarlı 5 görsel URL üretir (picsum.photos seed-based)
function hotelImages(hotelId) {
  const sizes = ["800/600", "800/600", "600/600", "600/600", "600/600"];
  return sizes.map((sz, i) => `https://picsum.photos/seed/hotel_${hotelId}_${i}/${sz}`);
}

function Gallery({ hotel, onOpen }) {
  const imgs = hotelImages(hotel.id);
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
  const imgs = hotelImages(hotel.id);
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
const TABS = [
  { id: "overview",   label: "Genel Bakış" },
  { id: "rooms",      label: "Odalar" },
  { id: "amenities",  label: "Olanaklar" },
  { id: "reviews",    label: "Yorumlar" },
];

function OverviewPanel({ hotel, go }) {
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
            <div className="big">{hotel.rating.toFixed(1)}<small>{hotel.verdict} · {new Intl.NumberFormat("tr-TR").format(hotel.reviews)} yorum</small></div>
          </div>
          <div className="review-bars">
            {hotel.ratingBars.map(b => (
              <div className="review-bar" key={b.label}>
                <div className="label">{b.label}</div>
                <div className="track"><div className="fill" style={{ width: (b.value/10)*100 + "%" }} /></div>
                <div className="num">{b.value.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="review-list">
          {hotel.reviewList.slice(0, 2).map(rv => <ReviewCard rv={rv} key={rv.name} />)}
        </div>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => go("reviews")}>Tüm {new Intl.NumberFormat("tr-TR").format(hotel.reviews)} yorumu gör <IconArrow size={14} /></button>
        </div>
      </div>
    </>
  );
}

function RoomsPanel({ hotel }) {
  return (
    <div className="panel" id="rooms">
      <h2>Süit & oda seçenekleri</h2>
      <p className="muted" style={{ fontSize:14, marginBottom: 20 }}>Tüm fiyatlar 3 gece konaklama için, kahvaltı dahil.</p>
      <div className="rooms">
        {hotel.rooms.map(r => (
          <article className="room" key={r.name || r.id}>
            <div className="img">
              <img src={`https://picsum.photos/seed/room_${hotel.id}_${r.id}/400/300`} alt={r.name}
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
              <button className="btn btn-cta" style={{ marginTop:8, height:38, padding:"0 16px", fontSize:13 }} onClick={() => {
                const t0 = new Date(); t0.setHours(0,0,0,0);
                const ci = new Date(t0); ci.setDate(ci.getDate()+7);
                const co = new Date(t0); co.setDate(co.getDate()+10);
                window.location.href = `booking.html?room_id=${r.id || ""}&hotel_id=${hotel.id}&check_in=${ci.toISOString().split("T")[0]}&check_out=${co.toISOString().split("T")[0]}&adults=2&rooms=1`;
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
        <div className="pill">{rv.rating.toFixed(1)}</div>
      </div>
      <div className="review-title">{rv.title}</div>
      <div className="review-text">"{rv.text}"</div>
    </div>
  );
}

function ReviewsPanel({ hotel }) {
  return (
    <div className="panel" id="reviews">
      <h2>Tüm yorumlar ({new Intl.NumberFormat("tr-TR").format(hotel.reviews)})</h2>
      <div className="reviews-summary">
        <div>
          <div className="big">{hotel.rating.toFixed(1)}<small>{hotel.verdict}</small></div>
        </div>
        <div className="review-bars">
          {hotel.ratingBars.map(b => (
            <div className="review-bar" key={b.label}>
              <div className="label">{b.label}</div>
              <div className="track"><div className="fill" style={{ width: (b.value/10)*100 + "%" }} /></div>
              <div className="num">{b.value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="review-list">
        {hotel.reviewList.map(rv => <ReviewCard rv={rv} key={rv.name} />)}
      </div>
    </div>
  );
}

// ── Booking panel ─────────────────────────────────────────────────────
function BookingPanel({ hotel, onBook }) {
  const t0 = today();
  const [checkIn, setCheckIn]   = useState(addDays(t0, 7));
  const [checkOut, setCheckOut] = useState(addDays(t0, 10));
  const [adults, setAdults]     = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms]       = useState(1);
  const [pop, setPop]           = useState(null);
  const panel = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (panel.current && !panel.current.contains(e.target)) setPop(null); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));
  const subtotal = hotel.pricePerNight * nights;
  const discount = nights >= 3 ? Math.round(subtotal * 0.08) : 0;
  const cleaning = 500;
  const taxes = Math.round((subtotal - discount) * 0.10);
  const total = subtotal - discount + cleaning + taxes;

  return (
    <aside className="book" ref={panel}>
      <div className="from">Başlangıç</div>
      <div className="price"><b>{fmtTL(hotel.pricePerNight)}</b><span className="per">/ gece</span></div>
      <div className="promo"><IconTag size={14} /> 3+ gece için %8 indirim</div>

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
          <span className="label"><u>{nights} gece × {fmtTL(hotel.pricePerNight)}</u></span>
          <span>{fmtTL(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="row discount">
            <span className="label">Kampanya (-%8)</span>
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

      <button className="btn btn-cta cta" onClick={() => {
        const roomId = hotel.rooms[0]?.id || "";
        const ci = checkIn.toISOString().split("T")[0];
        const co = checkOut.toISOString().split("T")[0];
        window.location.href = `booking.html?room_id=${roomId}&hotel_id=${hotel.id}&check_in=${ci}&check_out=${co}&adults=${adults}&rooms=${rooms}`;
      }}>
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

// ── API verisi → component'lerin beklediği formata dönüştür ───────────
function transformHotel(data) {
  const r = data.rating || 0;
  return {
    id: data.id,
    name: data.name,
    stars: data.stars,
    district: `${data.city}${data.district ? ", " + data.district : ""}`,
    rating: parseFloat((r * 2).toFixed(1)),
    verdict: r >= 4.5 ? "Mükemmel" : r >= 4.0 ? "Çok İyi" : "İyi",
    reviews: data.reviews_count,
    pricePerNight: data.price_per_night,
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
      { label: "Personel",   value: parseFloat((r * 2 * 0.98).toFixed(1)) },
      { label: "Temizlik",   value: parseFloat((r * 2 * 0.97).toFixed(1)) },
      { label: "Konfor",     value: parseFloat((r * 2).toFixed(1)) },
      { label: "Konum",      value: parseFloat((r * 2 * 1.01).toFixed(1)) },
    ],
    reviewList: (data.reviews || []).map(rv => ({
      name: rv.reviewer_name,
      country: rv.country || "",
      when: new Date(rv.created_at || Date.now()).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      rating: parseFloat((rv.rating * 2).toFixed(1)),
      title: rv.title || "",
      text: rv.text,
    })),
  };
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [hotel, setHotel] = useState(null);   // null = yükleniyor
  const [tab, setTab]     = useState("overview");
  const [fav, setFav]     = useState(false);
  const [lightIdx, setLightIdx] = useState(null);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const hotelId = new URLSearchParams(window.location.search).get("id") || "1";

  useEffect(() => {
    setHotel(null);
    fetch(`/api/hotels/${hotelId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.id) return;
        sessionStorage.setItem("bakoda_hotel_id", data.id);
        setHotel(transformHotel(data));
      })
      .catch(() => {});
  }, [hotelId]);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const navLight = (delta) => setLightIdx(i => (i + delta + 5) % 5);

  if (!hotel) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", fontFamily:"var(--body)", color:"var(--muted)", fontSize:16 }}>
      Otel bilgileri yükleniyor…
    </div>
  );

  return (
    <>
      <Navbar active="Oteller" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <div className="crumbs-nav">
              <a href="index.html">Anasayfa</a>
              <span className="sep">/</span>
              <a href="search-results.html">{hotel.district ? hotel.district.split(",")[0] : "Oteller"}</a>
              <span className="sep">/</span>
              <span className="here">{hotel.name}</span>
            </div>
            <div className="crumbs-actions">
              <button type="button"><IconShare size={13} /> Paylaş</button>
              <button type="button" className={fav ? "on":""} onClick={() => { setFav(!fav); flash(fav ? "Favorilerden çıkarıldı" : "Favorilere eklendi"); }}>
                <IconHeart size={13} filled={fav} /> {fav ? "Kaydedildi" : "Kaydet"}
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
                    <span className="h-badge"><IconHeart size={12} filled /> Misafir Favorisi</span>
                  </div>
                  <h1 className="h-name">{hotel.name}</h1>
                  <div className="h-loc"><IconMapPin size={14} /> {hotel.district} · <a href="#">Haritada göster</a></div>
                </div>
                <div className="h-score">
                  <div className="meta">
                    <div className="verdict">{hotel.verdict}</div>
                    <div className="reviews"><a href="#reviews" onClick={(e)=>{e.preventDefault(); setTab("reviews");}}>{new Intl.NumberFormat("tr-TR").format(hotel.reviews)} değerlendirme</a></div>
                  </div>
                  <div className="badge">{hotel.rating.toFixed(1)}</div>
                </div>
              </header>

              <div className="tabs" role="tablist">
                {TABS.map(t => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id}
                    className={`tab ${tab === t.id ? "active":""}`}
                    onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>

              {tab === "overview"  && <OverviewPanel hotel={hotel} go={setTab} />}
              {tab === "rooms"     && <RoomsPanel hotel={hotel} />}
              {tab === "amenities" && <AmenitiesPanel hotel={hotel} />}
              {tab === "reviews"   && <ReviewsPanel hotel={hotel} />}
            </main>

            <BookingPanel hotel={hotel} onBook={(total) => flash(`Rezervasyon başlatıldı · ${fmtTL(total)}`)} />
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
