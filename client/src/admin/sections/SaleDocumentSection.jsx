import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useConfirm } from '../useConfirm.jsx';
import { formatDate, formatMoney, formatTime, saleNumber } from '../salesUtils.js';

// Shared document header: logo tile + business contacts. The logo is light
// yellow on transparent, so it sits on a navy tile to stay visible on paper.
export function DocHeader({ settings, title, children }) {
  return (
    <header className="doc-header">
      <div className="doc-brand">
        <div className="doc-brand__tile">
          <img src={settings?.logo_url || '/logo-full.png'} alt="MAMAJ" />
        </div>
        <div className="doc-brand__contact">
          <strong>MAMAJ</strong>
          <span>Mobilie të Punuara me Dorë</span>
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

export default function SaleDocumentSection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, modal } = useConfirm();
  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/sales/${id}`).then(setSale).catch((e) => setError(e.message));
    api.get('/site-settings').then(setSettings).catch(() => setSettings({}));
  }, [id]);

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
      navigate('/mamaj-cms/sales');
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) {
    return (
      <div className="admin-panel">
        <p className="prod-empty-state">{error} <Link to="/mamaj-cms/sales" className="admin-inline-link">Kthehu te Shitjet</Link></p>
      </div>
    );
  }
  if (!sale || !settings) return <p>Po ngarkohet...</p>;

  const subtotal = sale.items.reduce((s, it) => s + it.quantity * Number(it.unit_price), 0);
  const discount = Number(sale.discount) || 0;
  const total = Math.max(subtotal - discount, 0);

  return (
    <div className="admin-panel">
      <div className="doc-toolbar no-print">
        <button type="button" className="col-back-link" onClick={() => navigate('/mamaj-cms/sales')}>‹ Shitjet</button>
        <div className="doc-toolbar__actions">
          <button type="button" className="admin-btn-danger" onClick={handleDelete}>Fshi</button>
          <button type="button" className="admin-btn-secondary" onClick={() => navigate(`/mamaj-cms/sales/${id}/edit`)}>Ndrysho</button>
          <button type="button" className="admin-save-btn" onClick={() => window.print()}>🖨 Printo / Ruaj PDF</button>
        </div>
      </div>

      <article className="doc-paper">
        <DocHeader settings={settings} title="Fletë Shitje">
          <dl className="doc-meta">
            <dt>Nr.</dt><dd>{saleNumber(sale.id)}</dd>
            <dt>Data</dt><dd>{formatDate(sale.created_at)}</dd>
            <dt>Ora</dt><dd>{formatTime(sale.created_at)}</dd>
          </dl>
        </DocHeader>

        <section className="doc-customer">
          <h2>Blerësi</h2>
          <p><strong>{sale.customer_name}</strong></p>
          {sale.customer_phone && <p>Tel: {sale.customer_phone}</p>}
          {sale.customer_address && <p>Adresa: {sale.customer_address}</p>}
        </section>

        <table className="doc-table">
          <thead>
            <tr>
              <th className="doc-table__num">Nr.</th>
              <th>Produkti</th>
              <th className="doc-table__right">Sasia</th>
              <th className="doc-table__right">Çmimi</th>
              <th className="doc-table__right">Totali</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={it.id}>
                <td className="doc-table__num">{i + 1}</td>
                <td>
                  <strong>{it.product_name}</strong>
                  {it.dimensions && <span className="doc-table__sub">Përmasat: {it.dimensions}</span>}
                  {it.details && <span className="doc-table__sub">{it.details}</span>}
                </td>
                <td className="doc-table__right">{it.quantity}</td>
                <td className="doc-table__right">{formatMoney(it.unit_price)}</td>
                <td className="doc-table__right">{formatMoney(it.quantity * Number(it.unit_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-totals">
          <div><span>Nëntotali</span><span>{formatMoney(subtotal)}</span></div>
          {discount > 0 && <div><span>Zbritja</span><span>− {formatMoney(discount)}</span></div>}
          <div className="doc-totals__grand"><span>TOTALI</span><span>{formatMoney(total)}</span></div>
        </div>

        {sale.notes && (
          <section className="doc-notes">
            <h2>Shënime</h2>
            <p>{sale.notes}</p>
          </section>
        )}

        <div className="doc-signatures">
          <div><span className="doc-signatures__line" />Shitësi</div>
          <div><span className="doc-signatures__line" />Blerësi</div>
        </div>

        <p className="doc-footer">Faleminderit që zgjodhët MAMAJ.</p>
      </article>
      {modal}
    </div>
  );
}
