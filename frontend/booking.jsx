// Booking flow — 3 step (Bilgiler → Ödeme → Onay)

const { useState, useRef, useEffect, useMemo } = React;

const BOOKING = {
  hotel: "Çırağan Palace Suites",
  district: "İstanbul, Beşiktaş",
  stars: 5,
  thumb: "[ otel ]",
  checkIn: new Date(2026, 4, 26),   // 26 May 2026
  checkOut: new Date(2026, 4, 29),  // 29 May 2026
  adults: 2,
  rooms: 1,
  roomType: "Deluxe Süit, Park Manzaralı",
  pricePerNight: 8400,
  discountPct: 8,
  cleaning: 500,
};

const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
const fmtTLcompact = (n) => "₺" + new Intl.NumberFormat("tr-TR").format(n);
const fmtDate = (d) => {
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtDateShort = (d) => {
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

// ── Pricing math ──────────────────────────────────────────────────────
function usePricing() {
  return useMemo(() => {
    const nights = Math.round((BOOKING.checkOut - BOOKING.checkIn) / 86400000);
    const subtotal = BOOKING.pricePerNight * nights;
    const discount = Math.round(subtotal * BOOKING.discountPct / 100);
    const taxable  = subtotal - discount + BOOKING.cleaning;
    const taxes    = Math.round(taxable * 0.10);
    const total    = taxable + taxes;
    return { nights, subtotal, discount, cleaning: BOOKING.cleaning, taxes, total };  }, []);
}

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

// ── Summary card (right sticky) ───────────────────────────────────────
function Summary() {
  const p = usePricing();
  return (
    <aside className="summary" aria-label="Rezervasyon özeti">
      <div className="summary-head">
        <div className="summary-thumb">
          <div className="ph" />
          <div className="ph-label">{BOOKING.thumb}</div>
        </div>
        <div className="summary-h">
          <span className="summary-stars" aria-label={`${BOOKING.stars} yıldız`}>
            {Array.from({length: BOOKING.stars}).map((_, i) => <IconStar key={i} size={11} filled />)}
          </span>
          <div className="summary-name">{BOOKING.hotel}</div>
          <div className="summary-loc"><IconMapPin size={11} /> {BOOKING.district}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily:"var(--mono)", letterSpacing:".04em" }}>
            {BOOKING.roomType.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="summary-body">
        <div className="stay-rows">
          <div className="stay-row">
            <div className="ico"><IconCalendar size={15} /></div>
            <div>
              <div className="lbl">Giriş — Çıkış</div>
              <div className="val">{fmtDateShort(BOOKING.checkIn)} → {fmtDateShort(BOOKING.checkOut)} · {p.nights} gece</div>
            </div>
            <button className="change">değiştir</button>
          </div>
          <div className="stay-row">
            <div className="ico"><IconUsers size={15} /></div>
            <div>
              <div className="lbl">Misafir</div>
              <div className="val">{BOOKING.adults} yetişkin · {BOOKING.rooms} oda</div>
            </div>
            <button className="change">değiştir</button>
          </div>
        </div>

        <div className="price-rows">
          <div className="row">
            <span className="label">{p.nights} gece × {fmtTLcompact(BOOKING.pricePerNight)}</span>
            <span>{fmtTL(p.subtotal)}</span>
          </div>
          <div className="row discount">
            <span className="label">Mart kampanyası (−%{BOOKING.discountPct})</span>
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
            <div className="lbl">3 gece · 2 kişi</div>
          </div>
          <div className="val">{fmtTL(p.total)}</div>
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

// ── Step 1: Guest info form ───────────────────────────────────────────
const ARRIVAL_TIMES = [
  "Belirsiz",
  "12:00 — 14:00",
  "14:00 — 16:00",
  "16:00 — 18:00",
  "18:00 — 20:00",
  "20:00 — 22:00",
  "22:00 sonrası",
];
const COUNTRY_CODES = [
  { code: "+90",  flag: "🇹🇷" },
  { code: "+1",   flag: "🇺🇸" },
  { code: "+44",  flag: "🇬🇧" },
  { code: "+33",  flag: "🇫🇷" },
  { code: "+49",  flag: "🇩🇪" },
];

function GuestStep({ form, setForm, onNext }) {
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm({ ...form, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Ad gereklidir";
    if (!form.lastName.trim())  e.lastName  = "Soyad gereklidir";
    if (!form.email.trim())     e.email     = "E-posta gereklidir";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Geçerli bir e-posta girin";
    if (!form.phone.trim()) e.phone = "Telefon gereklidir";
    else if (!/^[0-9 ]{6,}$/.test(form.phone)) e.phone = "Geçerli bir numara girin";
    if (!form.terms) e.terms = "Devam etmek için kabul edin";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (validate()) onNext();
  };

  return (
    <form className="form-card fade-in" onSubmit={submit} noValidate>
      <h1>Misafir Bilgileri</h1>
      <p className="lead">Rezervasyon onayı bu bilgilere gönderilecek. Pasaport veya kimlik bilgileri otelde check-in sırasında alınır.</p>

      <div className="form-section-title">Ad ve İletişim</div>
      <div className="field-grid">
        <div className="field-col">
          <label htmlFor="firstName">Ad <span className="req">*</span></label>
          <input id="firstName" className={`input ${errors.firstName ? "err":""}`} type="text" autoComplete="given-name"
                 value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Selin" />
          {errors.firstName && <span className="err-msg"><IconX size={11} /> {errors.firstName}</span>}
        </div>
        <div className="field-col">
          <label htmlFor="lastName">Soyad <span className="req">*</span></label>
          <input id="lastName" className={`input ${errors.lastName ? "err":""}`} type="text" autoComplete="family-name"
                 value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Karaca" />
          {errors.lastName && <span className="err-msg"><IconX size={11} /> {errors.lastName}</span>}
        </div>

        <div className="field-col">
          <label htmlFor="email">E-posta <span className="req">*</span></label>
          <input id="email" className={`input ${errors.email ? "err":""}`} type="email" autoComplete="email"
                 value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="selin@ornek.com" />
          {errors.email
            ? <span className="err-msg"><IconX size={11} /> {errors.email}</span>
            : <span className="hint">Rezervasyon onayı bu adrese gönderilir</span>}
        </div>
        <div className="field-col">
          <label htmlFor="phone">Telefon <span className="req">*</span></label>
          <div className="phone-wrap">
            <select className="select" value={form.country} onChange={(e) => set("country", e.target.value)} aria-label="Ülke kodu">
              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <input id="phone" className={`input ${errors.phone ? "err":""}`} type="tel" autoComplete="tel"
                   value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="555 000 00 00" />
          </div>
          {errors.phone && <span className="err-msg"><IconX size={11} /> {errors.phone}</span>}
        </div>
      </div>

      <div className="section-divider" />

      <div className="form-section-title">Konaklama Tercihleri</div>
      <div className="field-grid">
        <div className="field-col full">
          <label htmlFor="requests">Özel İstek <span style={{ color:"var(--muted)", fontWeight:400 }}>(opsiyonel)</span></label>
          <textarea id="requests" className="textarea" value={form.requests}
                    onChange={(e) => set("requests", e.target.value)}
                    placeholder="Yüksek katta sessiz oda, ekstra yastık, alerji notu, romantik düzenleme…" />
          <span className="hint">Otel taleplerinizi karşılamak için elinden geleni yapar; garanti edilmez.</span>
        </div>
        <div className="field-col">
          <label htmlFor="arrival">Tahmini Varış Saati</label>
          <select id="arrival" className="select" value={form.arrival} onChange={(e) => set("arrival", e.target.value)}>
            {ARRIVAL_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field-col">
          <label htmlFor="trip">Seyahat Amacı</label>
          <select id="trip" className="select" value={form.trip} onChange={(e) => set("trip", e.target.value)}>
            <option>Tatil</option>
            <option>İş</option>
            <option>Bal Ayı</option>
            <option>Özel Kutlama</option>
            <option>Diğer</option>
          </select>
        </div>
      </div>

      <div className="section-divider" />

      <div className="check-list">
        <label className="check">
          <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} />
          <span className="box"><CheckTick /></span>
          <span><a href="#">Kullanım Şartları</a> ve <a href="#">Gizlilik Politikası</a>'nı okuduğumu kabul ediyorum. <span className="req">*</span></span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.marketing} onChange={(e) => set("marketing", e.target.checked)} />
          <span className="box"><CheckTick /></span>
          <span>bakoda'dan özel teklifler ve seyahat fikirleri almak istiyorum.</span>
        </label>
      </div>
      {errors.terms && <span className="err-msg" style={{ marginTop: 8 }}><IconX size={11} /> {errors.terms}</span>}

      <div className="submit-row">
        <a href="hotel-detail.html" className="back">← Otel sayfasına dön</a>
        <button type="submit" className="btn btn-cta next">Ödemeye Geç <IconArrow size={16} /></button>
      </div>

      <div className="trust">
        <span><IconShield size={13} /> SSL şifrelemeli güvenli ödeme</span>
        <span><IconRefresh size={13} /> Ücretsiz iptal · 48 saat öncesine kadar</span>
        <span><IconTag size={13} /> En iyi fiyat garantisi</span>
      </div>
    </form>
  );
}

const CheckTick = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.2 5.8 10 11 4.2" />
  </svg>
);

// ── Step 2: Payment ───────────────────────────────────────────────────
function PaymentStep({ pay, setPay, onBack, onConfirm }) {
  const [method, setMethod] = useState("card"); // card | pay-at-hotel
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setPay({ ...pay, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const formatCard = (s) => s.replace(/\D/g, "").slice(0,16).replace(/(.{4})/g, "$1 ").trim();
  const formatExp  = (s) => {
    const d = s.replace(/\D/g, "").slice(0,4);
    return d.length > 2 ? d.slice(0,2) + "/" + d.slice(2) : d;
  };

  const validate = () => {
    if (method === "pay-at-hotel") return true;
    const e = {};
    if (pay.card.replace(/\s/g,"").length < 16) e.card = "16 haneli kart numarası girin";
    if (!/^\d{2}\/\d{2}$/.test(pay.exp))         e.exp  = "AA/YY";
    if (pay.cvv.length < 3)                       e.cvv  = "3-4 hane";
    if (!pay.name.trim())                         e.name = "Kart üzerindeki isim";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (validate()) onConfirm(method);
  };

  return (
    <form className="form-card fade-in" onSubmit={submit} noValidate>
      <h1>Ödeme</h1>
      <p className="lead">Rezervasyonunuz hemen onaylanır. Ücret, otele giriş yapana kadar kartınızdan çekilmez.</p>

      <div className="pay-tabs" role="tablist">
        <button type="button" className={`pay-tab ${method==="card"?"active":""}`} onClick={() => setMethod("card")}>
          <IconShield size={14} /> Kredi Kartı
        </button>
        <button type="button" className={`pay-tab ${method==="pay-at-hotel"?"active":""}`} onClick={() => setMethod("pay-at-hotel")}>
          <IconBell size={14} /> Otelde Öde
        </button>
      </div>

      {method === "card" && (
        <>
          <div className="form-section-title">Kart Bilgileri</div>
          <div className="field-grid">
            <div className="field-col full">
              <label htmlFor="card">Kart Numarası <span className="req">*</span></label>
              <div className="input-affix">
                <span className="ico"><IconShield size={16} /></span>
                <input id="card" className={`input ${errors.card?"err":""}`} type="text" inputMode="numeric" autoComplete="cc-number"
                       value={pay.card} onChange={(e) => set("card", formatCard(e.target.value))}
                       placeholder="0000 0000 0000 0000" maxLength={19} />
              </div>
              {errors.card && <span className="err-msg"><IconX size={11} /> {errors.card}</span>}
            </div>
            <div className="field-col">
              <label htmlFor="exp">Son Kullanma <span className="req">*</span></label>
              <input id="exp" className={`input ${errors.exp?"err":""}`} type="text" inputMode="numeric" autoComplete="cc-exp"
                     value={pay.exp} onChange={(e) => set("exp", formatExp(e.target.value))} placeholder="AA/YY" maxLength={5} />
              {errors.exp && <span className="err-msg"><IconX size={11} /> {errors.exp}</span>}
            </div>
            <div className="field-col">
              <label htmlFor="cvv">CVV <span className="req">*</span></label>
              <input id="cvv" className={`input ${errors.cvv?"err":""}`} type="text" inputMode="numeric" autoComplete="cc-csc"
                     value={pay.cvv} onChange={(e) => set("cvv", e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="000" maxLength={4} />
              {errors.cvv && <span className="err-msg"><IconX size={11} /> {errors.cvv}</span>}
            </div>
            <div className="field-col full">
              <label htmlFor="cname">Kart Üzerindeki İsim <span className="req">*</span></label>
              <input id="cname" className={`input ${errors.name?"err":""}`} type="text" autoComplete="cc-name"
                     value={pay.name} onChange={(e) => set("name", e.target.value)} placeholder="SELIN KARACA" />
              {errors.name && <span className="err-msg"><IconX size={11} /> {errors.name}</span>}
            </div>
          </div>
        </>
      )}

      {method === "pay-at-hotel" && (
        <div style={{ padding: "24px 22px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Otelde ödemeyi seçtiniz</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Rezervasyon hemen onaylanır. Doğrulama için kart bilgisi vermeyeceksiniz; ücretin tamamı otele girişte alınır.
            Misafir politikası gereği konaklama tarihine 48 saat kalana kadar ücretsiz iptal hakkınız vardır.
          </p>
        </div>
      )}

      <div className="submit-row">
        <button type="button" className="back btn btn-ghost" onClick={onBack} style={{ height: 'auto', padding: '6px 8px' }}>← Bilgilere dön</button>
        <button type="submit" className="btn btn-cta next">
          Rezervasyonu Onayla <IconArrow size={16} />
        </button>
      </div>

      <div className="trust">
        <span><IconShield size={13} /> 256-bit SSL şifreleme</span>
        <span><IconRefresh size={13} /> 48 saat öncesine kadar ücretsiz iptal</span>
      </div>
    </form>
  );
}

// ── Step 3: Confirmation ──────────────────────────────────────────────
function ConfirmStep({ form, method }) {
  const code = "BKD-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-2026";
  return (
    <div className="form-card fade-in">
      <div className="step-pad">
        <div className="ico ok"><IconCheck size={32} /></div>
        <h2>Rezervasyon onaylandı</h2>
        <p>
          Teşekkürler {form.firstName || "değerli misafirimiz"}! Rezervasyon detaylarınızı <b style={{ color:"var(--text)" }}>{form.email || "e-posta adresinize"}</b> gönderdik. Otel hazırlıkları başlatıldı.
        </p>
        <div className="conf-meta">
          <div className="item">
            <div className="lbl">Onay Kodu</div>
            <div className="val" style={{ fontFamily: "var(--mono)", letterSpacing: ".04em" }}>{code}</div>
          </div>
          <div className="item">
            <div className="lbl">Giriş</div>
            <div className="val">{fmtDate(BOOKING.checkIn)}</div>
          </div>
          <div className="item">
            <div className="lbl">Ödeme</div>
            <div className="val">{method === "card" ? "Kredi Kartı" : "Otelde"}</div>
          </div>
        </div>
        <div className="conf-actions">
          <button className="btn btn-primary" onClick={() => alert("PDF makbuz indirmek için: gerçek implementasyon")}>Makbuzu İndir</button>
          <a href="index.html" className="btn btn-secondary">Anasayfaya Dön</a>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "", lastName: "",
    email: "", country: "+90", phone: "",
    requests: "", arrival: ARRIVAL_TIMES[0], trip: "Tatil",
    terms: false, marketing: true,
  });
  const [pay, setPay] = useState({ card: "", exp: "", cvv: "", name: "" });
  const [method, setMethod] = useState("card");
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  // Scroll to top on step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  return (
    <>
      <Navbar active="Oteller" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <a href="index.html">Anasayfa</a>
            <span className="sep">/</span>
            <a href="hotel-detail.html">Çırağan Palace Suites</a>
            <span className="sep">/</span>
            <span className="here">Rezervasyon</span>
          </div>
        </div>

        <Stepper step={step} />

        <div className="container">
          <div className="book-layout">
            <div>
              {step === 1 && <GuestStep form={form} setForm={setForm} onNext={() => { window.location.href = "payment.html"; }} />}
              {step === 2 && <PaymentStep pay={pay} setPay={setPay} onBack={() => setStep(1)} onConfirm={(m) => { setMethod(m); window.location.href = "confirmation.html"; }} />}
              {step === 3 && <ConfirmStep form={form} method={method} />}
            </div>
            <Summary />
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
