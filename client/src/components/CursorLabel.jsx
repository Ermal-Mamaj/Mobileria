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

    // Sits just below-right of the pointer, so it never covers what's under it.
    gsap.set(el, { xPercent: 0, yPercent: 0, x: 0, y: 0, scale: 0, autoAlpha: 0, transformOrigin: '0% 0%' });
    const toX = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
    const toY = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
    let current = null;
    let pointer = null;

    // What's under the mouse, decided from where it is rather than from the
    // last element it moved over: when the page scrolls under a still mouse
    // (wheel, Lenis easing) no pointer event fires, so scrolling re-checks.
    const update = () => {
      if (!pointer) return;
      const under = document.elementFromPoint(pointer.x, pointer.y);
      const target = under?.closest?.('[data-cursor]') || null;
      if (target === current) return;
      current = target;
      if (target) {
        setLabel(target.dataset.cursor);
        gsap.to(el, { scale: 1, autoAlpha: 1, duration: 0.25, ease: 'power3.out', overwrite: 'auto' });
      } else {
        gsap.to(el, { scale: 0, autoAlpha: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
      }
    };
    const onMove = (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      toX(e.clientX + 16);
      toY(e.clientY + 18);
      update();
    };
    const onLeave = () => {
      current = null;
      pointer = null;
      gsap.to(el, { scale: 0, autoAlpha: 0, duration: 0.2, overwrite: 'auto' });
    };
    hideRef.current = onLeave;

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('pointerdown', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      hideRef.current = () => {};
      window.removeEventListener('pointerdown', onLeave);
      window.removeEventListener('scroll', update);
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
