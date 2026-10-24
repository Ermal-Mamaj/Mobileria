import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, prefersReducedMotion } from '../lib/motion.js';
import './CursorLabel.css';

// A round label that follows the mouse over anything marked `data-cursor`
// ("Shiko" on products, "Hap" on rooms). Mouse-only: touch screens and
// reduced-motion visitors never see it.
export default function CursorLabel() {
  const ref = useRef(null);
  const hideRef = useRef(() => {});
  const [label, setLabel] = useState('');
  const { pathname } = useLocation();

  // A click usually navigates away from what was under the cursor.
  useEffect(() => hideRef.current(), [pathname]);

  useEffect(() => {
    const el = ref.current;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!el || !fine || prefersReducedMotion()) return undefined;

    gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
    const toX = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
    const toY = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
    let current = null;

    const onMove = (e) => {
      toX(e.clientX);
      toY(e.clientY);
      const target = e.target.closest?.('[data-cursor]');
      if (target === current) return;
      current = target;
      if (target) {
        setLabel(target.dataset.cursor);
        gsap.to(el, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(1.8)', overwrite: 'auto' });
      } else {
        gsap.to(el, { scale: 0, autoAlpha: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
      }
    };
    const onLeave = () => {
      current = null;
      gsap.to(el, { scale: 0, autoAlpha: 0, duration: 0.2, overwrite: 'auto' });
    };
    hideRef.current = onLeave;

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      hideRef.current = () => {};
      window.removeEventListener('pointerdown', onLeave);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="cursor-label" ref={ref} aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}
