import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND } from '../lib/brand.js';
import { beginIntro, endIntro, gsap, MOTION_OK, refreshTriggers, useGSAP } from '../lib/motion.js';
import './Curtain.css';

const isCms = (path) => path.startsWith('/bellacasa-cms');

// Set once the opening has actually played, so React re-running effects
// (Strict Mode in development) can't skip it or play it twice.
let introPlayed = false;

// An ink panel over the page. On the first visit it carries the wordmark and
// lifts once the fonts are in (at most ~2.6s); after that it sweeps away on
// every page change, so moving between rooms feels like turning a page.
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
        const letters = panel.querySelectorAll('.curtain__letter');
        const rule = panel.querySelector('.curtain__rule');
        const ready = Promise.race([
          Promise.all([document.fonts?.ready, new Promise((r) => setTimeout(r, 1100))]),
          new Promise((r) => setTimeout(r, 2600)),
        ]);
        const tl = gsap.timeline();
        tl.from(letters, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.035 })
          .from(rule, { scaleX: 0, duration: 1, ease: 'expo.inOut' }, 0.15);
        ready.then(() => {
          if (cancelled) return;
          introPlayed = true;
          gsap.timeline({ delay: Math.max(0, tl.duration() - tl.time()) })
            .to(letters, { yPercent: -110, duration: 0.6, ease: 'expo.in', stagger: 0.02 })
            .to(rule, { scaleX: 0, transformOrigin: 'right center', duration: 0.5, ease: 'expo.in' }, '<')
            .to(panel, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.2')
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
        <span className="curtain__word">
          {BRAND.split('').map((ch, i) => (
            <span key={i} className="curtain__letter">{ch === ' ' ? '\u00A0' : ch}</span>
          ))}
        </span>
        <span className="curtain__rule" />
      </div>
    </div>
  );
}
