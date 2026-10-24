import { Fragment, lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import RoomTile from '../components/RoomTile.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ContactForm from '../components/ContactForm.jsx';
import Icon from '../components/Icon.jsx';
import Magnet from '../components/reactbits/Magnet.jsx';
import { useApiGet } from '../lib/hooks.js';
import { BRAND_LINE, mapsUrl, telUrl, whatsappUrl } from '../lib/brand.js';
import {
  gsap, MOTION_OK, refreshTriggers, riseIn, scrollToElement, scrubWords, splitReveal, SplitText, useGSAP, whenIntroDone, wipeIn,
} from '../lib/motion.js';
import './HomePage.css';

// The marquee brings in `motion` (its animation engine); loading it on its
// own keeps that off the path to the first paint.
const ScrollVelocity = lazy(() => import('../components/reactbits/ScrollVelocity.jsx'));

export default function HomePage() {
  const { data: home } = useApiGet('/content/home', {});
  const { data: settings } = useApiGet('/site-settings', {});
  const { data: categories } = useApiGet('/categories', []);
  const { data: featured } = useApiGet('/products?featured=1', []);
  const { data: saleProducts } = useApiGet('/products?sale=1', []);
  const heroRef = useRef(null);
  const roomsRef = useRef(null);
  const bandRef = useRef(null);
  const productsRef = useRef(null);
  const contactRef = useRef(null);

  const headlineLines = (home.hero_headline || '').split('\n');
  const showSale = settings.sale_section_enabled && saleProducts.length > 0;

  // Hero: once the curtain lifts, the photo settles from a deep zoom while
  // the headline rises word by word, then the label and buttons follow.
  // Scrolling away drifts the photo down and lifts the copy off.
  useGSAP(() => {
    if (!home.hero_headline) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(heroRef);
      const split = SplitText.create(q('.home-page__hero-headline')[0], { type: 'lines,words', mask: 'lines' });
      const tl = gsap.timeline({ paused: true });
      tl.from(q('.home-page__hero-image'), { scale: 1.32, duration: 2.4, ease: 'expo.out' }, 0)
        .from(q('.home-page__hero-gradient'), { autoAlpha: 0, duration: 1.2 }, 0)
        .from(q('.eyebrow__rule'), { scaleX: 0, transformOrigin: 'left center', duration: 1, ease: 'expo.inOut' }, 0.15)
        .from(q('.eyebrow > span:last-child'), { autoAlpha: 0, x: -16, duration: 0.8 }, 0.45)
        .from(split.words, { yPercent: 120, duration: 1.25, ease: 'expo.out', stagger: 0.075 }, 0.25)
        .from(q('.home-page__hero-actions > *'), { autoAlpha: 0, y: 28, duration: 0.9, stagger: 0.1 }, 0.85)
        .from(q('.home-page__hero-scroll'), { autoAlpha: 0, y: 16, duration: 0.8 }, 1.2);
      whenIntroDone().then(() => tl.play());

      const scrub = { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(q('.home-page__hero-media'), { yPercent: 24, ease: 'none', scrollTrigger: scrub });
      gsap.to(q('.home-page__hero-copy'), { yPercent: -18, autoAlpha: 0, ease: 'none', scrollTrigger: { ...scrub, end: 'bottom 25%' } });
    });
    return () => mm.revert();
  }, { scope: heroRef, dependencies: [home.hero_headline], revertOnUpdate: true });

  // Rooms: heading rises out of its mask, tiles wipe open one after another.
  useGSAP(() => {
    if (!categories.length) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(roomsRef);
      splitReveal(q('.section-heading')[0]);
      riseIn(q('.see-all-link'), { y: 16 });
      wipeIn(q('.room-tile'), { inner: '.room-tile__image', stagger: 0.14 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: roomsRef, dependencies: [categories.length], revertOnUpdate: true });

  // Quote band: on desktop the band pins while its words light up in turn;
  // on phones the words light up as the band scrolls past.
  useGSAP(() => {
    if (!home.quote_text) return;
    const mm = gsap.matchMedia();
    mm.add({ ok: MOTION_OK, desktop: '(min-width: 900px)' }, (ctx) => {
      if (!ctx.conditions.ok) return;
      const q = gsap.utils.selector(bandRef);
      const { desktop } = ctx.conditions;
      scrubWords(q('.brand-band__text')[0], desktop
        ? { trigger: bandRef.current, start: 'top top', end: '+=90%', pin: true }
        : { start: 'top 80%', end: 'bottom 50%' });
      gsap.fromTo(q('.brand-band__quote-mark'), { rotate: -18, scale: 0.7, yPercent: 20 }, {
        rotate: 0, scale: 1, yPercent: -10, ease: 'none',
        scrollTrigger: { trigger: bandRef.current, start: 'top bottom', end: desktop ? '+=180%' : 'bottom top', scrub: true },
      });
      gsap.from(q('.brand-band .eyebrow'), {
        autoAlpha: 0, x: -24, duration: 0.9,
        scrollTrigger: { trigger: bandRef.current, start: desktop ? 'top top' : 'top 60%', once: true },
      });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: bandRef, dependencies: [home.quote_text], revertOnUpdate: true });

  // Products: headings rise, photos wipe open, details follow.
  useGSAP(() => {
    if (!featured.length && !showSale) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(productsRef);
      q('.section-heading').forEach((h) => splitReveal(h));
      wipeIn(q('.product-card__image'), { stagger: 0.1 });
      riseIn(q('.product-card__body'), { y: 24, stagger: 0.1 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: productsRef, dependencies: [featured.length, showSale], revertOnUpdate: true });

  // Contact: heading by line, then the direct links and the form rise in.
  useGSAP(() => {
    if (!home.contact_heading && !settings.id) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(contactRef);
      splitReveal(q('.section-heading')[0]);
      riseIn([...q('.section-intro'), ...q('.home-contact__direct li'), ...q('.home-contact__form')], { y: 32, stagger: 0.08 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: contactRef, dependencies: [home.contact_heading, settings.id], revertOnUpdate: true });

  const directions = settings.address || settings.address_2;
  const roomNames = categories.map((c) => c.name);

  return (
    <div className="home-page app-shell">
      <NavHeader />

      <section className="home-page__hero" aria-label="Bella Casa" ref={heroRef}>
        <div className="home-page__hero-media">
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
              <Fragment key={i}>
                {line}
                {i < headlineLines.length - 1 && <br />}
              </Fragment>
            ))}
          </h1>
          <div className="home-page__hero-actions">
            <Magnet padding={60} magnetStrength={4}>
              <button
                type="button"
                className="btn-gold"
                onClick={() => scrollToElement(roomsRef.current, -40)}
              >
                {home.hero_cta || 'Shiko ambientet'}
                <Icon name="arrow" className="btn-arrow" />
              </button>
            </Magnet>
            <Magnet padding={60} magnetStrength={4}>
              <Link to="/contact" className="btn-ghost">Na kontaktoni</Link>
            </Magnet>
          </div>
        </div>
        <div className="home-page__hero-scroll" aria-hidden="true">
          <span>Rrëshqitni</span>
          <span className="home-page__hero-scroll-line" />
        </div>
      </section>

      {roomNames.length > 0 && (
        <div className="home-marquee" aria-hidden="true">
          <Suspense fallback={<div className="home-marquee__placeholder" />}>
            <ScrollVelocity
              texts={[roomNames.join('  ✦  '), BRAND_LINE]}
              velocity={36}
              numCopies={4}
              separator="✦"
              gap={32}
              outlineAlternate
              fadeEdges
              skewWithVelocity={6}
              className="home-marquee__text"
            />
          </Suspense>
        </div>
      )}

      <section className="home-page__section home-rooms-section" ref={roomsRef} aria-labelledby="home-rooms-title">
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

      <div className="brand-band" ref={bandRef}>
        <div className="brand-band__quote-mark" aria-hidden="true">&ldquo;</div>
        <div className="brand-band__content">
          <p className="brand-band__text">{home.quote_text}</p>
          <div className="eyebrow eyebrow--gold">
            <span className="eyebrow__rule" />
            <span>{home.quote_label}</span>
          </div>
        </div>
      </div>

      <div ref={productsRef}>
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

        {showSale && (
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
      </div>

      <section id="contactForm" className="home-page__section home-contact" ref={contactRef} aria-labelledby="home-contact-title">
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
