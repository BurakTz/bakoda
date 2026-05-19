// Security — password change, 2FA, sessions

const { useState, useRef, useMemo } = React;

const Eye = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18" />
    <path d="M10.6 6.18A10.3 10.3 0 0 1 12 6c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.07" />
    <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7c1.86 0 3.5-.45 4.92-1.18" />
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
  </svg>
);
const Desktop = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Icon>
);
const Phone = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <rect x="6" y="3" width="12" height="18" rx="2.5" />
    <path d="M10 18h4" />
  </Icon>
);
const Tablet = (p) => (
  <Icon {...p} strokeWidth="1.6">
    <rect x="4" y="3" width="16" height="18" rx="2.5" />
    <path d="M10 18h4" />
  </Icon>
);

function strengthOf(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12 && s < 2) s = 2;
  return Math.max(1, s);
}
const LABELS = ["", "Zayıf", "Orta", "Güçlü", "Mükemmel"];

const SESSIONS = [
  { id: 1, device: "MacBook Pro · Chrome", os: "macOS 14.5", city: "İstanbul, Türkiye", ip: "85.105.20.144", when: "Şu an aktif", current: true,  ico: Desktop },
  { id: 2, device: "iPhone 15 · Safari",   os: "iOS 17.4",  city: "İstanbul, Türkiye", ip: "85.105.20.145", when: "2 saat önce", current: false, ico: Phone },
  { id: 3, device: "iPad · Chrome",        os: "iPadOS 17", city: "Ankara, Türkiye",   ip: "78.180.5.211",  when: "3 gün önce", current: false, ico: Tablet },
  { id: 4, device: "Windows · Edge",       os: "Windows 11",city: "Paris, Fransa",     ip: "92.135.40.18",  when: "2 hafta önce", current: false, ico: Desktop },
];

