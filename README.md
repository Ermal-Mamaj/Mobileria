# Bella Casa — Furniture Showroom

The website and CMS for Bella Casa, a furniture showroom: browse furniture by room,
see prices and photos, and contact the showroom. This is a **catalog, not a store**:
there is no cart or online checkout, by design. Sales are recorded by staff in the
CMS (Shitjet), which also prints the invoice (Fatura).

The whole site — every photo, product, category/room page, and piece of copy — is
editable by the business owner through a private admin dashboard, with no code
changes or developer involvement needed for day-to-day updates.

## Contents

- [What's here](#whats-here)
- [Quick start](#quick-start)
- [The admin CMS](#the-admin-cms)
- [Project structure](#project-structure)
- [How it fits together](#how-it-fits-together)
- [Environment variables](#environment-variables)
- [Installable app (PWA)](#installable-app-pwa)
- [Deploying](#deploying)
- [Known limitations / next steps](#known-limitations--next-steps)

## What's here

- **Public site** — Home, Categories, individual room pages (Living Room, Bedroom,
  Kitchen, Dining Room, Home Office, Outdoor, and any rooms you add later), Gallery,
  About, Contact. Mobile-first design, responsive from a 320px phone up through
  desktop (where it renders as a framed device on a dark backdrop rather than
  stretching full-width).
- **Admin CMS** at `/admin` — a hidden dashboard (not linked anywhere on the public
  site) where the owner logs in to edit hero text, categories/products, photos,
  gallery, About Us content, and contact/site info. Changes go live immediately.
- **API + database** — a small Express server backed by SQLite, with JWT-cookie admin
  auth and local image uploads.

Design system: deep navy (`#16222F`) + gold (`#EBC84C`) on a warm cream background,
Cormorant Garamond for headings, Inter for body text, Poppins for the wordmark.

## Quick start

Requires Node 18+.

```bash
npm install                       # installs root, server, and client (npm workspaces)
cp server/.env.example server/.env
npm run seed                      # creates the SQLite DB with starter content
npm run dev                       # runs the API (:3001) and the site (:5173) together
```

Open **http://localhost:5173** for the public site.

Running the two halves separately, if you ever need to:

```bash
npm run dev -w server   # API only, http://localhost:3001
npm run dev -w client   # Vite dev server only, http://localhost:5173 (proxies /api and /uploads to :3001)
```

## The admin CMS

**This is the important part.** The admin dashboard is not linked from anywhere on the
public site — no button, no footer link, nothing a visitor can stumble onto. You get to
it by going directly to:

```
http://localhost:5173/admin/login
```

(Once deployed, it's just `https://your-domain.com/admin/login`.)

Log in with the credentials from `server/.env` (see [Environment
variables](#environment-variables)). From the dashboard you can, without touching any
code:

| Tab | What you can do |
|---|---|
| **Home Page** | Edit the hero eyebrow/headline/CTA + hero photo, the workshop quote band, and the contact section heading/intro. |
| **Categories & Products** | Add a whole new room/subpage (e.g. "Garden") — it instantly becomes a real page at `/rooms/garden` with its own hero and product grid, the same way Kitchen or Bedroom work today. Edit or delete existing categories. Expand any category's "Manage Products" to add/edit/remove products: name, material, photo, an optional NEW/CUSTOM badge, and a toggle to feature it in the Home page's "New Designs" carousel. |
| **Gallery** | Add/remove photos and captions for the masonry gallery page. |
| **About Us** | Edit the story paragraphs, the "What We Value" list, the hero photo, and the closing quote. |
| **Site Settings** | Phone, WhatsApp, email, address, Facebook/Instagram, business hours, and the logo — these feed the footer and Contact page everywhere. |

Every photo field is a click-to-upload control (PNG/JPEG/WebP, resized and stored under
`server/uploads/`). Every change is saved via the API and appears on the live site
immediately — there's no publish/rebuild step.

### Default admin credentials

Set in `server/.env` (copied from `server/.env.example`, which is safe to commit —
`server/.env` itself is gitignored so real credentials never get committed):

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
JWT_SECRET=change-this-to-a-long-random-string
```

**Change `ADMIN_PASSWORD` and `JWT_SECRET` before relying on this for real**, then run
`npm run seed` once — seeding is idempotent, so it only creates the admin account and
starter content that don't already exist; it won't touch or duplicate content you've
already added.

## Project structure

```
server/
  src/
    index.js          Express app entry point, mounts all routes
    auth.js            JWT cookie signing/verification, requireAdmin middleware
    db/
      schema.js         SQL table definitions
      index.js          better-sqlite3 connection (creates data.sqlite on first run)
      seed.js            idempotent starter-content seeder (npm run seed)
    routes/
      admin.js           login / logout / me
      settings.js        site-wide contact info + logo
      categories.js       room/category CRUD
      products.js         product CRUD, filterable by ?category= and ?featured=
      gallery.js          gallery image CRUD
      content.js          singleton Home + About page copy
      uploads.js          multer image upload endpoint
  uploads/              uploaded images live here (gitignored, kept via .gitkeep)
  data.sqlite           SQLite database file (gitignored, created by seed/first run)

client/
  src/
    main.jsx, App.jsx    React Router route table
    index.css            design tokens (colors/fonts/shadows), responsive shell
    styles/common.css    shared classes reused across pages (buttons, cards, eyebrows…)
    lib/
      api.js              fetch wrapper + admin auth helpers
      hooks.js             useApiGet — simple GET-and-cache hook for public pages
    components/
      NavHeader.jsx        sticky header + hamburger dropdown, active-route highlight
      Footer.jsx           logo + contact info pulled from site settings
      ImageSlot.jsx         shows an uploaded photo, or a branded empty-state placeholder
    pages/                 the six public routes (Home, Categories, RoomPage, Gallery, About, Contact)
    admin/
      AdminAuth.jsx         auth context (login/logout/me) shared by login + dashboard
      AdminLogin.jsx        the /admin/login screen
      AdminDashboard.jsx    route table for the six dashboard tabs
      AdminLayout.jsx       shared tab nav + logout button
      ImageUploadField.jsx  reusable click-to-upload control
      sections/             one component per dashboard tab

project/   original Claude Design (claude.ai/design) prototype this app was built from
chats/     the design conversation transcript — reference material, not part of the app
```

## How it fits together

- **Categories are pages.** Each row in the `categories` table renders at
  `/rooms/:slug` via one shared `RoomPage` component. Adding a category in the admin
  *is* adding a new page — there's no separate "create a page" step.
- **Products belong to a category** and can optionally be flagged `featured_home`,
  which is what populates the Home page's "New Designs" carousel — no separate content
  model for that carousel.
- **Auth** is a signed JWT in an httpOnly cookie (`bellacasa_admin`), checked by a
  `requireAdmin` middleware on every mutating route. Public `GET` routes need no auth.
- **Images** are uploaded via `multer` to `server/uploads/`, served statically at
  `/uploads/...`, and only their URL is stored in SQLite — so back up
  `server/data.sqlite` *and* `server/uploads/` together if you ever move hosts.
- **No photos ship by default.** Every image slot renders a soft branded placeholder
  until the admin uploads something — this was a deliberate choice so nothing looks
  like a stock photo that isn't actually Bella Casa's work.

## Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `PORT` | API server port (default `3001`) |
| `JWT_SECRET` | Signing secret for admin session cookies — must be a long random string in production |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used only by `npm run seed` to create the first admin account |
| `CLIENT_ORIGIN` | Allowed CORS origin for the API (defaults to `http://localhost:5173`) — set this to your real domain in production |
| `NODE_ENV` | Set to `production` to mark the admin cookie `secure` (HTTPS-only) |

## Deploying

This is a standard two-process Node app — there's no framework lock-in:

1. Build the client: `npm run build -w client` → static files in `client/dist/`.
2. Serve `client/dist/` from any static host or CDN, **or** have the Express server
   serve it directly (not wired up yet — ask if you want this added so it's a single
   deployable process).
3. Run the API (`node server/src/index.js`) somewhere that keeps `server/data.sqlite`
   and `server/uploads/` on persistent disk (a container with a mounted volume, or a
   small VM — SQLite is file-based, so it doesn't want ephemeral/serverless storage).
4. Point the client's `/api` and `/uploads` requests at wherever the API actually runs
   (via a reverse proxy, or by setting the API's `CLIENT_ORIGIN` and adjusting the
   client's fetch base URL if they're not served from the same origin).
5. Set real values for `JWT_SECRET`, `ADMIN_PASSWORD`, and `NODE_ENV=production`.

## Installable app (PWA)

The site can be installed on a phone or desktop like an app (own icon, full-screen,
no browser bar) and keeps working for pages already visited when the connection drops.

- `client/public/manifest.webmanifest` — name, colours, icons and the Ambientet / Kontakti
  home-screen shortcuts. Icons are in `client/public/icons/` (the maskable one is padded
  for Android's circular crop).
- `client/public/sw.js` — a small hand-written service worker (no build plugin). Pages
  are network-first, so visitors always get the newest site when online; `/assets/*` is
  cache-first; the public content API (site settings, categories, products, page content)
  falls back to the last good copy offline. The admin API, sales, messages and uploads
  are never cached, and the CMS (`/bellacasa-cms`) never shows stale data.
  Bump `VERSION` in that file to clear every cache after changing the strategy.
- `client/src/lib/pwa.js` registers the worker (production builds only) and handles the
  install prompt. The footer shows an **Instalo aplikacionin** button on Android/desktop
  Chrome, and the Share → Add to Home Screen steps on iPhone/iPad. It disappears once
  the site is open as an installed app.
- `vercel.json` serves `sw.js` uncached so updates reach people straight away.

To check it: build, serve over HTTPS (or localhost), open Chrome DevTools → Application →
Manifest / Service Workers, and use Lighthouse's PWA audit.

## Known limitations / next steps

- The contact forms (Home page + Contact page) are currently **presentational** —
  submitting shows a thank-you message but doesn't send an email/SMS/notification
  anywhere yet. Say the word if you want this wired up.
- SQLite is great for a single-server deployment but isn't a fit if you ever need
  multiple app servers writing concurrently — not a concern at this scale, just noting
  it for the future.
- There's no "forgot password" flow for the admin account — if you lose the password,
  reset it by editing `server/.env` and re-running `npm run seed` after clearing the
  `admin_users` table (or ask and I can add a proper reset flow).
