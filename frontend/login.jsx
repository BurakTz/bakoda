// Login page

const { useState, useRef } = React;

// Eye / Eye-off (password toggle)
const Eye = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18" />
    <path d="M10.6 6.18A10.3 10.3 0 0 1 12 6c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.07" />
    <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7c1.86 0 3.5-.45 4.92-1.18" />
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
  </svg>
);

const MailIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);
const LockIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10.5" width="16" height="11" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
);

const Tick = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.2 5.8 10 11 4.2" />
  </svg>
);

const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [show, setShow]     = useState(false);
  const [remember, setRem]  = useState(true);
  const [errors, setErrors] = useState({});
  const [toast, setToast]   = useState({ on: false, msg: "" });
  const toastT = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({ ...s, on: false })), 2400);
  };

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "E-posta gereklidir";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Geçerli bir e-posta girin";
    if (!pw) e.pw = "Şifre gereklidir";
    else if (pw.length < 6) e.pw = "En az 6 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    flash("Giriş yapılıyor…");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.detail || "Giriş başarısız"); setSubmitting(false); return; }
      localStorage.setItem("bakoda_token", data.access_token);
      localStorage.setItem("bakoda_user", JSON.stringify(data.user));
      flash("Giriş başarılı, yönlendiriliyorsunuz…");
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const redirectTo = nextParam && /^[a-z0-9-]+\.html$/i.test(nextParam) ? nextParam : "index.html";
      setTimeout(() => { window.location.href = redirectTo; }, 900);
    } catch { flash("Bağlantı hatası. Tekrar deneyin."); setSubmitting(false); }
  };

  return (
    <>
      <div className="stage">
        {/* ── Left: Brand pane ── */}
        <section className="brand-pane">
          <a href="index.html" className="brand-logo" aria-label="bakoda anasayfa">bakoda</a>

          <div className="middle fade-in">
            <h1 className="brand-title">Dünyanın en güzel konaklama deneyimleri.</h1>
            <p className="brand-sub">50.000+ otel ve butik konaklama. Editörlerimiz tarafından bizzat seçildi.</p>
          </div>

          <div className="proof">
            <div className="avatars" aria-hidden="true">
              <div className="av av-1">SK</div>
              <div className="av av-2">MD</div>
              <div className="av av-3">AY</div>
            </div>
            <div className="proof-text">
              <b>50.000+ mutlu misafir</b>
            </div>
          </div>
        </section>

        {/* ── Right: Form pane ── */}
        <section className="form-pane">
          <div className="top-link">
            Yeni misin? <a href="register.html">Kayıt Ol</a>
          </div>

          <div className="form-box fade-in">
            <h1 className="form-title">Tekrar hoş geldin</h1>
            <p className="form-sub">Hesabına giriş yap.</p>

            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="email">E-posta</label>
                <div className="field-affix">
                  <span className="ico"><MailIcon /></span>
                  <input id="email" type="email" autoComplete="email"
                         className={`input ${errors.email ? "err":""}`}
                         value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({...errors, email:null}); }}
                         placeholder="adin@ornek.com" />
                </div>
                {errors.email && <span className="err-msg"><IconX size={11} /> {errors.email}</span>}
              </div>

              <div className="field">
                <label htmlFor="password">
                  Şifre
                  <a href="forgot-password.html" className="forgot">
                    Şifremi unuttum <ArrowRight size={12} />
                  </a>
                </label>
                <div className="field-affix">
                  <span className="ico"><LockIcon /></span>
                  <input id="password" type={show ? "text" : "password"} autoComplete="current-password"
                         className={`input has-toggle ${errors.pw ? "err":""}`}
                         value={pw} onChange={(e) => { setPw(e.target.value); if (errors.pw) setErrors({...errors, pw:null}); }}
                         placeholder="••••••••" />
                  <button type="button" className="toggle" aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
                          onClick={() => setShow(!show)}>
                    {show ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {errors.pw && <span className="err-msg"><IconX size={11} /> {errors.pw}</span>}
              </div>

              <div className="row-between">
                <label className="remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} />
                  <span className="box"><Tick /></span>
                  <span>Beni hatırla</span>
                </label>
              </div>

              <button type="submit" className="btn btn-cta" style={{ width:"100%" }} disabled={submitting}>
                {submitting ? "Giriş yapılıyor…" : (<>Giriş Yap <ArrowRight size={14} /></>)}
              </button>
            </form>

            <div className="signup-line">
              Hesabın yok mu? <a href="register.html">Kayıt Ol →</a>
            </div>

            <div className="legal">
              Giriş yaparak <a href="about.html">Kullanım Şartları</a> ve <a href="about.html">Gizlilik Politikası</a>'nı kabul etmiş olursunuz.
            </div>
          </div>
        </section>
      </div>

      <div className={`toast ${toast.on ? "on" : ""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
