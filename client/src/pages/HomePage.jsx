import { Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import RoomArch from '../components/RoomArch.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ContactForm from '../components/ContactForm.jsx';
import Icon from '../components/Icon.jsx';
import Magnet from '../components/reactbits/Magnet.jsx';
import { useApiGet, usePageTitle } from '../lib/hooks.js';
import { BRAND, LOGO_FULL, mapsUrl, telUrl, whatsappUrl } from '../lib/brand.js';
import {
  gsap, MOTION_OK, refreshTriggers, riseIn, scrollToElement, scrubWords, splitReveal, SplitText, useGSAP, whenIntroDone, wipeIn, EASE, padMasks,
} from '../lib/motion.js';
import './HomePage.css';

export default function HomePage() {
  const { data: home } = useApiGet('/content/home', {});
  usePageTitle();
  const { data: settings } = useApiGet('/site-settings', {});
  const { data: categories } = useApiGet('/categories', []);
  const { data: featured } = useApiGet('/products?featured=1', []);
  const { data: saleProducts } = useApiGet('/products?sale=1', []);
  const { data: about } = useApiGet('/content/about', {});
  const heroRef = useRef(null);
  const factsRef = useRef(null);
  const galleryRef = useRef(null);
  const bandRef = useRef(null);
  const productsRef = useRef(null);
  const contactRef = useRef(null);

  const headlineLines = (home.hero_headline || '').split('\n');
  const showSale = settings.sale_section_enabled && saleProducts.length > 0;
  // New designs open with one piece shown wide (two columns) beside two
  // more, then rows of four; the count is trimmed so the grid closes neatly.
  const featuredLead = featured.length >= 3;
  const featuredShown = featuredLead
    ? featured.slice(0, 3 + 4 * Math.floor((Math.min(featured.length, 11) - 3) / 4))
    : featured;

  // Hero: once the curtain lifts, the photo settles from a slow zoom, the
  // gold rules open out from the label and the headline rises word by word.
  // Scrolling drifts the photo down behind the copy, which lifts away.
  useGSAP(() => {
    if (!home.hero_headline) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(heroRef);
      const split = padMasks(SplitText.create(q('.home-page__hero-headline')[0], { type: 'lines,words', mask: 'lines' }));
      const tl = gsap.timeline({ paused: true });
      tl.from(q('.home-page__hero-image'), { scale: 1.12, duration: 2.4, ease: EASE.enter }, 0)
        .from(q('.home-page__hero-gradient'), { autoAlpha: 0, duration: 1.4 }, 0)
        .fromTo(q('.eyebrow'), { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: EASE.move }, 0.3)
        .from(q('.eyebrow > span:last-child'), { autoAlpha: 0, y: 10, duration: 0.8 }, 0.5)
        .from(split.words, { yPercent: 120, duration: 1.25, ease: EASE.enter, stagger: 0.07 }, 0.4)
        .from(q('.home-page__hero-actions > *'), { autoAlpha: 0, y: 28, duration: 0.9, stagger: 0.1 }, 1)
        .from(q('.home-page__hero-scroll'), { autoAlpha: 0, y: 16, duration: 0.8 }, 1.3);
      whenIntroDone().then(() => tl.play());
      // Ambient layer: once the opening has played, the photo breathes very
      // slowly, so the room feels alive without asking for attention. Its own
      // tween, so the opening timeline still completes (and un-splits the
      // headline).
      tl.eventCallback('onComplete', () => {
        split.revert();
        gsap.to(q('.home-page__hero-image'), { scale: 1.04, duration: 14, ease: 'sine.inOut', repeat: -1, yoyo: true });
      });

      const scrub = { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(q('.home-page__hero-media'), { yPercent: 18, ease: 'none', scrollTrigger: scrub });
      gsap.to(q('.home-page__hero-copy'), { yPercent: -30, autoAlpha: 0, ease: 'none', scrollTrigger: { ...scrub, end: 'bottom 35%' } });
    });
    return () => mm.revert();
  }, { scope: heroRef, dependencies: [home.hero_headline], revertOnUpdate: true });

  // Figures at the foot of the hero: once the curtain lifts, the gold line
  // draws in and the numbers count up from zero.
  useGSAP(() => {
    if (!categories.length) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(factsRef);
      const tl = gsap.timeline({ paused: true, delay: 0.9 });
      tl.from(q('.home-facts__item'), { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.12 }, 0);
      q('[data-count]').forEach((el) => {
        const counter = { value: 0 };
        el.textContent = '0';
        tl.to(counter, {
          value: Number(el.dataset.count),
          duration: 1.8,
          ease: 'power2.out',
          snap: { value: 1 },
          onUpdate: () => { el.textContent = counter.value; },
        }, 0.2);
      });
      whenIntroDone().then(() => tl.play());
    });
    return () => mm.revert();
  }, { scope: factsRef, dependencies: [categories.length], revertOnUpdate: true });

  // Rooms gallery: on desktop the section holds still while the arches slide
  // past sideways, a gold line keeping count; on phones it's a swipe strip.
  // Either way the arches rise into place the first time they're seen.
  useGSAP(() => {
    if (!categories.length) return;
    const mm = gsap.matchMedia();
    mm.add({ ok: MOTION_OK, desktop: '(min-width: 1000px)' }, (ctx) => {
      if (!ctx.conditions.ok) return;
      const q = gsap.utils.selector(galleryRef);
      const track = q('.home-gallery__track')[0];
      splitReveal(q('.section-heading')[0]);
      if (ctx.conditions.desktop) {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const pinned = { trigger: galleryRef.current, start: 'top top', end: () => `+=${distance()}`, invalidateOnRefresh: true };
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { ...pinned, pin: true, pinSpacing: true, scrub: 0.6 },
        });
        gsap.fromTo(q('.home-gallery__progress span'), { scaleX: 0 }, {
          scaleX: 1, ease: 'none', scrollTrigger: { ...pinned, scrub: true },
        });
      }
      gsap.from(q('.room-arch__frame'), {
        clipPath: 'inset(100% 0% 0% 0%)', duration: 1.4, ease: EASE.move, stagger: 0.1, clearProps: 'clipPath',
        scrollTrigger: { trigger: galleryRef.current, start: 'top 70%', once: true },
      });
      gsap.from(q('.room-arch__caption'), {
        autoAlpha: 0, y: 24, duration: 1, stagger: 0.1, delay: 0.5,
        scrollTrigger: { trigger: galleryRef.current, start: 'top 70%', once: true },
      });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: galleryRef, dependencies: [categories.length], revertOnUpdate: true });

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

  // Quote band: on desktop the band pins while its words light up in turn,
  // and the logo beside it comes forward; on phones it all plays as the band
  // scrolls past.
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
      gsap.fromTo(q('.brand-band__logo'), { scale: 0.82, rotate: -4, autoAlpha: 0.15, yPercent: 8 }, {
        scale: 1, rotate: 0, autoAlpha: 1, yPercent: 0, ease: 'none',
        scrollTrigger: desktop
          ? { trigger: bandRef.current, start: 'top 60%', end: '+=120%', scrub: true }
          : { trigger: bandRef.current, start: 'top 85%', end: 'center center', scrub: true },
      });
      gsap.from(q('.brand-band .eyebrow'), {
        autoAlpha: 0, x: -24, duration: 0.9,
        scrollTrigger: { trigger: bandRef.current, start: desktop ? 'top top' : 'top 60%', once: true },
      });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: bandRef, dependencies: [home.quote_text], revertOnUpdate: true });

  // Contact: heading by line, then the direct links and the form rise in.
  useGSAP(() => {
    if (!home.contact_heading && !settings.id) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(contactRef);
      gsap.fromTo(q('.home-contact-band__media'), { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: contactRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      splitReveal(q('.section-heading')[0]);
      riseIn([...q('.section-intro'), ...q('.home-contact__direct li'), ...q('.home-contact__form')], { y: 32, stagger: 0.08 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: contactRef, dependencies: [home.contact_heading, settings.id], revertOnUpdate: true });

  const directions = settings.address || settings.address_2;
  const productTotal = categories.reduce((sum, c) => sum + (Number(c.product_count) || 0), 0);

  return (
    <div className="home-page app-shell">
      <NavHeader />

      <section className={`home-page__hero ${categories.length > 0 ? 'has-facts' : ''}`} aria-label={BRAND} ref={heroRef}>
        <div className="home-page__hero-media">
          <ImageSlot src={home.hero_image_url} placeholder="Foto" alt="" dark priority className="home-page__hero-image" />
        </div>
        <div className="home-page__hero-gradient" />
        <div className="home-page__hero-inner">
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
              <Magnet padding={32} magnetStrength={12} maxOffset={5}>
                <button
                  type="button"
                  className="btn-gold"
                  onClick={() => scrollToElement(galleryRef.current)}
                >
                  {home.hero_cta || 'Shiko ambientet'}
                  <Icon name="arrow" className="btn-arrow" />
                </button>
              </Magnet>
              <Magnet padding={32} magnetStrength={12} maxOffset={5}>
                <Link to="/contact" className="btn-ghost">Na kontaktoni</Link>
              </Magnet>
            </div>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="home-facts" ref={factsRef} aria-label="Bella Casa në shifra">
            <Link to="/categories" className="home-facts__item">
              <span className="home-facts__num" data-count={categories.length}>{categories.length}</span>
              <span className="home-facts__label">Ambiente të shtëpisë <Icon name="arrow" /></span>
            </Link>
            {productTotal > 0 && (
              <Link to="/categories" className="home-facts__item">
                <span className="home-facts__num" data-count={productTotal}>{productTotal}</span>
                <span className="home-facts__label">Produkte në katalog <Icon name="arrow" /></span>
              </Link>
            )}
            <Link to="/contact" className="home-facts__item">
              <span className="home-facts__num home-facts__num--word">Me porosi</span>
              <span className="home-facts__label">
                  <span className="home-facts__long">Në përmasat dhe ngjyrat që ju duhen</span>
                  <span className="home-facts__short">Sipas masës suaj</span>
                  <Icon name="arrow" />
                </span>
            </Link>
          </div>
        )}
        <div className="home-page__hero-scroll" aria-hidden="true">
          <span>Rrëshqitni</span>
          <span className="home-page__hero-scroll-line" />
        </div>
      </section>

      {categories.length > 0 && (
        <section className="home-gallery" ref={galleryRef} aria-labelledby="home-rooms-title">
          <div className="home-gallery__head">
            <h2 className="section-heading" id="home-rooms-title">Zgjidh sipas Ambientit</h2>
            <Link to="/categories" className="see-all-link">
              Të gjitha ambientet <Icon name="arrow" />
            </Link>
          </div>
          <div className="home-gallery__track">
            {categories.map((cat, i) => (
              <RoomArch key={cat.id} category={cat} index={i} className="home-gallery__item" />
            ))}
          </div>
          <div className="home-gallery__progress" aria-hidden="true"><span /></div>
        </section>
      )}

      <div className="home-products band-latte" ref={productsRef}>
        {featured.length > 0 && (
          <section className="home-page__section" aria-labelledby="home-new-title">
            <div className="section-heading-row">
              <h2 className="section-heading" id="home-new-title">Dizajnet më të Reja</h2>
              <Link to="/categories" className="see-all-link">
                Shiko të gjitha <Icon name="arrow" />
              </Link>
            </div>
            <div className={`product-rail ${featuredLead ? 'is-featured' : ''}`}>
              {featuredShown.map((p) => (
                <ProductCard key={p.id} product={p} to={`/rooms/${p.category_slug}?p=${p.id}`} showRoom />
              ))}
            </div>
          </section>
        )}

        {showSale && (
          <section className="home-page__section home-sale-section" aria-labelledby="home-sale-title">
            <div className="section-heading-row">
              <h2 className="section-heading" id="home-sale-title">Në Zbritje</h2>
            </div>
            <div className="product-rail" style={{ '--cols': Math.min(saleProducts.length, 4) }}>
              {saleProducts.map((p) => (
                <ProductCard key={p.id} product={p} to={`/rooms/${p.category_slug}?p=${p.id}`} showRoom />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="brand-band" ref={bandRef}>
        <div className="brand-band__content brand-band__layout">
          <div>
            <p className="brand-band__text">{home.quote_text}</p>
            <div className="eyebrow eyebrow--gold">
              <span className="eyebrow__rule" />
              <span>{home.quote_label}</span>
            </div>
          </div>
          <img src={LOGO_FULL} alt={BRAND} className="brand-band__logo" loading="lazy" width="720" height="704" />
        </div>
      </div>

      <section id="contactForm" className="home-contact-band" ref={contactRef} aria-labelledby="home-contact-title">
        <div className="home-contact-band__media" aria-hidden="true">
          <ImageSlot src={about.hero_image_url || home.hero_image_url} placeholder="Foto" alt="" dark />
        </div>
        <div className="home-page__section home-contact">
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
        </div>
      </section>

      <Footer />
    </div>
  );
}
