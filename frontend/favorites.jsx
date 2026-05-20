// Favorites — grid + empty state

const { useState, useRef, useEffect } = React;

const FAVS = [
  { id: 1, name: "Çırağan Palace Suites",     city: "İstanbul, Beşiktaş",  stars: 5, rating: 9.4, reviews: 1284, price: 8400, ph: "ph-f1", note: "luxe · waterfront" },
  { id: 2, name: "Villa Ananda Ubud",          city: "Bali, Ubud",          stars: 5, rating: 9.5, reviews: 318,  price: 11200, ph: "ph-f2", note: "retreat · jungle" },
  { id: 3, name: "Maison Lumière Marais",      city: "Paris, 3. Bölge",     stars: 4, rating: 8.7, reviews: 642,  price: 4200, ph: "ph-f3", note: "boutique · marais" },
  { id: 4, name: "The Cappadocia Cave Resort", city: "Nevşehir, Ürgüp",     stars: 5, rating: 8.9, reviews: 891,  price: 6200, ph: "ph-f4", note: "stone · honey" },
  { id: 5, name: "Hôtel Aubépine Rive Gauche", city: "Paris, 6. Bölge",     stars: 4, rating: 8.6, reviews: 412,  price: 3650, ph: "ph-f5", note: "atelier · garden" },
  { id: 6, name: "Casa Solana Riviera",        city: "Antalya, Kalkan",     stars: 4, rating: 8.7, reviews: 524,  price: 5800, ph: "ph-f6", note: "terracotta · sea" },
  { id: 7, name: "Bosphorus Bay Hotel",        city: "İstanbul, Tarabya",   stars: 5, rating: 9.1, reviews: 642,  price: 6400, ph: "ph-f7", note: "modern · sea" },
  { id: 8, name: "Hammam Heritage Sultanahmet",city: "İstanbul, Sultanahmet",stars: 4,rating: 8.9, reviews: 1521, price: 2800, ph: "ph-f8", note: "stone · old city" },
];

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
          <b>{f.rating.toFixed(1)}</b>
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
  const [favs, setFavs] = useState(FAVS);
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
          stars: f.hotel.stars, rating: f.hotel.rating * 2,
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

  // For demo: a Tweaks-free toggle to view empty state
  const reset = () => { setFavs(FAVS); setRemoving(new Set()); };
  const clearAll = () => { setFavs([]); setRemoving(new Set()); };

  return (
    <ProfileShell active="favorites">
      <div className="fade-in">
        <div className="head-row">
          <div>
            <h1>Kaydettiğim Oteller {favs.length > 0 && <b>({favs.length})</b>}</h1>
            <p>Daha sonra rezerve etmek üzere işaretlediğin oteller.</p>
          </div>
          {favs.length > 0 && (
            <div className="demo-bar" title="Demo görünümü">
              demo
              <button onClick={clearAll}>Boş hâli gör</button>
            </div>
          )}
        </div>

        {favs.length > 0 ? (
          <div className="fav-grid">
            {favs.map(f => (
              <FavCard key={f.id} f={f} removing={removing.has(f.id)}
                onRemove={remove}
                onView={() => { window.location.href = "hotel-detail.html"; }} />
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
              <button className="btn btn-ghost" onClick={reset}>Demo verileri geri yükle</button>
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
