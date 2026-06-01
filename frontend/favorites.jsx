// Favorites — grid + empty state

const { useState, useRef, useEffect } = React;

const fmtTL = (n) => "₺ " + new Intl.NumberFormat("tr-TR").format(n);

function FavCard({ f, removing, onRemove, onView }) {
  const [popping, setPopping] = useState(false);
  const heart = (ev) => {
    ev.stopPropagation();
    setPopping(true);
    setTimeout(() => onRemove(f.id), 250);
  };
  return (
    <article className={`fav-card ${removing ? "removing":""}`} onClick={onView}>
      <div className="fav-img">
        <div className={`ph ${f.ph}`} />
        <div className="ph-label">[ {f.note} ]</div>
        <button className={`heart-btn ${popping ? "pop":""}`} type="button"
                aria-label="Favorilerden çıkar" onClick={heart}>
          <IconHeart size={18} filled />
        </button>
      </div>
      <div className="fav-body">
        <div className="fav-rating">
          <span className="stars" aria-hidden="true">
            {Array.from({length: f.stars}).map((_, i) => <IconStar key={i} size={11} filled />)}
          </span>
          <b>{f.rating.toFixed(1)}/10</b>
          <span className="reviews">({new Intl.NumberFormat("tr-TR").format(f.reviews)})</span>
        </div>
        <h3 className="fav-name">{f.name}</h3>
        <div className="fav-loc"><IconMapPin size={12} /> {f.city}</div>
        <div className="fav-foot">
          <div className="fav-price">
            <b>{fmtTL(f.price)}</b>
            <span className="per">/ gece</span>
          </div>
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onView(); }}>İncele</button>
        </div>
      </div>
    </article>
  );
}

function App() {
  const [favs, setFavs] = useState([]);
  const [removing, setRemoving] = useState(new Set());
  const [toast, setToast] = useState({ on:false, msg:"" });
  const toastT = useRef(null);
  const token = localStorage.getItem("bakoda_token");

  useEffect(() => {
    if (!token) return;
    fetch("/api/users/me/favorites", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setFavs(data.map(f => ({
          id: f.hotel.id, name: f.hotel.name,
          city: f.hotel.city, district: f.hotel.district || "",
          stars: f.hotel.stars, rating: f.hotel.rating || 0,
          reviews: f.hotel.reviews_count || 0,
          price: f.hotel.price_per_night, ph: "ph-h1",
        })));
      })
      .catch(() => {});
  }, [token]);

  const flash = (msg) => {
    setToast({ on:true, msg });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(s => ({...s, on:false})), 2400);
  };

  const remove = (id) => {
    setRemoving(prev => new Set([...prev, id]));
    if (token) fetch(`/api/users/me/favorites/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setTimeout(() => {
      setFavs(curr => curr.filter(f => f.id !== id));
      setRemoving(prev => { const n = new Set(prev); n.delete(id); return n; });
      flash("Favorilerden çıkarıldı");
    }, 320);
  };

  return (
    <ProfileShell active="favorites">
      <div className="fade-in">
        <div className="head-row">
          <div>
            <h1>Kaydettiğim Oteller {favs.length > 0 && <b>({favs.length})</b>}</h1>
            <p>Daha sonra rezerve etmek üzere işaretlediğin oteller.</p>
          </div>
        </div>

        {favs.length > 0 ? (
          <div className="fav-grid">
            {favs.map(f => (
              <FavCard key={f.id} f={f} removing={removing.has(f.id)}
                onRemove={remove}
                onView={() => { window.location.href = "hotel-detail.html?id=" + f.id; }} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="ico-big"><IconHeart size={44} /></div>
            <h2>Henüz favori eklemediniz</h2>
            <p>Beğendiğiniz otellerin kart üstündeki kalbe dokunarak buraya kaydedebilirsiniz. Sonra dönüp bakmak çok kolay olur.</p>
            <div style={{ display:"inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <a href="search-results.html" className="btn btn-cta">
                Otelleri Keşfet <IconArrow size={14} />
              </a>
            </div>
          </div>
        )}
      </div>

      <div className={`toast ${toast.on ? "on":""}`} role="status" aria-live="polite">
        <span className="ok">✓</span>{toast.msg}
      </div>
    </ProfileShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
