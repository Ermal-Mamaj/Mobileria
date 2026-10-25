import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { api } from '../../lib/api.js';

function StatCard({ icon, label, value, color = 'var(--navy)', sub }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat__icon" style={{ background: color }}><Icon name={icon} /></div>
      <div className="dash-stat__body">
        <span className="dash-stat__value">{value ?? '–'}</span>
        <span className="dash-stat__label">{label}</span>
        {sub && <span className="dash-stat__sub">{sub}</span>}
      </div>
    </div>
  );
}

function LowStockRow({ item }) {
  const stockLabel = item.stock_count <= 0
    ? 'Pa stok'
    : `${item.stock_count} copë`;
  const stockClass = item.stock_count <= 0 ? 'dash-stock--zero' : 'dash-stock--low';

  return (
    <div className="dash-stock-row">
      <div className="dash-stock-row__thumb">
        {item.image_url
          ? <img src={item.image_url} alt="" />
          : <span className="dash-stock-row__placeholder">?</span>
        }
      </div>
      <div className="dash-stock-row__info">
        <span className="dash-stock-row__name">{item.name}</span>
        <span className="dash-stock-row__cat">{item.category_name}</span>
      </div>
      <span className={`dash-stock-badge ${stockClass}`}>{stockLabel}</span>
    </div>
  );
}

export default function DashboardSection() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setStats);
    api.get('/dashboard/low-stock').then(setLowStock);
  }, []);

  if (!stats) return <p className="dash-loading">Po ngarkohet paneli...</p>;

  return (
    <div className="dash">
      <h2 className="dash__title">Mirë se vini në panelin e Bella Casa</h2>
      <p className="dash__subtitle">Një përmbledhje e shpejtë e dyqanit tuaj.</p>

      <div className="dash-stats-grid">
        <StatCard
          icon="box"
          label="Produkte Gjithsej"
          value={stats.total_products}
          color="#1C130F"
        />
        <StatCard
          icon="tag"
          label="Në Zbritje"
          value={stats.on_sale}
          color="#7D5C34"
        />
        <StatCard
          icon="mail"
          label="Mesazhe të Palexuara"
          value={stats.unread_messages}
          color={stats.unread_messages > 0 ? '#A4472E' : '#2A2622'}
        />
        <StatCard
          icon="layers"
          label="Njësi në Stok"
          value={stats.total_stock_units}
          color="#3D5560"
          sub={stats.out_of_stock > 0 ? `${stats.out_of_stock} produkte pa stok` : null}
        />
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="dash-alert-panel">
          <h3 className="dash-alert-panel__title">
            ⚠️ Stok i Ulët ose i Mbaruar ({lowStock.length})
          </h3>
          <p className="dash-alert-panel__desc">
            Produktet me 3 ose më pak njësi në stok. Shkoni te "Koleksionet" dhe hapni koleksionin e produktit për të përditësuar sasinë.
          </p>
          <div className="dash-stock-list">
            {lowStock.map((item) => (
              <LowStockRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
