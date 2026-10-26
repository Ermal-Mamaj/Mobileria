import { useSyncExternalStore } from 'react';

// Installing the site as an app on a phone (a PWA).
//
// Chrome and Edge announce "this can be installed" with a one-time
// `beforeinstallprompt` event, often before React has mounted anything, so it
// is caught here at startup and kept until a button asks for it. Safari on
// iPhone and iPad has no such event: the only way in is Share > Add to Home
// Screen, so there we just show those instructions.

let deferredPrompt = null;
const listeners = new Set();
let state = { canPrompt: false, showIosHint: false, installed: false };

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

export function initPwa() {
  if (typeof window === 'undefined') return;

  if (isStandalone()) {
    setState({ installed: true });
  } else if (isIos()) {
    setState({ showIosHint: true });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    setState({ canPrompt: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canPrompt: false, showIosHint: false, installed: true });
  });

  // The worker is what makes the site installable and usable offline. It is
  // only registered in the production build: in dev it would cache the Vite
  // dev server's modules and make edits look like they didn't apply.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed', err);
      });
    });
  }
}

async function promptInstall() {
  if (!deferredPrompt) return;
  const prompt = deferredPrompt;
  deferredPrompt = null; // an install prompt can only be shown once
  setState({ canPrompt: false });
  await prompt.prompt();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const getSnapshot = () => state;

// { canPrompt, showIosHint, installed, promptInstall }
export function useInstallApp() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...s, promptInstall };
}
