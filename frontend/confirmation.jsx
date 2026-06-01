// Confirmation page — single-column success layout

const { useState, useRef, useEffect } = React;
const CONFIRM_I18N = {
  tr: {
    nav: { confirmed: "Rezervasyonunuz Onaylandı", emailSent: "Onay e-postası gönderildi:", reservationNo: "Rezervasyon No", approved: "Onaylandı", checkIn: "Giriş", checkOut: "Çıkış", guest: "Misafir", room: "Oda", stay: "Konaklama", paidTotal: "Toplam Ödendi", collected: "Tahsil Edildi", searchAnother: "Başka bir otel ara", downloadPdf: "PDF İndir", sendEmail: "E-posta Gönder", addToCalendar: "Takvime Ekle", importantInfo: "Check-in için önemli bilgi" },
    toast: { signupRedirect: "Kayıt sayfasına yönlendiriliyorsunuz…", copied: "Rezervasyon kodu panoya kopyalandı", copyFailed: "Kopyalanamadı — manuel olarak seçin", receiptPending: "Makbuz bağlantısı henüz hazır değil", calendarDownloaded: "Takvim dosyası indirildi" },
  },
  en: {
    nav: { confirmed: "Your Booking Is Confirmed", emailSent: "Confirmation email sent to:", reservationNo: "Reservation No", approved: "Confirmed", checkIn: "Check-in", checkOut: "Check-out", guest: "Guest", room: "Room", stay: "Stay", paidTotal: "Total Paid", collected: "Charged", searchAnother: "Search another hotel", downloadPdf: "Download PDF", sendEmail: "Send Email", addToCalendar: "Add to Calendar", importantInfo: "Important check-in info" },
    toast: { signupRedirect: "Redirecting to sign up…", copied: "Reservation code copied", copyFailed: "Copy failed — please copy manually", receiptPending: "Receipt link is not ready yet", calendarDownloaded: "Calendar file downloaded" },
  },
};

const DAYS_TR = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const MONTHS_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const parsePositiveInt = (v, fallback = 0) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const parseSafeDate = (value) => {
  const txt = String(value || "").trim();
  if (!txt) return null;
  const d = ISO_DATE_RE.test(txt) ? new Date(`${txt}T00:00:00`) : new Date(txt);
  return Number.isNaN(d.getTime()) ? null : d;
};
function parseCheckDate(s, checkInTime, checkOutTime, isOut) {
  const d = parseSafeDate(s);
  if (!d) return { date: "—", year: "—", day: "—", time: isOut ? "12:00'ye kadar" : "15:00 itibaren" };
  return {
    date: `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`,
    year: d.getFullYear(),
    day: DAYS_TR[d.getDay()],
    time: isOut ? (checkOutTime ? checkOutTime + "'ye kadar" : "12:00'ye kadar") : (checkInTime ? checkInTime + " itibaren" : "15:00 itibaren"),
  };
}

const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function toIsoLocalDateTime(dateString, fallbackHour) {
  const base = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  base.setHours(fallbackHour, 0, 0, 0);
  return base.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function buildIcs({ title, location, startDate, endDate, description }) {
  const uid = `${Date.now()}@bakoda`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//bakoda//booking//TR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${toIsoLocalDateTime(startDate, 15)}`,
    `DTEND:${toIsoLocalDateTime(endDate, 12)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ── QR placeholder ────────────────────────────────────────────────────
// Iconographic only — three finder squares + pseudo-random data cells.
// Deterministic so it renders the same on every load.
function QR({ size = 88 }) {
  const cells = 21; // standard QR cell count for v1
  const grid = Array.from({ length: cells }, () => Array(cells).fill(0));

  // finder square at (gx, gy)
  const drawFinder = (gx, gy) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const onEdge = (x === 0 || x === 6 || y === 0 || y === 6);
        const inner = (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        grid[gy+y][gx+x] = (onEdge || inner) ? 1 : 0;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(cells - 7, 0);
  drawFinder(0, cells - 7);

  // timing patterns
  for (let i = 8; i < cells - 8; i++) {
    grid[6][i] = i % 2 === 0 ? 1 : 0;
    grid[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // pseudo-random data cells (mulberry32)
  let s = 123456789;
  const rnd = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // skip finder + timing areas
      const inFinder = (x < 8 && y < 8) || (x >= cells - 8 && y < 8) || (x < 8 && y >= cells - 8);
      if (inFinder) continue;
      if (grid[y][x] === 0 && rnd() > 0.55) grid[y][x] = 1;
    }
  }

  const cellSize = size / cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${cells} ${cells}`} aria-label="QR kod" role="img"
         style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: 4, boxSizing: "content-box" }}>
      {grid.flatMap((row, y) =>
        row.map((v, x) => v ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--primary)" /> : null)
      )}
    </svg>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────
