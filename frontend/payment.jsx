// Payment page — Step 2 of booking flow

const { useState, useRef, useEffect, useMemo } = React;

// Booking verisi sessionStorage'dan ve API'dan gelecek — başlangıç değerleri
const _parseDate = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };
const _t0 = new Date(); _t0.setHours(0,0,0,0);

const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
const fmtDateShort = (d) => {
  const m = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${d.getDate()} ${m[d.getMonth()]}`;
};

function calcPricing(bk) {
  const nights = bk.checkIn && bk.checkOut ? Math.round((bk.checkOut - bk.checkIn) / 86400000) : 1;
  const subtotal = bk.pricePerNight * nights;
  const discount = Math.round(subtotal * 0.08);
  const cleaning = 500;
  const taxable  = subtotal - discount + cleaning;
  const taxes    = Math.round(taxable * 0.10);
  const total    = taxable + taxes;
  return { nights, subtotal, discount, cleaning, taxes, total };
}

// ── Card brand detection ─────────────────────────────────────────────
function detectBrand(digits) {
  const d = digits.replace(/\s/g, "");
  if (/^4/.test(d))           return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mc";
  if (/^3[47]/.test(d))       return "amex";
  return null;
}

const BrandVisa = () => (
  <svg width="32" height="14" viewBox="0 0 48 16" aria-label="Visa">
    <text x="0" y="13" fontFamily="Inter, sans-serif" fontWeight="900" fontStyle="italic" fontSize="14" fill="#1A1F71" letterSpacing="-.02em">VISA</text>
  </svg>
);
const BrandMC = () => (
  <svg width="32" height="20" viewBox="0 0 32 20" aria-label="Mastercard">
    <circle cx="13" cy="10" r="7" fill="#EB001B" />
    <circle cx="19" cy="10" r="7" fill="#F79E1B" />
    <path d="M16 5.2a7 7 0 0 1 0 9.6 7 7 0 0 1 0-9.6Z" fill="#FF5F00" />
  </svg>
);
const BrandAmex = () => (
  <svg width="34" height="16" viewBox="0 0 50 18" aria-label="American Express">
    <rect width="50" height="18" rx="2" fill="#2E77BB" />
    <text x="25" y="13" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="9" fill="#fff" textAnchor="middle" letterSpacing="-.02em">AMEX</text>
  </svg>
);

// ── Stepper ───────────────────────────────────────────────────────────
function Stepper({ step }) {
  const items = [
    { n: 1, lbl: "Adım 01", ttl: "Bilgiler" },
    { n: 2, lbl: "Adım 02", ttl: "Ödeme" },
    { n: 3, lbl: "Adım 03", ttl: "Onay" },
  ];
  return (
    <div className="stepper-wrap">
      <div className="container">
        <div className="stepper">
          {items.map((it, i) => {
            const state = step === it.n ? "active" : (step > it.n ? "done" : "");
            return (
              <React.Fragment key={it.n}>
                <div className={`step ${state}`}>
                  <div className="num">{step > it.n ? <IconCheck size={16} stroke="#fff" /> : it.n}</div>
                  <div className="txt">
                    <span className="lbl">{it.lbl}</span>
                    <span className="ttl">{it.ttl}</span>
                  </div>
                </div>
                {i < items.length - 1 && <div className={`line ${step > it.n ? "done":""}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Summary({ bk }) {
  const p = calcPricing(bk);
  return (
    <aside className="summary" aria-label="Rezervasyon özeti">
      <div className="summary-head">
        <div className="summary-thumb">
          {bk.thumbnail
            ? <img src={bk.thumbnail} alt={bk.hotel} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span className="lbl">[ otel ]</span>}
        </div>
        <div className="summary-h">
          <span className="summary-stars" aria-label={`${bk.stars} yıldız`}>
            {Array.from({length: bk.stars || 5}).map((_, i) => <IconStar key={i} size={11} filled />)}
          </span>
          <div className="summary-name">{bk.hotel || "Yükleniyor…"}</div>
          <div className="summary-loc"><IconMapPin size={11} /> {bk.district}</div>
          <div className="summary-sub">{bk.roomType}</div>
        </div>
      </div>

      <div className="summary-body">
        <div className="stay-rows">
          <div className="stay-row">
            <div className="ico"><IconCalendar size={15} /></div>
            <div>
              <div className="lbl">Giriş — Çıkış</div>
              <div className="val">
                {bk.checkIn ? fmtDateShort(bk.checkIn) : "—"} → {bk.checkOut ? fmtDateShort(bk.checkOut) : "—"} · {p.nights} gece
              </div>
            </div>
          </div>
          <div className="stay-row">
            <div className="ico"><IconUsers size={15} /></div>
            <div>
              <div className="lbl">Misafir</div>
              <div className="val">{bk.adults} yetişkin · {bk.rooms} oda</div>
            </div>
          </div>
        </div>

        <div className="price-rows">
          <div className="row">
            <span className="label">{p.nights} gece × ₺{new Intl.NumberFormat("tr-TR").format(bk.pricePerNight || 0)}</span>
            <span>{fmtTL(p.subtotal)}</span>
          </div>
          <div className="row discount">
            <span className="label">Erken rezervasyon (−%8)</span>
            <span>−{fmtTL(p.discount)}</span>
          </div>
          <div className="row">
            <span className="label">Temizlik ücreti</span>
            <span>+{fmtTL(p.cleaning)}</span>
          </div>
          <div className="row">
            <span className="label">Vergi ve hizmet (%10)</span>
            <span>+{fmtTL(p.taxes)}</span>
          </div>
        </div>

        <div className="total-row">
          <div>
            <div className="sub">Toplam</div>
            <div className="lbl">{p.nights} gece · {bk.adults} kişi</div>
          </div>
          <div className="val">{fmtTL(bk.apiTotal || p.total)}</div>
        </div>
      </div>

      <div className="summary-perks">
        <span className="summary-perk"><IconCheck size={14} /> Ücretsiz iptal · girişe 48 saat kala</span>
        <span className="summary-perk"><IconCheck size={14} /> Şimdi ödeme yapma seçeneği</span>
        <span className="summary-perk"><IconShield size={14} /> 256-bit şifreli güvenli ödeme</span>
      </div>
    </aside>
  );
}

// ── Tick icon ─────────────────────────────────────────────────────────
const Tick = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.2 5.8 10 11 4.2" />
  </svg>
);

