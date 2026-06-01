// Booking flow — Step 1 (Bilgiler)

const { useState, useRef, useEffect, useMemo } = React;
const BOOKING_I18N = {
  tr: {
    step: { step: "Adım", info: "Bilgiler", payment: "Ödeme", confirm: "Onay" },
    nav: { home: "Anasayfa", booking: "Rezervasyon" },
    guest: { title: "Misafir Bilgileri", lead: "Rezervasyon onayı bu bilgilere gönderilecek. Pasaport veya kimlik bilgileri otelde check-in sırasında alınır.", continue: "Ödemeye Geç", back: "Otel sayfasına dön" },
    payment: { title: "Ödeme", lead: "Rezervasyonunuz hemen onaylanır. Ücret, otele giriş yapana kadar kartınızdan çekilmez.", card: "Kredi Kartı", payHotel: "Otelde Öde", back: "Bilgilere dön", confirm: "Rezervasyonu Onayla" },
    toast: { signupRedirect: "Kayıt sayfasına yönlendiriliyorsunuz…" },
  },
  en: {
    step: { step: "Step", info: "Info", payment: "Payment", confirm: "Confirmation" },
    nav: { home: "Home", booking: "Booking" },
    guest: { title: "Guest Information", lead: "Your booking confirmation will be sent to these details.", continue: "Continue to Payment", back: "Back to hotel page" },
    payment: { title: "Payment", lead: "Your booking is confirmed instantly.", card: "Credit Card", payHotel: "Pay at Hotel", back: "Back to info", confirm: "Confirm Booking" },
    toast: { signupRedirect: "Redirecting to sign up…" },
  },
};

const BOOKING_CTX_KEY = "bakoda_booking_context";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DISCOUNT_PCT = 8;
const CLEANING_FEE = 500;

function safeParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function parsePositiveInt(v, fallback = 0) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseIsoDate(value) {
  const txt = String(value || "").trim();
  if (!ISO_DATE_RE.test(txt)) return null;
  const d = new Date(`${txt}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

function syncBookingUrl(ctx) {
  const qs = new URLSearchParams(window.location.search);
  qs.set("hotel_id", String(ctx.hotelId));
  qs.set("room_id", String(ctx.roomId));
  qs.set("check_in", toIsoDate(ctx.checkIn));
  qs.set("check_out", toIsoDate(ctx.checkOut));
  qs.set("adults", String(ctx.adults));
  qs.set("rooms", String(ctx.rooms));
  const next = `${window.location.pathname}?${qs.toString()}`;
  window.history.replaceState(null, "", next);
}

function validateStayDates(checkIn, checkOut) {
  const t0 = today();
  if (!checkIn || !checkOut) return "Giriş ve çıkış tarihi seçin.";
  if (checkIn < t0) return "Giriş tarihi bugünden önce olamaz.";
  if (checkOut <= checkIn) return "Çıkış tarihi giriş tarihinden sonra olmalı.";
  return "";
}

function readBookingContext() {
  const qs = new URLSearchParams(window.location.search);
  const stored = safeParse(sessionStorage.getItem(BOOKING_CTX_KEY)) || {};
  const hotelId = parsePositiveInt(qs.get("hotel_id") || sessionStorage.getItem("bakoda_hotel_id") || stored.hotelId, 0);
  const roomId = parsePositiveInt(qs.get("room_id") || sessionStorage.getItem("bakoda_room_id") || stored.roomId, 0);
  const checkIn = parseIsoDate(qs.get("check_in") || sessionStorage.getItem("bakoda_checkin") || stored.checkIn);
  const checkOut = parseIsoDate(qs.get("check_out") || sessionStorage.getItem("bakoda_checkout") || stored.checkOut);
  const adults = parsePositiveInt(qs.get("adults") || qs.get("guests") || sessionStorage.getItem("bakoda_adults") || stored.adults, 2);
  const rooms = parsePositiveInt(qs.get("rooms") || sessionStorage.getItem("bakoda_rooms") || stored.rooms, 1);
  const errors = [];

  if (!hotelId) errors.push("Otel bilgisi eksik.");
  if (!roomId) errors.push("Oda bilgisi eksik.");
  if (!checkIn || !checkOut) errors.push("Giriş/çıkış tarihleri geçersiz.");
  if (checkIn && checkOut && checkOut <= checkIn) errors.push("Çıkış tarihi giriş tarihinden sonra olmalı.");

  return {
    hotelId,
    roomId,
    checkIn,
    checkOut,
    adults,
    rooms,
    valid: errors.length === 0,
    errors,
  };
}

function persistBookingContext(ctx) {
  const snapshot = {
    hotelId: ctx.hotelId,
    roomId: ctx.roomId,
    checkIn: toIsoDate(ctx.checkIn),
    checkOut: toIsoDate(ctx.checkOut),
    adults: Math.max(1, parsePositiveInt(ctx.adults, 1)),
    rooms: Math.max(1, parsePositiveInt(ctx.rooms, 1)),
  };
  try { sessionStorage.setItem(BOOKING_CTX_KEY, JSON.stringify(snapshot)); } catch {}
  try { sessionStorage.setItem("bakoda_hotel_id", String(snapshot.hotelId)); } catch {}
  try { sessionStorage.setItem("bakoda_room_id", String(snapshot.roomId)); } catch {}
  try { sessionStorage.setItem("bakoda_checkin", snapshot.checkIn); } catch {}
  try { sessionStorage.setItem("bakoda_checkout", snapshot.checkOut); } catch {}
  try { sessionStorage.setItem("bakoda_adults", String(snapshot.adults)); } catch {}
  try { sessionStorage.setItem("bakoda_rooms", String(snapshot.rooms)); } catch {}
}

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

function calcPricing(checkIn, checkOut, pricePerNight, rooms = 1) {
  const ms = (checkOut && checkIn) ? (checkOut - checkIn) : 0;
  const nights = Math.max(1, Math.round(ms / 86400000) || 1);
  const roomCount = Math.max(1, parsePositiveInt(rooms, 1));
  const subtotal = Math.max(0, Number(pricePerNight || 0)) * nights * roomCount;
  const discount = Math.round(subtotal * DISCOUNT_PCT / 100);
  const taxable = subtotal - discount + CLEANING_FEE;
  const taxes = Math.round(taxable * 0.10);
  const total = taxable + taxes;
  return { nights, subtotal, discount, cleaning: CLEANING_FEE, taxes, total };
}

// ── Mini calendar (hotel-detail ile uyumlu) ───────────────────────────
function MiniCal({ value, min, onPick }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const weekdays = ["Pt","Sa","Ça","Pe","Cu","Ct","Pz"];
  const offset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
  const ndays = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= ndays; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  return (
    <div className="cal" onClick={(e) => e.stopPropagation()}>
      <div className="cal-head">
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>
          <IconChevron size={14} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div className="title">{months[view.getMonth()]} {view.getFullYear()}</div>
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
          <IconChevron size={14} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>
      <div className="cal-wk">{weekdays.map((w) => <div key={w}>{w}</div>)}</div>
      <div className="cal-days">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const disabled = min && d < min;
          const sel = d.toDateString() === value.toDateString();
          return (
            <button key={i} type="button" className={`cal-day ${sel ? "sel" : ""}`} disabled={disabled} onClick={() => onPick(d)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────
function Stepper({ step }) {
  const { t } = useI18n(BOOKING_I18N);
  const items = [
    { n: 1, lbl: `${t("step.step")} 01`, ttl: t("step.info") },
    { n: 2, lbl: `${t("step.step")} 02`, ttl: t("step.payment") },
    { n: 3, lbl: `${t("step.step")} 03`, ttl: t("step.confirm") },
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
function Summary({ booking, hotel, onDatesChange, datesLoading, dateError }) {
  const t0 = today();
  const [datePop, setDatePop] = useState(null);
  const datesRef = useRef(null);
  const p = useMemo(
    () => calcPricing(booking.checkIn, booking.checkOut, hotel.pricePerNight, booking.rooms),
    [booking.checkIn, booking.checkOut, hotel.pricePerNight, booking.rooms]
  );
  const backToHotel = `hotel-detail.html?id=${booking.hotelId}`;

  useEffect(() => {
    const onDoc = (e) => {
      if (datesRef.current && !datesRef.current.contains(e.target)) setDatePop(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const applyCheckIn = (d) => {
    let nextOut = booking.checkOut;
    if (!nextOut || d >= nextOut) nextOut = addDays(d, 1);
    onDatesChange(d, nextOut);
    setDatePop("out");
  };

  const applyCheckOut = (d) => {
    onDatesChange(booking.checkIn, d);
    setDatePop(null);
  };

  return (
    <aside className="summary" aria-label="Rezervasyon özeti">
      <div className="summary-head">
        <div className="summary-thumb">
          <div className="ph" />
          <div className="ph-label">[ otel ]</div>
        </div>
        <div className="summary-h">
          <span className="summary-stars" aria-label={`${hotel.stars} yıldız`}>
            {Array.from({ length: hotel.stars }).map((_, i) => <IconStar key={i} size={11} filled />)}
          </span>
          <div className="summary-name">{hotel.name}</div>
          <div className="summary-loc"><IconMapPin size={11} /> {hotel.district}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily:"var(--mono)", letterSpacing:".04em" }}>
            {(hotel.roomType || "ODA").toUpperCase()}
          </div>
        </div>
      </div>

      <div className="summary-body">
        <div className="stay-rows">
          <div className={`stay-row dates-edit ${datePop ? "open" : ""}`} ref={datesRef}>
            <div className="ico"><IconCalendar size={15} /></div>
            <div>
              <div className="lbl">Giriş — Çıkış</div>
              <div className="val">
                {fmtDateShort(booking.checkIn)} → {fmtDateShort(booking.checkOut)} · {p.nights} gece
                {datesLoading && <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>güncelleniyor…</span>}
              </div>
            </div>
            <button
              type="button"
              className="change"
              disabled={datesLoading}
              onClick={() => setDatePop(datePop ? null : "in")}
              aria-expanded={!!datePop}
              aria-controls="stay-dates-pop"
            >
              değiştir
            </button>
            {datePop && (
              <div className="stay-dates-pop" id="stay-dates-pop" role="dialog" aria-label="Konaklama tarihlerini değiştir">
                <div className="stay-dates-fields">
                  <div
                    className={`stay-date-field ${datePop === "in" ? "active" : ""}`}
                    onClick={() => setDatePop("in")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDatePop("in"); }}
                  >
                    <div className="lbl">Giriş</div>
                    <div className="val">{fmtDate(booking.checkIn)}</div>
                  </div>
                  <div
                    className={`stay-date-field ${datePop === "out" ? "active" : ""}`}
                    onClick={() => setDatePop("out")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDatePop("out"); }}
                  >
                    <div className="lbl">Çıkış</div>
                    <div className="val">{fmtDate(booking.checkOut)}</div>
                  </div>
                </div>
                {datePop === "in" && (
                  <MiniCal value={booking.checkIn} min={t0} onPick={applyCheckIn} />
                )}
                {datePop === "out" && (
                  <MiniCal value={booking.checkOut} min={addDays(booking.checkIn, 1)} onPick={applyCheckOut} />
                )}
                {(dateError || validateStayDates(booking.checkIn, booking.checkOut)) && (
                  <div className="stay-date-err">
                    <IconX size={12} />
                    {dateError || validateStayDates(booking.checkIn, booking.checkOut)}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="stay-row">
            <div className="ico"><IconUsers size={15} /></div>
            <div>
              <div className="lbl">Misafir</div>
              <div className="val">{booking.adults} yetişkin · {booking.rooms} oda</div>
            </div>
            <a className="change" href={backToHotel}>değiştir</a>
          </div>
        </div>

        <div className="price-rows">
          <div className="row">
            <span className="label">{p.nights} gece × {fmtTLcompact(hotel.pricePerNight)}</span>
            <span>{fmtTL(p.subtotal)}</span>
          </div>
          <div className="row discount">
            <span className="label">Erken rezervasyon (−%{DISCOUNT_PCT})</span>
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
            <div className="lbl">{p.nights} gece · {booking.adults} kişi</div>
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

function GuestStep({ form, setForm, onNext, backHref, submitError, isSubmitting }) {
  const { t } = useI18n(BOOKING_I18N);
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
      <h1>{t("guest.title")}</h1>
      <p className="lead">{t("guest.lead")}</p>

      <div className="form-section-title">Ad ve İletişim</div>
      <div className="field-grid">
        <div className="field-col">
          <label htmlFor="firstName">Ad <span className="req">*</span></label>
          <input id="firstName" className={`input ${errors.firstName ? "err":""}`} type="text" autoComplete="given-name"
                 value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Adınız" />
          {errors.firstName && <span className="err-msg"><IconX size={11} /> {errors.firstName}</span>}
        </div>
        <div className="field-col">
          <label htmlFor="lastName">Soyad <span className="req">*</span></label>
          <input id="lastName" className={`input ${errors.lastName ? "err":""}`} type="text" autoComplete="family-name"
                 value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Soyadınız" />
          {errors.lastName && <span className="err-msg"><IconX size={11} /> {errors.lastName}</span>}
        </div>

        <div className="field-col">
          <label htmlFor="email">E-posta <span className="req">*</span></label>
          <input id="email" className={`input ${errors.email ? "err":""}`} type="email" autoComplete="email"
                 value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ornek@eposta.com" />
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
          <span><a href="about.html">Kullanım Şartları</a> ve <a href="about.html">Gizlilik Politikası</a>'nı okuduğumu kabul ediyorum. <span className="req">*</span></span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.marketing} onChange={(e) => set("marketing", e.target.checked)} />
          <span className="box"><CheckTick /></span>
          <span>bakoda'dan özel teklifler ve seyahat fikirleri almak istiyorum.</span>
        </label>
      </div>
      {errors.terms && <span className="err-msg" style={{ marginTop: 8 }}><IconX size={11} /> {errors.terms}</span>}

      <div className="submit-row">
        <a href={backHref} className="back">← {t("guest.back")}</a>
        <button type="submit" className="btn btn-cta next" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : t("guest.continue")} <IconArrow size={16} />
        </button>
      </div>
      {submitError && <span className="err-msg" style={{ marginTop: 8 }}><IconX size={11} /> {submitError}</span>}

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

function ErrorCard({ title, message, primaryHref, primaryLabel, secondaryHref, secondaryLabel, onRetry }) {
  return (
    <div className="form-card fade-in">
      <h1 style={{ marginBottom: 8 }}>{title}</h1>
      <p className="lead" style={{ marginBottom: 18 }}>{message}</p>
      <div className="submit-row" style={{ marginTop: 0 }}>
        {onRetry ? <button className="btn btn-primary" type="button" onClick={onRetry}>Tekrar Dene</button> : <a className="btn btn-primary" href={primaryHref}>{primaryLabel}</a>}
        <a className="btn btn-secondary" href={secondaryHref}>{secondaryLabel}</a>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const { t } = useI18n(BOOKING_I18N);
  const [step] = useState(1);
  const [ctx, setCtx] = useState(() => readBookingContext());
  const [hotelStatus, setHotelStatus] = useState("loading");
  const [hotelError, setHotelError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hotel, setHotel] = useState({
    name: "Yükleniyor…",
    district: "—",
    stars: 5,
    roomType: "Oda",
    pricePerNight: 0,
  });
  const [form, setForm] = useState({
    firstName: "", lastName: "",
    email: "", country: "+90", phone: "",
    requests: "", arrival: ARRIVAL_TIMES[0], trip: "Tatil",
    terms: false, marketing: true,
  });
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  // Scroll to top on step change
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  useEffect(() => {
    persistBookingContext(ctx);
    if (ctx.valid) syncBookingUrl(ctx);
  }, [ctx]);

  const handleDatesChange = (checkIn, checkOut) => {
    setCtx((prev) => ({ ...prev, checkIn, checkOut }));
  };

  useEffect(() => {
    const userRaw = localStorage.getItem("bakoda_user");
    if (!userRaw) return;
    try {
      const user = JSON.parse(userRaw);
      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || user.first_name || "",
        lastName: prev.lastName || user.last_name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
      }));
    } catch {}
  }, []);

  useEffect(() => {
    if (!ctx.valid) {
      setHotelStatus("error");
      setHotelError(ctx.errors.join(" "));
      return;
    }

    const dateErr = validateStayDates(ctx.checkIn, ctx.checkOut);
    if (dateErr) {
      setHotelStatus("error");
      setHotelError(dateErr);
      return;
    }

    const controller = new AbortController();
    setHotelStatus("loading");
    setHotelError("");
    const params = new URLSearchParams({
      check_in: toIsoDate(ctx.checkIn),
      check_out: toIsoDate(ctx.checkOut),
      guests: String(ctx.adults),
    });
    fetch(`/api/hotels/${ctx.hotelId}?${params}`, { signal: controller.signal })
      .then(async (r) => {
        let payload = null;
        try { payload = await r.json(); } catch {}
        if (!r.ok) throw new Error(payload?.detail || "Otel bilgisi alınamadı.");
        return payload;
      })
      .then((data) => {
        const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
        const selectedRoom = rooms.find((r) => r.id === ctx.roomId);
        if (!selectedRoom?.id) {
          throw new Error(
            rooms.length
              ? "Seçtiğiniz oda bu tarihlerde müsait değil. Lütfen başka tarih seçin."
              : "Bu otel için seçilen tarihlerde uygun oda bulunamadı."
          );
        }
        setHotel({
          name: data.name || "Otel",
          district: `${data.city || ""}${data.district ? ", " + data.district : ""}`.trim() || "—",
          stars: Number.isFinite(data.stars) ? data.stars : 5,
          roomType: selectedRoom.name || selectedRoom.type || "Oda",
          pricePerNight: Number(selectedRoom.price_per_night || data.price_per_night || 0),
        });
        sessionStorage.setItem("bakoda_room_type", selectedRoom.name || selectedRoom.type || "Oda");
        setHotelStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setHotelStatus("error");
        setHotelError(err?.message || "Otel bilgisi yüklenemedi.");
      });

    return () => controller.abort();
  }, [
    ctx.valid,
    ctx.hotelId,
    ctx.roomId,
    ctx.adults,
    toIsoDate(ctx.checkIn),
    toIsoDate(ctx.checkOut),
    refreshTick,
  ]);

  const hotelHref = `hotel-detail.html?id=${ctx.hotelId}`;
  const createBooking = async () => {
    if (!ctx.valid || hotelStatus !== "ready") return;
    const token = localStorage.getItem("bakoda_token");
    const guestName = `${form.firstName} ${form.lastName}`.trim();
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          room_id: ctx.roomId,
          guest_name: guestName,
          guest_email: String(form.email || "").trim(),
          phone: form.phone,
          check_in: toIsoDate(ctx.checkIn),
          check_out: toIsoDate(ctx.checkOut),
          guests: ctx.adults,
          rooms_count: ctx.rooms,
          preferences: form.requests || null,
          arrival_time: form.arrival || null,
          trip_type: form.trip || null,
        }),
      });
      let payload = null;
      try { payload = await res.json(); } catch {}
      if (!res.ok) {
        const detail = typeof payload?.detail === "string" ? payload.detail : "";
        if (res.status === 409) {
          throw new Error(
            detail.includes("already booked") || detail.includes("not available")
              ? "Seçtiğiniz oda bu tarihlerde dolu. Lütfen başka tarih veya oda seçin."
              : detail || "Seçilen tarihlerde yeterli müsait oda yok."
          );
        }
        throw new Error(detail || "Rezervasyon oluşturulamadı.");
      }

      sessionStorage.setItem("bakoda_booking_id", String(payload.id));
      sessionStorage.setItem("bakoda_booking_code", payload.confirmation_code || "");
      if (payload.confirmation_url) sessionStorage.setItem("bakoda_confirmation_url", payload.confirmation_url);
      sessionStorage.setItem("bakoda_guest_name", guestName);
      sessionStorage.setItem("bakoda_guest_email", form.email);
      sessionStorage.setItem("bakoda_payment_method", "Kart");
      flash("Rezervasyon oluşturuldu. Ödeme adımına yönlendiriliyorsunuz…");

      const nextQuery = new URLSearchParams({
        booking_id: String(payload.id),
        hotel_id: String(ctx.hotelId),
        room_id: String(ctx.roomId),
        check_in: toIsoDate(ctx.checkIn),
        check_out: toIsoDate(ctx.checkOut),
        adults: String(ctx.adults),
        rooms: String(ctx.rooms),
      });
      window.location.href = `payment.html?${nextQuery.toString()}`;
    } catch (err) {
      setSubmitError(err?.message || "Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar active="nav.hotels" onSignup={() => flash(t("toast.signupRedirect"))} />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <a href="index.html">{t("nav.home")}</a>
            <span className="sep">/</span>
            <a href={hotelHref}>{hotel.name}</a>
            <span className="sep">/</span>
            <span className="here">{t("nav.booking")}</span>
          </div>
        </div>

        <Stepper step={step} />

        <div className="container">
          <div className="book-layout">
            <div>
              {!ctx.valid && (
                <ErrorCard
                  title="Rezervasyon bilgileri eksik"
                  message={ctx.errors.join(" ") || "Rezervasyon akışı için gerekli bilgiler bulunamadı."}
                  primaryHref="search-results.html"
                  primaryLabel="Tekrar otel ara"
                  secondaryHref="index.html"
                  secondaryLabel="Anasayfaya dön"
                />
              )}
              {ctx.valid && hotelStatus === "loading" && (
                <div className="form-card fade-in">
                  <h1 style={{ marginBottom: 8 }}>Rezervasyon hazırlanıyor</h1>
                  <p className="lead">Otel ve oda bilgileri yükleniyor…</p>
                </div>
              )}
              {ctx.valid && hotelStatus === "error" && (
                <ErrorCard
                  title="Otel bilgisi alınamadı"
                  message={hotelError || "Lütfen tekrar deneyin."}
                  primaryHref={hotelHref}
                  primaryLabel="Otel sayfasına dön"
                  secondaryHref="search-results.html"
                  secondaryLabel="Yeni arama yap"
                  onRetry={() => setRefreshTick((x) => x + 1)}
                />
              )}
              {ctx.valid && hotelStatus === "ready" && (
                <GuestStep
                  form={form}
                  setForm={setForm}
                  backHref={hotelHref}
                  onNext={createBooking}
                  submitError={submitError}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
            <Summary
              booking={ctx}
              hotel={hotel}
              onDatesChange={handleDatesChange}
              datesLoading={hotelStatus === "loading"}
              dateError={hotelStatus === "error" ? hotelError : ""}
            />
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
