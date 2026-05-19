// My Bookings — tabs: upcoming / past / cancelled

const { useState, useRef, useMemo } = React;

const BOOKINGS = [
  // Upcoming
  { id: 1, status: "upcoming", code: "BKD-2026-48291",
    name: "Çırağan Palace Suites", city: "İstanbul, Beşiktaş",
    checkIn: new Date(2026, 4, 26), checkOut: new Date(2026, 4, 29),
    guests: "2 yetişkin · 1 oda", total: 26052, ph: "ph-b1", note: "luxe · waterfront" },
  { id: 2, status: "upcoming", code: "BKD-2026-47010",
    name: "Villa Ananda Ubud", city: "Bali, Ubud",
    checkIn: new Date(2026, 5, 18), checkOut: new Date(2026, 5, 22),
    guests: "2 yetişkin · 1 villa", total: 18400, ph: "ph-b2", note: "retreat · jungle" },

  // Past
  { id: 3, status: "past", code: "BKD-2025-12044",
    name: "Maison Lumière Marais", city: "Paris, 3. Bölge",
    checkIn: new Date(2025, 8, 12), checkOut: new Date(2025, 8, 15),
    guests: "2 yetişkin · 1 oda", total: 14200, ph: "ph-b3", note: "boutique · marais" },
  { id: 4, status: "past", code: "BKD-2025-09887",
    name: "The Cappadocia Cave Resort", city: "Nevşehir, Ürgüp",
    checkIn: new Date(2025, 7, 3), checkOut: new Date(2025, 7, 6),
    guests: "2 yetişkin · 1 oda", total: 18600, ph: "ph-b4", note: "stone · honey" },
  { id: 5, status: "past", code: "BKD-2024-11220",
    name: "Casa Solana Riviera", city: "Antalya, Kalkan",
    checkIn: new Date(2024, 6, 22), checkOut: new Date(2024, 6, 26),
    guests: "2 yetişkin · 1 oda", total: 23200, ph: "ph-b5", note: "terracotta · sea" },
  { id: 6, status: "past", code: "BKD-2024-08114",
    name: "Pera Loft House", city: "İstanbul, Beyoğlu",
    checkIn: new Date(2024, 3, 18), checkOut: new Date(2024, 3, 20),
    guests: "2 yetişkin · 1 oda", total: 6400, ph: "ph-b6", note: "atelier · roof view" },
  { id: 7, status: "past", code: "BKD-2024-04007",
    name: "Hammam Heritage Sultanahmet", city: "İstanbul, Sultanahmet",
    checkIn: new Date(2024, 1, 10), checkOut: new Date(2024, 1, 12),
    guests: "1 yetişkin · 1 oda", total: 5600, ph: "ph-b7", note: "stone · old city" },

  // Cancelled
  { id: 8, status: "cancelled", code: "BKD-2025-19770",
    name: "Bosphorus Bay Hotel", city: "İstanbul, Tarabya",
    checkIn: new Date(2025, 10, 5), checkOut: new Date(2025, 10, 8),
    guests: "2 yetişkin · 1 oda", total: 19200, ph: "ph-b8", note: "modern · sea" },
];

// ── Placeholder colors ─────────────────────────────────────────────────
const styles = document.createElement("style");
styles.textContent = `
  .ph-b1 { background: #4f7a73; } .ph-b2 { background: #5d8678; } .ph-b3 { background: #6a657e; }
  .ph-b4 { background: #8a7b59; } .ph-b5 { background: #9b6a52; } .ph-b6 { background: #8b6a48; }
  .ph-b7 { background: #6f4a3a; } .ph-b8 { background: #4a6b82; }
`;
document.head.appendChild(styles);

// ── Helpers ────────────────────────────────────────────────────────────
const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
const fmtDateShort = (d) => {
  const m = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
};
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

