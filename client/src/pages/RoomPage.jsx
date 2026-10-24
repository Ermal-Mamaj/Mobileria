import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import PriceTag from '../components/PriceTag.jsx';
import { useApiGet } from '../lib/hooks.js';
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
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);

  const photos = photosOf(selected);

  function open(product) {
    setSelected(product);
    setIndex(0);
  }

  // Arrow keys page the photos, Escape closes. Bound only while the modal is up.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
      if (photos.length < 2) return;
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, photos.length]);

  return (
    <div className="app-shell">
      <NavHeader />

      <div className="page-hero">
        <ImageSlot src={category?.hero_image_url} placeholder="Foto" dark priority className="page-hero__image" />
        <div className="page-hero__gradient" />
        <div className="page-hero__copy">
          <div className="eyebrow eyebrow--gold" style={{ marginBottom: 8, fontSize: '9.5px', letterSpacing: '2px' }}>
            <span className="eyebrow__rule" style={{ width: 20 }} />
            <span>KOLEKSION</span>
          </div>
          <h1 className="page-hero__title">{category?.name}</h1>
          <p className="page-hero__tagline">{category?.tagline}</p>
        </div>
      </div>

      <div className="room-product-grid">
        {products.map((p) => {
          const count = photosOf(p).length;
          return (
            <div key={p.id} className="room-product-card" onClick={() => open(p)}>
              <div className="room-product-card__image">
                <ImageSlot src={p.image_url} placeholder="Foto" />
                {count > 1 && <span className="room-product-card__count">{count} foto</span>}
              </div>
              <div className="room-product-card__body">
                <h3 className="room-product-card__name">{p.name}</h3>
                <p className="room-product-card__material">{p.material}</p>
                <PriceTag product={p} className="room-product-card__price" />
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="room-modal-overlay" onClick={() => setSelected(null)}>
          <div className="room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="room-modal__image">
              <ImageSlot src={photos[index]} placeholder="Foto" dark priority />
              <button type="button" className="room-modal__close" onClick={() => setSelected(null)}>×</button>

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="room-modal__nav room-modal__nav--prev"
                    aria-label="Foto e mëparshme"
                    onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="room-modal__nav room-modal__nav--next"
                    aria-label="Foto tjetër"
                    onClick={() => setIndex((i) => (i + 1) % photos.length)}
                  >
                    ›
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
                    onClick={() => setIndex(i)}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            <div className="room-modal__body">
              <div className="eyebrow eyebrow--muted" style={{ fontSize: '9.5px', letterSpacing: '2px' }}>
                <span className="eyebrow__rule" style={{ width: 18 }} />
                <span>BELLA CASA</span>
              </div>
              <h2 className="room-modal__name">{selected.name}</h2>
              <PriceTag product={selected} className="room-modal__price" />
              <p className="room-modal__description">
                {selected.material ? `${selected.material}. ` : ''}Shumë mobilie i ofrojmë edhe me porosi, në përmasa e ngjyra të ndryshme — vizitoni sallonin tonë për ta parë nga afër.
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
