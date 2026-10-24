// Individual CREATE TABLE statements. Kept as an array (rather than one
// multi-statement string) because Neon's HTTP-based serverless driver runs
// one statement per call — see db/migrate.js, which loops over these.
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    address_2 TEXT DEFAULT '',
    facebook TEXT DEFAULT '',
    instagram TEXT DEFAULT '',
    business_hours TEXT DEFAULT '',
    logo_url TEXT,
    sale_section_enabled BOOLEAN NOT NULL DEFAULT FALSE
  )`,

  `CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT DEFAULT '',
    hero_image_url TEXT,
    sort_order INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    material TEXT DEFAULT '',
    image_url TEXT,
    badge TEXT,
    price NUMERIC(10,2),
    sale_price NUMERIC(10,2),
    stock_count INTEGER NOT NULL DEFAULT 0,
    featured_home INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS home_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_eyebrow TEXT DEFAULT '',
    hero_headline TEXT DEFAULT '',
    hero_cta TEXT DEFAULT '',
    hero_image_url TEXT,
    quote_text TEXT DEFAULT '',
    quote_label TEXT DEFAULT '',
    contact_heading TEXT DEFAULT '',
    contact_intro TEXT DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS about_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_image_url TEXT,
    paragraph_1 TEXT DEFAULT '',
    paragraph_2 TEXT DEFAULT '',
    values_json JSONB DEFAULT '[]',
    quote_text TEXT DEFAULT '',
    quote_author TEXT DEFAULT ''
  )`,

  // Extra photos for a product, beyond the cover shot in products.image_url.
  // Kept as a separate table rather than more columns so a product can carry
  // any number of angles; the cover stays where it is so existing cards,
  // carousels and the CMS keep working untouched.
  `CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images (product_id)`,

  // Every contact submission lands here first. Email delivery is a
  // best-effort extra on top: if the email account is unconfigured or down,
  // the enquiry is still captured and readable in the CMS rather than lost.
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    emailed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Sales recorded from the CMS (showroom / phone sales), printable as a
  // sale document. Line items snapshot the product name at sale time so an
  // old document still reads correctly after a product is renamed or deleted.
  `CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL DEFAULT '',
    customer_address TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    discount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // product_id is optional: a line can be a fully custom piece that isn't in
  // the catalog. from_stock records whether this line took units out of
  // products.stock_count, so editing or deleting the sale can put exactly
  // that many back.
  `CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    dimensions TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    from_stock BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items (sale_id)`,
];
