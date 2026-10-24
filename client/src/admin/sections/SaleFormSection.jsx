import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useUnsavedChanges } from '../UnsavedChangesContext.jsx';
import { useConfirm } from '../useConfirm.jsx';
import { catalogPrice, formatMoney, saleNumber, searchKey } from '../salesUtils.js';

let lineKey = 0;
function newLine(overrides = {}) {
  lineKey += 1;
  return {
    key: lineKey,
    product_id: null,
    product_name: '',
    dimensions: '',
    details: '',
    quantity: 1,
    unit_price: '',
    from_stock: false,
    ...overrides,
  };
}

function lineTotal(line) {
  return (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
}

// Name field with catalog suggestions. Picking a suggestion (or typing a
// name that exactly matches a product) links the line to that product;
// anything else is treated as a custom piece.
function ProductPicker({ value, products, onPick, onType }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const matches = useMemo(() => {
    const q = searchKey(value);
    const list = q ? products.filter((p) => searchKey(p.name).includes(q)) : products;
    return list.slice(0, 8);
  }, [value, products]);

  function pick(product) {
    onPick(product);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="sale-picker">
      <input
        ref={inputRef}
        className="sale-picker__input"
        value={value}
        placeholder="Shkruani emrin e produktit..."
        onChange={(e) => { onType(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && matches.length > 0 && (
        <ul className="sale-picker__menu" role="listbox">
          {matches.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              className={`sale-picker__option ${i === active ? 'is-active' : ''}`}
              // mousedown (not click) so the pick happens before the input's blur closes the menu
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="sale-picker__name">{p.name}</span>
              <span className="sale-picker__meta">
                {p.category_name} · {formatMoney(catalogPrice(p))} · {p.stock_count > 0 ? `${p.stock_count} në stok` : 'pa stok'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SaleFormSection() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { isDirty, setIsDirty } = useUnsavedChanges();
  const { confirm, modal } = useConfirm();

  const [products, setProducts] = useState(null);
  const [customer, setCustomer] = useState({ customer_name: '', customer_phone: '', customer_address: '' });
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [lines, setLines] = useState(() => [newLine()]);
  // Units this sale already holds from stock (when editing) — they count as
  // available again, since saving returns them before taking the new amounts.
  const [held, setHeld] = useState({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cache-buster: the public products endpoint is CDN-cached for a few
    // seconds; a sale should see current stock and prices.
    api.get(`/products?fresh=${Date.now()}`).then(setProducts).catch((e) => setError(e.message));
    return () => setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing) return;
    api.get(`/sales/${id}`)
      .then((sale) => {
        setCustomer({
          customer_name: sale.customer_name,
          customer_phone: sale.customer_phone,
          customer_address: sale.customer_address,
        });
        setNotes(sale.notes);
        setDiscount(Number(sale.discount) ? String(Number(sale.discount)) : '');
        setLines(sale.items.map((it) => newLine({
          product_id: it.product_id,
          product_name: it.product_name,
          dimensions: it.dimensions,
          details: it.details,
          quantity: it.quantity,
          unit_price: String(Number(it.unit_price)),
          from_stock: it.from_stock,
        })));
        const h = {};
        for (const it of sale.items) if (it.from_stock && it.product_id) h[it.product_id] = (h[it.product_id] || 0) + it.quantity;
        setHeld(h);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const productsById = useMemo(() => new Map((products || []).map((p) => [p.id, p])), [products]);
  const productsByName = useMemo(() => new Map((products || []).map((p) => [p.name.trim().toLowerCase(), p])), [products]);

  function available(productId) {
    const p = productsById.get(productId);
    return (p ? p.stock_count : 0) + (held[productId] || 0);
  }

  function requestedFromStock(productId) {
    return lines.filter((l) => l.from_stock && l.product_id === productId).reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  }

  function touch() {
    setIsDirty(true);
    setError('');
  }

  function updateLine(key, patch) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    touch();
  }

  function linkProduct(line, product) {
    updateLine(line.key, {
      product_id: product.id,
      product_name: product.name,
      unit_price: String(catalogPrice(product)),
      from_stock: available(product.id) >= (Number(line.quantity) || 1),
    });
  }

  function typeName(line, value) {
    const exact = productsByName.get(value.trim().toLowerCase());
    if (exact && exact.id !== line.product_id) {
      linkProduct({ ...line, product_name: value }, exact);
      return;
    }
    if (exact) {
      updateLine(line.key, { product_name: value });
      return;
    }
    // Not a catalog name: a custom piece. Keep whatever price was typed.
    updateLine(line.key, { product_name: value, product_id: null, from_stock: false });
  }

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const discountNum = Number(discount) || 0;
  const total = Math.max(subtotal - discountNum, 0);

  async function handleSave() {
    if (!customer.customer_name.trim()) return setError('Shkruani emrin e blerësit.');
    const filled = lines.filter((l) => l.product_name.trim());
    if (filled.length === 0) return setError('Shtoni të paktën një produkt.');
    for (const [i, l] of filled.entries()) {
      if (l.unit_price === '' || Number(l.unit_price) < 0) return setError(`Rreshti ${i + 1}: vendosni çmimin.`);
      if (!Number.isInteger(Number(l.quantity)) || Number(l.quantity) < 1) return setError(`Rreshti ${i + 1}: sasia duhet të jetë 1 ose më shumë.`);
    }
    if (discountNum > subtotal) return setError('Zbritja nuk mund të jetë më e madhe se totali.');

    setSaving(true);
    try {
      const body = {
        ...customer,
        notes,
        discount: discountNum,
        items: filled.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          dimensions: l.dimensions,
          details: l.details,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          from_stock: l.from_stock,
        })),
      };
      const saved = editing ? await api.put(`/sales/${id}`, body) : await api.post('/sales', body);
      setIsDirty(false);
      navigate(`/bellacasa-cms/sales/${saved.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (isDirty) {
      const leave = await confirm({
        title: 'Të anulohet shitja?',
        message: 'Ndryshimet që keni bërë në këtë formular nuk do të ruhen.',
        confirmLabel: 'Po, anulo',
        cancelLabel: 'Vazhdo punën',
        danger: true,
      });
      if (!leave) return;
      setIsDirty(false);
    }
    navigate(editing ? `/bellacasa-cms/sales/${id}` : '/bellacasa-cms/sales');
  }

  if (loading || !products) {
    return <div className="admin-panel"><p>{error || 'Po ngarkohet...'}</p></div>;
  }

  return (
    <div className="admin-panel sale-form">
      <div className="admin-panel__header-row">
        <h2 className="admin-panel__heading">{editing ? `Ndrysho Shitjen Nr. ${saleNumber(id)}` : 'Shitje e Re'}</h2>
        <div className="admin-panel__save-controls">
          <button type="button" className="admin-btn-secondary" onClick={handleCancel}>Anulo</button>
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Po ruhet...' : 'Ruaj Shitjen'}
          </button>
        </div>
      </div>

      {error && <p className="sale-form__error" role="alert">{error}</p>}

      <div className="settings-group">
        <h3 className="settings-group__title">Blerësi</h3>
        <div className="admin-field-row">
          <div className="admin-field">
            <label className="admin-field__label">Emri dhe mbiemri *</label>
            <input value={customer.customer_name} onChange={(e) => { setCustomer((c) => ({ ...c, customer_name: e.target.value })); touch(); }} />
          </div>
          <div className="admin-field">
            <label className="admin-field__label">Telefoni</label>
            <input value={customer.customer_phone} onChange={(e) => { setCustomer((c) => ({ ...c, customer_phone: e.target.value })); touch(); }} />
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-field__label">Adresa (për dërgesë)</label>
          <input value={customer.customer_address} onChange={(e) => { setCustomer((c) => ({ ...c, customer_address: e.target.value })); touch(); }} />
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group__title">Produktet</h3>
        {lines.map((line, i) => {
          const product = line.product_id ? productsById.get(line.product_id) : null;
          const catalog = product ? catalogPrice(product) : null;
          const short = line.from_stock && line.product_id && requestedFromStock(line.product_id) > available(line.product_id);
          return (
            <div className="sale-line" key={line.key}>
              <div className="sale-line__top">
                <span className="sale-line__num">{i + 1}</span>
                <ProductPicker
                  value={line.product_name}
                  products={products}
                  onPick={(p) => linkProduct(line, p)}
                  onType={(v) => typeName(line, v)}
                />
                <button
                  type="button"
                  className="sale-line__remove"
                  aria-label={`Hiq rreshtin ${i + 1}`}
                  title="Hiq rreshtin"
                  disabled={lines.length === 1}
                  onClick={() => { setLines((ls) => ls.filter((l) => l.key !== line.key)); touch(); }}
                >×</button>
              </div>

              {line.product_name.trim() && (
                <p className={`sale-line__tag ${product ? 'is-linked' : ''}`}>
                  {product
                    ? `✓ Nga katalogu · ${product.category_name} · ${available(product.id)} në stok`
                    : line.product_id
                      ? 'Produkti nuk ekziston më në katalog'
                      : 'Produkt me porosi (jo nga katalogu)'}
                </p>
              )}

              <div className="sale-line__grid">
                <div className="admin-field">
                  <label className="admin-field__label">Përmasat</label>
                  <input value={line.dimensions} placeholder="p.sh. 220 × 95 × 80 cm" onChange={(e) => updateLine(line.key, { dimensions: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label className="admin-field__label">Sasia</label>
                  <input type="number" min="1" step="1" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label className="admin-field__label">Çmimi për copë (€)</label>
                  <div className="sale-line__price">
                    <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(line.key, { unit_price: e.target.value })} />
                    {catalog !== null && Number(line.unit_price) !== catalog && (
                      <button
                        type="button"
                        className="sale-line__reset"
                        title={`Kthe çmimin e katalogut (${formatMoney(catalog)})`}
                        onClick={() => updateLine(line.key, { unit_price: String(catalog) })}
                      >↺</button>
                    )}
                  </div>
                </div>
                <div className="admin-field">
                  <label className="admin-field__label">Totali</label>
                  <div className="sale-line__total">{formatMoney(lineTotal(line))}</div>
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-field__label">Detaje / kërkesa të veçanta</label>
                <textarea
                  rows={2}
                  value={line.details}
                  placeholder="p.sh. ngjyra, materiali, pëlhura, afati i dorëzimit..."
                  onChange={(e) => updateLine(line.key, { details: e.target.value })}
                />
              </div>

              {product && (
                <label className="admin-checkbox">
                  <input type="checkbox" checked={line.from_stock} onChange={(e) => updateLine(line.key, { from_stock: e.target.checked })} />
                  Nga stoku (zbrit sasinë nga stoku) — hiqeni shenjën nëse është porosi që punohet
                </label>
              )}
              {short && (
                <p className="sale-line__warn">
                  Në stok janë vetëm {available(line.product_id)} copë. Ulni sasinë ose hiqni shenjën "Nga stoku".
                </p>
              )}
            </div>
          );
        })}
        <button type="button" className="bulk-upload__btn" onClick={() => { setLines((ls) => [...ls, newLine()]); touch(); }}>
          + Shto Produkt
        </button>
      </div>

      <div className="settings-group sale-totals">
        <div className="sale-totals__row"><span>Nëntotali</span><strong>{formatMoney(subtotal)}</strong></div>
        <div className="sale-totals__row">
          <label htmlFor="sale-discount">Zbritja (€)</label>
          <input id="sale-discount" type="number" min="0" step="0.01" value={discount} placeholder="0" onChange={(e) => { setDiscount(e.target.value); touch(); }} />
        </div>
        <div className="sale-totals__row sale-totals__grand"><span>Totali</span><strong>{formatMoney(total)}</strong></div>
        <div className="admin-field">
          <label className="admin-field__label">Shënime (shfaqen në dokument)</label>
          <textarea rows={2} value={notes} placeholder="p.sh. kapari i paguar, data e dorëzimit..." onChange={(e) => { setNotes(e.target.value); touch(); }} />
        </div>
      </div>

      <div className="sale-form__footer">
        <button type="button" className="admin-btn-secondary" onClick={handleCancel}>Anulo</button>
        <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Po ruhet...' : 'Ruaj Shitjen'}
        </button>
      </div>
      {modal}
    </div>
  );
}
