import { useEffect, useState } from 'react';
import { api } from './api.js';

// Components ask for the same content independently — NavHeader and Footer both
// want /site-settings, for example — which fired one HTTP request each. Sharing
// the in-flight promise per path collapses those into a single request.
//
// Deliberately only a request-dedupe, not a result cache: entries are dropped
// as soon as they settle, so navigating back to a page still refetches and the
// CMS never serves a stale page from memory.
const inFlight = new Map();

function getShared(path) {
  if (inFlight.has(path)) return inFlight.get(path);
  const promise = api.get(path).finally(() => inFlight.delete(path));
  inFlight.set(path, promise);
  return promise;
}

// Simple GET-and-cache-in-state hook for public, read-only content.
export function useApiGet(path, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getShared(path)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { data, loading };
}

// The title and description index.html ships with, used for Home.
const DEFAULT_TITLE = document.title;
const descriptionTag = document.querySelector('meta[name="description"]');
const DEFAULT_DESCRIPTION = descriptionTag?.getAttribute('content') || '';

// Sets the browser tab title ("Dhoma e Gjumit — Bella Casa") and the page
// description for search results and shared links. With no title it puts
// back the site's defaults.
export function usePageTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — Bella Casa` : DEFAULT_TITLE;
    descriptionTag?.setAttribute('content', description || DEFAULT_DESCRIPTION);
  }, [title, description]);
}
