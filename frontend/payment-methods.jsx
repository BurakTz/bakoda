// Payment Methods — saved cards + billing address

const { useState, useRef } = React;

// ── Brand logos (inline so we don't bloat icons.jsx) ─────────────
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
const BrandFor = (b) => ({visa: BrandVisa, mc: BrandMC, amex: BrandAmex, troy: BrandTroy})[b] || BrandVisa;

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

const INITIAL_CARDS = [
  { id: 1, brand: "visa", last4: "4521", name: "Selin Karaca", exp: "08/27", isDefault: true,  expired: false, type: "Kredi" },
  { id: 2, brand: "mc",   last4: "8841", name: "Selin Karaca", exp: "11/26", isDefault: false, expired: false, type: "Banka" },
  { id: 3, brand: "amex", last4: "1003", name: "Selin Karaca", exp: "03/25", isDefault: false, expired: true,  type: "Kredi" },
];

function App() {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [billing, setBilling] = useState({
    name: "Selin Karaca",
    line: "Bağdat Caddesi No: 124, Daire 3",
    district: "Suadiye, Kadıköy",
    city: "İstanbul", zip: "34740", country: "Türkiye",
  });
  const [billingDirty, setBillingDirty] = useState(false);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2200);
  };

  const setDefault = (id) => {
    setCards(c => c.map(x => ({ ...x, isDefault: x.id === id })));
    flash("Varsayılan kart güncellendi");
  };
  const remove = (id) => {
    setCards(c => c.filter(x => x.id !== id));
    flash("Kart kaldırıldı");
  };
  const updateBilling = (k, v) => { setBilling({...billing, [k]: v}); setBillingDirty(true); };
  const saveBilling = (ev) => { ev.preventDefault(); setBillingDirty(false); flash("Fatura adresi kaydedildi"); };

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

        <div className="pm-list">
          {cards.map(c => {
            const Brand = BrandFor(c.brand);
            return (
              <div className={`pm ${c.isDefault?"default":""} ${c.expired?"expired":""}`} key={c.id}>
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
                    <button title="Varsayılan yap" aria-label="Varsayılan yap" onClick={() => setDefault(c.id)}>
                      <IconCheck size={15} />
                    </button>
                  )}
                  <button title="Düzenle" aria-label="Düzenle" onClick={() => flash("Kart düzenleme açıldı")}>
                    <EditIcon />
                  </button>
                  <button title="Kaldır" aria-label="Kaldır" className="danger" onClick={() => remove(c.id)}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}

          <button className="add-card" type="button" onClick={() => flash("Yeni kart ekleme penceresi açılıyor…")}>
            <span className="ico"><IconPlus size={16} /></span>
            <div>
              <div style={{ fontWeight: 500, color: "var(--primary)" }}>Yeni kart ekle</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Visa · Mastercard · American Express · Troy</div>
            </div>
          </button>
        </div>

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
            <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>Sıfırla</button>
            <button type="submit" className="btn btn-cta" disabled={!billingDirty}>
              <IconCheck size={14} /> Adresi Kaydet
            </button>
          </div>
        </form>
      </div>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
