import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { api } from '../../lib/api.js';
import { formatPrice, isOnSale } from '../../lib/price.js';

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

// Lower-case and strip accents, so "cmim" finds "çmim" and "kuzhine" finds "kuzhinë".
function normalize(text) {
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const MAX_RESULTS = 8;

// Finds a product by name, material or collection and opens it in its
// collection, where the CMS edits products. The product list is fetched the
// first time the box is used, not on every visit to the overview.
function ProductSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const loading = useRef(false);

  function load() {
    if (products || loading.current) return;
    loading.current = true;
    api.get('/products')
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => { loading.current = false; });
  }

  const q = normalize(query).trim();
  let results = [];
  let total = 0;
  if (q && products) {
    const words = q.split(/\s+/);
    const scored = [];
    for (const p of products) {
      const name = normalize(p.name);
      const haystack = `${name} ${normalize(p.material)} ${normalize(p.category_name)}`;
      if (!words.every((w) => haystack.includes(w))) continue;
      // Name matches first, and names that start with the search first of all.
      scored.push({ p, rank: name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2 });
    }
    scored.sort((a, b) => a.rank - b.rank || String(a.p.name).localeCompare(String(b.p.name), 'sq'));
    total = scored.length;
    results = scored.slice(0, MAX_RESULTS).map((x) => x.p);
  }

  const hrefFor = (p) => `/bellacasa-cms/collections/${p.category_id}?product=${p.id}`;

  return (
    <section className="dash-search" aria-label="Kërko produkt">
      <div className="dash-search__box">
        <Icon name="search" className="dash-search__icon" />
        <input
          type="search"
          className="prod-search-input dash-search__input"
          placeholder="Kërko produkt me emër, material ose koleksion..."
          value={query}
          onFocus={load}
          onChange={(e) => { load(); setQuery(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) navigate(hrefFor(results[0]));
            if (e.key === 'Escape') setQuery('');
          }}
          aria-label="Kërko produkt"
          autoComplete="off"
        />
      </div>

      {q && error && <p className="dash-search__note">Nuk u ngarkuan produktet: {error}</p>}
      {q && !error && !products && <p className="dash-search__note">Po kërkohet...</p>}
      {q && products && results.length === 0 && (
        <p className="dash-search__note">Asnjë produkt nuk përputhet me "{query.trim()}".</p>
      )}
      {results.length > 0 && (
        <>
          <ul className="dash-search__results">
            {results.map((p) => {
              const sale = isOnSale(p);
              const stockClass = p.stock_count <= 0 ? 'dash-stock--zero' : p.stock_count <= 3 ? 'dash-stock--low' : 'dash-stock--ok';
              return (
                <li key={p.id}>
                  <Link to={hrefFor(p)} className="dash-stock-row dash-search__result">
                    <div className="dash-stock-row__thumb">
                      {p.image_url ? <img src={p.image_url} alt="" /> : <span className="dash-stock-row__placeholder">?</span>}
                    </div>
                    <div className="dash-stock-row__info">
                      <span className="dash-stock-row__name">{p.name || 'Produkt i Ri'}</span>
                      <span className="dash-stock-row__cat">
                        {p.category_name}
                        {formatPrice(sale ? p.sale_price : p.price) && ` · ${formatPrice(sale ? p.sale_price : p.price)}`}
                      </span>
                    </div>
                    <span className={`dash-stock-badge ${stockClass}`}>
                      {p.stock_count <= 0 ? 'Pa stok' : `${p.stock_count} copë`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {total > MAX_RESULTS && (
            <p className="dash-search__note">Po shfaqen {MAX_RESULTS} nga {total} rezultate. Shkruani më shumë për ta ngushtuar.</p>
          )}
        </>
      )}
    </section>
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

      <ProductSearch />

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
