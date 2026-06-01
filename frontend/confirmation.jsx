// Confirmation page — single-column success layout

const { useState, useRef, useEffect } = React;

const DAYS_TR = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const MONTHS_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
function parseCheckDate(s, checkInTime, checkOutTime, isOut) {
  if (!s) return { date: "—", year: 2026, day: "—", time: isOut ? "12:00'ye kadar" : "15:00 itibaren" };
  const d = new Date(s);
  return {
    date: `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`,
    year: d.getFullYear(),
    day: DAYS_TR[d.getDay()],
    time: isOut ? (checkOutTime ? checkOutTime + "'ye kadar" : "12:00'ye kadar") : (checkInTime ? checkInTime + " itibaren" : "15:00 itibaren"),
  };
}

const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);

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
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState({ on: false, msg: "" });
  const [res, setRes] = useState({
    code: "—", email: "—", guestName: "—",
    hotel: "—", district: "—",
    checkIn:  { date: "—", year: 2026, day: "—", time: "15:00 itibaren" },
    checkOut: { date: "—", year: 2026, day: "—", time: "12:00'ye kadar" },
    guests: "—", rooms: "1 oda", roomType: "—",
    total: 0, paymentMethod: "Kart", cardLast4: "****",
    nights: 1,
  });
  const toastT = useRef(null);

  useEffect(() => {
    const bookingId = sessionStorage.getItem("bakoda_booking_id");
    const hotelId   = sessionStorage.getItem("bakoda_hotel_id");

    const fetchAll = async () => {
      let booking = null, hotel = null;
      if (bookingId) {
        try { const r = await fetch(`/api/bookings/${bookingId}`); booking = await r.json(); } catch {}
      }
      if (hotelId) {
        try { const r = await fetch(`/api/hotels/${hotelId}`); hotel = await r.json(); } catch {}
      }
      if (!booking?.id) return;
      const nights = booking.check_in && booking.check_out
        ? Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000) : 1;
      setRes(prev => ({
        ...prev,
        code:         booking.confirmation_code || prev.code,
        email:        booking.guest_email || prev.email,
        guestName:    booking.guest_name  || prev.guestName,
        checkIn:      parseCheckDate(booking.check_in,  hotel?.check_in_time,  hotel?.check_out_time, false),
        checkOut:     parseCheckDate(booking.check_out, hotel?.check_in_time,  hotel?.check_out_time, true),
        guests:       `${booking.guests || 1} yetişkin`,
        rooms:        `${booking.rooms_count || 1} oda`,
        total:        booking.total_price || prev.total,
        nights,
        hotel:        hotel?.name    || prev.hotel,
        district:     hotel ? `${hotel.city}${hotel.district ? ", " + hotel.district : ""}` : prev.district,
      }));
    };
    fetchAll();
  }, []);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({ ...s, on: false })), 2400);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(res.code);
      setCopied(true);
      flash("Rezervasyon kodu panoya kopyalandı");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      flash("Kopyalanamadı — manuel olarak seçin");
    }
  };

  return (
    <>
      <Navbar active="Oteller" onSignup={() => flash("Kayıt sayfasına yönlendiriliyorsunuz…")} />

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
            <h1>Rezervasyonunuz Onaylandı</h1>
            <div className="email-line">
              Onay e-postası gönderildi: <b>{res.email}</b>
            </div>
          </div>

          {/* Reservation card */}
          <div className="card">
            <div className="card-head">
              <div className="head-left">
                <div className="lbl">Rezervasyon No</div>
                <div className="code">
                  #{res.code}
                  <button className={`copy-btn ${copied ? "copied" : ""}`} type="button" aria-label="Kodu kopyala" onClick={copyCode}>
                    {copied ? <IconCheck size={14} /> : <CopyIcon />}
                  </button>
                </div>
                <span className="badge"><span className="dot" /> Onaylandı</span>
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
                  <span className="lbl"><IconCalendar size={11} /> Giriş</span>
                  <div className="day">{res.checkIn.date} <small>{res.checkIn.year}</small></div>
                  <div className="time">{res.checkIn.day} · {res.checkIn.time}</div>
                </div>
                <div className="date-arrow"><IconArrow size={16} /></div>
                <div className="date-block" style={{ textAlign: "right" }}>
                  <span className="lbl" style={{ flexDirection: "row-reverse" }}>Çıkış <IconCalendar size={11} /></span>
                  <div className="day">{res.checkOut.date} <small>{res.checkOut.year}</small></div>
                  <div className="time">{res.checkOut.day} · {res.checkOut.time}</div>
                </div>
              </div>

              {/* Meta */}
              <div className="meta-grid">
                <div className="meta-item">
                  <div className="lbl">Misafir</div>
                  <div className="val">{res.guests}</div>
                  <div className="sub">{res.guestName}</div>
                </div>
                <div className="meta-item">
                  <div className="lbl">Oda</div>
                  <div className="val">{res.rooms}</div>
                  <div className="sub">{res.roomType}</div>
                </div>
                <div className="meta-item">
                  <div className="lbl">Konaklama</div>
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
                  <div className="lbl">Toplam Ödendi</div>
                  <div className="val">{fmtTL(res.total)}</div>
                  <span className="ok-pill"><IconCheck size={10} /> Tahsil Edildi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={() => flash("PDF makbuz indiriliyor…")}>
              <DownloadIcon /> PDF İndir
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => flash(`Onay yeniden gönderildi: ${res.email}`)}>
              <MailIcon /> E-posta Gönder
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => flash("Takvim dosyası (.ics) indirildi")}>
              <IconCalendar size={16} /> Takvime Ekle
            </button>
          </div>

          {/* Note */}
          <div className="note">
            <div className="ico"><IconShield size={18} /></div>
            <div>
              <h3>Check-in için önemli bilgi</h3>
              <p>Otele giriş sırasında geçerli bir <b>kimlik veya pasaport</b> ile <b>rezervasyon numaranızı</b> hazır bulundurun. QR kodu doğrudan resepsiyona göstererek hızlı check-in yapabilirsiniz.</p>
            </div>
          </div>

          {/* Next */}
          <div className="next-step">
            <a href="search-results.html">Başka bir otel ara <IconArrow size={16} /></a>
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
