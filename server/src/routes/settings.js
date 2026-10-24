import { Router } from 'express';
import { sql } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

const FIELDS = ['phone', 'whatsapp', 'email', 'address', 'address_2', 'facebook', 'instagram', 'business_hours', 'logo_url', 'sale_section_enabled', 'business_name', 'business_nui', 'business_address', 'vat_rate'];

// Text columns are NOT NULL; vat_rate is a number or empty (no VAT shown).
const TEXT_FIELDS = ['business_name', 'business_nui', 'business_address'];
function cleanValue(field, value) {
  if (field === 'vat_rate') {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 && n < 100 ? n : null;
  }
  if (TEXT_FIELDS.includes(field)) return String(value ?? '').trim();
  // NOT NULL boolean: a missing value means "off", not a failed save.
  if (field === 'sale_section_enabled') return Boolean(value);
  return value ?? null;
}

router.get('/', asyncHandler(async (req, res) => {
  const [row] = await sql`SELECT * FROM site_settings WHERE id = 1`;
  res.json(row || {});
}));

router.put('/', requireAdmin, asyncHandler(async (req, res) => {
  const values = FIELDS.map((f) => cleanValue(f, req.body[f]));

  // FIELDS is a hardcoded constant, not user input, so building the column
  // list into the query text is safe — only the values themselves (bound as
  // $1, $2, ...) come from the request body.
  const columnList = FIELDS.join(', ');
  const placeholders = FIELDS.map((_, i) => `$${i + 1}`).join(', ');
  const updateList = FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const [row] = await sql.query(
    `INSERT INTO site_settings (id, ${columnList}) VALUES (1, ${placeholders})
     ON CONFLICT (id) DO UPDATE SET ${updateList}
     RETURNING *`,
    values
  );
  res.json(row);
}));

export default router;
