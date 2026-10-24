import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { sql } from '../db/index.js';
import { signToken, checkAdmin, generateCsrfToken, COOKIE_NAME, CSRF_COOKIE_NAME } from '../auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

// Throttle login attempts: 5 tries per 15 minutes per IP, regardless of outcome.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Same lifetime/scope as the session cookie, but NOT httpOnly — the client
// needs to read this one to echo it back as a header.
const CSRF_COOKIE_OPTS = { ...COOKIE_OPTS, httpOnly: false };

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const [user] = await sql`SELECT * FROM admin_users WHERE username = ${username}`;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTS);
  res.json({ username: user.username });
}));

// First run: a fresh database has no admin. Whoever opens the CMS first
// creates the account with their own username and password, so nobody has
// to put a password in an environment variable. Once an admin exists this
// route refuses, and the insert itself only succeeds while the table is
// empty, so two people racing for it can't both win.
router.get('/setup-status', asyncHandler(async (req, res) => {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM admin_users`;
  res.set('Cache-Control', 'no-store');
  res.json({ needsSetup: n === 0 });
}));

router.post('/setup', loginLimiter, asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Përdoruesi duhet të ketë 3–50 shkronja.' });
  }
  if (password.length < 10) {
    return res.status(400).json({ error: 'Fjalëkalimi duhet të ketë të paktën 10 karaktere.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const [user] = await sql`
    INSERT INTO admin_users (username, password_hash)
    SELECT ${username}, ${hash}
    WHERE NOT EXISTS (SELECT 1 FROM admin_users)
    RETURNING id, username
  `;
  if (!user) return res.status(409).json({ error: 'Llogaria e administratorit ekziston tashmë. Hyni me të.' });

  res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTS);
  res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTS);
  res.json({ username: user.username });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: undefined });
  res.clearCookie(CSRF_COOKIE_NAME, { ...CSRF_COOKIE_OPTS, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const admin = checkAdmin(req);
  if (!admin) return res.status(401).json({ loggedIn: false });
  res.json({ loggedIn: true, username: admin.username });
});

export default router;
