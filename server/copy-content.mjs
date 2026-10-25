// Copies the public site's content — site settings, the Home and Rreth Nesh
// copy, rooms, products and their extra photos — from one database to
// another, so a deployment shows exactly what a local test database shows.
// Typical use: fill the Vercel (Neon) database with local test content.
//
// Rows are matched by id: existing rows are overwritten and missing ones
// added. In the target, only the extra photos of the copied products are
// replaced; nothing else is deleted. Admin accounts, sales, invoices and
// contact messages are never touched.
//
// A dry run (the default) only prints what would change. --write applies it
// all in one transaction, so a failure leaves the target as it was.
//
//   cd server
//   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node copy-content.mjs          # dry run
//   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node copy-content.mjs --write  # copy
//
// SOURCE_DATABASE_URL defaults to DATABASE_URL (server/.env).

import { neon } from '@neondatabase/serverless';

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
const write = process.argv.includes('--write');

if (!sourceUrl || !targetUrl) {
  console.error('Set TARGET_DATABASE_URL, and SOURCE_DATABASE_URL (or DATABASE_URL in server/.env).');
  process.exit(1);
}
if (sourceUrl === targetUrl) {
  console.error('Source and target are the same database; nothing to do.');
  process.exit(1);
}

const source = neon(sourceUrl);
const target = neon(targetUrl);

// Singletons (one row, id 1) first, then rooms before the products that
// point at them. Extra product photos are handled separately below.
const TABLES = ['site_settings', 'home_content', 'about_content', 'categories', 'products'];
// Tables whose id comes from a sequence that must stay ahead of copied ids.
const SERIAL = ['categories', 'products', 'product_images'];

const ident = (name) => `"${name.replace(/"/g, '""')}"`;
const where = (url) => {
  const u = new URL(url);
  return `${u.hostname}${u.pathname}`;
};

async function columnsOf(sql, table) {
  return sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
}

// Columns both databases have, so a target that's a migration behind still
// gets everything it can hold.
async function sharedColumns(table) {
  const [from, to] = await Promise.all([columnsOf(source, table), columnsOf(target, table)]);
  const toNames = new Set(to.map((c) => c.column_name));
  return from.filter((c) => toNames.has(c.column_name));
}

const toParam = (value, type) => (value !== null && type.startsWith('json') ? JSON.stringify(value) : value);

const queries = [];
const report = [];

const productIds = (await source.query('SELECT id FROM products ORDER BY id')).map((r) => r.id);
const categoryIds = (await source.query('SELECT id FROM categories ORDER BY id')).map((r) => r.id);

// Room slugs and product names are unique in the target too. Park the rows
// being overwritten on placeholder values first, so swapping two names
// between rows can't trip the constraint halfway through.
queries.push(target.query(`UPDATE categories SET slug = '__copy_' || id WHERE id = ANY($1)`, [categoryIds]));
queries.push(target.query(`UPDATE products SET name = '__copy_' || id WHERE id = ANY($1)`, [productIds]));

for (const table of TABLES) {
  const cols = await sharedColumns(table);
  const names = cols.map((c) => c.column_name);
  const rows = await source.query(`SELECT ${names.map(ident).join(', ')} FROM ${ident(table)} ORDER BY id`);
  const existing = new Set((await target.query(`SELECT id FROM ${ident(table)}`)).map((r) => r.id));
  const updates = names.filter((n) => n !== 'id').map((n) => `${ident(n)} = EXCLUDED.${ident(n)}`).join(', ');
  const text = `INSERT INTO ${ident(table)} (${names.map(ident).join(', ')})
    VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
    ON CONFLICT (id) DO UPDATE SET ${updates}`;
  for (const row of rows) {
    queries.push(target.query(text, cols.map((c) => toParam(row[c.column_name], c.data_type))));
  }
  const updated = rows.filter((r) => existing.has(r.id)).length;
  report.push(`${table}: ${rows.length} row(s) — ${updated} overwritten, ${rows.length - updated} added`);
}

// Extra product photos: replace the copied products' set with the source's.
{
  const cols = (await sharedColumns('product_images')).filter((c) => c.column_name !== 'id');
  const names = cols.map((c) => c.column_name);
  const rows = await source.query(`SELECT ${names.map(ident).join(', ')} FROM product_images ORDER BY product_id, sort_order, id`);
  const [{ n: replaced }] = await target.query('SELECT COUNT(*)::int AS n FROM product_images WHERE product_id = ANY($1)', [productIds]);
  queries.push(target.query('DELETE FROM product_images WHERE product_id = ANY($1)', [productIds]));
  const text = `INSERT INTO product_images (${names.map(ident).join(', ')}) VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`;
  for (const row of rows) queries.push(target.query(text, cols.map((c) => toParam(row[c.column_name], c.data_type))));
  report.push(`product_images: ${replaced} replaced by ${rows.length}`);
}

for (const table of SERIAL) {
  queries.push(target.query(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${ident(table)}), 1))`,
  ));
}

console.log(`From: ${where(sourceUrl)}\nTo:   ${where(targetUrl)}\n`);
for (const line of report) console.log(`  ${line}`);

if (!write) {
  console.log('\nDry run — nothing was written. Run again with --write to copy.');
  process.exit(0);
}

await target.transaction(queries);
console.log(`\nCopied in one transaction (${queries.length} statements).`);
