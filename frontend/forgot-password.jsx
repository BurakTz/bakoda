// Forgot password — 3 step flow (email → code → new password)

const { useState, useRef, useEffect, useMemo } = React;

// ── Icons ─────────────────────────────────────────────────────────────
const MailIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
  </svg>
);
const LockIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10.5" width="16" height="11" rx="2.5" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
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
const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);
const ArrowLeft = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M11 5l-7 7 7 7" />
  </svg>
);
const CheckBig = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4 12 5 5L20 6" />
  </svg>
);

// ── Password strength ────────────────────────────────────────────────
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

// ── Step dots ─────────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <div className="step-dots" aria-label={`Adım ${step} / 3`}>
      {[1,2,3].map(i => (
        <div key={i} className={`step-dot ${step > i ? "done" : step === i ? "active" : ""}`} />
      ))}
    </div>
  );
}

// ── Step 1: enter email ───────────────────────────────────────────────
function EmailStep({ email, setEmail, onNext, flash }) {
  const [err, setErr] = useState("");
  const submit = async (ev) => {
    ev.preventDefault();
    if (!email.trim()) return setErr("E-posta gereklidir");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("Geçerli bir e-posta girin");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    flash("Sıfırlama kodu gönderildi");
    onNext();
  };
  return (
    <form className="fade-in" onSubmit={submit} noValidate>
      <h1 className="form-title">Şifreni mi unuttun?</h1>
      <p className="form-sub">Sorun değil — hesabına bağlı e-postayı gir, 6 haneli bir sıfırlama kodu gönderelim.</p>

      <div className="field">
        <label htmlFor="email">E-posta</label>
        <div className="field-affix">
          <span className="ico"><MailIcon /></span>
          <input id="email" type="email" autoComplete="email"
                 className={`input ${err ? "err":""}`}
                 value={email} onChange={(e) => { setEmail(e.target.value); if (err) setErr(""); }}
                 placeholder="adin@ornek.com" autoFocus />
        </div>
        {err && <span className="err-msg"><IconX size={11} /> {err}</span>}
      </div>

      <button type="submit" className="btn btn-cta" style={{ width:"100%", marginTop: 22 }}>
        Sıfırlama Kodu Gönder <ArrowRight />
      </button>

      <div className="signup-line">
        Şifreni hatırladın mı? <a href="login.html">Giriş Yap →</a>
      </div>
    </form>
  );
}

// ── Step 2: enter 6-digit code ────────────────────────────────────────
function CodeStep({ email, code, setCode, onNext, onBack, flash }) {
  const [err, setErr] = useState("");
  const [seconds, setSeconds] = useState(52);
  const refs = useRef([]);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (err) setErr("");
    if (d && i < 5) refs.current[i+1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i-1]?.focus();
    if (e.key === "ArrowLeft"  && i > 0) refs.current[i-1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i+1]?.focus();
  };
  const onPaste = (e) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (txt.length === 6) {
      e.preventDefault();
      setCode(txt.split(""));
      refs.current[5]?.focus();
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (code.some(d => !d)) return setErr("6 haneli kodu girin");
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.join("") }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.detail || "Kod hatalı veya süresi dolmuş");
      onNext(data.reset_token);
    } catch { setErr("Bağlantı hatası"); }
  };

  const resend = () => {
    if (seconds > 0) return;
    setSeconds(52);
    flash("Kod yeniden gönderildi");
  };

  return (
    <form className="fade-in" onSubmit={submit} noValidate onPaste={onPaste}>
      <div className="step-ico"><MailIcon size={28} /></div>
      <h1 className="form-title">E-postanı kontrol et</h1>
      <p className="form-sub"><b style={{ color:"var(--primary)" }}>{email || "adresinize"}</b> e-posta adresine 6 haneli bir kod gönderdik. Birkaç dakikada gelmezse spam klasörünü kontrol edin.</p>

      <div className="otp" role="group" aria-label="6 haneli doğrulama kodu">
        {code.map((d, i) => (
          <input key={i} ref={(el) => (refs.current[i] = el)}
                 type="text" inputMode="numeric" maxLength={1} value={d}
                 className={d ? "filled" : ""}
                 onChange={(e) => setDigit(i, e.target.value)}
                 onKeyDown={(e) => onKey(i, e)} aria-label={`Hane ${i+1}`} />
        ))}
      </div>
      {err && <span className="err-msg" style={{ marginTop: 8 }}><IconX size={11} /> {err}</span>}

      <div className="resend-line">
        <span>{seconds > 0 ? `Kodu tekrar gönder (${seconds}s)` : "Kod gelmedi mi?"}</span>
        <button type="button" onClick={resend} disabled={seconds > 0}>
          {seconds > 0 ? "—" : "Tekrar Gönder"}
        </button>
      </div>

      <button type="submit" className="btn btn-cta" style={{ width:"100%", marginTop: 18 }}>
        Doğrula ve Devam Et <ArrowRight />
      </button>

      <div className="signup-line">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}
           style={{ display:"inline-flex", alignItems:"center", gap: 6, color: "var(--muted)" }}>
          <ArrowLeft size={12} /> E-posta adresini değiştir
        </a>
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: "var(--muted)", fontFamily:"var(--mono)", letterSpacing:".04em", textAlign:"center" }}>
        Güvenlik için doğrulama kodu yalnızca e-posta adresinize iletilir.
      </div>
    </form>
  );
}

