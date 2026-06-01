// profile-shell.jsx — shared sidebar + frame for profile/bookings/favorites.
// Renders Navbar (from shared.jsx) + sidebar + main slot + Footer.

// Populate from localStorage if token available
(function() {
  const stored = localStorage.getItem("bakoda_user");
  if (stored) {
    try {
      const u = JSON.parse(stored);
      window.PROFILE_USER = {
        firstName: u.first_name || "Kullanıcı",
        lastName:  u.last_name  || "",
        email:     u.email      || "",
        memberSince: new Date(u.created_at || Date.now()).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        avatarTone: u.avatar_tone || 1,
      };
    } catch {}
  }
})();

const USER = window.PROFILE_USER || {
  firstName: "Misafir",
  lastName:  "",
  email:     "",
  memberSince: "Ocak 2024",
  avatarTone: 1,
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
  const initials = `${USER.firstName?.[0] || "M"}${USER.lastName?.[0] || "U"}`.toUpperCase();
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
