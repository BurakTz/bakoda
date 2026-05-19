// Contact page — 3 channels + form + info + FAQ accordion

const { useState, useRef } = React;

const CHANNELS = [
  { ico: "IconChat",  cls: "live", title: "Canlı Destek",  sub: "Ortalama 2 dakika yanıt süresi" },
  { ico: "IconBell",  cls: "",     title: "E-posta",        sub: "24 saat içinde geri dönüş" },
  { ico: "IconPhone", cls: "",     title: "Telefon",        sub: "Pzt – Cum · 09:00–18:00 GMT+3" },
];

const SUBJECTS = [
  "Rezervasyon ile ilgili",
  "Ödeme veya iade",
  "Hesap ve giriş",
  "Otel bilgileri",
  "Ortaklık talebi",
  "Diğer",
];

const FAQ = [
  {
    q: "Rezervasyon nasıl iptal edilir?",
    a: "Profilim → Rezervasyonlarım sayfasından ilgili rezervasyonu açıp \"İptal Et\" butonuna tıklayabilirsiniz. Çoğu rezervasyon için girişe 48 saat kalana kadar tam iade ile iptal edilebilir; iptal koşulları rezervasyon detayında belirtilir.",
  },
  {
    q: "Ödeme güvenli mi?",
    a: "Tüm ödemeler 256-bit SSL şifreleme ile alınır ve PCI DSS uyumlu altyapımız üzerinden işlenir. Kart bilgilerinizi biz saklamayız; ödeme yalnızca konaklamadan bir gün önce tahsil edilir, dilerseniz \"Otelde Öde\" seçeneğini de kullanabilirsiniz.",
  },
  {
    q: "Fiyat farkı iade edilir mi?",
    a: "Evet. Aynı oteli aynı tarih ve oda tipi için daha düşük bir fiyatla bulursanız, rezervasyondan 24 saat içinde bize iletin — aradaki farkı kart hesabınıza iade edelim. \"En İyi Fiyat Garantisi\" tüm rezervasyonlarda geçerlidir.",
  },
  {
    q: "Konuk hizmetlerine nasıl ulaşırım?",
    a: "Canlı destek ekibimize bu sayfadaki \"Canlı Destek\" düğmesinden 7/24 ulaşabilirsiniz. Acil durumlar için +90 212 000 00 00 numarasından bizi arayabilir, ya da hello@bakoda.com adresine yazabilirsiniz.",
  },
  {
    q: "Otelde check-in için neye ihtiyacım var?",
    a: "Geçerli bir kimlik veya pasaport ile rezervasyon numaranızı (e-postanızda gönderildi) hazır bulundurmanız yeterli. Pek çok otelde rezervasyon QR kodu doğrudan resepsiyona göstererek de hızlı check-in yapılabilir.",
  },
  {
    q: "Otelimi bakoda'ya nasıl eklerim?",
    a: "Otel ortaklığı için partner@bakoda.com adresine bir e-posta atın. Curation ekibimiz başvurunuzu inceler ve ekleme süreci hakkında bilgi verir. Tüm partner otellerimiz onaylanmadan önce bizzat ziyaret edilir.",
  },
];

function ContactForm({ flash }) {
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const set = (k, v) => { setForm({...form, [k]: v}); if (errors[k]) setErrors({...errors, [k]: null}); };

  const submit = (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.name.trim())  e.name  = "Adınızı girin";
    if (!form.email.trim()) e.email = "E-posta gerekli";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Geçerli bir e-posta girin";
    if (!form.message.trim() || form.message.trim().length < 10) e.message = "Mesajınız en az 10 karakter olmalı";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setForm({ name: "", email: "", subject: SUBJECTS[0], message: "" });
      flash("Mesajınız alındı — 24 saat içinde dönüş yapacağız");
    }, 800);
  };

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <h2>Bize yazın</h2>
      <p>Aşağıdaki formu doldurun; konuk hizmetleri ekibimiz size mümkün olan en kısa sürede dönüş yapsın.</p>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="name">Adınız <span className="req">*</span></label>
          <input id="name" className={`input ${errors.name?"err":""}`} type="text" autoComplete="name"
                 value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Selin Karaca" />
          {errors.name && <span className="err-msg"><IconClose size={11} /> {errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">E-posta <span className="req">*</span></label>
          <input id="email" className={`input ${errors.email?"err":""}`} type="email" autoComplete="email"
                 value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="selin@ornek.com" />
          {errors.email && <span className="err-msg"><IconClose size={11} /> {errors.email}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="subject">Konu</label>
        <select id="subject" className="select" value={form.subject} onChange={(e) => set("subject", e.target.value)}>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="message">Mesajınız <span className="req">*</span></label>
        <textarea id="message" className={`textarea ${errors.message?"err":""}`}
                  value={form.message} onChange={(e) => set("message", e.target.value)}
                  placeholder="Detayları paylaşırsanız size çok daha hızlı yardımcı olabiliriz…" />
        {errors.message && <span className="err-msg"><IconClose size={11} /> {errors.message}</span>}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop: 22, gap: 16, flexWrap:"wrap" }}>
        <span style={{ fontSize: 12, color:"var(--muted)" }}>
          <IconShield size={13} style={{ verticalAlign:"middle", marginRight: 4, color:"var(--primary)" }} />
          Bilgileriniz şifreli olarak iletilir, üçüncü taraflarla paylaşılmaz.
        </span>
        <button type="submit" className="btn btn-cta" disabled={sending} style={{ minWidth: 180 }}>
          {sending ? "Gönderiliyor…" : (<>Gönder <IconArrow size={14} /></>)}
        </button>
      </div>
    </form>
  );
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className={`faq-item ${open ? "open":""}`}>
      <button className="faq-q" type="button" aria-expanded={open} onClick={onToggle}>
        <span>{q}</span>
        <span className="plus" aria-hidden="true"><IconPlus size={16} /></span>
      </button>
      <div className="faq-a">
        <div className="faq-a-inner">{a}</div>
      </div>
    </div>
  );
}

