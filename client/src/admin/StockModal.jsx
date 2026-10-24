import { useEffect, useRef, useState } from 'react';

// Stock editing for one product, in a popup so the product row stays small
// enough for a phone. Two ways in: move the stock by a quantity (a piece sold
// over the counter, a delivery arriving) or type the exact count after a
// stock-take.
export default function StockModal({ product, onAdjust, onSetExact, onClose }) {
  const [qty, setQty] = useState(1);
  const [exact, setExact] = useState(String(product.stock_count ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const current = product.stock_count ?? 0;

  // Latest close handler and busy flag, read by the key listener so it can be
  // bound once without going stale.
  const closeRef = useRef(onClose);
  const busyRef = useRef(false);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !busyRef.current && closeRef.current();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  const clamp = (n) => Math.min(999, Math.max(1, Number.isFinite(n) ? n : 1));

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err.message || 'Nuk u ruajt. Provoni përsëri.');
      setBusy(false);
    }
  }

  const exactNumber = parseInt(exact, 10);
  const exactValid = Number.isFinite(exactNumber) && exactNumber >= 0 && String(exactNumber) === exact.trim();
  const removable = Math.min(qty, current);

  return (
    <div className="stock-modal__backdrop" onClick={() => !busy && onClose()}>
      <div
        ref={dialogRef}
        className="stock-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stock-modal__head">
          <div className="stock-modal__product">
            {product.image_url && <img src={product.image_url} alt="" />}
            <div>
              <h3 id="stock-modal-title">{product.name || 'Produkt i Ri'}</h3>
              <p>
                Në stok tani: <strong>{current <= 0 ? 'asnjë copë' : `${current} copë`}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="stock-modal__close" onClick={onClose} disabled={busy} aria-label="Mbyll">×</button>
        </div>

        <div className="stock-modal__section">
          <label className="stock-modal__label" htmlFor="stock-qty">Sasia</label>
          <div className="stock-modal__stepper">
            <button type="button" onClick={() => setQty((q) => clamp(q - 1))} disabled={busy || qty <= 1} aria-label="Zvogëlo sasinë">−</button>
            <input
              id="stock-qty"
              type="number"
              inputMode="numeric"
              min="1"
              max="999"
              value={qty}
              onChange={(e) => setQty(clamp(parseInt(e.target.value, 10)))}
              disabled={busy}
            />
            <button type="button" onClick={() => setQty((q) => clamp(q + 1))} disabled={busy} aria-label="Rrit sasinë">+</button>
          </div>
          <div className="stock-modal__actions">
            <button
              type="button"
              className="stock-modal__btn stock-modal__btn--remove"
              disabled={busy || current <= 0}
              onClick={() => run(() => onAdjust(-removable))}
            >
              − Hiq {removable > 0 ? removable : ''}
              <span>{current} → {current - removable}</span>
            </button>
            <button
              type="button"
              className="stock-modal__btn stock-modal__btn--add"
              disabled={busy}
              onClick={() => run(() => onAdjust(qty))}
            >
              + Shto {qty}
              <span>{current} → {current + qty}</span>
            </button>
          </div>
          <p className="stock-modal__hint">
            Shitjet e regjistruara te "Shitjet" e ulin stokun vetë — këtu ndryshoni stokun me dorë.
          </p>
        </div>

        <form
          className="stock-modal__section stock-modal__exact"
          onSubmit={(e) => {
            e.preventDefault();
            if (exactValid && exactNumber !== current) run(() => onSetExact(exactNumber));
          }}
        >
          <label className="stock-modal__label" htmlFor="stock-exact">Ose vendosni numrin e saktë</label>
          <div className="stock-modal__exact-row">
            <input
              id="stock-exact"
              type="number"
              inputMode="numeric"
              min="0"
              value={exact}
              onChange={(e) => setExact(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="stock-modal__save" disabled={busy || !exactValid || exactNumber === current}>
              Ruaj
            </button>
          </div>
        </form>

        {error && <p className="stock-modal__error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