// ── Form ──────────────────────────────────────────────────────────────
function PaymentForm({ onConfirm }) {
  const [card, setCard]   = useState("");
  const [name, setName]   = useState("");
  const [exp, setExp]     = useState("");
  const [cvv, setCvv]     = useState("");
  const [saveCard, setSaveCard]   = useState(true);
  const [sameAddr, setSameAddr]   = useState(true);
  const [addr, setAddr] = useState({
    line: "", city: "", zip: "", country: "Türkiye",
  });
  const [errors, setErrors] = useState({});

  const brand = detectBrand(card);

  const fmtCard = (s) => {
    const d = s.replace(/\D/g, "").slice(0, 16);
    return d.replace(/(.{4})/g, "$1 ").trim();
  };
  const fmtExp = (s) => {
    const d = s.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0,2) + "/" + d.slice(2) : d;
  };

  const validate = () => {
    const e = {};
    if (card.replace(/\s/g,"").length < 15) e.card = "Geçerli bir kart numarası girin";
    if (!name.trim())                       e.name = "Kart üzerindeki ismi girin";
    if (!/^\d{2}\/\d{2}$/.test(exp))        e.exp  = "AA/YY";
    else {
      const [mm, yy] = exp.split("/").map(Number);
      if (mm < 1 || mm > 12) e.exp = "Geçersiz ay";
    }
    if (cvv.length < 3)                     e.cvv  = "3–4 hane";
    if (!sameAddr) {
      if (!addr.line.trim())    e.line = "Adres gerekli";
      if (!addr.city.trim())    e.city = "Şehir gerekli";
      if (!addr.zip.trim())     e.zip  = "Posta kodu gerekli";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (validate()) onConfirm({ brand, last4: card.replace(/\s/g,"").slice(-4) });
  };

  return (
    <form className="form-card fade-in" onSubmit={submit} noValidate>
      <h1>Ödeme</h1>
      <p className="lead">Rezervasyonunuz hemen onaylanır. Ücret konaklama tarihinden bir gün önce kartınızdan çekilir; o zamana kadar dilediğiniz an iptal edebilirsiniz.</p>

      {/* ── Card section ── */}
      <div className="form-section-title">Kart Bilgileri</div>
      <div className="field-grid">
        <div className="field-col full">
          <label htmlFor="card">Kart Numarası <span className="req">*</span></label>
          <div className="card-input-wrap">
            <input id="card" className={`input ${errors.card ? "err":""}`} type="text" inputMode="numeric" autoComplete="cc-number"
                   value={card} onChange={(e) => setCard(fmtCard(e.target.value))}
                   placeholder="0000 0000 0000 0000" maxLength={19} aria-describedby="card-brand" />
            <div className="brands" id="card-brand" aria-live="polite">
              <div className={`brand ${brand === "visa" ? "on" : (brand ? "off":"")}`}><BrandVisa /></div>
              <div className={`brand ${brand === "mc"   ? "on" : (brand ? "off":"")}`}><BrandMC /></div>
              <div className={`brand ${brand === "amex" ? "on" : (brand ? "off":"")}`}><BrandAmex /></div>
            </div>
          </div>
          {errors.card
            ? <span className="err-msg"><IconX size={11} /> {errors.card}</span>
            : brand && <span className="hint">{({visa:"Visa", mc:"Mastercard", amex:"American Express"})[brand]} algılandı</span>}
        </div>

        <div className="field-col full">
          <label htmlFor="cname">Kart Üzerindeki İsim <span className="req">*</span></label>
          <input id="cname" className={`input ${errors.name?"err":""}`} type="text" autoComplete="cc-name"
                 value={name} onChange={(e) => setName(e.target.value.toUpperCase())}
                 placeholder="SELIN KARACA" style={{ letterSpacing:".04em" }} />
          {errors.name && <span className="err-msg"><IconX size={11} /> {errors.name}</span>}
        </div>

        <div className="field-col">
          <label htmlFor="exp">Son Kullanma Tarihi <span className="req">*</span></label>
          <input id="exp" className={`input ${errors.exp?"err":""}`} type="text" inputMode="numeric" autoComplete="cc-exp"
                 value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} placeholder="AA/YY" maxLength={5} />
          {errors.exp && <span className="err-msg"><IconX size={11} /> {errors.exp}</span>}
        </div>
        <div className="field-col">
          <label htmlFor="cvv">CVV / CVC <span className="req">*</span></label>
          <div className="cvv-wrap">
            <input id="cvv" className={`input ${errors.cvv?"err":""}`} type="text" inputMode="numeric" autoComplete="cc-csc"
                   value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g,"").slice(0, brand==="amex" ? 4 : 3))}
                   placeholder="000" maxLength={4} />
            <span className="hint-ico" title="Kartınızın arkasındaki 3 haneli güvenlik kodu (Amex için ön yüzde 4 hane)">?</span>
          </div>
          {errors.cvv && <span className="err-msg"><IconX size={11} /> {errors.cvv}</span>}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="check">
          <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
          <span className="box"><Tick /></span>
          <span>
            <b style={{ fontWeight:500 }}>Kartımı kaydet</b>
            <div className="sub">Bir sonraki rezervasyonda otomatik doldurulur. İstediğiniz zaman silebilirsiniz.</div>
          </span>
        </label>
      </div>

      <div className="section-divider" />

      {/* ── Address section ── */}
      <div className="form-section-title">Fatura Adresi</div>
      <label className="check">
        <input type="checkbox" checked={sameAddr} onChange={(e) => setSameAddr(e.target.checked)} />
        <span className="box"><Tick /></span>
        <span>
          <b style={{ fontWeight:500 }}>Profilimdeki adresle aynı</b>
          <div className="sub">Hesabınıza kayıtlı varsayılan adresi kullanın.</div>
        </span>
      </label>

      {sameAddr && (
        <div className="saved-addr">
          <div className="ico"><IconMapPin size={15} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="who">{PROFILE_ADDR.name}</div>
            <div className="meta">{PROFILE_ADDR.street} · {PROFILE_ADDR.district} · {PROFILE_ADDR.city} {PROFILE_ADDR.zip} · {PROFILE_ADDR.country}</div>
          </div>
        </div>
      )}

      <div className={`addr-wrap ${sameAddr ? "collapsed" : ""}`}>
        <div className="field-grid">
          <div className="field-col full">
            <label htmlFor="line">Adres <span className="req">*</span></label>
            <input id="line" className={`input ${errors.line?"err":""}`} type="text" autoComplete="street-address"
                   value={addr.line} onChange={(e) => setAddr({...addr, line: e.target.value})}
                   placeholder="Cadde, mahalle, daire no" />
            {errors.line && <span className="err-msg"><IconX size={11} /> {errors.line}</span>}
          </div>
          <div className="field-col">
            <label htmlFor="city">Şehir <span className="req">*</span></label>
            <input id="city" className={`input ${errors.city?"err":""}`} type="text" autoComplete="address-level2"
                   value={addr.city} onChange={(e) => setAddr({...addr, city: e.target.value})} placeholder="İstanbul" />
            {errors.city && <span className="err-msg"><IconX size={11} /> {errors.city}</span>}
          </div>
          <div className="field-col">
            <label htmlFor="zip">Posta Kodu <span className="req">*</span></label>
            <input id="zip" className={`input ${errors.zip?"err":""}`} type="text" autoComplete="postal-code"
                   value={addr.zip} onChange={(e) => setAddr({...addr, zip: e.target.value})} placeholder="34740" />
            {errors.zip && <span className="err-msg"><IconX size={11} /> {errors.zip}</span>}
          </div>
          <div className="field-col full">
            <label htmlFor="country">Ülke</label>
            <select id="country" className="select" value={addr.country} onChange={(e) => setAddr({...addr, country: e.target.value})}>
              <option>Türkiye</option>
              <option>Almanya</option>
              <option>Birleşik Krallık</option>
              <option>Fransa</option>
              <option>İtalya</option>
              <option>Amerika Birleşik Devletleri</option>
            </select>
          </div>
        </div>
      </div>

      <div className="submit-row">
        <a href="booking.html" className="back btn btn-ghost" style={{ height: "auto", padding: "6px 8px" }}>← Bilgilere dön</a>
        <button type="submit" className="btn btn-cta next">Rezervasyonu Tamamla <IconArrow size={16} /></button>
      </div>

      <div className="trust-strip">
        <IconShield size={14} /> 256-bit SSL şifreli güvenli ödeme · PCI DSS uyumlu işlem
      </div>
    </form>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);
  const [bk, setBk] = useState({
    hotel: "", district: "", roomType: "", stars: 5, thumbnail: null,
    checkIn: null, checkOut: null, adults: 2, rooms: 1,
    pricePerNight: 0, apiTotal: 0,
  });

  useEffect(() => {
    const bookingId = sessionStorage.getItem("bakoda_booking_id");
    const hotelId   = sessionStorage.getItem("bakoda_hotel_id");
    const roomId    = parseInt(sessionStorage.getItem("bakoda_room_id") || "0");

    if (bookingId) {
      fetch(`/api/bookings/${bookingId}`)
        .then(r => r.json())
        .then(d => {
          if (d.id) setBk(prev => ({
            ...prev,
            checkIn:  _parseDate(d.check_in),
            checkOut: _parseDate(d.check_out),
            adults: d.guests || 2,
            rooms: d.rooms_count || 1,
            apiTotal: d.total_price || 0,
          }));
        }).catch(() => {});
    }

    if (hotelId) {
      fetch(`/api/hotels/${hotelId}`)
        .then(r => r.json())
        .then(d => {
          if (!d.id) return;
          const room = (d.rooms || []).find(r => r.id === roomId) || d.rooms?.[0];
          setBk(prev => ({
            ...prev,
            hotel:        d.name,
            district:     `${d.city}${d.district ? ", " + d.district : ""}`,
            stars:        d.stars,
            thumbnail:    d.thumbnail || null,
            roomType:     room ? (room.name || room.type) : "",
            pricePerNight: room ? room.price_per_night : (d.price_per_night || 0),
          }));
        }).catch(() => {});
    }
  }, []);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const confirm = async (info) => {
    flash(`Ödeme işleniyor · ${info.brand?.toUpperCase() || "Kart"} •••• ${info.last4}`);
    const bookingId = sessionStorage.getItem("bakoda_booking_id");
    try {
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId ? Number(bookingId) : null, payment_method: "card" }),
      });
    } catch {}
    setTimeout(() => { window.location.href = "confirmation.html"; }, 900);
  };

  return (
    <>
      <Navbar active="Oteller" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <a href="index.html">Anasayfa</a>
            <span className="sep">/</span>
            <a href={"hotel-detail.html" + (sessionStorage.getItem("bakoda_hotel_id") ? "?id=" + sessionStorage.getItem("bakoda_hotel_id") : "")}>
              {bk.hotel || "Otel"}
            </a>
            <span className="sep">/</span>
            <a href="booking.html">Bilgiler</a>
            <span className="sep">/</span>
            <span className="here">Ödeme</span>
          </div>
        </div>

        <Stepper step={2} />

        <div className="container">
          <div className="book-layout">
            <PaymentForm onConfirm={confirm} />
            <Summary bk={bk} />
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
