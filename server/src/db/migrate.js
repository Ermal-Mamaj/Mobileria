// Run once (locally, or as a one-off) to create/update tables:
//   npm run migrate -w server
// Deliberately NOT run automatically on server startup — DDL on every cold
// start is unnecessary and risky against a shared Neon database.
import { sql } from './index.js';
import { SCHEMA_STATEMENTS } from './schema.js';

async function migrate() {
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement);
  }

  // gallery_images backed the old standalone inspiration gallery, which has
  // been replaced by per-product photos (product_images). Drop it on
  // already-migrated databases — safe to run repeatedly since IF EXISTS
  // makes it a no-op once it's gone.
  await sql.query('DROP TABLE IF EXISTS gallery_images');

  // Columns added to tables that already existed on deployed databases —
  // CREATE TABLE IF NOT EXISTS only skips creating the table when it's
  // already there, it doesn't add missing columns to it. ADD COLUMN IF NOT
  // EXISTS handles that, and is a no-op on fresh databases where the column
  // already came from the CREATE TABLE above.
  await sql.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS address_2 TEXT DEFAULT ''`);
  await sql.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS sale_section_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
  await sql.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10,2)`);
  await sql.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2)`);
  await sql.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_count INTEGER NOT NULL DEFAULT 0`);
  // Fatura: seller details + VAT rate in settings prefill the invoice. A sale
  // keeps the VAT rate it was made with (so changing the rate never rewrites
  // old invoices) and stores any edits made on its invoice page in `invoice`.
  await sql.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_name TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_nui TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_address TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2)`);
  await sql.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2)`);
  await sql.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice JSONB NOT NULL DEFAULT '{}'::jsonb`);

  // Product names must be unique (case- and whitespace-insensitive) so a sale
  // can find a product by its full name. Existing duplicates — e.g. several
  // "Produkt i Ri" made with the add button — would block the unique index,
  // so the newer copies get a numbered suffix first. The oldest product with
  // each name keeps it unchanged. Loops in case a suffixed name itself
  // collides with an existing product.
  for (let pass = 0; pass < 5; pass++) {
    const renamed = await sql.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY id) AS rn
        FROM products
      )
      UPDATE products p
      SET name = btrim(p.name) || ' (' || ranked.rn || ')'
      FROM ranked
      WHERE p.id = ranked.id AND ranked.rn > 1
      RETURNING p.id, p.name
    `);
    if (renamed.length === 0) break;
    for (const r of renamed) console.log(`Renamed duplicate product #${r.id} to "${r.name}"`);
  }
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS products_name_unique_idx ON products (lower(btrim(name)))');

  console.log(`Migration complete: ${SCHEMA_STATEMENTS.length} tables ensured, gallery_images dropped, new columns ensured, product names unique.`);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
