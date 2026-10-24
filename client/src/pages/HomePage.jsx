import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import PriceTag from '../components/PriceTag.jsx';
import { useApiGet } from '../lib/hooks.js';
import { api } from '../lib/api.js';
import './HomePage.css';

export default function HomePage() {
  const { data: home } = useApiGet('/content/home', {});
  const { data: settings } = useApiGet('/site-settings', {});
  const { data: categories } = useApiGet('/categories', []);
  const { data: featured } = useApiGet('/products?featured=1', []);
  const { data: saleProducts } = useApiGet('/products?sale=1', []);
  const collectionsRef = useRef(null);
  const heroMediaRef = useRef(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', message: '' });

  const headlineLines = (home.hero_headline || '').split('\n');

  // Drift the hero photo slower than the page as you scroll, so it sits on a
  // plane behind the copy instead of moving with it. Transform-only and
  // rAF-throttled to stay off the main thread; skipped entirely for anyone who
  // asked their OS for reduced motion.
  useEffect(() => {
    const media = heroMediaRef.current;
    if (!media || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const shift = Math.min(window.scrollY, 700) * 0.2;
        media.style.setProperty('--hero-shift', `${shift}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Diçka shkoi keq. Provoni përsëri.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="home-page app-shell">
      <NavHeader />

      <div className="home-page__hero">
        <div className="home-page__hero-media" ref={heroMediaRef}>
          <ImageSlot src={home.hero_image_url} placeholder="Foto" dark priority className="home-page__hero-image" />
        </div>
        <div className="home-page__hero-gradient" />
        <div className="home-page__hero-copy">
          <div className="eyebrow eyebrow--gold">
            <span className="eyebrow__rule" />
            <span>{home.hero_eyebrow || 'MOBILIE PËR ÇDO DHOMË'}</span>
          </div>
          <h1 className="home-page__hero-headline">
            {headlineLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < headlineLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <button
            type="button"
            className="btn-gold"
            onClick={() => collectionsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            {home.hero_cta || 'Shiko ambientet'}
          </button>
        </div>
      </div>

      <section className="home-page__section" ref={collectionsRef}>
        <div className="eyebrow eyebrow--muted">
          <span className="eyebrow__rule" />
          <span>KOLEKSIONET</span>
        </div>
        <div className="section-heading-row">
          <h2 className="section-heading">Zgjidh sipas Ambientit</h2>
          <Link to="/categories" className="see-all-link">Shiko të gjitha →</Link>
        </div>

        <div className="category-grid">
          {categories.slice(0, 4).map((cat) => (
            <Link key={cat.id} to={`/rooms/${cat.slug}`} className="category-card">
              <div className="category-card__image">
                <ImageSlot src={cat.hero_image_url} placeholder="Foto" />
              </div>
              <div className="category-card__body">
                <h3 className="category-card__name">{cat.name}</h3>
                <p className="category-card__tagline">{cat.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="brand-band">
        <div className="brand-band__quote-mark">&ldquo;</div>
        <div className="brand-band__content">
          <p className="brand-band__text">{home.quote_text}</p>
          <div className="eyebrow eyebrow--gold">
            <span className="eyebrow__rule" />
            <span>{home.quote_label}</span>
          </div>
        </div>
      </div>

      <section className="home-page__section home-page__section--tight">
        <div className="eyebrow eyebrow--muted">
          <span className="eyebrow__rule" />
          <span>RISITË</span>
        </div>
        <div className="section-heading-row">
          <h2 className="section-heading">Dizajnet më të Reja</h2>
          <Link to="/categories" className="see-all-link">Shiko të gjitha →</Link>
        </div>
      </section>

      <div className="product-carousel">
        {featured.map((p) => (
          <Link key={p.id} to={`/rooms/${p.category_slug}`} className="product-card">
            <div className="product-card__image">
              <ImageSlot src={p.image_url} placeholder="Foto" />
              {p.badge && <span className="product-card__badge">{p.badge}</span>}
            </div>
            <div className="product-card__body">
              <h3 className="product-card__name">{p.name}</h3>
              <p className="product-card__material">{p.material}</p>
              <PriceTag product={p} className="product-card__price" />
              <span className="btn-outline">SHIKO</span>
            </div>
          </Link>
        ))}
      </div>

      {settings.sale_section_enabled && saleProducts.length > 0 && (
        <>
          <section className="home-page__section home-page__section--tight">
            <div className="eyebrow eyebrow--gold">
              <span className="eyebrow__rule" />
              <span>OFERTA</span>
            </div>
            <div className="section-heading-row">
              <h2 className="section-heading">Në Zbritje</h2>
            </div>
          </section>

          <div className="product-carousel">
            {saleProducts.map((p) => (
              <Link key={p.id} to={`/rooms/${p.category_slug}`} className="product-card">
                <div className="product-card__image">
                  <ImageSlot src={p.image_url} placeholder="Foto" />
                  <span className="product-card__badge product-card__badge--sale">ZBRITJE</span>
                </div>
                <div className="product-card__body">
                  <h3 className="product-card__name">{p.name}</h3>
                  <p className="product-card__material">{p.material}</p>
                  <PriceTag product={p} className="product-card__price" />
                  <span className="btn-outline">SHIKO</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <section id="contactForm" className="home-page__section">
        <div className="eyebrow eyebrow--muted">
          <span className="eyebrow__rule" />
          <span>NA KONTAKTONI</span>
        </div>
        <h2 className="section-heading">{home.contact_heading || 'Le të krijojmë diçka të veçantë.'}</h2>
        <p className="section-intro">{home.contact_intro}</p>

        {sent ? (
          <p className="contact-form__success">Mesazhi u dërgua me sukses. Do t'ju kontaktojmë së shpejti.</p>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <input type="text" name="name" placeholder="Emri juaj" value={form.name} onChange={handleChange} required />
            <input type="tel" name="phone" placeholder="Numri i telefonit" value={form.phone} onChange={handleChange} required />
            <textarea name="message" placeholder="Mesazhi juaj" value={form.message} onChange={handleChange} required />
            {error && <p className="contact-form__error">{error}</p>}
            <button type="submit" className="btn-navy" disabled={sending}>
              {sending ? 'DUKE DËRGUAR…' : 'DËRGO'}
            </button>
          </form>
        )}
      </section>

      <Footer />
    </div>
  );
}
