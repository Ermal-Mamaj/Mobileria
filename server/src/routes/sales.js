import { Router } from 'express';
import { sql } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

// Every sales route is admin-only: sales hold customer names and phone numbers.
router.use(requireAdmin);

const MAX_ITEMS = 100;

function text(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

// Turns a request body into a clean sale + items, or an error message for
// the admin. Prices are rounded to cents; quantities must be whole numbers.
function normalizeSale(body) {
  const b = body || {};
  const sale = {
    customer_name: text(b.customer_name, 200),
    customer_phone: text(b.customer_phone, 50),
    customer_address: text(b.customer_address, 300),
    notes: text(b.notes, 2000),
    discount: Math.round(Number(b.discount || 0) * 100) / 100,
  };
  if (!sale.customer_name) return { error: 'Shkruani emrin e blerësit.' };
  if (!Number.isFinite(sale.discount) || sale.discount < 0) return { error: 'Zbritja duhet të jetë 0 ose më shumë.' };

  if (!Array.isArray(b.items) || b.items.length === 0) return { error: 'Shtoni të paktën një produkt.' };
  if (b.items.length > MAX_ITEMS) return { error: `Një shitje mund të ketë deri në ${MAX_ITEMS} rreshta.` };

  const items = [];
  for (const [i, raw] of b.items.entries()) {
    const productId = raw?.product_id == null || raw.product_id === '' ? null : Number(raw.product_id);
    const item = {
      product_id: Number.isInteger(productId) && productId > 0 ? productId : null,
      product_name: text(raw?.product_name, 200),
      dimensions: text(raw?.dimensions, 200),
      details: text(raw?.details, 1000),
      quantity: Number(raw?.quantity),
      unit_price: Math.round(Number(raw?.unit_price) * 100) / 100,
      from_stock: false,
      sort_order: i,
    };
    item.from_stock = Boolean(raw?.from_stock) && item.product_id !== null;
    const row = `Rreshti ${i + 1}`;
    if (!item.product_name) return { error: `${row}: shkruani emrin e produktit.` };
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
      return { error: `${row}: sasia duhet të jetë numër i plotë nga 1 deri në 9999.` };
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 10_000_000) {
      return { error: `${row}: çmimi nuk është i vlefshëm.` };
    }
    items.push(item);
  }

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  if (sale.discount > subtotal + 0.001) return { error: 'Zbritja nuk mund të jetë më e madhe se totali.' };

  return { sale, items };
}

// Checks every linked product still exists and, for lines taken from stock,
// that there is enough. `alreadyDeducted` is what this same sale took before
// (when editing), since those units come back before the new lines apply.
async function checkProducts(items, alreadyDeducted = new Map()) {
  const ids = [...new Set(items.filter((it) => it.product_id).map((it) => it.product_id))];
  if (ids.length === 0) return null;

  const rows = await sql`SELECT id, name, stock_count FROM products WHERE id = ANY(${ids}::int[])`;
  const byId = new Map(rows.map((r) => [r.id, r]));

  const needed = new Map();
  for (const it of items) {
    if (it.product_id && !byId.has(it.product_id)) {
      return `Produkti "${it.product_name}" nuk ekziston më në katalog. Hiqeni ose zgjidheni përsëri.`;
    }
    if (it.from_stock) needed.set(it.product_id, (needed.get(it.product_id) || 0) + it.quantity);
  }
  for (const [id, qty] of needed) {
    const product = byId.get(id);
    const available = product.stock_count + (alreadyDeducted.get(id) || 0);
    if (qty > available) {
      return `Nuk ka stok të mjaftueshëm për "${product.name}": në stok ${Math.max(available, 0)}, kërkohen ${qty}. Nëse është porosi, hiqni shenjën "Nga stoku".`;
    }
  }
  return null;
}

// Columns for the unnest() that turns the item arrays back into rows.
function itemArrays(items) {
  return [
    items.map((it) => it.product_id),
    items.map((it) => it.product_name),
    items.map((it) => it.dimensions),
    items.map((it) => it.details),
    items.map((it) => it.quantity),
    items.map((it) => it.unit_price),
    items.map((it) => it.from_stock),
    items.map((it) => it.sort_order),
  ];
}

