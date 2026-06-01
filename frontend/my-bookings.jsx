// My Bookings — tabs: upcoming / past / cancelled

const { useState, useRef, useMemo, useEffect } = React;

// ── Helpers ────────────────────────────────────────────────────────────
const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
const parseIsoDate = (value) => {
  const txt = String(value || "").trim();
  if (!txt) return null;
  const d = new Date(`${txt}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtDateShort = (d) => {
  const m = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
};
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

function mapBookingRow(b, status) {
  const checkIn = parseIsoDate(b.check_in);
  const checkOut = parseIsoDate(b.check_out);
  const guestCount = Number(b.guests) || 1;
  const roomCount = Number(b.rooms_count) || 1;
  return {
    id: b.id,
    code: b.confirmation_code || `BKD-${b.id}`,
    name: b.hotel_name || "Otel",
    city: b.hotel_city || "",
    hotel_id: b.hotel_id || null,
    thumbnail: b.hotel_thumbnail || null,
    checkIn,
    checkOut,
    guests: `${guestCount} yetişkin · ${roomCount} oda`,
    total: b.total_price,
    status,
  };
}

// ── Booking card ───────────────────────────────────────────────────────
function BookingCard({ b, onAction }) {
  const nights = daysBetween(b.checkIn, b.checkOut);
  const daysUntil = daysBetween(today(), b.checkIn);
  const urgent = daysUntil >= 0 && daysUntil < 3;

  return (
    <article className="booking fade-in">
      <div className="b-img">
        {b.thumbnail
          ? <img src={b.thumbnail} alt={b.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
          : <div className="ph ph-r1" />}
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

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const parseList = async (r) => {
    if (r.status === 401) return { unauthorized: true, data: [] };
    return { unauthorized: false, data: r.ok ? await r.json() : [] };
  };

  const loadBookings = () => {
    const token = localStorage.getItem("bakoda_token");
    if (!token) {
      setLoading(false);
      setAuthError("Rezervasyonlarınızı görmek için giriş yapın.");
      setBookings([]);
      return;
    }
    setAuthError("");
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/users/me/bookings?status=upcoming", { headers }).then(parseList),
      fetch("/api/users/me/bookings?status=past", { headers }).then(parseList),
      fetch("/api/users/me/bookings?status=cancelled", { headers }).then(parseList),
    ])
      .then(([upcoming, past, cancelled]) => {
        if (upcoming.unauthorized || past.unauthorized || cancelled.unauthorized) {
          localStorage.removeItem("bakoda_token");
          localStorage.removeItem("bakoda_user");
          setAuthError("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
          setBookings([]);
          return;
        }
        const rows = [
          ...(Array.isArray(upcoming.data) ? upcoming.data.map((b) => mapBookingRow(b, "upcoming")) : []),
          ...(Array.isArray(past.data) ? past.data.map((b) => mapBookingRow(b, "past")) : []),
          ...(Array.isArray(cancelled.data) ? cancelled.data.map((b) => mapBookingRow(b, "cancelled")) : []),
        ];
        setBookings(rows);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
    const onVisible = () => { if (document.visibilityState === "visible") loadBookings(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const counts = useMemo(() => ({
    upcoming:  bookings.filter(b => b.status === "upcoming").length,
    past:      bookings.filter(b => b.status === "past").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  }), [bookings]);

  const filtered = bookings.filter(b => b.status === tab);

  const onAction = async (kind, b) => {
    const token = localStorage.getItem("bakoda_token");
    if (kind === "detay") {
      window.location.href = `booking-detail.html?id=${b.id}`;
    }
    if (kind === "iptal") {
      try {
        const res = await fetch(`/api/bookings/${b.id}/cancel`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "cancelled" } : x));
          flash(`${b.name} rezervasyonu iptal edildi`);
        } else {
          flash("İptal işlemi başarısız oldu");
        }
      } catch { flash("İptal işlemi başarısız oldu"); }
    }
    if (kind === "rebook") window.location.href = "hotel-detail.html" + (b.hotel_id ? "?id=" + b.hotel_id : "");
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

        {authError ? (
          <div className="empty">
            <div className="ico"><IconCalendar size={32} /></div>
            <h2>{authError}</h2>
            <a href="login.html" className="btn btn-cta">Giriş Yap <IconArrow size={14} /></a>
          </div>
        ) : loading ? (
          <div className="empty">
            <h2>Rezervasyonlar yükleniyor…</h2>
          </div>
        ) : filtered.length > 0 ? (
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
