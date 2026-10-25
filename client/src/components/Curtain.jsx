import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND, LOGO_FULL } from '../lib/brand.js';
import { beginIntro, endIntro, gsap, MOTION_OK, refreshTriggers, useGSAP } from '../lib/motion.js';
import './Curtain.css';

const isCms = (path) => path.startsWith('/bellacasa-cms');

// Set once the opening has actually played, so React re-running effects
// (Strict Mode in development) can't skip it or play it twice.
let introPlayed = false;

// An ink panel over the page. On the first visit the Bella Casa logo opens
// out of a circle and the panel lifts once fonts and logo are in (at most
// ~2.6s); after that it sweeps away on every page change, so moving between
// rooms feels like turning a page.
export default function Curtain() {
  const { pathname } = useLocation();
  const panelRef = useRef(null);

  useGSAP(() => {
    const panel = panelRef.current;
    if (isCms(pathname)) {
      gsap.set(panel, { autoAlpha: 0 });
      return undefined;
    }

    let cancelled = false;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.set(panel, { autoAlpha: 1, yPercent: 0 });
      if (!introPlayed) {
        beginIntro();
        const logo = panel.querySelector('.curtain__logo');
        const ready = Promise.race([
          Promise.all([document.fonts?.ready, logo.decode?.().catch(() => {}), new Promise((r) => setTimeout(r, 1300))]),
          new Promise((r) => setTimeout(r, 2600)),
        ]);
        const tl = gsap.timeline();
        tl.fromTo(logo, { clipPath: 'circle(0% at 50% 42%)', scale: 1.12 }, {
          clipPath: 'circle(75% at 50% 42%)', scale: 1, duration: 1.5, ease: 'expo.inOut',
        });
        ready.then(() => {
          if (cancelled) return;
          introPlayed = true;
          gsap.timeline({ delay: Math.max(0, tl.duration() - tl.time()) })
            .to(logo, { yPercent: -12, autoAlpha: 0, duration: 0.6, ease: 'expo.in' })
            .to(panel, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.25')
            .call(endIntro, null, '-=0.55')
            .set(panel, { autoAlpha: 0 })
            .call(refreshTriggers);
        });
      } else {
        gsap.set(panel.querySelector('.curtain__inner'), { autoAlpha: 0 });
        gsap.timeline({ delay: 0.05 })
          .to(panel, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' })
          .set(panel, { autoAlpha: 0 });
      }
    });
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(panel, { autoAlpha: 0 });
      endIntro();
    });
    return () => {
      cancelled = true;
      mm.revert();
    };
  }, { dependencies: [pathname], revertOnUpdate: true });

  return (
    <div className="curtain" ref={panelRef} aria-hidden="true">
      <div className="curtain__inner">
        <img src={LOGO_FULL} alt={BRAND} className="curtain__logo" width="720" height="704" />
      </div>
    </div>
  );
}
