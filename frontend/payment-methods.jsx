// Payment Methods — saved cards + billing address (API-backed)

const { useState, useRef, useEffect } = React;

const BrandVisa = () => (
  <svg width="34" height="14" viewBox="0 0 48 16" aria-label="Visa">
    <text x="0" y="13" fontFamily="Inter, sans-serif" fontWeight="900" fontStyle="italic" fontSize="14" fill="#1A1F71" letterSpacing="-.02em">VISA</text>
  </svg>
);
const BrandMC = () => (
  <svg width="34" height="22" viewBox="0 0 32 20" aria-label="Mastercard">
    <circle cx="13" cy="10" r="7" fill="#EB001B" />
    <circle cx="19" cy="10" r="7" fill="#F79E1B" />
    <path d="M16 5.2a7 7 0 0 1 0 9.6 7 7 0 0 1 0-9.6Z" fill="#FF5F00" />
  </svg>
);
const BrandAmex = () => (
  <svg width="38" height="16" viewBox="0 0 50 18" aria-label="American Express">
    <rect width="50" height="18" rx="2" fill="#2E77BB" />
    <text x="25" y="13" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="9" fill="#fff" textAnchor="middle" letterSpacing="-.02em">AMEX</text>
  </svg>
);
const BrandTroy = () => (
  <svg width="38" height="14" viewBox="0 0 50 18" aria-label="Troy">
    <text x="25" y="13" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="11" fill="#00C7B1" textAnchor="middle" letterSpacing="-.01em">troy</text>
  </svg>
);
const BrandFor = (b) => ({ visa: BrandVisa, mc: BrandMC, amex: BrandAmex, troy: BrandTroy })[b] || BrandVisa;

const EditIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4l11-11-4-4L4 16Z" /><path d="m13.5 6.5 4 4" />
  </svg>
);
const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" /><path d="M10 11v6M14 11v6" />
    <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

const EMPTY_BILLING = { name: "", line: "", district: "", city: "", zip: "", country: "Türkiye" };
const EMPTY_CARD_FORM = { number: "", exp: "", name: "", type: "Kredi", isDefault: false };

function detectBrand(num) {
  const d = (num || "").replace(/\D/g, "");
  if (!d) return "visa";
  if (d.startsWith("4")) return "visa";
  if (d.startsWith("34") || d.startsWith("37")) return "amex";
  if (d.startsWith("65") || d.startsWith("9")) return "troy";
  if (d.startsWith("5") || (d.length >= 2 && parseInt(d.slice(0, 2), 10) >= 51 && parseInt(d.slice(0, 2), 10) <= 55)) return "mc";
  return "visa";
}

function parseExp(exp) {
  const m = (exp || "").trim().match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  let year = parseInt(m[2], 10);
  if (year > 99) year = year % 100;
  if (month < 1 || month > 12) return null;
  return { exp_month: month, exp_year: year };
}

function formatExp(month, year) {
  return `${String(month).padStart(2, "0")}/${String(year).padStart(2, "0")}`;
}

function mapCardFromApi(c) {
  return {
    id: c.id,
    brand: c.brand,
    last4: c.last4,
    name: c.holder_name,
    exp: formatExp(c.exp_month, c.exp_year),
    isDefault: c.is_default,
    expired: c.expired,
    type: c.card_type,
  };
}

function apiHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function CardModal({ open, editing, form, errors, saving, onClose, onChange, onSubmit }) {
  if (!open) return null;
  return (
    <div className="pm-overlay" role="dialog" aria-modal="true" aria-labelledby="pm-modal-title">
      <div className="pm-modal">
        <div className="pm-modal-head">
          <h2 id="pm-modal-title">{editing ? "Kartı düzenle" : "Yeni kart ekle"}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Kapat"><IconClose size={16} /></button>
        </div>
        <form onSubmit={onSubmit}>
          {!editing && (
            <div className="field full">
              <label htmlFor="c-number">Kart numarası</label>
              <input id="c-number" className={`input ${errors.number ? "err" : ""}`} inputMode="numeric" autoComplete="cc-number"
                     placeholder="•••• •••• •••• ••••" maxLength={19}
                     value={form.number} onChange={(e) => onChange("number", e.target.value.replace(/\D/g, "").slice(0, 16))} />
              {errors.number && <span className="err-msg">{errors.number}</span>}
              <p className="hint">Tam kart numarası saklanmaz; yalnızca son 4 hane kaydedilir.</p>
            </div>
          )}
          <div className="field">
            <label htmlFor="c-exp">Son kullanma (AA/YY)</label>
            <input id="c-exp" className={`input ${errors.exp ? "err" : ""}`} placeholder="08/27" maxLength={5}
                   value={form.exp} onChange={(e) => onChange("exp", e.target.value)} />
            {errors.exp && <span className="err-msg">{errors.exp}</span>}
          </div>
          <div className="field">
            <label htmlFor="c-type">Kart türü</label>
            <select id="c-type" className="select" value={form.type} onChange={(e) => onChange("type", e.target.value)}>
              <option>Kredi</option><option>Banka</option><option>Debit</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="c-name">Kart üzerindeki isim</label>
            <input id="c-name" className={`input ${errors.name ? "err" : ""}`} autoComplete="cc-name"
                   value={form.name} onChange={(e) => onChange("name", e.target.value)} />
            {errors.name && <span className="err-msg">{errors.name}</span>}
          </div>
          <label className="pm-check">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => onChange("isDefault", e.target.checked)} />
            Varsayılan kart olarak kaydet
          </label>
          <div className="pm-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-cta" disabled={saving}>
              {saving ? "Kaydediliyor…" : (editing ? "Güncelle" : "Kartı kaydet")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const token = localStorage.getItem("bakoda_token");
  const [cards, setCards] = useState([]);
  const [billing, setBilling] = useState(EMPTY_BILLING);
  const [billingSnapshot, setBillingSnapshot] = useState(EMPTY_BILLING);
  const [loading, setLoading] = useState(!!token);
  const [billingDirty, setBillingDirty] = useState(false);
  const [toast, setToast] = useState({ on: false, msg: "" });
  const [modal, setModal] = useState({ open: false, editing: null });
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [cardErrors, setCardErrors] = useState({});
  const [savingCard, setSavingCard] = useState(false);
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({ ...s, on: false })), 2200);
  };

  const loadData = () => {
    const tok = localStorage.getItem("bakoda_token");
    if (!tok) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch("/api/users/me/payment-methods", { headers: apiHeaders(tok) }).then(r => r.ok ? r.json() : []),
      fetch("/api/users/me/billing-address", { headers: apiHeaders(tok) }).then(r => r.ok ? r.json() : null),
    ])
      .then(([cardData, billData]) => {
        if (Array.isArray(cardData)) setCards(cardData.map(mapCardFromApi));
        if (billData) {
          const b = {
            name: billData.name || "",
            line: billData.line || "",
            district: billData.district || "",
            city: billData.city || "",
            zip: billData.zip_code || "",
            country: billData.country || "Türkiye",
          };
          setBilling(b);
          setBillingSnapshot(b);
        }
      })
      .catch(() => flash("Veriler yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [token]);

  const setDefault = async (id) => {
    if (!token) return;
    const res = await fetch(`/api/users/me/payment-methods/${id}/default`, {
      method: "POST",
      headers: apiHeaders(token),
    });
    if (!res.ok) { flash("Varsayılan kart ayarlanamadı"); return; }
    const updated = mapCardFromApi(await res.json());
    setCards(c => c.map(x => ({ ...x, isDefault: x.id === updated.id })));
    flash("Varsayılan kart güncellendi");
  };

  const remove = async (id) => {
    if (!token) return;
    const res = await fetch(`/api/users/me/payment-methods/${id}`, {
      method: "DELETE",
      headers: apiHeaders(token),
    });
    if (!res.ok && res.status !== 204) { flash("Kart kaldırılamadı"); return; }
    setCards(c => {
      const next = c.filter(x => x.id !== id);
      if (next.length && !next.some(x => x.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
    loadData();
    flash("Kart kaldırıldı");
  };

  const openAdd = () => {
    setCardForm({ ...EMPTY_CARD_FORM, name: `${USER.firstName || ""} ${USER.lastName || ""}`.trim(), isDefault: cards.length === 0 });
    setCardErrors({});
    setModal({ open: true, editing: null });
  };

  const openEdit = (card) => {
    setCardForm({ number: "", exp: card.exp, name: card.name, type: card.type, isDefault: card.isDefault });
    setCardErrors({});
    setModal({ open: true, editing: card });
  };

  const closeModal = () => setModal({ open: false, editing: null });

  const changeCardField = (k, v) => {
    setCardForm(f => ({ ...f, [k]: v }));
    if (cardErrors[k]) setCardErrors(e => ({ ...e, [k]: null }));
  };

  const validateCardForm = () => {
    const e = {};
    if (!modal.editing) {
      const digits = cardForm.number.replace(/\D/g, "");
      if (digits.length < 13) e.number = "Geçerli bir kart numarası girin";
    }
    if (!parseExp(cardForm.exp)) e.exp = "Son kullanma AA/YY formatında olmalı";
    if (!cardForm.name.trim()) e.name = "Kart üzerindeki isim gerekli";
    setCardErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitCard = async (ev) => {
    ev.preventDefault();
    if (!token || !validateCardForm()) return;
    const parsed = parseExp(cardForm.exp);
    setSavingCard(true);
    try {
      if (modal.editing) {
        const res = await fetch(`/api/users/me/payment-methods/${modal.editing.id}`, {
          method: "PUT",
          headers: apiHeaders(token),
          body: JSON.stringify({
            holder_name: cardForm.name.trim(),
            exp_month: parsed.exp_month,
            exp_year: parsed.exp_year,
            card_type: cardForm.type,
            is_default: cardForm.isDefault,
          }),
        });
        if (!res.ok) throw new Error();
        const updated = mapCardFromApi(await res.json());
        setCards(c => c.map(x => (x.id === updated.id ? updated : { ...x, isDefault: cardForm.isDefault ? x.id === updated.id : x.isDefault })));
        if (cardForm.isDefault) await setDefault(updated.id);
        flash("Kart güncellendi");
      } else {
        const digits = cardForm.number.replace(/\D/g, "");
        const res = await fetch("/api/users/me/payment-methods", {
          method: "POST",
          headers: apiHeaders(token),
          body: JSON.stringify({
            brand: detectBrand(digits),
            last4: digits.slice(-4),
            holder_name: cardForm.name.trim(),
            exp_month: parsed.exp_month,
            exp_year: parsed.exp_year,
            card_type: cardForm.type,
            is_default: cardForm.isDefault,
          }),
        });
        if (!res.ok) throw new Error();
        const created = mapCardFromApi(await res.json());
        setCards(c => {
          const list = cardForm.isDefault ? c.map(x => ({ ...x, isDefault: false })) : c;
          return [created, ...list];
        });
        flash("Kart eklendi");
      }
      closeModal();
      loadData();
    } catch {
      flash("Kart kaydedilemedi");
    } finally {
      setSavingCard(false);
    }
  };

  const updateBilling = (k, v) => { setBilling({ ...billing, [k]: v }); setBillingDirty(true); };

  const saveBilling = async (ev) => {
    ev.preventDefault();
    if (!token) return;
    try {
      const res = await fetch("/api/users/me/billing-address", {
        method: "PUT",
        headers: apiHeaders(token),
        body: JSON.stringify({
          name: billing.name,
          line: billing.line,
          district: billing.district,
          city: billing.city,
          zip_code: billing.zip,
          country: billing.country,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const b = {
        name: data.name || "",
        line: data.line || "",
        district: data.district || "",
        city: data.city || "",
        zip: data.zip_code || "",
        country: data.country || "Türkiye",
      };
      setBilling(b);
      setBillingSnapshot(b);
      setBillingDirty(false);
      flash("Fatura adresi kaydedildi");
    } catch {
      flash("Fatura adresi kaydedilemedi");
    }
  };

  const resetBilling = () => {
    setBilling(billingSnapshot);
    setBillingDirty(false);
  };

  if (!token) {
    return (
      <ProfileShell active="payment">
        <div className="card fade-in">
          <div className="empty" style={{ padding: "48px 24px" }}>
            <div className="ico-big"><IconWallet size={44} /></div>
            <h2>Ödeme yöntemlerini yönetmek için giriş yapın</h2>
            <p>Kayıtlı kartlarınız ve fatura adresiniz hesabınıza bağlıdır.</p>
            <a href="login.html" className="btn btn-cta">Giriş Yap</a>
          </div>
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell active="payment">
      <div className="card fade-in">
        <div className="card-head">
          <div>
            <h1>Ödeme Yöntemleri</h1>
            <p>Kayıtlı kartlarınızı yönetin ve fatura adresinizi güncel tutun.</p>
          </div>
        </div>

        <div className="section-title">Kayıtlı Kartlar</div>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Yükleniyor…</p>
        ) : (
          <div className="pm-list">
            {cards.map(c => {
              const Brand = BrandFor(c.brand);
              return (
                <div className={`pm ${c.isDefault ? "default" : ""} ${c.expired ? "expired" : ""}`} key={c.id}>
                  <div className="pm-brand"><Brand /></div>
                  <div className="pm-info">
                    <div className="pm-line">•••• •••• •••• {c.last4}</div>
                    <div className="pm-meta">
                      <span><b>{c.name}</b></span>
                      <span>· {c.type} Kartı</span>
                      <span>· Son: {c.exp}</span>
                      {c.expired && <span style={{ color: "var(--error)", fontWeight: 600 }}>· Süresi doldu</span>}
                      {c.isDefault && <span className="pm-badge"><IconCheck size={10} /> Varsayılan</span>}
                    </div>
                  </div>
                  <div className="pm-actions">
                    {!c.isDefault && !c.expired && (
                      <button type="button" title="Varsayılan yap" aria-label="Varsayılan yap" onClick={() => setDefault(c.id)}>
                        <IconCheck size={15} />
                      </button>
                    )}
                    <button type="button" title="Düzenle" aria-label="Düzenle" onClick={() => openEdit(c)}>
                      <EditIcon />
                    </button>
                    <button type="button" title="Kaldır" aria-label="Kaldır" className="danger" onClick={() => remove(c.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}

            {cards.length === 0 && !loading && (
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 8px" }}>
                Henüz kayıtlı kartınız yok. Ödeme sırasında kullanmak için bir kart ekleyin.
              </p>
            )}

            <button className="add-card" type="button" onClick={openAdd}>
              <span className="ico"><IconPlus size={16} /></span>
              <div>
                <div style={{ fontWeight: 500, color: "var(--primary)" }}>Yeni kart ekle</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Visa · Mastercard · American Express · Troy</div>
              </div>
            </button>
          </div>
        )}

        <form onSubmit={saveBilling}>
          <div className="section-title">Fatura Adresi</div>
          <div className="billing-grid">
            <div className="field full">
              <label htmlFor="b-name">Ad Soyad</label>
              <input id="b-name" className="input" value={billing.name} onChange={(e) => updateBilling("name", e.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="b-line">Adres</label>
              <input id="b-line" className="input" value={billing.line} onChange={(e) => updateBilling("line", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="b-district">İlçe / Semt</label>
              <input id="b-district" className="input" value={billing.district} onChange={(e) => updateBilling("district", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="b-city">Şehir</label>
              <input id="b-city" className="input" value={billing.city} onChange={(e) => updateBilling("city", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="b-zip">Posta Kodu</label>
              <input id="b-zip" className="input" value={billing.zip} onChange={(e) => updateBilling("zip", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="b-country">Ülke</label>
              <select id="b-country" className="select" value={billing.country} onChange={(e) => updateBilling("country", e.target.value)}>
                <option>Türkiye</option><option>Almanya</option><option>Birleşik Krallık</option>
                <option>Fransa</option><option>İtalya</option><option>Amerika Birleşik Devletleri</option>
              </select>
            </div>
          </div>
          <div className="save-row">
            <button type="button" className="btn btn-ghost" onClick={resetBilling} disabled={!billingDirty}>Sıfırla</button>
            <button type="submit" className="btn btn-cta" disabled={!billingDirty}>
              <IconCheck size={14} /> Adresi Kaydet
            </button>
          </div>
        </form>
      </div>

      <CardModal
        open={modal.open}
        editing={modal.editing}
        form={cardForm}
        errors={cardErrors}
        saving={savingCard}
        onClose={closeModal}
        onChange={changeCardField}
        onSubmit={submitCard}
      />

      <div className={`toast ${toast.on ? "on" : ""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
