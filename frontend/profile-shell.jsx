// profile-shell.jsx — shared sidebar + frame for profile/bookings/favorites.
// Renders Navbar (from shared.jsx) + sidebar + main slot + Footer.

const USER = window.PROFILE_USER || {
  firstName: "Selin",
  lastName:  "Karaca",
  email:     "selin@ornek.com",
  memberSince: "Ocak 2024",
  avatarTone: 1, // 1..3 — picks a color
};

const SIDEBAR_ITEMS = [
  { id: "personal",   label: "Kişisel Bilgiler", href: "profile.html",      ico: "IconUserCircle" },
  { id: "bookings",   label: "Rezervasyonlarım", href: "my-bookings.html",  ico: "IconCalendar" },
  { id: "favorites",  label: "Favorilerim",      href: "favorites.html",    ico: "IconHeart" },
  { id: "payment",    label: "Ödeme Yöntemleri", href: "payment-methods.html", ico: "IconWallet" },
  { id: "security",   label: "Güvenlik",         href: "security.html",        ico: "IconShield" },
];

function ProfileShell({ active, children }) {
  return (
    <>
      <Navbar />

      <div className="page">
        <div className="crumbs">
          <div className="container crumbs-inner">
            <a href="index.html">Anasayfa</a>
            <span className="sep">/</span>
            <span className="here">Profil</span>
          </div>
        </div>

        <div className="container">
          <div className="profile-layout">
            <ProfileSidebar active={active} />
            <main className="profile-main">{children}</main>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

function ProfileSidebar({ active }) {
  const initials = (USER.firstName[0] + USER.lastName[0]).toUpperCase();
  return (
    <aside className="profile-sidebar" aria-label="Profil menüsü">
      <div className="sb-user">
        <div className={`sb-avatar tone-${USER.avatarTone}`} aria-hidden="true">{initials}</div>
        <div className="sb-name">{USER.firstName} {USER.lastName}</div>
        <div className="sb-email">{USER.email}</div>
        <div className="sb-since">Üye · {USER.memberSince}</div>
      </div>

      <nav className="sb-nav">
        {SIDEBAR_ITEMS.map(it => {
          const Ico = window[it.ico] || IconCheck;
          return (
            <a key={it.id} href={it.href}
               className={`sb-link ${active === it.id ? "active":""}`}>
              <Ico size={16} /> {it.label}
            </a>
          );
        })}
        <a href="login.html" className="sb-link sb-logout">
          <IconLogout size={16} /> Çıkış Yap
        </a>
      </nav>
    </aside>
  );
}

Object.assign(window, { ProfileShell, ProfileSidebar, USER, SIDEBAR_ITEMS });