// ── Step 3: new password ──────────────────────────────────────────────
function PasswordStep({ resetToken, flash }) {
  const [pw, setPw]           = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow]       = useState(false);
  const [showC, setShowC]     = useState(false);
  const [errors, setErrors]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => strengthOf(pw), [pw]);

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!pw)                      e.pw      = "Şifre gereklidir";
    else if (strength < 2)        e.pw      = "Daha güçlü bir şifre seçin (en az 8 karakter, harf + rakam)";
    if (!confirm)                 e.confirm = "Şifreyi tekrar girin";
    else if (confirm !== pw)      e.confirm = "Şifreler eşleşmiyor";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, new_password: pw }),
      });
      if (!res.ok) { const d = await res.json(); flash(d.detail || "Hata oluştu"); setSubmitting(false); return; }
      flash("Şifren güncellendi");
      setTimeout(() => setDone(true), 700);
    } catch { flash("Bağlantı hatası"); setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="fade-in" style={{ textAlign:"center", padding:"12px 0" }}>
        <div className="step-ico" style={{ margin:"0 auto 22px", background:"rgba(46,204,113,.15)", color:"var(--success-dk)" }}>
          <CheckBig />
        </div>
        <h1 className="form-title">Şifren güncellendi</h1>
        <p className="form-sub" style={{ maxWidth: "40ch", margin:"10px auto 28px" }}>
          Yeni şifrenle giriş yapabilirsin. Bir sonraki sefer için Beni Hatırla'yı işaretlemeyi unutma.
        </p>
        <a href="login.html" className="btn btn-cta" style={{ width:"100%" }}>
          Giriş Yap <ArrowRight />
        </a>
      </div>
    );
  }

  return (
    <form className="fade-in" onSubmit={submit} noValidate>
      <h1 className="form-title">Yeni şifreni belirle</h1>
      <p className="form-sub">Hesabını güvende tutmak için en az 8 karakterli, harf ve rakam içeren bir şifre seç.</p>

      <div className="field">
        <label htmlFor="pw">Yeni Şifre</label>
        <div className="field-affix">
          <span className="ico"><LockIcon /></span>
          <input id="pw" type={show ? "text" : "password"} autoComplete="new-password"
                 className={`input has-toggle ${errors.pw ? "err":""}`}
                 value={pw} onChange={(e) => { setPw(e.target.value); if (errors.pw) setErrors({...errors, pw: null}); }}
                 placeholder="En az 8 karakter" />
          <button type="button" className="toggle" aria-label={show ? "Gizle":"Göster"} onClick={() => setShow(!show)}>
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {pw && (
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
        {errors.pw && <span className="err-msg"><IconX size={11} /> {errors.pw}</span>}
      </div>

      <div className="field">
        <label htmlFor="confirm">Şifre Tekrar</label>
        <div className="field-affix">
          <span className="ico"><LockIcon /></span>
          <input id="confirm" type={showC ? "text" : "password"} autoComplete="new-password"
                 className={`input has-toggle ${errors.confirm ? "err":""}`}
                 value={confirm} onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors({...errors, confirm: null}); }}
                 placeholder="Şifreni tekrar gir" />
          <button type="button" className="toggle" aria-label={showC ? "Gizle":"Göster"} onClick={() => setShowC(!showC)}>
            {showC ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {errors.confirm && <span className="err-msg"><IconX size={11} /> {errors.confirm}</span>}
      </div>

      <button type="submit" className="btn btn-cta" style={{ width:"100%", marginTop: 22 }} disabled={submitting}>
        {submitting ? "Güncelleniyor…" : (<>Şifremi Güncelle <ArrowRight /></>)}
      </button>
    </form>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["","","","","",""]);
  const [resetToken, setResetToken] = useState("");
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  return (
    <>
      <div className="stage">
        {/* Left: same brand pane as login */}
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
            <div className="proof-text"><b>50.000+ mutlu misafir</b></div>
          </div>
        </section>

        {/* Right: 3-step flow */}
        <section className="form-pane">
          <div className="top-link">
            <a href="login.html" style={{ display:"inline-flex", alignItems:"center", gap: 6 }}>
              <ArrowLeft size={12} /> Girişe dön
            </a>
          </div>

          <div className="form-box">
            <StepDots step={step} />
            {step === 1 && <EmailStep    email={email} setEmail={setEmail} onNext={() => setStep(2)} flash={flash} />}
            {step === 2 && <CodeStep     email={email} code={code} setCode={setCode}
                                          onNext={(token) => { setResetToken(token); setStep(3); }} onBack={() => setStep(1)} flash={flash} />}
            {step === 3 && <PasswordStep resetToken={resetToken} flash={flash} />}
          </div>
        </section>
      </div>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
