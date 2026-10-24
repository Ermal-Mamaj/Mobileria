import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useConfirm } from '../useConfirm.jsx';
import { formatDate, formatMoney, saleNumber } from '../salesUtils.js';
import { BRAND, BRAND_LINE } from '../../lib/brand.js';

// The shop's mark on printed documents: the uploaded logo when there is one,
// otherwise the name set in the brand face on an ink tile.
export function BrandTile({ settings, className = '' }) {
  return (
    <div className={`doc-brand__tile ${className}`}>
      {settings?.logo_url
        ? <img src={settings.logo_url} alt={BRAND} />
        : <span className="doc-brand__wordmark">{BRAND}</span>}
    </div>
  );
}

// Shared document header (used by the printed sales report).
export function DocHeader({ settings, title, children }) {
  return (
    <header className="doc-header">
      <div className="doc-brand">
        <BrandTile settings={settings} />
        <div className="doc-brand__contact">
          <strong>{settings?.business_name || BRAND}</strong>
          <span>{BRAND_LINE}</span>
          {settings?.phone && <span>Tel: {settings.phone}</span>}
          {settings?.email && <span>{settings.email}</span>}
        </div>
      </div>
      <div className="doc-title">
        <h1>{title}</h1>
        {children}
      </div>
    </header>
  );
}

const MIN_ROWS = 8;
const UNITS = ['copë', 'set', 'm', 'm²', 'm³', 'kg', 'orë'];

function round2(n) {
  return Math.round(n * 100) / 100;
}

