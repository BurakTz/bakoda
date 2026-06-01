// Booking detail — reservation summary (not hotel marketing page)

const { useState, useEffect } = React;

const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);
const MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const parseIsoDate = (value) => {
  const txt = String(value || "").trim();
  if (!txt) return null;
  const d = new Date(`${txt}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtDateLong = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

function bookingUiStatus(b) {
  if (b.status === "cancelled") return "cancelled";
  const co = parseIsoDate(b.check_out);
  if (co && co < today()) return "past";
  return "upcoming";
}

const STATUS_LABEL = {
  upcoming: { cls: "ok", text: "Onaylandı" },
  past: { cls: "past", text: "Tamamlandı" },
  cancelled: { cls: "canceled", text: "İptal Edildi" },
};

function App() {
  const qs = new URLSearchParams(window.location.search);
  const bookingId = Number.parseInt(qs.get("id") || "", 10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!Number.isFinite(bookingId) || bookingId < 1) {
      setError("Geçersiz rezervasyon bağlantısı.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("bakoda_token");
    if (!token) {
      setError("Rezervasyon detayını görmek için giriş yapın.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/users/me/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        let body = null;
        try { body = await r.json(); } catch {}
        if (r.status === 401) {
          localStorage.removeItem("bakoda_token");
          localStorage.removeItem("bakoda_user");
          throw new Error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
        }
        if (!r.ok) throw new Error(body?.detail || "Rezervasyon bulunamadı.");
        return body;
      })
      .then((data) => setBooking(data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err?.message || "Rezervasyon yüklenemedi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [bookingId]);

  const uiStatus = booking ? bookingUiStatus(booking) : "upcoming";
  const statusInfo = STATUS_LABEL[uiStatus] || STATUS_LABEL.upcoming;
  const checkIn = booking ? parseIsoDate(booking.check_in) : null;
  const checkOut = booking ? parseIsoDate(booking.check_out) : null;
  const nights = checkIn && checkOut ? Math.max(1, daysBetween(checkIn, checkOut)) : 0;

  return (
    <ProfileShell active="bookings">
      <div className="fade-in">
        <a href="my-bookings.html" className="back-link">
          <IconArrow size={14} style={{ transform: "rotate(180deg)" }} /> Rezervasyonlarıma Dön
        </a>

        {loading ? (
          <div className="empty"><h2>Rezervasyon yükleniyor…</h2></div>
        ) : error ? (
          <div className="empty">
            <h2>{error}</h2>
            {error.includes("giriş") || error.includes("Oturum") ? (
              <a href="login.html" className="btn btn-cta">Giriş Yap <IconArrow size={14} /></a>
            ) : (
              <a href="my-bookings.html" className="btn btn-secondary">Listeye Dön</a>
            )}
          </div>
        ) : booking ? (
          <>
            <div className="head-row">
              <div>
                <h1>Rezervasyon Detayı</h1>
                <p>#{booking.confirmation_code || `BKD-${booking.id}`}</p>
              </div>
              <span className={`detail-status ${statusInfo.cls}`}>
                <span className="dot" /> {statusInfo.text}
              </span>
            </div>

            <article className="detail-card">
              <div className="detail-hero">
                <div className="detail-img">
                  {booking.hotel_thumbnail
                    ? <img src={booking.hotel_thumbnail} alt={booking.hotel_name || "Otel"} loading="lazy" />
                    : <div className="ph ph-r1" />}
                </div>
                <div className="detail-head">
                  <div className="detail-hotel">{booking.hotel_name || "Otel"}</div>
                  <div className="detail-loc">
                    <IconMapPin size={14} /> {booking.hotel_city || "—"}
                  </div>
                  <div className="detail-code">
                    REZERVASYON · #{booking.confirmation_code || `BKD-${booking.id}`}
                  </div>
                  <div className="detail-code" style={{ marginTop: 0 }}>
                    Oluşturulma: {booking.created_at
                      ? new Date(booking.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="detail-body">
                <div className="detail-dates">
                  <div className="date-col">
                    <div className="lbl">Giriş</div>
                    <div className="val">{fmtDateLong(checkIn)}</div>
                    <div className="sub">15:00 itibaren</div>
                  </div>
                  <div className="date-arrow"><IconArrow size={18} /></div>
                  <div className="date-col" style={{ textAlign: "right" }}>
                    <div className="lbl">Çıkış</div>
                    <div className="val">{fmtDateLong(checkOut)}</div>
                    <div className="sub">12:00&apos;ye kadar</div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="item">
                    <div className="lbl">Misafir</div>
                    <div className="val">{booking.guests || 1} yetişkin</div>
                    <div className="sub">{booking.guest_name}</div>
                  </div>
                  <div className="item">
                    <div className="lbl">Oda</div>
                    <div className="val">{booking.rooms_count || 1} oda</div>
                    <div className="sub">{booking.room_name || "Standart oda"}</div>
                  </div>
                  <div className="item">
                    <div className="lbl">Konaklama</div>
                    <div className="val">{nights} gece</div>
                    <div className="sub">{booking.guest_email}</div>
                  </div>
                </div>

                {booking.phone ? (
                  <div className="detail-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="item">
                      <div className="lbl">İletişim</div>
                      <div className="val">{booking.phone}</div>
                    </div>
                  </div>
                ) : null}

                <div className="detail-total">
                  <div>
                    <div className="lbl">{uiStatus === "cancelled" ? "İade tutarı" : uiStatus === "past" ? "Ödenen" : "Toplam"}</div>
                    <div className="price">{fmtTL(booking.total_price)}</div>
                  </div>
                </div>

                <div className="detail-actions">
                  {booking.confirmation_url ? (
                    <a className="btn btn-primary" href={booking.confirmation_url} target="_blank" rel="noopener noreferrer">
                      Onay Belgesini İndir
                    </a>
                  ) : null}
                  {uiStatus === "upcoming" && booking.hotel_id ? (
                    <a className="btn btn-secondary" href={`hotel-detail.html?id=${booking.hotel_id}`}>
                      Otel Sayfası
                    </a>
                  ) : uiStatus !== "upcoming" && booking.hotel_id ? (
                    <a className="btn btn-secondary" href={`hotel-detail.html?id=${booking.hotel_id}`}>
                      Yeniden Rezervasyon
                    </a>
                  ) : null}
                  <a className="btn btn-ghost" href="my-bookings.html">Tüm Rezervasyonlar</a>
                </div>
              </div>
            </article>
          </>
        ) : null}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
