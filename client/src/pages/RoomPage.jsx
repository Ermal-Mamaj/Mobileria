import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import PriceTag from '../components/PriceTag.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { useApiGet } from '../lib/hooks.js';
import { roomTone, telUrl, whatsappUrl } from '../lib/brand.js';
import './RoomPage.css';

// The cover shot plus any extra angles, as one list to page through.
function photosOf(product) {
  if (!product) return [];
  const extra = (product.images || []).map((i) => i.image_url);
  return [product.image_url, ...extra].filter(Boolean);
}

export default function RoomPage() {
  const { slug } = useParams();
  const { data: category } = useApiGet(`/categories/${slug}`, null);
  const { data: products } = useApiGet(`/products?category=${slug}`, []);
  const { data: categories } = useApiGet('/categories', []);
  const { data: settings } = useApiGet('/site-settings', {});
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);
  const closeRef = useRef(null);
  const openerRef = useRef(null);

  const photos = photosOf(selected);
  // The room keeps the wall colour it has everywhere else (its place in the
  // CMS list); the next room is offered at the bottom of the page.
  const position = categories.findIndex((c) => c.slug === slug);
  const tone = roomTone(position);
  const next = position >= 0 && categories.length > 1 ? categories[(position + 1) % categories.length] : null;

  function open(product, e) {
    openerRef.current = e?.currentTarget || null;
    setSelected(product);
    setIndex(0);
  }

  function close() {
    setSelected(null);
    openerRef.current?.focus();
  }

  // Arrow keys page the photos, Escape closes. Bound only while the sheet is
  // up; the page behind it stays still and focus moves into the sheet.
  useEffect(() => {
    if (!selected) return;
    document.body.classList.add('is-locked');
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (photos.length < 2) return;
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('is-locked');
      window.removeEventListener('keydown', onKey);
    };
  }, [selected, photos.length]);

  const enquiry = selected ? `Përshëndetje, jam i interesuar për "${selected.name}" (${category?.name || ''}).` : '';

  return (
    <div className="app-shell">
      <NavHeader />

      <section className={`room-hero tone-${tone}`}>
        <div className="room-hero__panel">
          <nav className="room-hero__crumbs" aria-label="Ku jeni">
            <Link to="/categories">Ambientet</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{category?.name}</span>
          </nav>
          <h1 className="room-hero__title">{category?.name}</h1>
          {category?.tagline && <p className="room-hero__tagline">{category.tagline}</p>}
          {products.length > 0 && (
            <p className="room-hero__count">{products.length} {products.length === 1 ? 'produkt' : 'produkte'}</p>
          )}
        </div>
        <div className="room-hero__media">
          <ImageSlot src={category?.hero_image_url} placeholder="Foto" alt="" dark priority className="room-hero__image" />
        </div>
      </section>

      <div className="room-products">
        {products.length > 0 ? (
          <div className="room-product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} photoCount={photosOf(p).length} onOpen={(e) => open(p, e)} />
            ))}
          </div>
        ) : (
          <p className="room-products__empty">Produktet e këtij ambienti shtohen së shpejti. Na kontaktoni për çdo pyetje.</p>
        )}
      </div>

      <section className="room-cta">
        <div className="room-cta__inner">
          <div>
            <h2 className="room-cta__title">Nuk e gjeni atë që kërkoni?</h2>
            <p className="room-cta__text">Shumë mobilie i punojmë me porosi — në përmasat, ngjyrat dhe materialet që i duhen shtëpisë suaj.</p>
          </div>
          <div className="room-cta__actions">
            <Link to="/contact" className="btn-navy">Na kontaktoni <Icon name="arrow" className="btn-arrow" /></Link>
            {next && next.slug !== slug && (
              <Link to={`/rooms/${next.slug}`} className="room-cta__next">
                <small>Ambienti tjetër</small>
                <span>{next.name} <Icon name="arrow" /></span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {selected && (
        <div className="room-modal-overlay" onClick={close}>
          <div
            className="room-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="room-modal__close" onClick={close} ref={closeRef} aria-label="Mbyll">
              <Icon name="close" />
            </button>

            <div className="room-modal__gallery">
              <div className="room-modal__image">
                <ImageSlot key={photos[index]} src={photos[index]} placeholder="Foto" alt={selected.name} dark priority />

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="room-modal__nav room-modal__nav--prev"
                      aria-label="Foto e mëparshme"
                      onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                    >
                      <Icon name="chevronLeft" />
                    </button>
                    <button
                      type="button"
                      className="room-modal__nav room-modal__nav--next"
                      aria-label="Foto tjetër"
                      onClick={() => setIndex((i) => (i + 1) % photos.length)}
                    >
                      <Icon name="chevronRight" />
                    </button>
                    <span className="room-modal__counter">{index + 1} / {photos.length}</span>
                  </>
                )}
              </div>

              {photos.length > 1 && (
                <div className="room-modal__thumbs">
                  {photos.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      className={`room-modal__thumb ${i === index ? 'is-active' : ''}`}
                      aria-label={`Foto ${i + 1}`}
                      aria-pressed={i === index}
                      onClick={() => setIndex(i)}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="room-modal__body">
              <p className="room-modal__room">{category?.name}</p>
              <h2 className="room-modal__name" id="room-modal-title">{selected.name}</h2>
              {selected.material && <p className="room-modal__material">{selected.material}</p>}
              <PriceTag product={selected} className="room-modal__price" />
              <p className="room-modal__description">
                Shumë mobilie i ofrojmë edhe me porosi, në përmasa e ngjyra të ndryshme — vizitoni sallonin tonë për ta parë nga afër.
              </p>
              {(settings.phone || settings.whatsapp) && (
                <div className="room-modal__actions">
                  {settings.whatsapp && (
                    <a href={whatsappUrl(settings.whatsapp, enquiry)} className="btn-navy" target="_blank" rel="noopener noreferrer">
                      <Icon name="whatsapp" /> Pyetni në WhatsApp
                    </a>
                  )}
                  {settings.phone && (
                    <a href={telUrl(settings.phone)} className="btn-outline">
                      <Icon name="phone" /> Telefononi
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
