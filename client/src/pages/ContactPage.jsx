import { useState } from 'react';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import { useApiGet } from '../lib/hooks.js';
import { api } from '../lib/api.js';
import './ContactPage.css';

export default function ContactPage() {
  const { data: settings } = useApiGet('/site-settings', {});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', message: '' });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Diçka shkoi keq. Provoni përsëri.');
    } finally {
      setSending(false);
    }
  }

  const infoRows = [
    settings.phone && {
      label: 'Telefoni',
      value: settings.phone,
      icon: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    },
    settings.email && {
      label: 'Email',
      value: settings.email,
      icon: (
        <>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </>
      ),
    },
  ].filter(Boolean);

  // Each set address opens Google Maps with directions straight to it — no
  // API key needed, and it works the same as a plain link on desktop (opens
  // Google Maps in the browser) or on mobile (opens the Maps/Waze app if
  // installed). Supports one location or two.
  const locations = [
    settings.address && { label: 'Lokacioni 1', address: settings.address },
    settings.address_2 && { label: 'Lokacioni 2', address: settings.address_2 },
  ].filter(Boolean);

  return (
    <div className="app-shell">
      <NavHeader />
      <div className="page-body">
        <div className="eyebrow eyebrow--muted">
          <span className="eyebrow__rule" />
          <span>BELLA CASA</span>
        </div>
        <h1 className="section-heading" style={{ marginBottom: 6 }}>Na Kontaktoni</h1>
        <p className="section-intro">Do të gëzoheshim t'ju dëgjonim.</p>

        <div className="contact-info-list">
          {infoRows.map((row) => (
            <div className="contact-info-card" key={row.label}>
              <div className="contact-info-card__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C3428" strokeWidth="2">
                  {row.icon}
                </svg>
              </div>
              <div>
                <h3 className="contact-info-card__label">{row.label}</h3>
                <p className="contact-info-card__value">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {locations.length > 0 && (
          <div className="contact-locations">
            {locations.map((loc) => (
              <a
                key={loc.label}
                className="contact-location-card"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="contact-location-card__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C3428" strokeWidth="2">
                    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="contact-location-card__text">
                  <h3 className="contact-location-card__label">{loc.label}</h3>
                </div>
                <span className="contact-location-card__cta">Merr Drejtimin →</span>
              </a>
            ))}
          </div>
        )}

        {settings.business_hours && (
          <p className="contact-hours">Orari i Punës: {settings.business_hours}</p>
        )}

        <div className="contact-form-panel">
          <h3 className="contact-form-panel__heading">Dërgo një Mesazh</h3>
          <p className="contact-form-panel__intro">Keni pyetje? Do t'ju përgjigjemi së shpejti.</p>

          {sent ? (
            <p className="contact-form__success">Mesazhi u dërgua me sukses. Do t'ju kontaktojmë së shpejti.</p>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <input type="text" name="name" placeholder="Emri juaj" value={form.name} onChange={handleChange} required />
              <input type="tel" name="phone" placeholder="Numri i telefonit" value={form.phone} onChange={handleChange} required />
              <textarea name="message" placeholder="Mesazhi juaj" value={form.message} onChange={handleChange} required />
              {error && <p className="contact-form__error">{error}</p>}
              <button type="submit" className="btn-navy" disabled={sending}>
                {sending ? 'Duke dërguar…' : 'Dërgo'}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
