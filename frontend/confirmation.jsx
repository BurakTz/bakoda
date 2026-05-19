// Confirmation page — single-column success layout

const { useState, useRef, useEffect } = React;

// ── Data ──────────────────────────────────────────────────────────────
const RES = {
  code: "BKD-2026-48291",
  email: "selin@ornek.com",
  guestName: "Selin Karaca",
  hotel: "Çırağan Palace Suites",
  district: "İstanbul, Beşiktaş",
  checkIn:  { date: "26 Mayıs",   year: 2026, day: "Pazartesi", time: "15:00 itibaren" },
  checkOut: { date: "29 Mayıs",   year: 2026, day: "Perşembe", time: "12:00'ye kadar" },
  guests: "2 yetişkin",
  rooms:  "1 oda",
  roomType: "Deluxe Süit",
  total: 26052,
  paymentMethod: "Visa",
  cardLast4: "4521",
};

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
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({ ...s, on: false })), 2400);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(RES.code);
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
              Onay e-postası gönderildi: <b>{RES.email}</b>
            </div>
          </div>

          {/* Reservation card */}
          <div className="card">
            <div className="card-head">
              <div className="head-left">
                <div className="lbl">Rezervasyon No</div>
                <div className="code">
                  #{RES.code}
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
                  <div className="hotel-name">{RES.hotel}</div>
                  <div className="hotel-loc"><IconMapPin size={12} /> {RES.district}</div>
                </div>
              </div>

              {/* Dates */}
              <div className="dates">
                <div className="date-block">
                  <span className="lbl"><IconCalendar size={11} /> Giriş</span>
                  <div className="day">{RES.checkIn.date} <small>{RES.checkIn.year}</small></div>
                  <div className="time">{RES.checkIn.day} · {RES.checkIn.time}</div>
                </div>
                <div className="date-arrow"><IconArrow size={16} /></div>
                <div className="date-block" style={{ textAlign: "right" }}>
                  <span className="lbl" style={{ flexDirection: "row-reverse" }}>Çıkış <IconCalendar size={11} /></span>
                  <div className="day">{RES.checkOut.date} <small>{RES.checkOut.year}</small></div>
                  <div className="time">{RES.checkOut.day} · {RES.checkOut.time}</div>
                </div>
              </div>

              {/* Meta */}
              <div className="meta-grid">
                <div className="meta-item">
                  <div className="lbl">Misafir</div>
                  <div className="val">{RES.guests}</div>
                  <div className="sub">{RES.guestName}</div>
                </div>
                <div className="meta-item">
                  <div className="lbl">Oda</div>
                  <div className="val">{RES.rooms}</div>
                  <div className="sub">{RES.roomType}</div>
                </div>
                <div className="meta-item">
                  <div className="lbl">Konaklama</div>
                  <div className="val">3 gece</div>
                  <div className="sub">Kahvaltı dahil</div>
                </div>
              </div>

              {/* Total */}
              <div className="total-row">
                <div className="lhs">
                  <div className="lbl">Ödeme</div>
                  <div className="pay">
                    <span className="card-chip"><IconShield size={11} /> {RES.paymentMethod} **** {RES.cardLast4}</span>
                  </div>
                </div>
                <div className="rhs">
                  <div className="lbl">Toplam Ödendi</div>
                  <div className="val">{fmtTL(RES.total)}</div>
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
            <button className="btn btn-secondary" type="button" onClick={() => flash(`Onay yeniden gönderildi: ${RES.email}`)}>
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
