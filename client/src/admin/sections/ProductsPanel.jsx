import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatPrice, isOnSale, discountPercent } from '../../lib/price.js';
import { useConfirm } from '../useConfirm.jsx';
import ImageUploadField from '../ImageUploadField.jsx';
import BulkImageUploadField from '../BulkImageUploadField.jsx';
import StockModal from '../StockModal.jsx';

const BADGES = ['', 'E RE', 'ME POROSI'];

function ProductCard({ product: p, canReorder, isFirst, isLast, onUpdate, onDelete, onAddPhoto, onRemovePhoto, onStockChange, onMove }) {
  const [local, setLocal] = useState(p);
  const [stockOpen, setStockOpen] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Sync from parent when API saves come back
  useEffect(() => setLocal(p), [p]);

  function setField(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }));
  }

  function blur(field) {
    const value = local[field];
    if (value === p[field]) return;
    // For numeric fields, send null instead of empty string
    const patch = ['price', 'sale_price'].includes(field)
      ? { [field]: value === '' || value === null ? null : value }
      : { [field]: value };
    // A rejected save (e.g. a name another product already uses) shows the
    // reason and puts the field back to its saved value.
    Promise.resolve(onUpdate(p.id, patch))
      .then(() => setSaveError(''))
      .catch((err) => {
        setSaveError(err.message);
        setLocal((prev) => ({ ...prev, [field]: p[field] }));
      });
  }

  const sale = isOnSale(p);
  const pct = discountPercent(p);
  const stockClass = p.stock_count <= 0
    ? 'prod-stock--zero'
    : p.stock_count <= 3
      ? 'prod-stock--low'
      : 'prod-stock--ok';

  return (
    <div className="prod-card">
      <div className="prod-card__header">
        {canReorder && (
          <div className="prod-reorder">
            <button type="button" className="prod-reorder__btn" disabled={isFirst} onClick={() => onMove(p.id, -1)} aria-label="Lëviz lart" title="Lëviz lart">▲</button>
            <button type="button" className="prod-reorder__btn" disabled={isLast} onClick={() => onMove(p.id, 1)} aria-label="Lëviz poshtë" title="Lëviz poshtë">▼</button>
          </div>
        )}
        <div className="prod-card__thumb">
          {p.image_url
            ? <img src={p.image_url} alt="" />
            : <span className="prod-card__thumb-empty">📷</span>
          }
        </div>
        <div className="prod-card__summary">
          <div className="prod-card__title-row">
            <h3 className="prod-card__name">{p.name || 'Produkt i Ri'}</h3>
            <button
              type="button"
              className={`prod-stock-badge prod-stock-badge--btn ${stockClass}`}
              onClick={() => setStockOpen(true)}
              aria-label={`Stoku: ${p.stock_count <= 0 ? 'pa stok' : `${p.stock_count} copë`}. Ndrysho stokun`}
              title="Ndrysho stokun"
            >
              {p.stock_count <= 0 ? 'Pa stok' : `${p.stock_count} copë`}
            </button>
          </div>
          <div className="prod-card__meta">
            {formatPrice(p.price) && (
              <span className="prod-card__price">
                {sale ? (
                  <>
                    <s>{formatPrice(p.price)}</s>{' '}
                    <strong>{formatPrice(p.sale_price)}</strong>{' '}
                    <span className="prod-card__discount">-{pct}%</span>
                  </>
                ) : formatPrice(p.price)}
              </span>
            )}
          </div>
        </div>
      </div>

      {stockOpen && (
        <StockModal
          product={p}
          onAdjust={(delta) => onStockChange(p.id, delta)}
          onSetExact={(count) => onUpdate(p.id, { stock_count: count })}
          onClose={() => setStockOpen(false)}
        />
      )}

      <details className="prod-card__details">
        <summary className="prod-card__toggle">Ndrysho detajet ▾</summary>

        <div className="prod-card__fields">
          <ImageUploadField
            label="Foto Kryesore"
            value={p.image_url}
            onChange={(url) => onUpdate(p.id, { image_url: url })}
          />

          <div className="admin-photos">
            <label className="admin-field__label">Foto Shtesë</label>
            {(p.images || []).length > 0 && (
              <div className="admin-photo-strip">
                {p.images.map((img) => (
                  <div className="admin-photo-strip__item" key={img.id}>
                    <img src={img.image_url} alt="" />
                    <button
                      type="button"
                      className="admin-photo-strip__remove"
                      aria-label="Hiq foton"
                      onClick={() => onRemovePhoto(p.id, img.id)}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <BulkImageUploadField onUploaded={(url) => onAddPhoto(p.id, url)} />
          </div>

          <div className="admin-field">
            <label className="admin-field__label">Emri</label>
            <input value={local.name || ''} onChange={(e) => setField('name', e.target.value)} onBlur={() => blur('name')} />
            <span className="admin-field__hint">Emri duhet të jetë unik — përdoret për ta gjetur produktin te Shitjet.</span>
          </div>
          {saveError && <p className="sale-form__error" role="alert">{saveError}</p>}

          <div className="admin-field">
            <label className="admin-field__label">Materiali</label>
            <input value={local.material || ''} onChange={(e) => setField('material', e.target.value)} onBlur={() => blur('material')} />
          </div>

          <div className="admin-field-row">
            <div className="admin-field">
              <label className="admin-field__label">Çmimi (€)</label>
              <input type="number" min="0" step="0.01" value={local.price ?? ''} placeholder="p.sh. 450"
                onChange={(e) => setField('price', e.target.value)} onBlur={() => blur('price')} />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Zbritja (€)</label>
              <input type="number" min="0" step="0.01" value={local.sale_price ?? ''} placeholder="bosh = pa zbritje"
                onChange={(e) => setField('sale_price', e.target.value)} onBlur={() => blur('sale_price')} />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Stoku (copë)</label>
              <input type="number" min="0" step="1" value={local.stock_count ?? 0}
                onChange={(e) => setField('stock_count', e.target.value)}
                onBlur={() => onUpdate(p.id, { stock_count: Number(local.stock_count) || 0 })} />
            </div>
          </div>

          <div className="admin-field-row">
            <div className="admin-field">
              <label className="admin-field__label">Etiketa</label>
              <select value={p.badge || ''} onChange={(e) => onUpdate(p.id, { badge: e.target.value || null })}>
                {BADGES.map((b) => <option key={b} value={b}>{b || 'Pa Etiketë'}</option>)}
              </select>
            </div>
            <div className="admin-field" style={{ justifyContent: 'flex-end' }}>
              <label className="admin-checkbox">
                <input type="checkbox" checked={!!p.featured_home}
                  onChange={(e) => onUpdate(p.id, { featured_home: e.target.checked ? 1 : 0 })} />
                Shfaq në Ballinë
              </label>
            </div>
          </div>

          <div className="prod-card__actions">
            <button type="button" className="admin-btn-danger" onClick={() => onDelete(p.id, p.name)}>Fshi Produktin</button>
          </div>
        </div>
      </details>
    </div>
  );
}

export default function ProductsPanel({ category, showTopAddButton = false }) {
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const { confirm, modal } = useConfirm();

  function reload() {
    api.get(`/products?category=${category.slug}`).then(setProducts);
  }

  useEffect(() => {
    reload();
    setSearch('');
    setStockFilter('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.slug]);

  async function addProduct() {
    await api.post('/products', { category_id: category.id, name: 'Produkt i Ri', material: '' });
    reload();
  }

  async function updateProduct(id, patch) {
    const updated = await api.put(`/products/${id}`, patch);
    setProducts((ps) => ps.map((p) => (p.id === id ? updated : p)));
  }

  async function removeProduct(id, name) {
    const ok = await confirm({
      title: 'Fshi produktin?',
      message: `Jeni të sigurt që doni të fshini "${name || 'këtë produkt'}"? Ky veprim nuk mund të zhbëhet.`,
      confirmLabel: 'Fshi',
      danger: true,
    });
    if (!ok) return;
    await api.del(`/products/${id}`);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  async function addPhoto(productId, url) {
    if (!url) return;
    const image = await api.post(`/products/${productId}/images`, { image_url: url });
    setProducts((ps) => ps.map((p) => (p.id === productId ? { ...p, images: [...(p.images || []), image] } : p)));
  }

  async function removePhoto(productId, imageId) {
    await api.del(`/products/${productId}/images/${imageId}`);
    setProducts((ps) =>
      ps.map((p) => (p.id === productId ? { ...p, images: (p.images || []).filter((i) => i.id !== imageId) } : p))
    );
  }

  async function adjustStock(id, delta) {
    const result = await api.post(`/products/${id}/stock`, { delta });
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock_count: result.stock_count } : p)));
  }

  // Moves one product by one position and persists the new order for the
  // whole list in a single call — a two-value swap would silently do
  // nothing whenever the two items already share the same sort_order,
  // which is common since new products all default to 0.
  async function moveProduct(id, direction) {
    const index = products.findIndex((p) => p.id === id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= products.length) return;

    const reordered = [...products];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setProducts(reordered);

    await api.post('/products/reorder', { order: reordered.map((p) => p.id) });
  }

  if (!products) return <p>Po ngarkohen produktet...</p>;

  const STOCK_FILTERS = [
    { key: 'all', label: 'Të Gjitha', test: () => true },
    { key: 'in-stock', label: 'Në Stok', test: (p) => p.stock_count > 3 },
    { key: 'low', label: 'Stok i Ulët', test: (p) => p.stock_count > 0 && p.stock_count <= 3 },
    { key: 'out', label: 'Pa Stok', test: (p) => p.stock_count <= 0 },
    { key: 'sale', label: 'Në Zbritje', test: (p) => isOnSale(p) },
  ];

  const activeFilter = STOCK_FILTERS.find((f) => f.key === stockFilter) || STOCK_FILTERS[0];
  const q = search.trim().toLowerCase();

  const filtered = products.filter((p) => {
    const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.material?.toLowerCase().includes(q);
    return matchesSearch && activeFilter.test(p);
  });

  // Reordering only makes sense (and stays correct) against the full,
  // unfiltered, naturally-sorted list — with a search or filter active the
  // visible order no longer matches sort_order order, so hide the arrows
  // rather than let them do something confusing.
  const canReorder = !q && stockFilter === 'all';

  return (
    <div className="admin-products-panel">
      <div className="prod-header-row">
        <div className="prod-summary">
          {products.length} produkte · {products.filter((p) => p.stock_count > 0).length} në stok · {products.filter((p) => isOnSale(p)).length} në zbritje
        </div>
        {showTopAddButton && (
          <button type="button" className="prod-add-btn prod-add-btn--top" onClick={addProduct}>+ Shto Produkt</button>
        )}
      </div>

      <div className="prod-search-bar">
        <input
          type="search"
          className="prod-search-input"
          placeholder="Kërko produkt me emër ose material..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="prod-filter-chips">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`prod-filter-chip ${stockFilter === f.key ? 'is-active' : ''}`}
              onClick={() => setStockFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="prod-empty-state">
          Asnjë produkt nuk përputhet {q && `me "${search}"`} {stockFilter !== 'all' && `në filtrin "${activeFilter.label}"`}.
        </p>
      ) : (
        <>
          {(q || stockFilter !== 'all') && (
            <p className="prod-filter-count">{filtered.length} nga {products.length} produkte</p>
          )}
          {filtered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              canReorder={canReorder}
              isFirst={i === 0}
              isLast={i === filtered.length - 1}
              onUpdate={updateProduct}
              onDelete={removeProduct}
              onAddPhoto={addPhoto}
              onRemovePhoto={removePhoto}
              onStockChange={adjustStock}
              onMove={moveProduct}
            />
          ))}
        </>
      )}

      <button type="button" className="prod-add-btn" onClick={addProduct}>+ Shto Produkt të Ri</button>
      {modal}
    </div>
  );
}
