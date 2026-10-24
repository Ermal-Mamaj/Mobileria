import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useUnsavedChanges } from '../UnsavedChangesContext.jsx';
import ImageUploadField from '../ImageUploadField.jsx';

const CONTACT_FIELDS = [
  ['phone', 'Telefoni'],
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email'],
  ['business_hours', 'Orari i Punës'],
];

// Prefilled on every Fatura (each one can still be changed on the invoice
// itself before printing).
const INVOICE_FIELDS = [
  ['business_name', 'Emri i shitësit (emri i biznesit si në faturë)'],
  ['business_nui', 'NUI i shitësit (numri unik identifikues)'],
  ['business_address', 'Adresa e shitësit'],
  ['vat_rate', 'Norma e TVSH-së (%) — lëreni bosh nëse nuk jeni në TVSH; çmimet konsiderohen me TVSH të përfshirë'],
];

const SOCIAL_FIELDS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
];

const LOCATION_FIELDS = [
  ['address', 'Adresa (Lokacioni 1) — koordinatat ose adresa; nuk shfaqet te vizitorët, përdoret vetëm për butonin e drejtimit'],
  ['address_2', 'Adresa (Lokacioni 2) — lëreni bosh nëse keni vetëm një sallon'],
];

function FieldGroup({ title, fields, form, onChange }) {
  return (
    <div className="settings-group">
      <h3 className="settings-group__title">{title}</h3>
      {fields.map(([key, label]) => (
        <div className="admin-field" key={key}>
          <label className="admin-field__label">{label}</label>
          <input value={form[key] ?? ''} onChange={(e) => onChange(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

export default function SiteSettingsSection() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const { isDirty, setIsDirty } = useUnsavedChanges();

  useEffect(() => {
    api.get('/site-settings').then(setForm);
    return () => setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await api.put('/site-settings', form);
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
        <h2 className="admin-panel__heading">Cilësimet e Faqes</h2>
        <div className="admin-panel__save-controls">
          {savedAt && !isDirty && <span className="admin-panel__saved">U ruajt ✓</span>}
          {isDirty && <span className="admin-panel__unsaved">Ndryshime të paruajtura</span>}
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? 'Po ruhet...' : 'Ruaj Ndryshimet'}
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group__title">Identiteti</h3>
        <ImageUploadField label="Logoja" value={form.logo_url} onChange={(url) => set('logo_url', url)} />
      </div>

      <FieldGroup title="Kontakti" fields={CONTACT_FIELDS} form={form} onChange={set} />
      <FieldGroup title="Vendndodhjet" fields={LOCATION_FIELDS} form={form} onChange={set} />
      <FieldGroup title="Rrjetet Sociale" fields={SOCIAL_FIELDS} form={form} onChange={set} />
      <FieldGroup title="Të dhënat për faturë" fields={INVOICE_FIELDS} form={form} onChange={set} />

      <div className="settings-group">
        <h3 className="settings-group__title">Ballina</h3>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={!!form.sale_section_enabled}
            onChange={(e) => set('sale_section_enabled', e.target.checked)}
          />
          Aktivizo Seksionin "Në Zbritje" në Ballinë
        </label>
      </div>
    </div>
  );
}