function App() {
  const [pw, setPw]       = useState({ current: "", next: "", confirm: "" });
  const [show, setShow]   = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});

  const [twoFA, setTwoFA]         = useState(true);
  const [loginAlerts, setAlerts]  = useState(true);
  const [newDevice, setNewDevice] = useState(true);

  const [sessions, setSessions] = useState(SESSIONS);

  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const strength = useMemo(() => strengthOf(pw.next), [pw.next]);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const setPwField = (k, v) => { setPw({...pw, [k]: v}); if (errors[k]) setErrors({...errors, [k]: null}); };

  const changePw = (ev) => {
    ev.preventDefault();
    const e = {};
    if (!pw.current) e.current = "Mevcut şifrenizi girin";
    if (!pw.next)    e.next    = "Yeni şifrenizi girin";
    else if (strength < 2) e.next = "Daha güçlü bir şifre seçin";
    if (pw.confirm !== pw.next) e.confirm = "Şifreler eşleşmiyor";
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setPw({ current: "", next: "", confirm: "" });
      flash("Şifreniz güncellendi");
    }
  };

  const revokeSession = (id) => {
    setSessions(s => s.filter(x => x.id !== id));
    flash("Oturum sonlandırıldı");
  };
  const revokeAll = () => {
    setSessions(s => s.filter(x => x.current));
    flash("Tüm diğer oturumlar sonlandırıldı");
  };

  return (
    <ProfileShell active="security">
      <div className="card fade-in">
        <div className="card-head">
          <div>
            <h1>Güvenlik</h1>
            <p>Hesabını koru: şifre, iki adımlı doğrulama ve aktif oturumlar.</p>
          </div>
        </div>

        {/* ── Password change ── */}
        <form onSubmit={changePw}>
          <div className="section-title">Şifre Değiştir</div>

          <div className="billing-grid">
            {[
              { id: "current", label: "Mevcut Şifre" },
              { id: "next",    label: "Yeni Şifre" },
              { id: "confirm", label: "Yeni Şifre (Tekrar)" },
            ].map(f => (
              <div className={`field ${f.id !== "current" ? "" : "full"}`} key={f.id}>
                <label htmlFor={f.id}>{f.label}</label>
                <div className="field-affix">
                  <input id={f.id} type={show[f.id] ? "text" : "password"} autoComplete="current-password"
                         className={`input ${errors[f.id] ? "err":""}`}
                         value={pw[f.id]} onChange={(e) => setPwField(f.id, e.target.value)} />
                  <button type="button" className="toggle-vis" aria-label={show[f.id] ? "Gizle":"Göster"}
                          onClick={() => setShow({...show, [f.id]: !show[f.id]})}>
                    {show[f.id] ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {f.id === "next" && pw.next && (
                  <div className="pw-strength">
                    <div className="pw-bars">
                      {[1,2,3,4].map(i => <div key={i} className={`pw-bar ${i <= strength ? `l-${strength}`:""}`} />)}
                    </div>
                    <div className="pw-meta">
                      <span>Şifre gücü</span>
                      <span className={`pw-label l-${strength}`}>{LABELS[strength]}</span>
                    </div>
                  </div>
                )}
                {errors[f.id] && <span style={{ fontSize: 12, color:"var(--error)", marginTop: 2, display:"inline-flex", alignItems:"center", gap: 5 }}><IconClose size={11} /> {errors[f.id]}</span>}
              </div>
            ))}
          </div>

          <div className="save-row">
            <button type="submit" className="btn btn-cta">
              <IconCheck size={14} /> Şifreyi Güncelle
            </button>
          </div>
        </form>

        {/* ── 2FA + alerts ── */}
        <div className="section-title">İki Adımlı Doğrulama</div>
        <div>
          <div className="pref">
            <div className="info">
              <div className="ttl">İki adımlı doğrulama (2FA) {twoFA && <span className="badge">Aktif</span>}</div>
              <div className="sub">Her girişte SMS veya authenticator uygulaması ile ek bir kod istenir.</div>
            </div>
            <button type="button" className="toggle" data-on={twoFA?"1":"0"} role="switch" aria-checked={twoFA} onClick={() => { setTwoFA(!twoFA); flash(twoFA ? "2FA devre dışı bırakıldı" : "2FA etkinleştirildi"); }}><i /></button>
          </div>
          <div className="pref">
            <div className="info">
              <div className="ttl">Giriş bildirimleri</div>
              <div className="sub">Hesabına yeni bir cihazdan giriş yapıldığında e-posta gönderilir.</div>
            </div>
            <button type="button" className="toggle" data-on={loginAlerts?"1":"0"} role="switch" aria-checked={loginAlerts} onClick={() => setAlerts(!loginAlerts)}><i /></button>
          </div>
          <div className="pref">
            <div className="info">
              <div className="ttl">Yeni cihaz onayı {!newDevice && <span className="badge warn">Önerilir</span>}</div>
              <div className="sub">Tanımadığımız bir cihazdan girişte ekstra doğrulama iste.</div>
            </div>
            <button type="button" className="toggle" data-on={newDevice?"1":"0"} role="switch" aria-checked={newDevice} onClick={() => setNewDevice(!newDevice)}><i /></button>
          </div>
        </div>

        {/* ── Sessions ── */}
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", margin: "28px 0 14px" }}>
          <div className="section-title" style={{ margin: 0 }}>Aktif Oturumlar</div>
          {sessions.length > 1 && (
            <button type="button" className="btn btn-ghost" style={{ height: 34, padding: "0 12px", fontSize: 13 }} onClick={revokeAll}>
              Diğer tüm oturumları sonlandır
            </button>
          )}
        </div>
        <div className="sess-list">
          {sessions.map(s => {
            const Ico = s.ico;
            return (
              <div className={`sess ${s.current?"current":""}`} key={s.id}>
                <div className="sess-ico"><Ico size={18} /></div>
                <div className="sess-info">
                  <div className="device">
                    {s.device}
                    {s.current && <span className="now">● Bu cihaz</span>}
                  </div>
                  <div className="meta">{s.os} · {s.city} · {s.ip} · {s.when}</div>
                </div>
                {!s.current && (
                  <button type="button" className="revoke" onClick={() => revokeSession(s.id)}>Sonlandır</button>
                )}
              </div>
            );
          })}
        </div>

        <div className="danger">
          <div>
            <h3>Hesabı kapat</h3>
            <p>Hesabını kapattığında tüm aktif rezervasyonlar iptal edilir, kayıtlı kartlar ve adres bilgilerin silinir. Bu işlem geri alınamaz.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={() => flash("Hesap kapatma için onay e-postası gönderildi")}>
            Hesabı Kapat
          </button>
        </div>
      </div>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
