import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useConfirm } from '../useConfirm.jsx';

export default function CollectionsListSection() {
  const [categories, setCategories] = useState(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { confirm, modal } = useConfirm();

  function reload() {
    api.get('/categories').then(setCategories);
  }

  useEffect(reload, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const created = await api.post('/categories', { name: newName });
      setNewName('');
      reload();
      // Jump straight into the new room so you can start adding products
      navigate(`/bellacasa-cms/collections/${created.id}`);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(e, cat) {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Fshi koleksionin?',
      message: `Fshij "${cat.name}" dhe të gjitha ${cat.product_count} produktet brenda? Ky veprim nuk mund të zhbëhet.`,
      confirmLabel: 'Fshi',
      danger: true,
    });
    if (!ok) return;
    await api.del(`/categories/${cat.id}`);
    reload();
  }

  // Same full-renumber approach as product reordering, for the same reason
  // (a swap silently does nothing when both values already happen to match).
  async function move(e, cat, direction) {
    e.stopPropagation();
    const index = categories.findIndex((c) => c.id === cat.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setCategories(reordered);

    await api.post('/categories/reorder', { order: reordered.map((c) => c.id) });
  }

  if (!categories) return <p>Po ngarkohet...</p>;

  const q = search.trim().toLowerCase();
  const filtered = q ? categories.filter((c) => c.name?.toLowerCase().includes(q)) : categories;
  const canReorder = !q;

  return (
    <div className="admin-panel">
      <h2 className="admin-panel__heading">Koleksionet</h2>
      <p className="admin-panel__description">
        Krijoni ose fshini koleksionet (dhomat) e faqes. Klikoni një rresht për t'i parë detajet dhe produktet e tij.
      </p>

      <form className="col-add-form" onSubmit={handleAdd}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Emri i koleksionit të ri (p.sh. Dhoma e Fëmijëve)"
          className="col-add-form__input"
        />
        <button type="submit" className="col-add-form__btn" disabled={adding || !newName.trim()}>
          {adding ? 'Duke shtuar...' : '+ Shto Koleksion'}
        </button>
      </form>

      {categories.length > 3 && (
        <input
          type="search"
          className="prod-search-input"
          placeholder="Kërko koleksion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <p className="prod-empty-state">
          {q ? `Asnjë koleksion nuk përputhet me "${search}".` : 'Nuk ka ende asnjë koleksion. Shtoni njërin më sipër.'}
        </p>
      ) : (
        <div className="col-list">
          {filtered.map((cat, i) => (
            <div
              key={cat.id}
              className="col-row"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/bellacasa-cms/collections/${cat.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/bellacasa-cms/collections/${cat.id}`); }}
            >
              {canReorder && (
                <div className="col-reorder">
                  <button type="button" className="col-reorder__btn" disabled={i === 0} onClick={(e) => move(e, cat, -1)} aria-label="Lëviz lart" title="Lëviz lart">▲</button>
                  <button type="button" className="col-reorder__btn" disabled={i === filtered.length - 1} onClick={(e) => move(e, cat, 1)} aria-label="Lëviz poshtë" title="Lëviz poshtë">▼</button>
                </div>
              )}
              <div className="col-row__thumb">
                {cat.hero_image_url
                  ? <img src={cat.hero_image_url} alt="" />
                  : <span className="col-row__thumb-empty">🏠</span>
                }
              </div>
              <div className="col-row__info">
                <span className="col-row__name">{cat.name}</span>
                <span className="col-row__meta">{cat.product_count} produkte</span>
              </div>
              <span className="col-row__chevron">›</span>
              <button
                type="button"
                className="col-row__delete"
                onClick={(e) => handleDelete(e, cat)}
                title="Fshi koleksionin"
                aria-label={`Fshi ${cat.name}`}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
      {modal}
    </div>
  );
}
