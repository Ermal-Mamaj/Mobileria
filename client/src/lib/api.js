export function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const SESSION_EXPIRED_MESSAGE =
  'Seanca juaj ka përfunduar. Hyni përsëri (butoni lart), pastaj provoni sërish — të dhënat që keni shkruar nuk humbin.';

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookie('bellacasa_csrf');
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
  }

  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    // A missing or expired CMS session (or its CSRF cookie) gets a plain
    // Albanian message, and the CMS shows a banner to sign in again in
    // another tab, so whatever was being edited here isn't lost.
    const sessionLost = res.status === 401 || (res.status === 403 && /csrf/i.test(data?.error || ''));
    if (sessionLost && !path.startsWith('/admin/')) {
      window.dispatchEvent(new Event('admin-session-expired'));
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export const adminAuth = {
  login: (username, password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/admin/logout', { method: 'POST' }),
  me: () => request('/admin/me').catch(() => ({ loggedIn: false })),
  setupStatus: () => request('/admin/setup-status').catch(() => ({ needsSetup: false })),
  setup: (username, password) => request('/admin/setup', { method: 'POST', body: JSON.stringify({ username, password }) }),
};
