import { useRef } from 'react';
import ImageSlot from './ImageSlot.jsx';
import { gsap, introHeadline, MOTION_OK, useGSAP } from '../lib/motion.js';
import './PageBanner.css';

// The opening of the plain pages (Ambientet, Na Kontaktoni): a photo the
// owner already manages in the CMS, darkened on the left, with the page's
// title and a line of text over it. The photo settles from a slow zoom and
// drifts as the page scrolls.
export default function PageBanner({ title, text, image }) {
  const ref = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(ref);
      introHeadline(q('.page-banner__title')[0]);
      gsap.from(q('.page-banner__text'), { autoAlpha: 0, y: 20, duration: 1, delay: 0.5 });
      gsap.fromTo(q('.page-banner'), { '--rule': 0 }, { '--rule': 1, duration: 1.4, ease: 'expo.inOut', delay: 0.2 });
      gsap.from(q('.page-banner__media .image-slot'), { scale: 1.18, duration: 2.6, ease: 'expo.out' });
      gsap.to(q('.page-banner__media'), {
        yPercent: 16, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    return () => mm.revert();
  }, { scope: ref, dependencies: [image], revertOnUpdate: true });

  return (
    <div ref={ref}>
      <header className="page-banner">
        <div className="page-banner__media" aria-hidden="true">
          <ImageSlot src={image} placeholder="Foto" alt="" dark priority />
        </div>
        <div className="page-banner__inner">
          <h1 className="page-banner__title">{title}</h1>
          {text && <p className="page-banner__text">{text}</p>}
        </div>
      </header>
    </div>
  );
}
