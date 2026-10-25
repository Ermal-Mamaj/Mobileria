import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import PriceTag from '../components/PriceTag.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Icon from '../components/Icon.jsx';
import { useApiGet, usePageTitle } from '../lib/hooks.js';
import { roomTone, telUrl, whatsappUrl } from '../lib/brand.js';
import Magnet from '../components/reactbits/Magnet.jsx';
import {
  gsap, lockScroll, MOTION_OK, parallax, refreshTriggers, riseIn, splitReveal, SplitText, unlockScroll, useGSAP, whenIntroDone, wipeIn,
} from '../lib/motion.js';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('p');
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const heroRef = useRef(null);
  const gridRef = useRef(null);
  const ctaRef = useRef(null);

  const photos = photosOf(selected);
  // The room keeps the wall colour it has everywhere else (its place in the
  // CMS list); the next room is offered at the bottom of the page.
  const position = categories.findIndex((c) => c.slug === slug);
  const tone = roomTone(position);
  const next = position >= 0 && categories.length > 1 ? categories[(position + 1) % categories.length] : null;

  // The open product is part of the link (/rooms/bedroom?p=12), so a
  // product clicked on Home opens straight away here, and a link to it can
  // be shared. `replace` keeps the Back button for leaving the page.
  function open(product, e) {
    openerRef.current = e?.currentTarget || null;
    setSelected(product);
    setIndex(0);
    setSearchParams({ p: String(product.id) }, { replace: true });
  }

  const close = useCallback(() => {
    setSelected(null);
    setSearchParams({}, { replace: true });
    openerRef.current?.focus();
  }, [setSearchParams]);

  useEffect(() => {
    if (!requested || !products.length) return;
    const product = products.find((p) => String(p.id) === requested);
    if (product) {
      setSelected(product);
      setIndex(0);
    }
  }, [requested, products]);

  usePageTitle(
    selected ? `${selected.name} · ${category?.name || ''}` : category?.name,
    category?.tagline,
  );

  // Arrow keys page the photos, Escape closes. Bound only while the sheet is
  // up; the page behind it stays still and focus moves into the sheet.
  useEffect(() => {
    if (!selected) return;
    lockScroll();
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (photos.length < 2) return;
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [selected, photos.length, close]);

  // Hero: the room photo settles from a slow zoom, the room name comes up
  // word by word and the rest follows; then the photo drifts as the page
  // scrolls.
  useGSAP(() => {
    if (!category?.name) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(heroRef);
      const split = SplitText.create(q('.room-hero__title')[0], { type: 'lines,words', mask: 'lines' });
      const tl = gsap.timeline({ paused: true, onComplete: () => split.revert() });
      tl.from(q('.room-hero__image'), { scale: 1.2, duration: 2.6, ease: 'expo.out' }, 0)
        .from(q('.room-hero__crumbs'), { autoAlpha: 0, y: 14, duration: 0.7 }, 0.35)
        .from(split.words, { yPercent: 120, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, 0.45)
        .from(q('.room-hero__tagline, .room-hero__count'), { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.1 }, 0.8);
      whenIntroDone().then(() => tl.play());
      parallax(q('.room-hero__media')[0], { trigger: heroRef.current, yPercent: 10, start: 'top top' });
    });
    return () => mm.revert();
  }, { scope: heroRef, dependencies: [slug, category?.name], revertOnUpdate: true });

  // Products wipe open in rows; the "can't find it" band rises after them.
  useGSAP(() => {
    if (!products.length) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(gridRef);
      wipeIn(q('.product-card__image'), { stagger: 0.1 });
      riseIn(q('.product-card__body'), { y: 24, stagger: 0.1 });
      const c = gsap.utils.selector(ctaRef);
      splitReveal(c('.room-cta__title')[0]);
      riseIn([...c('.room-cta__text'), ...c('.room-cta__actions > *')], { y: 24 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { dependencies: [slug, products.length], revertOnUpdate: true });

  const enquiry = selected ? `Përshëndetje, jam i interesuar për "${selected.name}" (${category?.name || ''}).` : '';

  return (
    <div className="app-shell">
      <NavHeader />

      <section className={`room-hero tone-${tone}`} ref={heroRef}>
        <div className="room-hero__media">
          <ImageSlot src={category?.hero_image_url} placeholder="Foto" alt="" dark priority className="room-hero__image" />
        </div>
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
      </section>

      <div className="band-latte room-band">
      <div className="room-products" ref={gridRef}>
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

      <section className="room-cta" ref={ctaRef}>
        <div className="room-cta__inner">
          <div>
            <h2 className="room-cta__title">Nuk e gjeni atë që kërkoni?</h2>
            <p className="room-cta__text">Shumë mobilie i punojmë me porosi — në përmasat, ngjyrat dhe materialet që i duhen shtëpisë suaj.</p>
          </div>
          <div className="room-cta__actions">
            <Magnet padding={32} magnetStrength={12} maxOffset={5}>
              <Link to="/contact" className="btn-navy">Na kontaktoni <Icon name="arrow" className="btn-arrow" /></Link>
            </Magnet>
            {next && next.slug !== slug && (
              <Link to={`/rooms/${next.slug}`} className="room-cta__next">
                <small>Ambienti tjetër</small>
                <span>{next.name} <Icon name="arrow" /></span>
              </Link>
            )}
          </div>
        </div>
      </section>
      </div>

      {selected && (
        <div className="room-modal-overlay" onClick={close} data-lenis-prevent>
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
