import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import ImageUploadField from '../ImageUploadField.jsx';
import ProductsPanel from './ProductsPanel.jsx';

export default function CollectionDetailSection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get('/categories').then((cats) => {
      const found = cats.find((c) => String(c.id) === id);
      if (!found) {
        setNotFound(true);
        return;
      }
      setCategory(found);
      setForm({ name: found.name, tagline: found.tagline || '', hero_image_url: found.hero_image_url });
    });
  }, [id]);

  async function save(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    const updated = await api.put(`/categories/${id}`, next);
    setCategory(updated);
  }

  if (notFound) {
    return (
      <div className="admin-panel">
        <p className="prod-empty-state">
          Ky koleksion nuk ekziston më. <Link to="/bellacasa-cms/collections" className="admin-inline-link">Kthehu te Koleksionet</Link>.
        </p>
      </div>
    );
  }

  if (!category || !form) return <p>Po ngarkohet...</p>;

  return (
    <div className="admin-panel">
      <button type="button" className="col-back-link" onClick={() => navigate('/bellacasa-cms/collections')}>
        ‹ Koleksionet
      </button>

      <h2 className="admin-panel__heading">{category.name}</h2>

      <details className="col-edit-details">
        <summary className="prod-card__toggle">Ndrysho të dhënat e koleksionit ▾</summary>
        <div className="prod-card__fields">
          <ImageUploadField label="Imazhi Kryesor" value={form.hero_image_url} onChange={(url) => save({ hero_image_url: url })} />
          <div className="admin-field">
            <label className="admin-field__label">Emri</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onBlur={() => save({ name: form.name })} />
          </div>
          <div className="admin-field">
            <label className="admin-field__label">Përshkrim i shkurtër</label>
            <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} onBlur={() => save({ tagline: form.tagline })} />
          </div>
          <p className="admin-field__hint">Faqja: /rooms/{category.slug}</p>
        </div>
      </details>

      <ProductsPanel category={category} showTopAddButton />
    </div>
  );
}
