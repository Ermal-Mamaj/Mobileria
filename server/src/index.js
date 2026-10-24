import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import './db/index.js';

import adminRoutes from './routes/admin.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import categoriesRoutes from './routes/categories.js';
import productsRoutes from './routes/products.js';
import contentRoutes from './routes/content.js';
import uploadsRoutes from './routes/uploads.js';
import contactRoutes from './routes/contact.js';
import salesRoutes from './routes/sales.js';

const PORT = process.env.PORT || 3001;

export const app = express();
// Vercel sits in front as a single reverse-proxy hop; trusting it lets
// express-rate-limit (and req.ip generally) resolve the real client IP from
// X-Forwarded-For instead of the proxy's own address.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// The showroom content is identical for every visitor and changes only when
// someone edits it in the CMS, yet each page view was waking a serverless
// function and querying Postgres to rebuild the same JSON. Letting Vercel's CDN
// hold it means most visits never reach the function at all.
//
// Applied per-router rather than globally on purpose: the admin routes and the
// contact inbox return visitor-specific or private data and must never be
// stored by a shared cache. Only GETs are marked — mutations aren't cacheable.
//
// The window is deliberately short: a CMS edit should show up on the site
// within seconds, not a minute. Most of the speed-up comes from the CDN
// absorbing bursts of traffic rather than from a long TTL, and
// stale-while-revalidate keeps responses instant while a fresh copy is fetched
// in the background — so shortening this costs almost no latency.
function cachePublicReads(req, res, next) {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
  }
  next();
}

app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/site-settings', cachePublicReads, settingsRoutes);
app.use('/api/categories', cachePublicReads, categoriesRoutes);
app.use('/api/products', cachePublicReads, productsRoutes);
app.use('/api/content', cachePublicReads, contentRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/sales', salesRoutes);

app.use((err, req, res, next) => {
  // Unique-constraint violation (e.g. two admins saving the same product
  // name at the same moment): a clear 409 instead of a generic 500.
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'Ky emër ekziston tashmë. Zgjidhni një emër tjetër.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only bind a listening port when run directly (local dev / a traditional
// host). On Vercel this file is imported by api/index.js instead, and the
// platform's own runtime handles the request/response cycle.
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`MAMAJ server listening on http://localhost:${PORT}`);
  });
}
