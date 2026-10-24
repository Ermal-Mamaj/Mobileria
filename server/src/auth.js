import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

// The key that signs CMS sessions. JWT_SECRET wins when it's set. Otherwise
// it's derived from DATABASE_URL, which is already a server-only secret that
// is stable for the life of the deployment, so a fresh Vercel project works
// without anyone inventing and pasting a key. Changing the database password
// signs everyone out, which is the right outcome anyway.
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.DATABASE_URL) {
    return crypto.createHmac('sha256', 'bella-casa-session-key').update(process.env.DATABASE_URL).digest('hex');
  }
  return 'dev-secret-change-me';
}

const JWT_SECRET = resolveSecret();
export const COOKIE_NAME = 'bellacasa_admin';
export const CSRF_COOKIE_NAME = 'bellacasa_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Double-submit cookie pattern: the CSRF cookie is readable by JS (not
// httpOnly) so the client can echo it back as a header. A cross-site form
// post can send the cookie automatically but has no way to read it and
// therefore can't set the matching header, which is what actually blocks
// the forgery. The JWT cookie itself stays httpOnly throughout.
export function requireAdmin(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.get(CSRF_HEADER_NAME);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
  }

  next();
}

export function checkAdmin(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Same checks as requireAdmin (JWT + CSRF), but returns a value instead of
// writing an Express response — needed where a single route has to handle
// both a browser-initiated request (has our cookies) and a server-to-server
// callback (doesn't), such as Vercel Blob's client-upload token route.
export function verifyAdminRequest(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  let admin;
  try {
    admin = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get ? req.get(CSRF_HEADER_NAME) : req.headers?.[CSRF_HEADER_NAME];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) return null;
  return admin;
}