// ── Booking card ───────────────────────────────────────────────────────
function BookingCard({ b, onAction }) {
  const nights = daysBetween(b.checkIn, b.checkOut);
  // Pretend "today" is the actual current date — the demo booking 1 is set for May 26 2026 (~1 week from now in the demo)
  const daysUntil = daysBetween(today(), b.checkIn);
  const urgent = daysUntil >= 0 && daysUntil < 3;

  return (
    <article className="booking fade-in">
      <div className="b-img">
        <div className={`ph ${b.ph}`} />
        <div className="ph-label">[ {b.note} ]</div>
        {b.status === "upcoming" && daysUntil >= 0 && (
          <span className={`countdown ${urgent ? "urgent":""}`}>
            <span className="dot" />
            {daysUntil === 0 ? "Bugün giriş!" : `${daysUntil} gün kaldı`}
          </span>
        )}
      </div>

      <div className="b-body">
        <div className="b-name">{b.name}</div>
        <div className="b-loc"><IconMapPin size={13} /> {b.city}</div>

        <div className="b-meta">
          <div className="b-meta-item">
            <div className="lbl">Giriş</div>
            <div className="val">{fmtDateShort(b.checkIn)}</div>
          </div>
          <div className="b-meta-item">
            <div className="lbl">Çıkış</div>
            <div className="val">{fmtDateShort(b.checkOut)}</div>
          </div>
          <div className="b-meta-item">
            <div className="lbl">Konaklama</div>
            <div className="val">{nights} gece</div>
          </div>
          <div className="b-meta-item">
            <div className="lbl">Misafir</div>
            <div className="val">{b.guests}</div>
          </div>
        </div>
        <div className="b-code">REZERVASYON · #{b.code}</div>
      </div>

      <div className="b-side">
        <span className={`b-status ${b.status === "upcoming" ? "ok" : b.status === "past" ? "past" : "canceled"}`}>
          <span className="dot" />
          {b.status === "upcoming" ? "Onaylandı" : b.status === "past" ? "Tamamlandı" : "İptal"}
        </span>

        <div className="b-price">
          <div className="lbl">{b.status === "upcoming" ? "Toplam" : b.status === "past" ? "Ödenen" : "İade Edildi"}</div>
          <b>{fmtTL(b.total)}</b>
        </div>

        <div className="b-actions">
          <button className="btn btn-primary" onClick={() => onAction("detay", b)}>
            <IconArrow size={13} /> Detayları Gör
          </button>
          {b.status === "upcoming" ? (
            <button className="btn btn-danger" onClick={() => onAction("iptal", b)}>İptal Et</button>
          ) : (
            <button className="btn btn-secondary" onClick={() => onAction("rebook", b)}>Yeniden Rezervasyon</button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── App ────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState("upcoming");
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const counts = useMemo(() => ({
    upcoming:  BOOKINGS.filter(b => b.status === "upcoming").length,
    past:      BOOKINGS.filter(b => b.status === "past").length,
    cancelled: BOOKINGS.filter(b => b.status === "cancelled").length,
  }), []);

  const filtered = BOOKINGS.filter(b => b.status === tab);

  const onAction = (kind, b) => {
    if (kind === "detay")  window.location.href = "hotel-detail.html";
    if (kind === "iptal")  flash(`${b.name} için iptal isteği iletildi`);
    if (kind === "rebook") window.location.href = "hotel-detail.html";
  };

  return (
    <ProfileShell active="bookings">
      <div className="fade-in">
        <div className="head-row">
          <div>
            <h1>Rezervasyonlarım</h1>
            <p>Yaklaşan ve geçmiş tüm rezervasyonların tek yerde.</p>
          </div>
          <a href="search-results.html" className="btn btn-cta"><IconPlus size={14} /> Yeni Rezervasyon</a>
        </div>

        <div className="tabs" role="tablist">
          <button className={`tab ${tab==="upcoming"?"active":""}`}  onClick={() => setTab("upcoming")}>
            Yaklaşan <span className="count">{counts.upcoming}</span>
          </button>
          <button className={`tab ${tab==="past"?"active":""}`}      onClick={() => setTab("past")}>
            Geçmiş <span className="count">{counts.past}</span>
          </button>
          <button className={`tab ${tab==="cancelled"?"active":""}`} onClick={() => setTab("cancelled")}>
            İptal <span className="count">{counts.cancelled}</span>
          </button>
        </div>

        {filtered.length > 0 ? (
          <div className="booking-list">
            {filtered.map(b => <BookingCard key={b.id} b={b} onAction={onAction} />)}
          </div>
        ) : (
          <div className="empty">
            <div className="ico"><IconCalendar size={32} /></div>
            <h2>Bu kategoride rezervasyon yok</h2>
            <p>Yeni bir konaklama planlamak için otelleri keşfedin.</p>
            <a href="search-results.html" className="btn btn-cta">Otelleri Keşfet <IconArrow size={14} /></a>
          </div>
        )}
      </div>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
