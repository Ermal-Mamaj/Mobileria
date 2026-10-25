import { useRef } from 'react';
import { Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import Icon from '../components/Icon.jsx';
import { useApiGet, usePageTitle } from '../lib/hooks.js';
import Magnet from '../components/reactbits/Magnet.jsx';
import {
  gsap, introHeadline, MOTION_OK, refreshTriggers, riseIn, scrubWords, splitReveal, useGSAP, EASE,
} from '../lib/motion.js';
import './AboutPage.css';

const VALUE_ICONS = [
  <path key="star" d="M12 3.5l2.5 5.6 6 .6-4.5 4 1.3 6-5.3-3.1-5.3 3.1 1.3-6-4.5-4 6-.6z" />,
  <path key="ruler" d="M3 16.5 16.5 3 21 7.5 7.5 21zM7 12.5l1.8 1.8M10 9.5l1.8 1.8M13 6.5l1.8 1.8" />,
  <path key="chat" d="M4 5h16v11H9l-5 4z" />,
];

// The story, values and quote are edited in the CMS (Faqet → Rreth Nesh),
// which shows them with these same classes.
export default function AboutPage() {
  const { data: about } = useApiGet('/content/about', {});
  usePageTitle('Rreth Nesh', about.paragraph_1);
  const values = about.values_json || [];
  const heroRef = useRef(null);
  const bodyRef = useRef(null);

  // The title rises after the curtain; scrolling pushes the workshop photo
  // back. The lead paragraph lights up word by word as it's read, values
  // draw their top rule and rise, the quote comes in line by line.
  useGSAP(() => {
    if (!about.id) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const h = gsap.utils.selector(heroRef);
      introHeadline(h('.about-hero__title')[0], { stagger: 0.1 });
      gsap.from(h('.about-hero__image'), { scale: 1.1, duration: 2, ease: EASE.enter });
      gsap.to(h('.about-hero__image'), {
        yPercent: 18, ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      const q = gsap.utils.selector(bodyRef);
      scrubWords(q('.about-paragraph')[0], { start: 'top 85%', end: 'bottom 55%' });
      riseIn(q('.about-paragraph:nth-child(2)'), { y: 30 });
      splitReveal(q('.about-subheading')[0]);
      riseIn(q('.value-item'), { y: 40, stagger: 0.12 });
      splitReveal(q('.about-quote__text')[0], { stagger: 0.12 });
      riseIn([...q('.about-quote__author'), ...q('.about-visit > *')], { y: 24 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { dependencies: [about.id, values.length], revertOnUpdate: true });

  return (
    <div className="app-shell">
      <NavHeader />

      <div className="about-hero" ref={heroRef}>
        <ImageSlot src={about.hero_image_url} placeholder="Foto e sallonit" alt="" dark priority className="about-hero__image" />
        <div className="about-hero__gradient" />
        <div className="about-hero__copy">
          <h1 className="about-hero__title">Historia Jonë</h1>
        </div>
      </div>

      {/* Story on latte, values and the quote on black, the visit on latte:
          the same bands the CMS editor shows. */}
      <div ref={bodyRef}>
        <section className="band-latte">
          <div className="page-body about-body">
            <p className="about-paragraph">{about.paragraph_1}</p>
            <p className="about-paragraph">{about.paragraph_2}</p>
          </div>
        </section>

        <section className="band-dark about-values-band">
          <div className="page-body">
            <h2 className="about-subheading">Vlerat Tona</h2>
            <div className="value-list">
              {values.map((v, i) => (
                <div className="value-item" key={i}>
                  <div className="value-item__icon">
                    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                      {VALUE_ICONS[i % VALUE_ICONS.length]}
                    </svg>
                  </div>
                  <div>
                    <h3 className="value-item__title">{v.title}</h3>
                    <p className="value-item__description">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="about-quote">
              <p className="about-quote__text">&ldquo;{about.quote_text}&rdquo;</p>
              <p className="about-quote__author">— {about.quote_author}</p>
            </div>
          </div>
        </section>

        <section className="band-latte">
          <div className="page-body about-visit">
            <p>Mobiliet duken më mirë nga afër. Ejani në sallon, ose na shkruani se çfarë po kërkoni.</p>
            <div className="about-visit__actions">
              <Magnet padding={32} magnetStrength={12} maxOffset={5}>
                <Link to="/contact" className="btn-navy">Na kontaktoni <Icon name="arrow" className="btn-arrow" /></Link>
              </Magnet>
              <Link to="/categories" className="btn-outline">Shiko ambientet</Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
