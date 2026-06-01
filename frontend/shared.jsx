// Shared components — Navbar, Footer, Toast.
// Used by both index.html (homepage) and search-results.html.

const { useState: useStateS, useEffect: useEffectS } = React;

const LANGUAGE_STORAGE_KEY = "bakoda_lang";
const LANGUAGE_FALLBACK = "tr";
const LANGUAGE_SET = new Set(["tr", "en"]);

const SHARED_I18N = {
  tr: {
    nav: {
      explore: "Keşfet",
      hotels: "Oteller",
      about: "Hakkımızda",
      languageAria: "Dil değiştir",
      logout: "Çıkış",
      login: "Giriş Yap",
      signup: "Kayıt Ol",
    },
    footer: {
      tagline: "Find your perfect stay. Dünyanın dört bir yanından dikkatle seçilmiş otel ve butik konaklama.",
      company: "Şirket",
      about: "Hakkımızda",
      press: "Basın",
      careers: "Kariyer",
      blog: "Blog",
      destinations: "Destinasyonlar",
      allCities: "Tüm şehirler",
      help: "Yardım",
      faq: "Sıkça Sorulanlar",
      cancelRefund: "İptal & İade",
      contact: "İletişim",
      guestServices: "Konuk Hizmetleri",
      social: "Sosyal Medya",
      newsletter: "Bülten",
      community: "Topluluk",
      partnership: "Partnerlik",
      copyright: "© 2026 bakoda. Tüm hakları saklıdır.",
      privacy: "Gizlilik",
      terms: "Kullanım Şartları",
      cookies: "Çerezler",
    },
  },
  en: {
    nav: {
      explore: "Explore",
      hotels: "Hotels",
      about: "About",
      languageAria: "Switch language",
      logout: "Log out",
      login: "Sign in",
      signup: "Sign up",
    },
    footer: {
      tagline: "Find your perfect stay. Carefully selected hotels and boutique stays from around the world.",
      company: "Company",
      about: "About",
      press: "Press",
      careers: "Careers",
      blog: "Blog",
      destinations: "Destinations",
      allCities: "All cities",
      help: "Help",
      faq: "FAQ",
      cancelRefund: "Cancellation & Refunds",
      contact: "Contact",
      guestServices: "Guest Services",
      social: "Social",
      newsletter: "Newsletter",
      community: "Community",
      partnership: "Partnership",
      copyright: "© 2026 bakoda. All rights reserved.",
      privacy: "Privacy",
      terms: "Terms",
      cookies: "Cookies",
    },
  },
};

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (LANGUAGE_SET.has(stored)) return stored;
  } catch {}
  try {
    const fromBrowser = (navigator.language || "").toLowerCase();
    if (fromBrowser.startsWith("en")) return "en";
  } catch {}
  return LANGUAGE_FALLBACK;
}

const languageStore = {
  value: readStoredLanguage(),
  listeners: new Set(),
};

function emitLanguage() {
  languageStore.listeners.forEach((fn) => fn(languageStore.value));
}

function applyLanguage(lang) {
  languageStore.value = LANGUAGE_SET.has(lang) ? lang : LANGUAGE_FALLBACK;
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, languageStore.value); } catch {}
  document.documentElement.lang = languageStore.value;
  emitLanguage();
}

function subscribeLanguage(listener) {
  languageStore.listeners.add(listener);
  return () => languageStore.listeners.delete(listener);
}

function getLanguage() {
  return languageStore.value;
}

function setLanguage(lang) {
  applyLanguage(lang);
}

function toggleLanguage() {
  applyLanguage(languageStore.value === "tr" ? "en" : "tr");
}

window.addEventListener("storage", (e) => {
  if (e.key !== LANGUAGE_STORAGE_KEY || !LANGUAGE_SET.has(e.newValue)) return;
  languageStore.value = e.newValue;
  document.documentElement.lang = languageStore.value;
  emitLanguage();
});

document.documentElement.lang = getLanguage();

function pickTranslation(dict, lang, key, fallback) {
  const path = String(key).split(".");
  const at = (src) => path.reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), src);
  const exact = at(dict[lang] || {});
  if (exact != null) return exact;
  const tr = at(dict.tr || {});
  if (tr != null) return tr;
  const en = at(dict.en || {});
  if (en != null) return en;
  return fallback != null ? fallback : key;
}

function useLanguage() {
  const [lang, setLang] = useStateS(getLanguage());
  useEffectS(() => subscribeLanguage(setLang), []);
  return [lang, setLanguage];
}

function useI18n(dict = SHARED_I18N) {
  const [lang, setLang] = useLanguage();
  const t = (key, fallback) => pickTranslation(dict, lang, key, fallback);
  return { lang, setLang, toggleLang: toggleLanguage, t };
}

