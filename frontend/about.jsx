// About / Hakkımızda

const STATS = [
  { v: "50.000+", lbl: "Seçilmiş Otel" },
  { v: "120+",    lbl: "Ülke" },
  { v: "2M+",     lbl: "Mutlu Misafir" },
  { v: "4.9",     lbl: "Ortalama Konuk Puanı" },
];

const VALUES = [
  {
    ico: "IconBookmark",
    title: "Özenle Seçilmiş",
    text: "Her otel editörlerimiz tarafından bizzat ziyaret edilir ve gerçek konuk yorumlarına göre puanlanır. Sadece kalanların kalmaktan memnun olduğu yerleri öneririz.",
  },
  {
    ico: "IconTag",
    title: "Şeffaf Fiyatlar",
    text: "Hiçbir zaman gizli ücret yok. Vergi, hizmet, temizlik dahil ödeyeceğiniz toplam tutarı baştan görürsünüz. Daha düşük bulursanız aradaki farkı iade ederiz.",
  },
  {
    ico: "IconHeadset",
    title: "7/24 Destek",
    text: "Konuk hizmetleri ekibimiz Türkçe ve İngilizce, gece gündüz hizmetinizde. Ortalama yanıt süresi 2 dakikanın altında.",
  },
];

const TEAM = [
  { name: "Arif Batuhan Bahar", role: "Kurucu Ortak",  initials: "AB", ph: "ph-t1" },
  { name: "Burak Tuzcu",         role: "Kurucu Ortak",  initials: "BT", ph: "ph-t2" },
];

const PRESS = [
  { name: "TechCrunch",  cls: "italic" },
  { name: "Forbes",      cls: "italic" },
  { name: "CNN Travel",  cls: "upper" },
  { name: "Hürriyet",    cls: "mono"  },
  { name: "Condé Nast",  cls: "italic" },
];

const QUOTES = [
  { text: "bakoda, butik otel rezervasyonunun nasıl olması gerektiğini yeniden tanımlıyor.", who: "TechCrunch · 2025" },
  { text: "Türkiye'nin en hızlı büyüyen seyahat girişimlerinden biri.", who: "Forbes · 2024" },
  { text: "Editörlerin gerçekten otelleri ziyaret etmesi, sektörde nadir bir titizlik.", who: "Condé Nast · 2024" },
];

function App() {
  return (
    <>
      <Navbar active="Hakkımızda" />

      <div style={{ paddingTop: 72 }}>
        {/* ── Hero ── */}
        <header className="about-hero">
          <div className="container">
            <div className="eyebrow">Hakkımızda · 2026</div>
            <h1>Konaklama deneyimini <em>yeniden tanımlıyoruz</em>.</h1>
            <p>Mass-market rezervasyon platformlarının yorgun listelerinden bıktığımız için bakoda'yı kurduk. Her oteli bizzat ziyaret eden, sadece beğendiklerini öneren küçük bir ekibiz. 2024'ten bu yana 120 ülkede iki milyondan fazla misafiri ağırladık.</p>
          </div>
        </header>

        {/* ── Mission ── */}
        <section>
          <div className="container">
            <div className="mission">
              <div>
                <div className="sec-eyebrow">Misyonumuz</div>
                <h2 className="sec-title">Konaklama, ezbere reklam değil; özenli bir seçim olmalı.</h2>
                <p className="sec-sub">
                  bakoda'nın çıkış noktası basit: dünyada milyonlarca otel listesi var, ama gerçekten kalmaya değer olanların sayısı çok daha az. Biz mimari, hizmet, konum ve yerel karaktere dikkat eden bir ekiple bu seçimi yapıyor; sonra ortaya çıkan kısa listeyi sizinle paylaşıyoruz.
                </p>
                <p className="sec-sub" style={{ marginTop: 14 }}>
                  Her konaklamayı yılda en az bir kez bizzat ziyaret ediyoruz. Otel sahipleriyle değil; misafir gibi konaklayan editörlerimizle. Sonra her şeyi şeffaf, gizli ücretsiz, en iyi fiyat garantili olarak rezerve edebilmenizi sağlıyoruz.
                </p>
                <div style={{ marginTop: 28 }}>
                  <a href="search-results.html" className="btn btn-cta">Otelleri Keşfet <IconArrow size={14} /></a>
                </div>
              </div>

              <div className="stats" aria-label="Rakamlarla bakoda">
                {STATS.map((s, i) => (
                  <div className="stat" key={s.lbl}>
                    <b>{s.v.includes("+") ? <>{s.v.replace("+","")}<em>+</em></> : s.v}</b>
                    <div className="lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="values">
          <div className="container">
            <div className="sec-eyebrow">Değerlerimiz</div>
            <h2 className="sec-title">Üç temel ilke etrafında çalışıyoruz.</h2>

            <div className="value-grid">
              {VALUES.map(v => {
                const Ico = window[v.ico] || IconCheck;
                return (
                  <div className="value-card" key={v.title}>
                    <div className="value-ico"><Ico size={22} /></div>
                    <h3>{v.title}</h3>
                    <p>{v.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Team ── */}
        <section>
          <div className="container">
            <div className="sec-eyebrow">Ekip</div>
            <h2 className="sec-title">İşi gerçekten yapan iki kişi.</h2>
            <p className="sec-sub">bakoda'yı iki kurucu ortak yürütüyor. Otelleri biz seçiyor, biz ziyaret ediyor ve siz rezervasyon yaparken karşınızda biz oluyoruz.</p>

            <div className="team-grid">
              {TEAM.map(m => (
                <article className="team-card" key={m.name}>
                  <div className="team-img">
                    <div className={`ph ${m.ph}`} />
                    <div className="initials">{m.initials}</div>
                  </div>
                  <div className="team-body">
                    <div className="team-name">{m.name}</div>
                    <div className="team-role">{m.role}</div>
                    <div className="team-links">
                      <a href="#" aria-label="LinkedIn"><IconLink size={13} /></a>
                      <a href="#" aria-label="Instagram"><IconInstagram size={13} /></a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Press ── */}
        <section className="press">
          <div className="container">
            <div className="sec-eyebrow">Basında bakoda</div>
            <h2 className="sec-title">Yazılanlardan birkaçı.</h2>

            <div className="press-grid" aria-label="Basın logoları">
              {PRESS.map(p => (
                <div className="press-cell" key={p.name}>
                  <span className={`press-name ${p.cls}`}>{p.name}</span>
                </div>
              ))}
            </div>

            <div className="press-quotes">
              {QUOTES.map(q => (
                <div className="press-quote" key={q.who}>
                  "{q.text}"<span className="who">— {q.who}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="cta-strip">
          <div className="container">
            <h2>Bir sonraki konaklamanı planlamaya başla.</h2>
            <p>50.000+ özenle seçilmiş otel arasından, sana en uygun olanı bulalım.</p>
            <a href="search-results.html" className="btn btn-cta">Aramaya Başla <IconArrow size={14} /></a>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
