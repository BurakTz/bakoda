// Security — password change, account closure (auth required)

const { useState, useRef, useMemo, useEffect } = React;

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

function parseApiDetail(data) {
  if (!data || !data.detail) return null;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => d.msg || d.message || String(d)).join(" ");
  }
  return null;
}

function detectCurrentDevice() {
  const ua = navigator.userAgent || "";
  let os = "Bilinmeyen işletim sistemi";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = /iPad/i.test(ua) ? "iPadOS" : "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Tarayıcı";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  const mobile = /Mobile|Android|iPhone/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  const ico = tablet ? Tablet : mobile ? Phone : Desktop;

  return {
    id: "current",
    device: `${browser} · ${mobile ? (tablet ? "Tablet" : "Telefon") : "Masaüstü"}`,
    os,
    when: "Şu an aktif",
    current: true,
    ico,
  };
}

function App() {
  const token = localStorage.getItem("bakoda_token");
  const [authReady, setAuthReady] = useState(!!token);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const [currentDevice] = useState(() => detectCurrentDevice());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [toast, setToast] = useState({ on: false, msg: "" });
  const toastT = useRef(null);

  const strength = useMemo(() => strengthOf(pw.next), [pw.next]);

  useEffect(() => {
    if (!token) {
      const next = encodeURIComponent("security.html");
      window.location.replace(`login.html?next=${next}`);
      return;
    }
    setAuthReady(true);
  }, [token]);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast((s) => ({ ...s, on: false })), 2400);
  };

  const setPwField = (k, v) => {
    setPw({ ...pw, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const changePw = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!pw.current) e.current = "Mevcut şifrenizi girin";
    if (!pw.next) e.next = "Yeni şifrenizi girin";
    else if (pw.next.length < 8) e.next = "Şifre en az 8 karakter olmalı";
    else if (strength < 2) e.next = "Daha güçlü bir şifre seçin";
    if (pw.confirm !== pw.next) e.confirm = "Şifreler eşleşmiyor";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setPwSaving(true);
    try {
      const res = await fetch("/api/users/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pw.current, new_password: pw.next }),
      });
      if (res.ok) {
        setPw({ current: "", next: "", confirm: "" });
        setErrors({});
        flash("Şifreniz güncellendi");
      } else if (res.status === 401) {
        window.location.replace("login.html?next=security.html");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = parseApiDetail(data) || (res.status === 400 ? "Mevcut şifre yanlış" : "Şifre güncellenemedi");
        if (res.status === 422) setErrors({ next: msg });
        else setErrors({ current: msg });
      }
    } catch {
      flash("Bağlantı hatası, tekrar deneyin");
    } finally {
      setPwSaving(false);
    }
  };

  const closeAccount = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204 || res.ok) {
        localStorage.removeItem("bakoda_token");
        localStorage.removeItem("bakoda_user");
        window.location.replace("index.html");
        return;
      }
      if (res.status === 401) {
        window.location.replace("login.html?next=security.html");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setDeleteError(parseApiDetail(data) || "Hesap kapatılamadı, tekrar deneyin");
    } catch {
      setDeleteError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!authReady) {
    return (
      <ProfileShell active="security">
        <div className="card fade-in">
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Oturum kontrol ediliyor…</p>
        </div>
      </ProfileShell>
    );
  }

  const Ico = currentDevice.ico;

  return (
    <ProfileShell active="security">
      <div className="card fade-in">
        <div className="card-head">
          <div>
            <h1>Güvenlik</h1>
            <p>Şifreni güncelle, oturumunu yönet ve hesabını kapat.</p>
          </div>
        </div>

        <form onSubmit={changePw}>
          <div className="section-title">Şifre Değiştir</div>

          <div className="billing-grid">
            {[
              { id: "current", label: "Mevcut Şifre" },
              { id: "next", label: "Yeni Şifre" },
              { id: "confirm", label: "Yeni Şifre (Tekrar)" },
            ].map((f) => (
              <div className={`field ${f.id !== "current" ? "" : "full"}`} key={f.id}>
                <label htmlFor={f.id}>{f.label}</label>
                <div className="field-affix">
                  <input
                    id={f.id}
                    type={show[f.id] ? "text" : "password"}
                    autoComplete={f.id === "current" ? "current-password" : "new-password"}
                    className={`input ${errors[f.id] ? "err" : ""}`}
                    value={pw[f.id]}
                    onChange={(e) => setPwField(f.id, e.target.value)}
                    disabled={pwSaving}
                  />
                  <button
                    type="button"
                    className="toggle-vis"
                    aria-label={show[f.id] ? "Gizle" : "Göster"}
                    onClick={() => setShow({ ...show, [f.id]: !show[f.id] })}
                  >
                    {show[f.id] ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {f.id === "next" && pw.next && (
                  <div className="pw-strength">
                    <div className="pw-bars">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`pw-bar ${i <= strength ? `l-${strength}` : ""}`} />
                      ))}
                    </div>
                    <div className="pw-meta">
                      <span>Şifre gücü</span>
                      <span className={`pw-label l-${strength}`}>{LABELS[strength]}</span>
                    </div>
                  </div>
                )}
                {errors[f.id] && (
                  <span style={{ fontSize: 12, color: "var(--error)", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <IconClose size={11} /> {errors[f.id]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="save-row">
            <a href="forgot-password.html" className="btn btn-ghost" style={{ marginRight: "auto" }}>
              Şifremi unuttum
            </a>
            <button type="submit" className="btn btn-cta" disabled={pwSaving}>
              <IconCheck size={14} /> {pwSaving ? "Kaydediliyor…" : "Şifreyi Güncelle"}
            </button>
          </div>
        </form>

        <div className="section-title">Ek Güvenlik</div>
        <div className="notice-box">
          <p>
            <strong>İki adımlı doğrulama (2FA)</strong> ve uzaktan oturum sonlandırma bu sürümde henüz desteklenmiyor.
            Oturumlar JWT ile yönetildiği için yalnızca bu cihaz görüntülenir; başka cihazlardan çıkış için şifreni değiştirmen önerilir.
          </p>
        </div>

        <div className="section-title" style={{ marginTop: 28 }}>Bu Cihaz</div>
        <div className="sess-list">
          <div className="sess current">
            <div className="sess-ico"><Ico size={18} /></div>
            <div className="sess-info">
              <div className="device">
                {currentDevice.device}
                <span className="now">● Bu cihaz</span>
              </div>
              <div className="meta">{currentDevice.os} · {currentDevice.when}</div>
            </div>
          </div>
        </div>
        <p className="sess-hint">
          Tüm cihazlardan çıkmak için{" "}
          <a href="login.html" onClick={(e) => { e.preventDefault(); localStorage.removeItem("bakoda_token"); localStorage.removeItem("bakoda_user"); window.location.href = "login.html"; }}>
            çıkış yap
          </a>
          {" "}veya şifreni güncelle.
        </p>

        <div className="danger">
          <div>
            <h3>Hesabı kapat</h3>
            <p>
              Hesabın devre dışı bırakılır; aynı e-posta ile tekrar giriş yapamazsın.
              Aktif rezervasyonların etkilenebilir — devam etmeden önce rezervasyonlarını kontrol et.
            </p>
          </div>
          <button type="button" className="btn btn-danger" onClick={() => { setDeleteError(""); setDeleteOpen(true); }}>
            Hesabı Kapat
          </button>
        </div>
      </div>

      {deleteOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="modal">
            <h3 id="delete-title">Hesabı kapat?</h3>
            <p>Bu işlem geri alınamaz. Hesabın pasifleştirilir ve oturumun sonlandırılır.</p>
            {deleteError && <p className="modal-err">{deleteError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" disabled={deleteBusy} onClick={() => setDeleteOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn btn-danger" disabled={deleteBusy} onClick={closeAccount}>
                {deleteBusy ? "Kapatılıyor…" : "Evet, hesabı kapat"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.on ? "on" : ""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
