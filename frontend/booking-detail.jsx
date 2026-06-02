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
const toIsoDate = (value) => {
  const txt = String(value || "").trim();
  return txt ? txt.slice(0, 10) : "";
};

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

  // Edit (update) state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [form, setForm] = useState({ check_in: "", check_out: "", guests: 1, rooms_count: 1 });

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

  // Auto-open the edit form when arriving via "?edit=1" on an upcoming booking.
  useEffect(() => {
    if (booking && qs.get("edit") === "1" && bookingUiStatus(booking) === "upcoming") {
      openEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  const openEdit = () => {
    if (!booking) return;
    setForm({
      check_in: toIsoDate(booking.check_in),
      check_out: toIsoDate(booking.check_out),
      guests: Number(booking.guests) || 1,
      rooms_count: Number(booking.rooms_count) || 1,
    });
    setFormError("");
    setFormMsg("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormError("");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormMsg("");

    if (!form.check_in || !form.check_out) {
      setFormError("Giriş ve çıkış tarihlerini girin.");
      return;
    }
    if (form.check_out <= form.check_in) {
      setFormError("Çıkış tarihi girişten sonra olmalı.");
      return;
    }

    const token = localStorage.getItem("bakoda_token");
    if (!token) {
      setFormError("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          check_in: form.check_in,
          check_out: form.check_out,
          guests: Number(form.guests) || 1,
          rooms_count: Number(form.rooms_count) || 1,
        }),
      });

      let body = null;
      try { body = await res.json(); } catch {}

      if (res.status === 401) {
        localStorage.removeItem("bakoda_token");
        localStorage.removeItem("bakoda_user");
        setFormError("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
        return;
      }
      if (res.status === 409) {
        setFormError(body?.detail || "Seçilen tarihlerde oda müsait değil.");
        return;
      }
      if (!res.ok) {
        setFormError(body?.detail || "Rezervasyon güncellenemedi.");
        return;
      }

      setBooking(body);
      setEditing(false);
      setFormMsg("Rezervasyon güncellendi.");
    } catch {
      setFormError("Rezervasyon güncellenemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

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

                {formMsg && !editing ? (
                  <div className="form-note ok" role="status">{formMsg}</div>
                ) : null}

                {editing ? (
                  <form className="edit-form" onSubmit={saveEdit}>
                    <h3>Rezervasyonu Düzenle</h3>
                    <div className="edit-grid">
                      <label className="fld">
                        <span>Giriş tarihi</span>
                        <input
                          type="date"
                          value={form.check_in}
                          onChange={(e) => setForm((s) => ({ ...s, check_in: e.target.value }))}
                          required
                        />
                      </label>
                      <label className="fld">
                        <span>Çıkış tarihi</span>
                        <input
                          type="date"
                          value={form.check_out}
                          onChange={(e) => setForm((s) => ({ ...s, check_out: e.target.value }))}
                          required
                        />
                      </label>
                      <label className="fld">
                        <span>Misafir</span>
                        <input
                          type="number"
                          min="1"
                          value={form.guests}
                          onChange={(e) => setForm((s) => ({ ...s, guests: e.target.value }))}
                        />
                      </label>
                      <label className="fld">
                        <span>Oda</span>
                        <input
                          type="number"
                          min="1"
                          value={form.rooms_count}
                          onChange={(e) => setForm((s) => ({ ...s, rooms_count: e.target.value }))}
                        />
                      </label>
                    </div>

                    {formError ? (
                      <div className="form-note err" role="alert">{formError}</div>
                    ) : null}

                    <div className="edit-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>
                        Vazgeç
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="detail-actions">
                  {uiStatus === "upcoming" && !editing ? (
                    <button type="button" className="btn btn-primary" onClick={openEdit}>
                      Düzenle
                    </button>
                  ) : null}
                  {booking.confirmation_url ? (
                    <a className="btn btn-secondary" href={booking.confirmation_url} target="_blank" rel="noopener noreferrer">
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