function App() {
  const [openIdx, setOpenIdx] = useState(0);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 3000);
  };

  return (
    <>
      <Navbar />

      <div className="page" style={{ paddingBottom: 0 }}>
        {/* Hero */}
        <header className="contact-hero">
          <div className="container">
            <div className="eyebrow">İletişim</div>
            <h1>Size nasıl yardımcı olabiliriz?</h1>
            <p>Konuk hizmetleri ekibimiz Türkçe ve İngilizce, gece gündüz hizmetinizde. Tercih ettiğiniz kanaldan ulaşın.</p>
          </div>
        </header>

        {/* 3 channels */}
        <div className="channels">
          {CHANNELS.map(c => {
            const Ico = window[c.ico] || IconBell;
            return (
              <button key={c.title} className={`channel ${c.cls}`} type="button" onClick={() => flash(`${c.title} kanalı açılıyor…`)}>
                <div className="ico"><Ico size={22} /></div>
                <div>
                  <h3>{c.title}</h3>
                  <div className="sub">{c.sub}</div>
                </div>
                <div className="arr"><IconArrow size={16} /></div>
              </button>
            );
          })}
        </div>

        {/* Form + info */}
        <div className="container">
          <div className="contact-grid">
            <ContactForm flash={flash} />

            <aside className="info-card">
              <h3>İletişim Bilgileri</h3>
              <p className="lead">Ofis ziyaret saatleri ve doğrudan iletişim kanalları.</p>

              <div className="info-rows">
                <div className="info-row">
                  <div className="ico"><IconMapPin size={16} /></div>
                  <div>
                    <div className="lbl">Ofis</div>
                    <div className="val">İstiklal Caddesi No: 248, K:4</div>
                    <div className="sub">Beyoğlu, İstanbul 34430 · Türkiye</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="ico"><IconBell size={16} /></div>
                  <div>
                    <div className="lbl">E-posta</div>
                    <div className="val"><a href="mailto:hello@bakoda.com">hello@bakoda.com</a></div>
                    <div className="sub">Genel sorular için</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="ico"><IconPhone size={16} /></div>
                  <div>
                    <div className="lbl">Telefon</div>
                    <div className="val">+90 212 000 00 00</div>
                    <div className="sub">Pzt – Cum · 09:00 – 18:00</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="ico"><IconClock size={16} /></div>
                  <div>
                    <div className="lbl">Canlı Destek</div>
                    <div className="val">7/24 açık</div>
                    <div className="sub">Ortalama yanıt 2 dk</div>
                  </div>
                </div>
              </div>

              <div className="info-quick">
                <h4>Hızlı Bağlantılar</h4>
                <ul>
                  <li><a href="#faq">Sıkça Sorulan Sorular <IconArrow size={12} /></a></li>
                  <li><a href="my-bookings.html">Rezervasyon iptal & değişiklik <IconArrow size={12} /></a></li>
                  <li><a href="about.html">Hakkımızda <IconArrow size={12} /></a></li>
                  <li><a href="#">Otel ortaklığı başvurusu <IconArrow size={12} /></a></li>
                </ul>

                <div className="info-social">
                  <a href="#" aria-label="Instagram"><IconInstagram size={15} /></a>
                  <a href="#" aria-label="Facebook"><IconFb size={15} /></a>
                  <a href="#" aria-label="X"><IconX size={13} /></a>
                  <a href="#" aria-label="YouTube"><IconYoutube size={15} /></a>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* FAQ */}
        <section className="faq" id="faq">
          <div className="container">
            <div className="faq-head">
              <div className="eyebrow">SSS</div>
              <h2>Sıkça sorulanlar</h2>
            </div>
            <div className="faq-list">
              {FAQ.map((it, i) => (
                <FaqItem key={i} q={it.q} a={it.a} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
              ))}
            </div>
            <div style={{ textAlign:"center", marginTop: 28, color:"var(--muted)", fontSize: 14 }}>
              Aradığınızı bulamadınız mı? <a href="#" style={{ color:"var(--primary)", textDecoration:"underline", textDecorationColor:"rgba(15,42,42,.25)", textUnderlineOffset: 3 }}>Yardım merkezimize bakın</a> veya yukarıdaki formu doldurun.
            </div>
          </div>
        </section>

        <Footer />
      </div>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
