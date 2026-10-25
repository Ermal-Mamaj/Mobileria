import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// All of the public site's motion goes through here: GSAP (+ScrollTrigger,
// SplitText) for the animation, Lenis for the smooth, weighted scroll. The
// CMS never imports this, so nothing here touches the editor.
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);

// Bella Casa's motion identity ("Premium": elegant, controlled, never
// bouncy). One signature curve for nearly everything that arrives, one for
// things that move across the screen, and three durations.
CustomEase.create('bc-enter', '0.16, 1, 0.3, 1'); // long, soft deceleration
CustomEase.create('bc-move', '0.4, 0, 0.2, 1'); // smooth both ends
export const EASE = { enter: 'bc-enter', move: 'bc-move' };
export const DUR = { quick: 0.35, standard: 0.6, slow: 1.0 };
gsap.defaults({ ease: EASE.enter, duration: DUR.standard });
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText, useGSAP };

// Every animation is registered inside this media query, so anyone who asked
// their OS for reduced motion gets the finished, still page.
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── Smooth scroll ─────────────────────────────────────────── */

let lenis = null;

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return;
  lenis = new Lenis({
    lerp: 0.1,
    anchors: true,
    stopInertiaOnNavigate: true,
    // Let things that scroll on their own keep their native scroll: the open
    // product sheet and menu, and a product rail when it's a swipe strip.
    prevent: (node) => {
      if (!node.closest) return false;
      if (node.closest('.room-modal, .nav-header__menu')) return true;
      const rail = node.closest('.product-rail, .home-gallery__track');
      return !!rail && rail.scrollWidth > rail.clientWidth;
    },
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);
}

// One ticker hook for the app's life; it drives whichever Lenis is current.
gsap.ticker.add((time) => lenis?.raf(time * 1000));

// The CMS keeps the browser's own scrolling.
export function stopSmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

// Freezes the page behind the mobile menu or a product sheet.
export function lockScroll() {
  document.body.classList.add('is-locked');
  lenis?.stop();
}

export function unlockScroll() {
  document.body.classList.remove('is-locked');
  lenis?.start();
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}

export function scrollToElement(el, offset = 0) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.2 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

// Recalculate every trigger once layout above them has settled (data arrived,
// fonts swapped). Batched so several sections finishing together refresh once.
let refreshQueued = false;
export function refreshTriggers() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}

/* ── Intro curtain hand-off ────────────────────────────────── */

// The first page under the opening curtain waits for it to lift before its
// hero plays; on later navigations this resolves at once.
let introResolve = null;
let introDone = Promise.resolve();

export function beginIntro() {
  introDone = new Promise((resolve) => { introResolve = resolve; });
}

export function endIntro() {
  introResolve?.();
  introResolve = null;
}

export function whenIntroDone() {
  return introDone;
}

/* ── Reusable reveals ──────────────────────────────────────── */

// The line masks clip everything outside the text line, which cut off the
// descenders (g, j, p, y, q) until the animation ended, so they popped in
// late. Padding the mask (and pulling it back with a negative margin, so the
// layout doesn't move) leaves room for them from the first frame.
export function padMasks(split) {
  (split.masks || []).forEach((mask) => {
    mask.style.paddingBottom = '0.28em';
    mask.style.marginBottom = '-0.28em';
  });
  return split;
}

// Headline that rises line by line out of masks as it scrolls into view.
// Pass `trigger: false` to get the timeline back un-triggered (for heroes).
export function splitReveal(el, { trigger = true, delay = 0, type = 'lines', stagger = 0.08, start = 'top 88%' } = {}) {
  if (!el || !el.textContent.trim()) return null;
  let tween = null;
  SplitText.create(el, {
    type: type === 'words' ? 'lines,words' : 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      padMasks(self);
      tween = gsap.from(type === 'words' ? self.words : self.lines, {
        yPercent: 110,
        duration: DUR.slow,
        ease: EASE.enter,
        stagger,
        delay,
        paused: !trigger,
        scrollTrigger: trigger ? { trigger: el, start, once: true } : undefined,
        // The line masks would otherwise keep clipping descenders.
        onComplete: () => self.revert(),
      });
      return tween;
    },
  });
  return tween;
}

// Words that light up one after another while the block is scrolled through.
export function scrubWords(el, { trigger, start = 'top 80%', end = 'bottom 45%', pin = false } = {}) {
  if (!el || !el.textContent.trim()) return;
  SplitText.create(el, {
    type: 'words',
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(self.words, { opacity: 0.14 }, {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        // pinSpacing spelled out: ScrollTrigger turns it off by default when
        // the pinned element sits in a flex container (the page shell is one).
        scrollTrigger: { trigger: trigger || el, start, end, scrub: true, pin, pinSpacing: !!pin },
      });
    },
  });
}

// Fade-and-rise for groups (cards, rows), batched so a row arrives together
// with a stagger instead of one trigger per element.
export function riseIn(targets, { y = 24, stagger = 0.08, start = 'top 90%' } = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length) return;
  gsap.set(els, { autoAlpha: 0, y });
  ScrollTrigger.batch(els, {
    start,
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      autoAlpha: 1, y: 0, duration: DUR.standard, ease: EASE.enter, overwrite: true,
      // Whatever the batch size, the last item starts within 0.4s.
      stagger: { each: stagger, amount: Math.min(stagger * (batch.length - 1), 0.4) },
    }),
  });
}

// A photo frame that wipes open from the bottom while the photo inside
// settles from a slight zoom.
export function wipeIn(frames, { inner, stagger = 0.12, start = 'top 88%', from = 'bottom' } = {}) {
  const els = gsap.utils.toArray(frames);
  if (!els.length) return;
  const hidden = {
    bottom: 'inset(100% 0% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
    left: 'inset(0% 100% 0% 0%)',
  }[from];
  gsap.set(els, { clipPath: hidden });
  if (inner) gsap.set(els.map((el) => el.querySelector(inner)).filter(Boolean), { scale: 1.08 });
  ScrollTrigger.batch(els, {
    start,
    once: true,
    onEnter: (batch) => {
      const each = { each: stagger, amount: Math.min(stagger * (batch.length - 1), 0.4) };
      gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: EASE.move, stagger: each, clearProps: 'clipPath' });
      if (inner) {
        gsap.to(batch.map((el) => el.querySelector(inner)).filter(Boolean), {
          scale: 1, duration: 1.4, ease: EASE.enter, stagger: each,
        });
      }
    },
  });
}

// Moves an element against the scroll while its section passes the screen.
export function parallax(el, { trigger, yPercent = 15, start = 'top bottom', end = 'bottom top' } = {}) {
  if (!el) return;
  gsap.fromTo(el, { yPercent: -yPercent }, {
    yPercent,
    ease: 'none',
    scrollTrigger: { trigger: trigger || el, start, end, scrub: true },
  });
}

// A page's opening headline: words rise out of their masks right after the
// curtain clears (no scroll trigger — it's already on screen).
export function introHeadline(el, { delay = 0.1, stagger = 0.08 } = {}) {
  if (!el || !el.textContent.trim()) return null;
  const split = padMasks(SplitText.create(el, { type: 'lines,words', mask: 'lines' }));
  const tween = gsap.from(split.words, {
    yPercent: 120, duration: DUR.slow, ease: EASE.enter, stagger, delay, paused: true,
    onComplete: () => split.revert(),
  });
  whenIntroDone().then(() => tween.play());
  return tween;
}
