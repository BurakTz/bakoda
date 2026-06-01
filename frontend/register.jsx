// Register page — matches login.html shell

const { useState, useRef, useMemo } = React;

// ── Logos / icons (same as login.jsx) ─────────────────────────────────
const GoogleG = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z" />
    <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z" />
  </svg>
);
const Eye = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
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
    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
  </svg>
);
const LockIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10.5" width="16" height="11" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
);
const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
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

// ── Password strength ────────────────────────────────────────────────
// Returns 0..4 (0 = empty). 1=Zayıf, 2=Orta, 3=Güçlü, 4=Mükemmel
function strengthOf(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  // Bump weak-but-long passwords up so a 12-char lowercase-only string isn't "Zayıf"
  if (pw.length >= 12 && s < 2) s = 2;
  return Math.max(1, s);
}
const STRENGTH_LABEL = ["", "Zayıf", "Orta", "Güçlü", "Mükemmel"];

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [pw, setPw]               = useState("");
  const [confirm, setConfirm]     = useState("");
  const [show, setShow]           = useState(false);
  const [showC, setShowC]         = useState(false);
  const [terms, setTerms]         = useState(false);
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]         = useState({ on: false, msg: "" });
  const toastT = useRef(null);

  const strength = useMemo(() => strengthOf(pw), [pw]);

  const flash = (msg) => {
    setToast({ on: true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({ ...s, on: false })), 2400);
  };

  const clearErr = (k) => { if (errors[k]) setErrors({ ...errors, [k]: null }); };

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = "Ad gereklidir";
    if (!lastName.trim())  e.lastName  = "Soyad gereklidir";
    if (!email.trim())     e.email     = "E-posta gereklidir";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Geçerli bir e-posta girin";
    if (!pw)               e.pw        = "Şifre gereklidir";
    else if (strength < 2) e.pw        = "Daha güçlü bir şifre seçin (en az 8 karakter, harf ve rakam)";
    if (!confirm)          e.confirm   = "Şifreyi tekrar girin";
    else if (confirm !== pw) e.confirm = "Şifreler eşleşmiyor";
    if (!terms)            e.terms     = "Devam etmek için kabul edin";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    flash("Hesabınız oluşturuluyor…");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw, first_name: firstName, last_name: lastName }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.detail || "Kayıt başarısız"); setSubmitting(false); return; }
      localStorage.setItem("bakoda_token", data.access_token);
      localStorage.setItem("bakoda_user", JSON.stringify(data.user));
      flash("Hesabınız oluşturuldu!");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch { flash("Bağlantı hatası. Tekrar deneyin."); setSubmitting(false); }
  };

  return (
    <>
      <div className="stage">
        {/* ── Left: Brand pane (same as login) ── */}
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

        {/* ── Right: Form ── */}
        <section className="form-pane">
          <div className="top-link">
            Zaten üye misin? <a href="login.html">Giriş Yap</a>
          </div>

          <div className="form-box fade-in">
            <h1 className="form-title">Hesap oluştur</h1>
            <p className="form-sub">Birkaç saniye sürer, üyelik ücretsizdir.</p>

            <button type="button" className="btn btn-google" onClick={() => flash("Google ile bağlanılıyor…")}>
              <GoogleG size={20} />
              <span>Google ile kayıt ol</span>
            </button>

            <div className="divider">veya e-posta ile</div>

            <form onSubmit={submit} noValidate>
              <div className="fields-row">
                <div className="field">
                  <label htmlFor="firstName">Ad</label>
                  <div className="field-affix">
                    <span className="ico"><UserIcon /></span>
                    <input id="firstName" type="text" autoComplete="given-name"
                           className={`input ${errors.firstName ? "err":""}`}
                           value={firstName} onChange={(e) => { setFirstName(e.target.value); clearErr("firstName"); }}
                           placeholder="Adınız" />
                  </div>
                  {errors.firstName && <span className="err-msg"><IconX size={11} /> {errors.firstName}</span>}
                </div>
                <div className="field">
                  <label htmlFor="lastName">Soyad</label>
                  <input id="lastName" type="text" autoComplete="family-name"
                         className={`input no-affix ${errors.lastName ? "err":""}`}
                         value={lastName} onChange={(e) => { setLastName(e.target.value); clearErr("lastName"); }}
                         placeholder="Soyadınız" />
                  {errors.lastName && <span className="err-msg"><IconX size={11} /> {errors.lastName}</span>}
                </div>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="email">E-posta</label>
                <div className="field-affix">
                  <span className="ico"><MailIcon /></span>
                  <input id="email" type="email" autoComplete="email"
                         className={`input ${errors.email ? "err":""}`}
                         value={email} onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
                         placeholder="adin@ornek.com" />
                </div>
                {errors.email && <span className="err-msg"><IconX size={11} /> {errors.email}</span>}
              </div>

              <div className="field">
                <label htmlFor="password">Şifre</label>
                <div className="field-affix">
                  <span className="ico"><LockIcon /></span>
                  <input id="password" type={show ? "text" : "password"} autoComplete="new-password"
                         className={`input has-toggle ${errors.pw ? "err":""}`}
                         value={pw} onChange={(e) => { setPw(e.target.value); clearErr("pw"); }}
                         placeholder="En az 8 karakter" />
                  <button type="button" className="toggle" aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
                          onClick={() => setShow(!show)}>
                    {show ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {pw && (
                  <div className="pw-strength">
                    <div className="pw-bars">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`pw-bar ${i <= strength ? `l-${strength}`:""}`} />
                      ))}
                    </div>
                    <div className="pw-meta">
                      <span>Şifre gücü</span>
                      <span className={`pw-label l-${strength}`}>{STRENGTH_LABEL[strength]}</span>
                    </div>
                  </div>
                )}
                {errors.pw && <span className="err-msg"><IconX size={11} /> {errors.pw}</span>}
              </div>

              <div className="field">
                <label htmlFor="confirm">Şifre Tekrar</label>
                <div className="field-affix">
                  <span className="ico"><LockIcon /></span>
                  <input id="confirm" type={showC ? "text" : "password"} autoComplete="new-password"
                         className={`input has-toggle ${errors.confirm ? "err":""}`}
                         value={confirm} onChange={(e) => { setConfirm(e.target.value); clearErr("confirm"); }}
                         placeholder="Şifrenizi tekrar girin" />
                  <button type="button" className="toggle" aria-label={showC ? "Şifreyi gizle" : "Şifreyi göster"}
                          onClick={() => setShowC(!showC)}>
                    {showC ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {errors.confirm && <span className="err-msg"><IconX size={11} /> {errors.confirm}</span>}
              </div>

              <label className={`terms ${errors.terms ? "err":""}`}>
                <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); clearErr("terms"); }} />
                <span className="box"><Tick /></span>
                <span>
                  <a href="about.html">Kullanım Şartları</a> ve <a href="about.html">Gizlilik Politikası</a>'nı okudum, kabul ediyorum.
                </span>
              </label>
              {errors.terms && <span className="err-msg" style={{ marginTop: -14, marginBottom: 14, display:"block" }}><IconX size={11} /> {errors.terms}</span>}

              <button type="submit" className="btn btn-cta" style={{ width: "100%" }} disabled={submitting}>
                {submitting ? "Hesabınız oluşturuluyor…" : (<>Hesap Oluştur <ArrowRight size={14} /></>)}
              </button>
            </form>

            <div className="signup-line">
              Zaten hesabın var mı? <a href="login.html">Giriş Yap →</a>
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
