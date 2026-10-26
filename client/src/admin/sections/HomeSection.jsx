import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { EditableText, EditableImage } from '../WysiwygFields.jsx';
import { useUnsavedChanges } from '../UnsavedChangesContext.jsx';
import { LOGO_FULL } from '../../lib/brand.js';
import '../../pages/HomePage.css';

export default function HomeSection() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const { isDirty, setIsDirty } = useUnsavedChanges();

  useEffect(() => {
    api.get('/content/home').then(setForm);
    // Leaving this page (however it happens) shouldn't leave a stale
    // "unsaved changes" flag armed for whatever page loads next.
    return () => setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edits only update local state now — nothing hits the server until
  // "Ruaj Ndryshimet" is pressed, and the nav guard (see AdminLayout) stops
  // an accidental tab switch from silently losing them.
  function edit(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await api.put('/content/home', form);
      setForm(saved);
      setSavedAt(Date.now());
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p>Po ngarkohet...</p>;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header-row">
        <h2 className="admin-panel__heading">Ballina</h2>
        <div className="admin-panel__save-controls">
          {savedAt && !isDirty && <span className="admin-panel__saved">U ruajt ✓</span>}
          {isDirty && <span className="admin-panel__unsaved">Ndryshime të paruajtura</span>}
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? 'Po ruhet...' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      </div>
      <p className="admin-panel__description">
        Kjo është pikërisht siç do të duket faqja. Klikoni mbi çdo tekst për ta ndryshuar. Për një foto,
        shtypni ikonën e kamerës në cep të saj. Pastaj shtypni "Ruaj Ndryshimet".
      </p>

      <div className="wysiwyg-frame">
        {/* Hero: the photo and its text are two separate blocks, so neither
            can cover the other. The photo is on top (camera icon to change it);
            the text sits below on the hero's dark background. */}
        <div className="home-page__hero wysiwyg-hero wysiwyg-hero--split">
          <div className="wysiwyg-hero__photo">
            <EditableImage
              value={form.hero_image_url}
              onSave={(url) => edit('hero_image_url', url)}
              className="home-page__hero-image"
              dark
            />
          </div>
          <div className="wysiwyg-hero__text">
            <div className="home-page__hero-copy">
              <div className="eyebrow eyebrow--gold">
                <span className="eyebrow__rule" />
                <EditableText
                  value={form.hero_eyebrow}
                  onSave={(v) => edit('hero_eyebrow', v)}
                  placeholder="MOBILIE PËR ÇDO DHOMË"
                  className="wysiwyg-field--eyebrow"
                />
              </div>
              <div className="home-page__hero-headline wysiwyg-headline-wrap">
                <EditableText
                  as="textarea"
                  rows={2}
                  value={form.hero_headline}
                  onSave={(v) => edit('hero_headline', v)}
                  placeholder="Titulli kryesor..."
                  className="wysiwyg-field--headline"
                />
              </div>
              <div className="btn-gold wysiwyg-btn-wrap">
                <EditableText
                  value={form.hero_cta}
                  onSave={(v) => edit('hero_cta', v)}
                  placeholder="Shiko ambientet"
                  className="wysiwyg-field--btn"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quote / brand band */}
        <div className="brand-band">
          <div className="brand-band__content brand-band__layout">
            <div>
              <EditableText
                as="textarea"
                rows={2}
                value={form.quote_text}
                onSave={(v) => edit('quote_text', v)}
                placeholder="Teksti i citatit..."
                className="wysiwyg-field--quote brand-band__text"
              />
              <div className="eyebrow eyebrow--gold">
                <span className="eyebrow__rule" />
                <EditableText
                  value={form.quote_label}
                  onSave={(v) => edit('quote_label', v)}
                  placeholder="BELLA CASA"
                  className="wysiwyg-field--eyebrow"
                />
              </div>
            </div>
            <img src={LOGO_FULL} alt="" className="brand-band__logo" />
          </div>
        </div>

        {/* Contact section heading */}
        <div className="home-page__section wysiwyg-section-bg">
          <div className="eyebrow eyebrow--muted">
            <span className="eyebrow__rule" />
            <span>NA KONTAKTONI</span>
          </div>
          <EditableText
            value={form.contact_heading}
            onSave={(v) => edit('contact_heading', v)}
            placeholder="Le të krijojmë diçka të veçantë."
            className="wysiwyg-field--section-heading section-heading"
          />
          <EditableText
            as="textarea"
            rows={2}
            value={form.contact_intro}
            onSave={(v) => edit('contact_intro', v)}
            placeholder="Na shkruani dhe..."
            className="wysiwyg-field--intro section-intro"
          />
          <p className="wysiwyg-note">↓ Formulari i kontaktit shfaqet këtu në faqen reale (emri, telefoni, mesazhi, butoni Dërgo)</p>
        </div>
      </div>
    </div>
  );
}
