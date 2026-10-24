import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { EditableText, EditableImage } from '../WysiwygFields.jsx';
import { useUnsavedChanges } from '../UnsavedChangesContext.jsx';
import '../../pages/AboutPage.css';

const VALUE_ICONS = [
  <path key="star" d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />,
  <path key="plus" d="M12 2v20M2 12h20" />,
  <path key="check" d="M20 6L9 17l-5-5" />,
];

export default function AboutSection() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const { isDirty, setIsDirty } = useUnsavedChanges();

  useEffect(() => {
    api.get('/content/about').then(setForm);
    return () => setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edits only touch local state — nothing hits the server until
  // "Ruaj Ndryshimet" is pressed.
  function edit(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setIsDirty(true);
  }

  function editValue(index, field, value) {
    const values = [...(form.values_json || [])];
    values[index] = { ...values[index], [field]: value };
    edit('values_json', values);
  }

  function addValue() {
    edit('values_json', [...(form.values_json || []), { title: 'Vlerë e Re', description: 'Përshkrimi...' }]);
  }

  function removeValue(index) {
    edit('values_json', (form.values_json || []).filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await api.put('/content/about', form);
      setForm(saved);
      setSavedAt(Date.now());
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p>Po ngarkohet...</p>;

  const values = form.values_json || [];

  return (
    <div className="admin-panel">
      <div className="admin-panel__header-row">
        <h2 className="admin-panel__heading">Rreth Nesh</h2>
        <div className="admin-panel__save-controls">
          {savedAt && !isDirty && <span className="admin-panel__saved">U ruajt ✓</span>}
          {isDirty && <span className="admin-panel__unsaved">Ndryshime të paruajtura</span>}
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? 'Po ruhet...' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      </div>
      <p className="admin-panel__description">
        Kjo është pikërisht siç do të duket faqja. Klikoni mbi çdo tekst ose foto për ta ndryshuar,
        pastaj shtypni "Ruaj Ndryshimet".
      </p>

      <div className="wysiwyg-frame">
        <div className="about-hero wysiwyg-about-hero">
          <EditableImage
            value={form.hero_image_url}
            onSave={(url) => edit('hero_image_url', url)}
            className="about-hero__image"
            dark
          />
          <div className="about-hero__gradient" />
          <div className="about-hero__copy">
            <h1 className="about-hero__title">Historia Jonë</h1>
          </div>
        </div>

        <div className="page-body wysiwyg-section-bg">
          <EditableText
            as="textarea"
            rows={3}
            value={form.paragraph_1}
            onSave={(v) => edit('paragraph_1', v)}
            placeholder="Paragrafi i parë..."
            className="wysiwyg-field--paragraph about-paragraph"
          />
          <EditableText
            as="textarea"
            rows={3}
            value={form.paragraph_2}
            onSave={(v) => edit('paragraph_2', v)}
            placeholder="Paragrafi i dytë..."
            className="wysiwyg-field--paragraph about-paragraph"
          />

          <h2 className="about-subheading">Vlerat Tona</h2>
          <div className="value-list">
            {values.map((v, i) => (
              <div className="value-item wysiwyg-value-item" key={i}>
                <div className="value-item__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2733" strokeWidth="2">
                    {VALUE_ICONS[i % VALUE_ICONS.length]}
                  </svg>
                </div>
                <div className="wysiwyg-value-item__body">
                  <EditableText
                    value={v.title}
                    onSave={(val) => editValue(i, 'title', val)}
                    placeholder="Titulli"
                    className="wysiwyg-field--value-title value-item__title"
                  />
                  <EditableText
                    value={v.description}
                    onSave={(val) => editValue(i, 'description', val)}
                    placeholder="Përshkrimi"
                    className="wysiwyg-field--value-desc value-item__description"
                  />
                </div>
                <button type="button" className="wysiwyg-value-remove" onClick={() => removeValue(i)} aria-label="Hiq vlerën">×</button>
              </div>
            ))}
          </div>
          <button type="button" className="admin-btn-secondary" onClick={addValue}>+ Shto Vlerë</button>

          <div className="about-quote wysiwyg-quote">
            <EditableText
              as="textarea"
              rows={2}
              value={form.quote_text}
              onSave={(v) => edit('quote_text', v)}
              placeholder="Teksti i citatit..."
              className="wysiwyg-field--quote about-quote__text"
            />
            <EditableText
              value={form.quote_author}
              onSave={(v) => edit('quote_author', v)}
              placeholder="Ekipi i Bella Casa"
              className="wysiwyg-field--author about-quote__author"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
