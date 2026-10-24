import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useConfirm } from '../useConfirm.jsx';
import { DocHeader } from './SaleDocumentSection.jsx';
import {
  datePresets, downloadFile, formatDate, formatDateInput, formatMoney, formatTime,
  saleNumber, saleTotal, salesToCsv, toDateInput,
} from '../salesUtils.js';

export default function SalesListSection() {
  const navigate = useNavigate();
  const { confirm, modal } = useConfirm();
  const presets = useMemo(() => datePresets(), []);
  const monthPreset = presets.find((p) => p.key === 'month');

  const [sales, setSales] = useState(null);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [from, setFrom] = useState(monthPreset.from);
  const [to, setTo] = useState(monthPreset.to);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/site-settings').then(setSettings).catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  function reload() {
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    setError('');
    api.get(`/sales?${params}`).then(setSales).catch((e) => setError(e.message));
  }

  useEffect(reload, [debounced, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePreset = presets.find((p) => p.from === from && p.to === to)?.key;
  const grandTotal = (sales || []).reduce((s, sale) => s + saleTotal(sale), 0);
  const rangeLabel = from || to
    ? `${from ? formatDateInput(from) : 'fillimi'} – ${to ? formatDateInput(to) : 'sot'}`
    : 'Të gjitha shitjet (300 më të fundit)';

  async function handleDelete(e, sale) {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Fshi shitjen?',
      message: `Fshij shitjen Nr. ${saleNumber(sale.id)} (${sale.customer_name})? Sasitë që u zbritën nga stoku do të kthehen në stok. Ky veprim nuk mund të zhbëhet.`,
      confirmLabel: 'Fshi',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/sales/${sale.id}`);
      setSales((list) => list.filter((s) => s.id !== sale.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function exportCsv() {
    const name = from || to ? `shitjet_${from || 'fillimi'}_${to || toDateInput(new Date())}` : 'shitjet';
    downloadFile(`${name}.csv`, salesToCsv(sales), 'text/csv;charset=utf-8');
  }

  return (
    <div className="admin-panel">
      <div className="no-print sales-screen">
        <div className="admin-panel__header-row">
          <h2 className="admin-panel__heading">Shitjet</h2>
          <button type="button" className="admin-save-btn" onClick={() => navigate('/bellacasa-cms/sales/new')}>+ Shitje e Re</button>
        </div>

        <div className="settings-group sales-filters">
          <input
            type="search"
            className="prod-search-input"
            placeholder="Kërko sipas blerësit, telefonit, produktit ose numrit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="prod-filter-chips">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`prod-filter-chip ${activePreset === p.key ? 'is-active' : ''}`}
                onClick={() => { setFrom(p.from); setTo(p.to); }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="sales-filters__dates">
            <label>Nga <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>Deri <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        </div>

        <div className="sales-summary">
          <div>
            <span className="sales-summary__label">{rangeLabel}</span>
            <strong className="sales-summary__value">
              {sales ? `${sales.length} shitje · ${formatMoney(grandTotal)}` : '...'}
            </strong>
          </div>
          <div className="sales-summary__actions">
            <button type="button" className="admin-btn-secondary" disabled={!sales?.length || !settings} onClick={() => window.print()}>🖨 Printo raportin</button>
            <button type="button" className="admin-btn-secondary" disabled={!sales?.length} onClick={exportCsv}>⬇ Shkarko CSV</button>
          </div>
        </div>

        {error && <p className="sale-form__error" role="alert">{error}</p>}

        {sales && sales.length === 0 && (
          <p className="prod-empty-state">
            {debounced || from || to ? 'Asnjë shitje për këtë kërkim ose periudhë.' : 'Nuk ka ende shitje. Shtoni të parën me "+ Shitje e Re".'}
          </p>
        )}

        <div className="col-list">
          {(sales || []).map((sale) => (
            <div
              key={sale.id}
              className="col-row sales-row"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/bellacasa-cms/sales/${sale.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/bellacasa-cms/sales/${sale.id}`); }}
            >
              <div className="sales-row__num">
                <span>Nr. {saleNumber(sale.id)}</span>
                <small>{formatDate(sale.created_at)} · {formatTime(sale.created_at)}</small>
              </div>
              <div className="col-row__info">
                <span className="col-row__name">{sale.customer_name}</span>
                <span className="col-row__meta sales-row__products">{sale.product_names}</span>
              </div>
              <strong className="sales-row__total">{formatMoney(saleTotal(sale))}</strong>
              <button type="button" className="col-row__delete" onClick={(e) => handleDelete(e, sale)} title="Fshi shitjen" aria-label={`Fshi shitjen ${saleNumber(sale.id)}`}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      {/* Only visible when printing: the report for the current filter. */}
      {sales && settings && (
        <article className="doc-paper print-only">
          <DocHeader settings={settings} title="Raporti i Shitjeve">
            <dl className="doc-meta">
              <dt>Periudha</dt><dd>{rangeLabel}</dd>
              <dt>Printuar</dt><dd>{formatDate(new Date())} {formatTime(new Date())}</dd>
              {debounced && (<><dt>Kërkimi</dt><dd>{debounced}</dd></>)}
            </dl>
          </DocHeader>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Data</th>
                <th>Blerësi</th>
                <th>Produktet</th>
                <th className="doc-table__right">Totali</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{saleNumber(sale.id)}</td>
                  <td>{formatDate(sale.created_at)}</td>
                  <td>{sale.customer_name}{sale.customer_phone && <span className="doc-table__sub">{sale.customer_phone}</span>}</td>
                  <td>{sale.product_names}</td>
                  <td className="doc-table__right">{formatMoney(saleTotal(sale))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="doc-totals">
            <div><span>Numri i shitjeve</span><span>{sales.length}</span></div>
            <div className="doc-totals__grand"><span>TOTALI</span><span>{formatMoney(grandTotal)}</span></div>
          </div>
        </article>
      )}
      {modal}
    </div>
  );
}