function itemsCte(firstParam) {
  const p = (n) => `$${firstParam + n}`;
  return `items AS (
    SELECT * FROM unnest(${p(0)}::int[], ${p(1)}::text[], ${p(2)}::text[], ${p(3)}::text[],
                         ${p(4)}::int[], ${p(5)}::numeric[], ${p(6)}::bool[], ${p(7)}::int[])
      AS u(product_id, product_name, dimensions, details, quantity, unit_price, from_stock, sort_order)
  )`;
}

const SALE_SUMMARY = `
  SELECT s.id, s.customer_name, s.customer_phone, s.discount, s.created_at,
    COUNT(i.id)::int AS item_count,
    COALESCE(SUM(i.quantity * i.unit_price), 0) AS subtotal,
    COALESCE(string_agg(i.product_name, ', ' ORDER BY i.sort_order), '') AS product_names
  FROM sales s
  LEFT JOIN sale_items i ON i.sale_id = s.id
`;

// The shop's local day boundaries (Kosovo), so "from 1 Oct to 31 Oct" means
// those calendar days in the showroom, not in UTC.
const SHOP_TZ = 'Europe/Belgrade';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', asyncHandler(async (req, res) => {
  const q = text(req.query.q, 100);
  const from = DATE_RE.test(req.query.from || '') ? req.query.from : null;
  const to = DATE_RE.test(req.query.to || '') ? req.query.to : null;

  const params = [];
  const clauses = [];
  if (q) {
    // Escape LIKE wildcards so a search for "50%" means the literal text.
    params.push(q, `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
    clauses.push(`(s.id::text = $1
      OR s.customer_name ILIKE $2 OR s.customer_phone ILIKE $2
      OR EXISTS (SELECT 1 FROM sale_items x WHERE x.sale_id = s.id AND x.product_name ILIKE $2))`);
  }
  if (from) {
    params.push(from);
    clauses.push(`s.created_at >= ($${params.length}::date)::timestamp AT TIME ZONE '${SHOP_TZ}'`);
  }
  if (to) {
    params.push(to);
    clauses.push(`s.created_at < ($${params.length}::date + 1)::timestamp AT TIME ZONE '${SHOP_TZ}'`);
  }

  // A date range is an export/report: return every sale in it. Without one,
  // the history page shows the latest 300.
  const limit = from || to ? 10000 : 300;
  const rows = await sql.query(
    `${SALE_SUMMARY}
     ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
     GROUP BY s.id ORDER BY s.created_at DESC, s.id DESC LIMIT ${limit}`,
    params
  );
  res.json(rows);
}));

async function loadSale(id) {
  const [sale] = await sql`SELECT * FROM sales WHERE id = ${id}`;
  if (!sale) return null;
  const items = await sql`SELECT * FROM sale_items WHERE sale_id = ${id} ORDER BY sort_order ASC, id ASC`;
  return { ...sale, items };
}

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Shitja nuk u gjet.' });
  const sale = await loadSale(id);
  if (!sale) return res.status(404).json({ error: 'Shitja nuk u gjet.' });
  res.json(sale);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { sale, items, error } = normalizeSale(req.body);
  if (error) return res.status(400).json({ error });
  const stockError = await checkProducts(items);
  if (stockError) return res.status(409).json({ error: stockError });

  // One statement: insert the sale, its lines, and take stock-backed lines
  // out of stock. Data-modifying CTEs all run (and commit) together, so a
  // sale can never be saved without its stock change or vice versa.
  const [row] = await sql.query(
    `WITH new_sale AS (
       INSERT INTO sales (customer_name, customer_phone, customer_address, notes, discount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id
     ),
     ${itemsCte(6)},
     ins AS (
       INSERT INTO sale_items (sale_id, product_id, product_name, dimensions, details, quantity, unit_price, from_stock, sort_order)
       SELECT new_sale.id, items.product_id, items.product_name, items.dimensions, items.details,
              items.quantity, items.unit_price, items.from_stock, items.sort_order
       FROM new_sale CROSS JOIN items
       RETURNING 1
     ),
     deduct AS (
       UPDATE products p SET stock_count = p.stock_count - d.qty
       FROM (SELECT product_id, SUM(quantity)::int AS qty FROM items
             WHERE from_stock AND product_id IS NOT NULL GROUP BY product_id) d
       WHERE p.id = d.product_id
       RETURNING 1
     )
     SELECT id FROM new_sale`,
    [sale.customer_name, sale.customer_phone, sale.customer_address, sale.notes, sale.discount, ...itemArrays(items)]
  );
  res.status(201).json(await loadSale(row.id));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Shitja nuk u gjet.' });
  const { sale, items, error } = normalizeSale(req.body);
  if (error) return res.status(400).json({ error });

  const previous = await sql`
    SELECT product_id, SUM(quantity)::int AS qty FROM sale_items
    WHERE sale_id = ${id} AND from_stock AND product_id IS NOT NULL
    GROUP BY product_id
  `;
  const stockError = await checkProducts(items, new Map(previous.map((r) => [r.product_id, r.qty])));
  if (stockError) return res.status(409).json({ error: stockError });

  // Replace the lines and apply only the *net* stock change per product
  // (new units taken minus old units returned). A single UPDATE per product
  // row matters: updating the same row twice in one statement is undefined
  // in Postgres, so "return old, then take new" can't be two updates here.
  const rows = await sql.query(
    `WITH old AS (
       SELECT product_id, SUM(quantity)::int AS qty FROM sale_items
       WHERE sale_id = $1 AND from_stock AND product_id IS NOT NULL
       GROUP BY product_id
     ),
     upd AS (
       UPDATE sales SET customer_name = $2, customer_phone = $3, customer_address = $4,
                        notes = $5, discount = $6, updated_at = NOW()
       WHERE id = $1
       RETURNING id
     ),
     del AS (DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM upd) RETURNING 1),
     ${itemsCte(7)},
     ins AS (
       INSERT INTO sale_items (sale_id, product_id, product_name, dimensions, details, quantity, unit_price, from_stock, sort_order)
       SELECT upd.id, items.product_id, items.product_name, items.dimensions, items.details,
              items.quantity, items.unit_price, items.from_stock, items.sort_order
       FROM upd CROSS JOIN items
       RETURNING 1
     ),
     net AS (
       SELECT product_id, SUM(delta)::int AS delta FROM (
         SELECT product_id, -qty AS delta FROM old
         UNION ALL
         SELECT product_id, quantity FROM items WHERE from_stock AND product_id IS NOT NULL
       ) changes
       GROUP BY product_id
     ),
     stock AS (
       UPDATE products p SET stock_count = p.stock_count - net.delta
       FROM net
       WHERE p.id = net.product_id AND net.delta <> 0 AND EXISTS (SELECT 1 FROM upd)
       RETURNING 1
     )
     SELECT id FROM upd`,
    [id, sale.customer_name, sale.customer_phone, sale.customer_address, sale.notes, sale.discount, ...itemArrays(items)]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Shitja nuk u gjet.' });
  res.json(await loadSale(id));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Shitja nuk u gjet.' });

  // Deleting a sale puts back any units it took from stock, in the same
  // statement as the delete (sale_items go with it via ON DELETE CASCADE).
  const rows = await sql`
    WITH old AS (
      SELECT product_id, SUM(quantity)::int AS qty FROM sale_items
      WHERE sale_id = ${id} AND from_stock AND product_id IS NOT NULL
      GROUP BY product_id
    ),
    del AS (DELETE FROM sales WHERE id = ${id} RETURNING id),
    restore AS (
      UPDATE products p SET stock_count = p.stock_count + old.qty
      FROM old
      WHERE p.id = old.product_id AND EXISTS (SELECT 1 FROM del)
      RETURNING 1
    )
    SELECT id FROM del
  `;
  if (rows.length === 0) return res.status(404).json({ error: 'Shitja nuk u gjet.' });
  res.json({ ok: true });
}));

export default router;