function Navbar({ active = "Keşfet", onSignup }) {
  const [scrolled, setScrolled] = useStateS(false);
  const [user, setUser] = useStateS(null);
  const { lang, t, toggleLang } = useI18n();

  useEffectS(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffectS(() => {
    const stored = localStorage.getItem("bakoda_user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
  }, []);

  const logout = () => {
    localStorage.removeItem("bakoda_token");
    localStorage.removeItem("bakoda_user");
    window.location.href = "login.html";
  };

  const LINKS = [
    { key: "nav.explore", href: "index.html" },
    { key: "nav.hotels", href: "search-results.html" },
    { key: "nav.about", href: "about.html" },
  ];

  const initials = user ? (user.first_name?.[0] || "") + (user.last_name?.[0] || "") : "";

  return (
    <nav className={`nav ${scrolled ? "scrolled" : "transparent"}`} data-screen-label="Navbar">
      <div className="container nav-inner">
        <a href="index.html" className="nav-logo" aria-label="bakoda">bakoda</a>
        <div className="nav-links">
          {LINKS.map((l) => {
            const label = t(l.key);
            const isActive = active === label || active === l.key;
            return (
            <a key={l.key} href={l.href} className={`nav-link ${isActive ? "active":""}`}>{label}</a>
          );
          })}
        </div>
        <div className="nav-right">
          <button className="nav-lang" type="button" aria-label={t("nav.languageAria")} onClick={toggleLang}>
            <IconGlobe size={16} /> <span className="full">{lang === "tr" ? "TR" : "ENG"}</span> <IconChevron size={12} />
          </button>
          {user ? (
            <>
              <a href="profile.html" style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:14, fontWeight:500, color:"inherit", textDecoration:"none" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--primary)", color:"#fff", display:"grid", placeItems:"center", fontSize:13, fontWeight:600, fontFamily:"var(--display)", flexShrink:0 }}>{initials.toUpperCase()}</div>
                <span style={{ maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.first_name}</span>
              </a>
              <button className="btn nav-btn-ghost" type="button" onClick={logout} style={{ fontSize:13, height:36, padding:"0 14px" }}>{t("nav.logout")}</button>
            </>
          ) : (
            <>
              <button className="btn nav-btn-ghost" type="button" onClick={() => { window.location.href = "login.html"; }}>{t("nav.login")}</button>
              <button className="btn btn-cta" type="button" onClick={() => { window.location.href = "register.html"; }}>{t("nav.signup")}</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer data-screen-label="Footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <div className="foot-brand">bakoda</div>
            <p className="foot-tag">{t("footer.tagline")}</p>
            <div className="foot-social">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><IconInstagram size={16} /></a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><IconFb size={16} /></a>
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X"><IconX size={14} /></a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><IconYoutube size={16} /></a>
            </div>
          </div>
          <div>
            <h4>{t("footer.company")}</h4>
            <ul>
              <li><a href="about.html">{t("footer.about")}</a></li>
              <li><a href="about.html">{t("footer.press")}</a></li>
              <li><a href="contact.html">{t("footer.careers")}</a></li>
              <li><a href="about.html">{t("footer.blog")}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t("footer.destinations")}</h4>
            <ul>
              <li><a href="search-results.html?city=%C4%B0stanbul">İstanbul</a></li>
              <li><a href="search-results.html?city=Paris">Paris</a></li>
              <li><a href="search-results.html?city=Bali">Bali</a></li>
              <li><a href="search-results.html">{t("footer.allCities")}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t("footer.help")}</h4>
            <ul>
              <li><a href="contact.html">{t("footer.faq")}</a></li>
              <li><a href="contact.html">{t("footer.cancelRefund")}</a></li>
              <li><a href="contact.html">{t("footer.contact")}</a></li>
              <li><a href="contact.html">{t("footer.guestServices")}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t("footer.social")}</h4>
            <ul>
              <li><a href="https://x.com" target="_blank" rel="noreferrer">@bakoda</a></li>
              <li><a href="contact.html">{t("footer.newsletter")}</a></li>
              <li><a href="about.html">{t("footer.community")}</a></li>
              <li><a href="contact.html">{t("footer.partnership")}</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bar">
          <div>{t("footer.copyright")}</div>
          <div className="links">
            <a href="about.html">{t("footer.privacy")}</a>
            <a href="about.html">{t("footer.terms")}</a>
            <a href="about.html">{t("footer.cookies")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Toast({ msg, on }) {
  return (
    <div className={`toast ${on ? "on":""}`} role="status" aria-live="polite">
      <span className="ok">✓</span>{msg}
    </div>
  );
}

Object.assign(window, { Navbar, Footer, Toast, useI18n, getLanguage, setLanguage, toggleLanguage, pickTranslation });
