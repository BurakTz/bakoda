// Profile — Personal Info form

const { useState, useRef } = React;

const COUNTRIES = ["Türkiye","Almanya","Birleşik Krallık","Fransa","İtalya","Yunanistan","Hollanda","Amerika Birleşik Devletleri"];
const LANGUAGES = ["Türkçe","English","Deutsch","Français","Español"];
const CURRENCIES = ["TRY ₺","EUR €","USD $","GBP £"];

function PrefRow({ ttl, sub, on, onChange }) {
  return (
    <div className="pref">
      <div className="info">
        <div className="ttl">{ttl}</div>
        <div className="sub">{sub}</div>
      </div>
      <button type="button" className="toggle" data-on={on ? "1":"0"} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
        <i />
      </button>
    </div>
  );
}

function App() {
  const [form, setForm] = useState({
    firstName: USER.firstName, lastName: USER.lastName,
    email: USER.email, phone: "555 123 45 67",
    birthday: "1992-04-15", gender: "Belirtmek istemiyorum",
    country: "Türkiye",
    language: "Türkçe", currency: "TRY ₺",
    emailNotif: true, smsNotif: false, dealsNotif: true, marketingNotif: false,
  });
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);

  const set = (k, v) => { setForm({...form, [k]: v}); setDirty(true); if (errors[k]) setErrors({...errors, [k]: null}); };

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Ad gerekli";
    if (!form.lastName.trim())  e.lastName  = "Soyad gerekli";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Geçerli bir e-posta";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const token = localStorage.getItem("bakoda_token");
    if (token) {
      try {
        const res = await fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ first_name: form.firstName, last_name: form.lastName, phone: form.phone }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("bakoda_user", JSON.stringify(data));
        }
      } catch {}
    }
    flash("Değişiklikler kaydedildi");
    setDirty(false);
  };

  return (
    <ProfileShell active="personal">
      <form className="card fade-in" onSubmit={save} noValidate>
        <div className="card-head">
          <div>
            <h1>Kişisel Bilgiler</h1>
            <p>Hesap bilgilerini güncel tutarak rezervasyon sürecini hızlandır.</p>
          </div>
        </div>

        <div className="section-title">Profil</div>
        <div className="avatar-edit">
          <div className="av">{(form.firstName[0] + form.lastName[0]).toUpperCase()}</div>
          <div className="meta">
            <h3>Profil fotoğrafı</h3>
            <p>JPG veya PNG · maksimum 4 MB</p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-secondary">Yükle</button>
            <button type="button" className="btn btn-ghost">Kaldır</button>
          </div>
        </div>

        <div className="section-title">Ad ve İletişim</div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="firstName">Ad</label>
            <input id="firstName" type="text" className={`input ${errors.firstName?"err":""}`}
                   value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            {errors.firstName && <span className="err-msg"><IconClose size={11} /> {errors.firstName}</span>}
          </div>
          <div className="field">
            <label htmlFor="lastName">Soyad</label>
            <input id="lastName" type="text" className={`input ${errors.lastName?"err":""}`}
                   value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            {errors.lastName && <span className="err-msg"><IconClose size={11} /> {errors.lastName}</span>}
          </div>
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input id="email" type="email" className={`input ${errors.email?"err":""}`}
                   value={form.email} onChange={(e) => set("email", e.target.value)} />
            {errors.email && <span className="err-msg"><IconClose size={11} /> {errors.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="phone">Telefon</label>
            <input id="phone" type="tel" className="input"
                   value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+90 555 000 00 00" />
          </div>
        </div>

        <div className="section-title">Demografik</div>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="birthday">Doğum Tarihi</label>
            <input id="birthday" type="date" className="input"
                   value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="gender">Cinsiyet</label>
            <select id="gender" className="select" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>Kadın</option>
              <option>Erkek</option>
              <option>Diğer</option>
              <option>Belirtmek istemiyorum</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="country">Uyruk</label>
            <select id="country" className="select" value={form.country} onChange={(e) => set("country", e.target.value)}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="section-title">Tercihler</div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="language">Dil</label>
            <select id="language" className="select" value={form.language} onChange={(e) => set("language", e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="currency">Para Birimi</label>
            <select id="currency" className="select" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="section-title">Bildirimler</div>
        <div className="pref-list">
          <PrefRow ttl="E-posta bildirimleri" sub="Rezervasyon onayları, hatırlatmalar ve check-in bilgileri"
            on={form.emailNotif} onChange={(v) => set("emailNotif", v)} />
          <PrefRow ttl="SMS bildirimleri" sub="Önemli güncellemeler için SMS al"
            on={form.smsNotif} onChange={(v) => set("smsNotif", v)} />
          <PrefRow ttl="Fırsat ve kampanyalar" sub="Özel fiyatlar ve indirim kodları"
            on={form.dealsNotif} onChange={(v) => set("dealsNotif", v)} />
          <PrefRow ttl="Pazarlama e-postaları" sub="Yeni destinasyonlar ve seyahat fikirleri"
            on={form.marketingNotif} onChange={(v) => set("marketingNotif", v)} />
        </div>

        <div className="save-row">
          <div className="info">{dirty ? "Kaydedilmemiş değişiklikler var" : "Tüm değişiklikler kaydedildi"}</div>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => { window.location.reload(); }}>Sıfırla</button>
            <button type="submit" className="btn btn-cta" disabled={!dirty}>
              <IconCheck size={14} /> Değişiklikleri Kaydet
            </button>
          </div>
        </div>

        <div className="danger">
          <div>
            <h3>Hesabı kapat</h3>
            <p>Hesabınızı kapattığınızda rezervasyon geçmişiniz silinmez, ancak tüm aktif rezervasyonlar iptal edilir.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={() => flash("Hesap kapatma için e-posta gönderildi")}>
            Hesabı Kapat
          </button>
        </div>
      </form>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