function Confetti() {
  const pieces = useRef(
    Array.from({ length: 22 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.2,
      color: ["#D7A86E", "#2ECC71", "#0F2A2A", "#b88a52"][Math.floor(Math.random() * 4)],
      shape: Math.random() > 0.5 ? "1px" : "999px",
    }))
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.current.map((p, i) => (
        <i key={i} style={{
          left: p.left + "%",
          top: "-12px",
          background: p.color,
          borderRadius: p.shape,
          animationDelay: p.delay + "s",
          animationDuration: p.duration + "s",
        }} />
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const { t } = useI18n(CONFIRM_I18N);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState({ on: false, msg: "" });
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const qs = new URLSearchParams(window.location.search);
  const bookingId = parsePositiveInt(qs.get("booking_id") || sessionStorage.getItem("bakoda_booking_id"), 0);
  const hotelId = parsePositiveInt(qs.get("hotel_id") || sessionStorage.getItem("bakoda_hotel_id"), 0);
  const [res, setRes] = useState({
    code: "—", email: "—", guestName: "—",
    hotel: "—", district: "—",
    checkIn:  { date: "—", year: 2026, day: "—", time: "15:00 itibaren" },
    checkOut: { date: "—", year: 2026, day: "—", time: "12:00'ye kadar" },
    guests: "—", rooms: "1 oda", roomType: "—",
    total: 0, paymentMethod: "Kart", cardLast4: "****",
    nights: 1,
    confirmationUrl: "",
  });
  const toastT = useRef(null);

  useEffect(() => {
    if (!bookingId) {
      setStatus("error");
      setLoadError("Onay kaydı bulunamadı. Rezervasyonu tekrar başlatın.");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setLoadError("");

    const fetchAll = async () => {
      const bookingResp = await fetch(`/api/bookings/${bookingId}`, { signal: controller.signal });
      let bookingBody = null;
      try { bookingBody = await bookingResp.json(); } catch {}
      if (!bookingResp.ok) throw new Error(bookingBody?.detail || "Rezervasyon kaydı alınamadı.");

      let hotelBody = null;
      const resolvedHotelId = hotelId || parsePositiveInt(sessionStorage.getItem("bakoda_hotel_id"), 0);
      if (resolvedHotelId) {
        const hotelResp = await fetch(`/api/hotels/${resolvedHotelId}`, { signal: controller.signal });
        try { hotelBody = await hotelResp.json(); } catch {}
      }
      return { booking: bookingBody, hotel: hotelBody };
    };

    fetchAll()
      .then(({ booking, hotel }) => {
        const ci = parseSafeDate(booking.check_in);
        const co = parseSafeDate(booking.check_out);
        const nights = ci && co ? Math.max(1, Math.round((co - ci) / 86400000)) : 1;
        const roomName = hotel?.rooms?.find((r) => r.id === booking.room_id)?.name
          || hotel?.rooms?.find((r) => r.id === booking.room_id)?.type
          || sessionStorage.getItem("bakoda_room_type")
          || "Oda";
        const paymentMethod = sessionStorage.getItem("bakoda_payment_method") || "Kart";
        const paymentLast4 = sessionStorage.getItem("bakoda_payment_last4") || "****";

        setRes(prev => ({
          ...prev,
          code: booking.confirmation_code || sessionStorage.getItem("bakoda_booking_code") || prev.code,
          email: booking.guest_email || sessionStorage.getItem("bakoda_guest_email") || prev.email,
          guestName: booking.guest_name || sessionStorage.getItem("bakoda_guest_name") || prev.guestName,
          confirmationUrl: booking.confirmation_url || sessionStorage.getItem("bakoda_confirmation_url") || "",
          checkIn: parseCheckDate(booking.check_in, hotel?.check_in_time, hotel?.check_out_time, false),
          checkOut: parseCheckDate(booking.check_out, hotel?.check_in_time, hotel?.check_out_time, true),
          guests: `${booking.guests || 1} yetişkin`,
          rooms: `${booking.rooms_count || 1} oda`,
          total: Number(booking.total_price || prev.total || 0),
          nights,
          hotel: hotel?.name || prev.hotel,
          district: hotel ? `${hotel.city}${hotel.district ? ", " + hotel.district : ""}` : prev.district,
          roomType: roomName,
          paymentMethod,
          cardLast4: paymentLast4,
        }));
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setLoadError(err?.message || "Onay bilgisi alınamadı.");
      });

    return () => controller.abort();
  }, [bookingId, hotelId, retryTick]);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({ ...s, on: false })), 2400);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(res.code);
      setCopied(true);
      flash(t("toast.copied"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      flash(t("toast.copyFailed"));
    }
  };

  if (status === "loading") {
    return (
      <>
        <Navbar active="nav.hotels" onSignup={() => flash(t("toast.signupRedirect"))} />
        <div className="page" style={{ position: "relative" }}>
          <div className="wrap">
            <div className="card" style={{ padding: 24, textAlign: "center" }}>
              Onay bilgileri yukleniyor...
            </div>
          </div>
        </div>
        <Footer />
        <Toast on={toast.on} msg={toast.msg} />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <Navbar active="nav.hotels" onSignup={() => flash(t("toast.signupRedirect"))} />
        <div className="page" style={{ position: "relative" }}>
          <div className="wrap">
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ marginBottom: 8 }}>Onay ekrani acilamadi</h2>
              <p style={{ color: "var(--muted)" }}>{loadError}</p>
              <div className="actions" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" type="button" onClick={() => setRetryTick((x) => x + 1)}>Tekrar Dene</button>
                <a className="btn btn-secondary" href="payment.html">Odemeye don</a>
                <a className="btn btn-secondary" href="search-results.html">Yeni arama yap</a>
              </div>
            </div>
          </div>
        </div>
        <Footer />
        <Toast on={toast.on} msg={toast.msg} />
      </>
    );
  }

  return (
    <>
      <Navbar active="nav.hotels" onSignup={() => flash(t("toast.signupRedirect"))} />

      <div className="page" style={{ position: "relative" }}>
        <Confetti />

        <div className="wrap">

          {/* Hero */}
          <div className="hero">
            <div className="check-ring">
              <svg className="check-svg" viewBox="0 0 80 80" aria-hidden="true">
                <circle className="circle" cx="40" cy="40" r="36" />
                <path className="tick" d="M24 42 L36 54 L58 30" />
              </svg>
            </div>
            <h1>{t("nav.confirmed")}</h1>
            <div className="email-line">
              {t("nav.emailSent")} <b>{res.email}</b>
            </div>
          </div>

          {/* Reservation card */}
          <div className="card">
            <div className="card-head">
              <div className="head-left">
                <div className="lbl">{t("nav.reservationNo")}</div>
                <div className="code">
                  #{res.code}
                  <button className={`copy-btn ${copied ? "copied" : ""}`} type="button" aria-label={t("nav.reservationNo")} onClick={copyCode}>
                    {copied ? <IconCheck size={14} /> : <CopyIcon />}
                  </button>
                </div>
                <span className="badge"><span className="dot" /> {t("nav.approved")}</span>
              </div>
              <div>
                <QR size={96} />
                <div className="qr-caption">Check-in</div>
              </div>
            </div>

            <div className="card-body">
              {/* Hotel */}
              <div className="hotel-row">
                <div className="hotel-thumb" aria-hidden="true" />
                <div className="hotel-info">
                  <div className="hotel-name">{res.hotel}</div>
                  <div className="hotel-loc"><IconMapPin size={12} /> {res.district}</div>
                </div>
              </div>

              {/* Dates */}
              <div className="dates">
                <div className="date-block">
                  <span className="lbl"><IconCalendar size={11} /> {t("nav.checkIn")}</span>
                  <div className="day">{res.checkIn.date} <small>{res.checkIn.year}</small></div>
                  <div className="time">{res.checkIn.day} · {res.checkIn.time}</div>
                </div>
                <div className="date-arrow"><IconArrow size={16} /></div>
                <div className="date-block" style={{ textAlign: "right" }}>
                  <span className="lbl" style={{ flexDirection: "row-reverse" }}>{t("nav.checkOut")} <IconCalendar size={11} /></span>
                  <div className="day">{res.checkOut.date} <small>{res.checkOut.year}</small></div>
                  <div className="time">{res.checkOut.day} · {res.checkOut.time}</div>
                </div>
              </div>

              {/* Meta */}
              <div className="meta-grid">
                <div className="meta-item">
                  <div className="lbl">{t("nav.guest")}</div>
                  <div className="val">{res.guests}</div>
                  <div className="sub">{res.guestName}</div>
                </div>
                <div className="meta-item">
                  <div className="lbl">{t("nav.room")}</div>
                  <div className="val">{res.rooms}</div>
                  <div className="sub">{res.roomType}</div>
                </div>
                <div className="meta-item">
                  <div className="lbl">{t("nav.stay")}</div>
                  <div className="val">{res.nights} gece</div>
                  <div className="sub">Kahvaltı dahil</div>
                </div>
              </div>

              {/* Total */}
              <div className="total-row">
                <div className="lhs">
                  <div className="lbl">Ödeme</div>
                  <div className="pay">
                    <span className="card-chip"><IconShield size={11} /> {res.paymentMethod} **** {res.cardLast4}</span>
                  </div>
                </div>
                <div className="rhs">
                  <div className="lbl">{t("nav.paidTotal")}</div>
                  <div className="val">{fmtTL(res.total)}</div>
                  <span className="ok-pill"><IconCheck size={10} /> {t("nav.collected")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={() => {
              if (res.confirmationUrl) {
                window.open(res.confirmationUrl, "_blank", "noopener,noreferrer");
              } else {
                flash(t("toast.receiptPending"));
              }
            }}>
              <DownloadIcon /> {t("nav.downloadPdf")}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => {
              const subject = encodeURIComponent(`Bakoda rezervasyon onayı #${res.code}`);
              const body = encodeURIComponent(`Rezervasyon kodunuz: ${res.code}\nOtel: ${res.hotel}\nTarih: ${res.checkIn.date} - ${res.checkOut.date}`);
              if (!res.email || res.email === "—") {
                flash("E-posta adresi bulunamadı");
                return;
              }
              window.location.href = `mailto:${res.email}?subject=${subject}&body=${body}`;
            }}>
              <MailIcon /> {t("nav.sendEmail")}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => {
              const ics = buildIcs({
                title: `Bakoda Konaklama - ${res.hotel}`,
                location: res.district,
                startDate: sessionStorage.getItem("bakoda_checkin") || "",
                endDate: sessionStorage.getItem("bakoda_checkout") || "",
                description: `Rezervasyon No: ${res.code}`,
              });
              downloadTextFile(`bakoda-${res.code || "rezervasyon"}.ics`, ics, "text/calendar;charset=utf-8");
              flash(t("toast.calendarDownloaded"));
            }}>
              <IconCalendar size={16} /> {t("nav.addToCalendar")}
            </button>
          </div>

          {/* Note */}
          <div className="note">
            <div className="ico"><IconShield size={18} /></div>
            <div>
              <h3>{t("nav.importantInfo")}</h3>
              <p>Otele giriş sırasında geçerli bir <b>kimlik veya pasaport</b> ile <b>rezervasyon numaranızı</b> hazır bulundurun. QR kodu doğrudan resepsiyona göstererek hızlı check-in yapabilirsiniz.</p>
            </div>
          </div>

          {/* Next */}
          <div className="next-step">
            <a href="search-results.html">{t("nav.searchAnother")} <IconArrow size={16} /></a>
          </div>

        </div>
      </div>

      <Footer />
      <Toast on={toast.on} msg={toast.msg} />
    </>
  );
}

// Small icons (inline to avoid bloating icons.jsx)
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" />
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
