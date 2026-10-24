import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import RoomTile from '../components/RoomTile.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ContactForm from '../components/ContactForm.jsx';
import Icon from '../components/Icon.jsx';
import { useApiGet } from '../lib/hooks.js';
import { mapsUrl, telUrl, whatsappUrl } from '../lib/brand.js';
import './HomePage.css';

export default function HomePage() {
  const { data: home } = useApiGet('/content/home', {});
  const { data: settings } = useApiGet('/site-settings', {});
  const { data: categories } = useApiGet('/categories', []);
  const { data: featured } = useApiGet('/products?featured=1', []);
  const { data: saleProducts } = useApiGet('/products?sale=1', []);
  const collectionsRef = useRef(null);
  const heroMediaRef = useRef(null);

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
        const shift = Math.min(window.scrollY, 900) * 0.25;
        media.style.setProperty('--hero-shift', `${shift}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const directions = settings.address || settings.address_2;

  return (
    <div className="home-page app-shell">
      <NavHeader />

      <section className="home-page__hero" aria-label="Bella Casa">
        <div className="home-page__hero-media" ref={heroMediaRef}>
          <ImageSlot src={home.hero_image_url} placeholder="Foto" alt="" dark priority className="home-page__hero-image" />
        </div>
        <div className="home-page__hero-gradient" />
        <div className="home-page__hero-copy">
          <div className="eyebrow eyebrow--gold">
            <span className="eyebrow__rule" />
            <span>{home.hero_eyebrow || 'MOBILIE PËR ÇDO DHOMË'}</span>
          </div>
          <h1 className="home-page__hero-headline">
            {headlineLines.map((line, i) => (
              <span key={i} className="home-page__hero-line" style={{ '--i': i }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <div className="home-page__hero-actions">
            <button
              type="button"
              className="btn-gold"
              onClick={() => collectionsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              {home.hero_cta || 'Shiko ambientet'}
              <Icon name="arrow" className="btn-arrow" />
            </button>
            <Link to="/contact" className="btn-ghost">Na kontaktoni</Link>
          </div>
        </div>
      </section>

      <section className="home-page__section home-rooms-section" ref={collectionsRef} aria-labelledby="home-rooms-title">
        <div className="section-heading-row">
          <h2 className="section-heading" id="home-rooms-title">Zgjidh sipas Ambientit</h2>
          <Link to="/categories" className="see-all-link">
            Të gjitha ambientet <Icon name="arrow" />
          </Link>
        </div>

        <div className={`home-rooms ${categories.length >= 4 ? 'is-editorial' : ''}`}>
          {categories.slice(0, 4).map((cat, i) => (
            <RoomTile key={cat.id} category={cat} index={i} />
          ))}
        </div>
      </section>

      <div className="brand-band">
        <div className="brand-band__quote-mark" aria-hidden="true">&ldquo;</div>
        <div className="brand-band__content">
          <p className="brand-band__text">{home.quote_text}</p>
          <div className="eyebrow eyebrow--gold">
            <span className="eyebrow__rule" />
            <span>{home.quote_label}</span>
          </div>
        </div>
      </div>

      {featured.length > 0 && (
        <section className="home-page__section" aria-labelledby="home-new-title">
          <div className="section-heading-row">
            <h2 className="section-heading" id="home-new-title">Dizajnet më të Reja</h2>
            <Link to="/categories" className="see-all-link">
              Shiko të gjitha <Icon name="arrow" />
            </Link>
          </div>
          <div className="product-rail">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} to={`/rooms/${p.category_slug}`} showRoom />
            ))}
          </div>
        </section>
      )}

      {settings.sale_section_enabled && saleProducts.length > 0 && (
        <section className="home-page__section home-sale-section" aria-labelledby="home-sale-title">
          <div className="section-heading-row">
            <h2 className="section-heading" id="home-sale-title">Në Zbritje</h2>
          </div>
          <div className="product-rail">
            {saleProducts.map((p) => (
              <ProductCard key={p.id} product={p} to={`/rooms/${p.category_slug}`} showRoom />
            ))}
          </div>
        </section>
      )}

      <section id="contactForm" className="home-page__section home-contact" aria-labelledby="home-contact-title">
        <div className="home-contact__intro">
          <h2 className="section-heading" id="home-contact-title">{home.contact_heading || 'Le të krijojmë diçka të veçantë.'}</h2>
          <p className="section-intro">{home.contact_intro}</p>

          {(settings.phone || settings.whatsapp || directions) && (
            <ul className="home-contact__direct">
              {settings.phone && (
                <li>
                  <a href={telUrl(settings.phone)}>
                    <Icon name="phone" />
                    <span><small>Telefononi</small>{settings.phone}</span>
                  </a>
                </li>
              )}
              {settings.whatsapp && (
                <li>
                  <a href={whatsappUrl(settings.whatsapp)} target="_blank" rel="noopener noreferrer">
                    <Icon name="whatsapp" />
                    <span><small>Shkruani në</small>WhatsApp</span>
                  </a>
                </li>
              )}
              {directions && (
                <li>
                  <a href={mapsUrl(directions)} target="_blank" rel="noopener noreferrer">
                    <Icon name="pin" />
                    <span><small>Vizitoni sallonin</small>Merr drejtimin</span>
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="home-contact__form">
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
