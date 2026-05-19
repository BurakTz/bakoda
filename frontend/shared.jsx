// Shared components — Navbar, Footer, Toast.
// Used by both index.html (homepage) and search-results.html.

const { useState: useStateS, useEffect: useEffectS } = React;

function Navbar({ active = "Keşfet", onSignup }) {
  const [scrolled, setScrolled] = useStateS(false);
  useEffectS(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const LINKS = [
    { label: "Keşfet",     href: "index.html" },
    { label: "Oteller",    href: "search-results.html" },
    { label: "Deneyimler", href: "#" },
    { label: "Hakkımızda", href: "about.html" },
  ];
  return (
    <nav className={`nav ${scrolled ? "scrolled" : "transparent"}`} data-screen-label="Navbar">
      <div className="container nav-inner">
        <a href="index.html" className="nav-logo" aria-label="bakoda">bakoda</a>
        <div className="nav-links">
          {LINKS.map(l => (
            <a key={l.label} href={l.href} className={`nav-link ${active === l.label ? "active":""}`}>{l.label}</a>
          ))}
        </div>
        <div className="nav-right">
          <button className="nav-lang" type="button" aria-label="Dil seç"><IconGlobe size={16} /> <span className="full">TR</span> <IconChevron size={12} /></button>
          <button className="btn nav-btn-ghost" type="button" onClick={() => { window.location.href = "login.html"; }}>Giriş Yap</button>
          <button className="btn btn-cta" type="button" onClick={() => { window.location.href = "register.html"; }}>Kayıt Ol</button>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer data-screen-label="Footer">
      <div className="container">
        <div className="foot-grid">
          <div>
            <div className="foot-brand">bakoda</div>
            <p className="foot-tag">Find your perfect stay. Dünyanın dört bir yanından dikkatle seçilmiş otel ve butik konaklama.</p>
            <div className="foot-social">
              <a href="#" aria-label="Instagram"><IconInstagram size={16} /></a>
              <a href="#" aria-label="Facebook"><IconFb size={16} /></a>
              <a href="#" aria-label="X"><IconX size={14} /></a>
              <a href="#" aria-label="YouTube"><IconYoutube size={16} /></a>
            </div>
          </div>
          <div>
            <h4>Şirket</h4>
            <ul>
              <li><a href="about.html">Hakkımızda</a></li>
              <li><a href="#">Basın</a></li>
              <li><a href="#">Kariyer</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4>Destinasyonlar</h4>
            <ul>
              <li><a href="#">İstanbul</a></li>
              <li><a href="#">Paris</a></li>
              <li><a href="#">Bali</a></li>
              <li><a href="#">Tüm şehirler</a></li>
            </ul>
          </div>
          <div>
            <h4>Yardım</h4>
            <ul>
              <li><a href="#">Sıkça Sorulanlar</a></li>
              <li><a href="#">İptal & İade</a></li>
              <li><a href="contact.html">İletişim</a></li>
              <li><a href="#">Konuk Hizmetleri</a></li>
            </ul>
          </div>
          <div>
            <h4>Sosyal Medya</h4>
            <ul>
              <li><a href="#">@bakoda</a></li>
              <li><a href="#">Bülten</a></li>
              <li><a href="#">Topluluk</a></li>
              <li><a href="#">Partnerlik</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bar">
          <div>© 2026 bakoda. Tüm hakları saklıdır.</div>
          <div className="links">
            <a href="#">Gizlilik</a>
            <a href="#">Kullanım Şartları</a>
            <a href="#">Çerezler</a>
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

Object.assign(window, { Navbar, Footer, Toast });