// One editable value on the invoice. Looks like printed text; on screen it
// carries a dashed underline so it's clear it can be changed. Prints plain.
function Field({ value, onChange, onBlur, className = '', placeholder, list }) {
  return (
    <input
      className={`fatura-input ${className}`}
      value={value}
      placeholder={placeholder}
      list={list}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

export default function SaleDocumentSection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, modal } = useConfirm();
  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  // Edits made on this invoice: only fields that differ from the prefill.
  const [edits, setEdits] = useState({});
  const [vatRate, setVatRate] = useState('');
  const [savedVat, setSavedVat] = useState('');
  const [saveState, setSaveState] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/sales/${id}`), api.get('/site-settings').catch(() => ({}))])
      .then(([s, st]) => {
        setSale(s);
        setSettings(st);
        setEdits(s.invoice || {});
        // A sale keeps the VAT rate it was made with; older sales (before
        // VAT support) fall back to the current setting.
        const rate = s.vat_rate ?? st.vat_rate;
        const r = rate === null || rate === undefined ? '' : String(Number(rate));
        setVatRate(r);
        setSavedVat(r);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const defaults = useMemo(() => {
    if (!sale || !settings) return {};
    return {
      seller_name: settings.business_name || BRAND,
      seller_nui: settings.business_nui || '',
      seller_address: settings.business_address || '',
      buyer_name: sale.customer_name,
      buyer_nui: '',
      buyer_address: sale.customer_address || '',
      number: saleNumber(sale.id),
      date: formatDate(sale.created_at),
    };
  }, [sale, settings]);

  const value = (key) => edits[key] ?? defaults[key] ?? '';
  const unitOf = (item) => edits.units?.[item.id] ?? 'copë';

  function setField(key, v) {
    setEdits((e) => ({ ...e, [key]: v }));
  }

  function setUnit(itemId, v) {
    setEdits((e) => ({ ...e, units: { ...(e.units || {}), [itemId]: v } }));
  }

  // Saves on blur. Only values that differ from the prefill are stored, so
  // e.g. a buyer name fixed later on the sale still flows into the invoice.
  async function persist(nextEdits = edits, nextVat = vatRate) {
    const invoice = {};
    for (const key of Object.keys(defaults)) {
      if (nextEdits[key] !== undefined && nextEdits[key] !== defaults[key]) invoice[key] = nextEdits[key];
    }
    const units = {};
    for (const [itemId, u] of Object.entries(nextEdits.units || {})) if (u !== 'copë') units[itemId] = u;
    if (Object.keys(units).length) invoice.units = units;

    const same = JSON.stringify(invoice) === JSON.stringify(sale.invoice || {}) && nextVat === savedVat;
    if (same) return;
    setSaveState('saving');
    try {
      const updated = await api.put(`/sales/${id}/invoice`, { invoice, vat_rate: nextVat === '' ? null : nextVat });
      setSale(updated);
      setSavedVat(nextVat);
      setSaveState('saved');
    } catch (e) {
      setSaveState('');
      setError(e.message);
    }
  }

  async function resetEdits() {
    const ok = await confirm({
      title: 'Rikthe të dhënat fillestare?',
      message: 'Ndryshimet e bëra në këtë faturë do të hiqen dhe do të përdoren të dhënat e shitjes dhe të Cilësimeve.',
      confirmLabel: 'Rikthe',
    });
    if (!ok) return;
    const st = settings.vat_rate;
    const r = st === null || st === undefined ? '' : String(Number(st));
    setEdits({});
    setVatRate(r);
    await persist({}, r);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Fshi shitjen?',
      message: `Fshij shitjen Nr. ${saleNumber(id)}? Sasitë që u zbritën nga stoku do të kthehen në stok. Ky veprim nuk mund të zhbëhet.`,
      confirmLabel: 'Fshi',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/sales/${id}`);
      navigate('/bellacasa-cms/sales');
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !sale) {
    return (
      <div className="admin-panel">
        <p className="prod-empty-state">{error} <Link to="/bellacasa-cms/sales" className="admin-inline-link">Kthehu te Shitjet</Link></p>
      </div>
    );
  }
  if (!sale || !settings) return <p>Po ngarkohet...</p>;

  const subtotal = round2(sale.items.reduce((s, it) => s + it.quantity * Number(it.unit_price), 0));
  const discount = Number(sale.discount) || 0;
  const gross = Math.max(round2(subtotal - discount), 0);
  const rate = Number(String(vatRate).replace(',', '.'));
  const hasVat = vatRate !== '' && Number.isFinite(rate) && rate > 0;
  // Prices include VAT: split the VAT out of the total.
  const net = hasVat ? round2(gross / (1 + rate / 100)) : gross;
  const vat = hasVat ? round2(gross - net) : 0;
  const emptyRows = Math.max(MIN_ROWS - sale.items.length, 0);

  return (
    <div className="admin-panel">
      <div className="doc-toolbar no-print">
        <button type="button" className="col-back-link" onClick={() => navigate('/bellacasa-cms/sales')}>‹ Shitjet</button>
        <div className="doc-toolbar__actions">
          <button type="button" className="admin-btn-danger" onClick={handleDelete}>Fshi</button>
          <button type="button" className="admin-btn-secondary" onClick={() => navigate(`/bellacasa-cms/sales/${id}/edit`)}>Ndrysho shitjen</button>
          <button type="button" className="admin-save-btn" onClick={() => window.print()}>🖨 Printo / Ruaj PDF</button>
        </div>
      </div>

      <div className="fatura-hint no-print">
        <span>
          Të dhënat janë plotësuar automatikisht. Klikoni mbi çdo fushë të nënvizuar për ta ndryshuar para printimit —
          ndryshimet ruhen për këtë faturë.
        </span>
        <label className="fatura-hint__vat">
          TVSH (%)
          <input
            type="text"
            inputMode="decimal"
            value={vatRate}
            placeholder="pa TVSH"
            onChange={(e) => setVatRate(e.target.value)}
            onBlur={() => persist()}
          />
        </label>
        <button type="button" className="admin-btn-secondary admin-btn--sm" onClick={resetEdits}>Rikthe të dhënat fillestare</button>
        {saveState === 'saving' && <span className="admin-panel__unsaved">Po ruhet...</span>}
        {saveState === 'saved' && <span className="admin-panel__saved">U ruajt ✓</span>}
      </div>
      {error && <p className="sale-form__error no-print" role="alert">{error}</p>}

      <article className="doc-paper fatura">
        <header className="fatura__top">
          <div className="fatura__title">
            <BrandTile settings={settings} className="fatura__logo" />
            <h1>Fatura</h1>
          </div>
          <div className="fatura__meta">
            <label>Data: <Field value={value('date')} onChange={(v) => setField('date', v)} onBlur={() => persist()} className="fatura-input--date" /></label>
            <Field value={value('number')} onChange={(v) => setField('number', v)} onBlur={() => persist()} className="fatura-input--number" />
          </div>
        </header>

        <section className="fatura__parties">
          <div className="fatura__party">
            <div className="fatura__box">
              <span className="fatura__label">Emri i shitësit</span>
              <Field value={value('seller_name')} onChange={(v) => setField('seller_name', v)} onBlur={() => persist()} />
            </div>
            <div className="fatura__box">
              <span className="fatura__label">NUI i shitësit</span>
              <Field value={value('seller_nui')} placeholder="—" onChange={(v) => setField('seller_nui', v)} onBlur={() => persist()} />
            </div>
            <div className="fatura__box">
              <span className="fatura__label">Adresa e shitësit</span>
              <Field value={value('seller_address')} placeholder="—" onChange={(v) => setField('seller_address', v)} onBlur={() => persist()} />
            </div>
          </div>
          <div className="fatura__party">
            <div className="fatura__box">
              <span className="fatura__label">NUI i blerësit</span>
              <Field value={value('buyer_nui')} placeholder="—" onChange={(v) => setField('buyer_nui', v)} onBlur={() => persist()} />
            </div>
            <div className="fatura__box">
              <span className="fatura__label">Emri i blerësit</span>
              <Field value={value('buyer_name')} onChange={(v) => setField('buyer_name', v)} onBlur={() => persist()} />
            </div>
            <div className="fatura__box">
              <span className="fatura__label">Adresa e blerësit</span>
              <Field value={value('buyer_address')} placeholder="—" onChange={(v) => setField('buyer_address', v)} onBlur={() => persist()} />
            </div>
          </div>
        </section>

        <datalist id="fatura-units">
          {UNITS.map((u) => <option key={u} value={u} />)}
        </datalist>

        <table className="fatura__table">
          <thead>
            <tr>
              <th className="fatura__col-nr fatura__shade">Nr.<br />ren.</th>
              <th>Përshkrimi i mallrave<br />dhe i shërbimeve</th>
              <th className="fatura__col-unit fatura__shade">Njës.<br />mat.</th>
              <th className="fatura__col-qty">Sasia</th>
              <th className="fatura__col-money fatura__shade">Çmimi<br />€</th>
              <th className="fatura__col-money">Vlera totale<br />€</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={it.id}>
                <td className="fatura__col-nr fatura__shade">{i + 1}.</td>
                <td className="fatura__desc">
                  <strong>{it.product_name}</strong>
                  {it.dimensions && <span>Përmasat: {it.dimensions}</span>}
                  {it.details && <span>{it.details}</span>}
                </td>
                <td className="fatura__col-unit fatura__shade">
                  <Field value={unitOf(it)} list="fatura-units" onChange={(v) => setUnit(it.id, v)} onBlur={() => persist()} className="fatura-input--unit" />
                </td>
                <td className="fatura__col-qty">{it.quantity}</td>
                <td className="fatura__col-money fatura__shade">{formatMoney(it.unit_price).replace(' €', '')}</td>
                <td className="fatura__col-money">{formatMoney(it.quantity * Number(it.unit_price)).replace(' €', '')}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }, (_, k) => (
              <tr key={`empty-${k}`} className="fatura__empty">
                <td className="fatura__col-nr fatura__shade">{sale.items.length + k + 1}.</td>
                <td /><td className="fatura__shade" /><td /><td className="fatura__shade" /><td />
              </tr>
            ))}
          </tbody>
        </table>

        {sale.notes && (
          <section className="doc-notes fatura__notes">
            <h2>Shënime</h2>
            <p>{sale.notes}</p>
          </section>
        )}

        <footer className="fatura__bottom">
          <div className="fatura__signatures">
            <div>
              <span className="fatura__sign-label">Emri dhe titulli i personit që pret faturën</span>
              <span className="doc-signatures__line" />
            </div>
            <div>
              <span className="fatura__sign-label">Nënshkrimi dhe vula e shitësit</span>
              <span className="doc-signatures__line" />
            </div>
          </div>
          <table className="fatura__totals">
            <tbody>
              {discount > 0 && (
                <>
                  <tr><th>Shuma:</th><td>{formatMoney(subtotal)}</td></tr>
                  <tr><th>Zbritja:</th><td>− {formatMoney(discount)}</td></tr>
                </>
              )}
              <tr><th>GJITHSEJ:</th><td>{formatMoney(net)}</td></tr>
              <tr><th>TVSH{hasVat ? ` (${String(rate).replace('.', ',')}%)` : ''}:</th><td>{hasVat ? formatMoney(vat) : ''}</td></tr>
              <tr className="fatura__total"><th>TOTALI:</th><td>{formatMoney(gross)}</td></tr>
            </tbody>
          </table>
        </footer>
      </article>
      {modal}
    </div>
  );
}
