import { useId, useState } from 'react';
import { api } from '../lib/api.js';
import './ContactForm.css';

// The enquiry form on Home and Contact. Submissions go to /contact, which
// stores them for the CMS Messages tab and emails the owner.
export default function ContactForm({ dark = false }) {
  const id = useId();
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

  if (sent) {
    return (
      <div className={`contact-form__success ${dark ? 'is-dark' : ''}`} role="status">
        <strong>Faleminderit{form.name.trim() ? `, ${form.name.trim().split(' ')[0]}` : ''}.</strong>
        <span>Mesazhi u dërgua. Do t'ju kontaktojmë së shpejti.</span>
      </div>
    );
  }

  return (
    <form className={`contact-form ${dark ? 'is-dark' : ''}`} onSubmit={handleSubmit}>
      <div className="contact-form__row">
        <div className="contact-form__field">
          <label htmlFor={`${id}-name`}>Emri</label>
          <input id={`${id}-name`} type="text" name="name" autoComplete="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="contact-form__field">
          <label htmlFor={`${id}-phone`}>Telefoni</label>
          <input id={`${id}-phone`} type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={handleChange} required />
        </div>
      </div>
      <div className="contact-form__field">
        <label htmlFor={`${id}-message`}>Mesazhi</label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          placeholder="P.sh. Kërkoj një divan këndor për dhomën e ndenjes, rreth 3 metra."
          value={form.message}
          onChange={handleChange}
          required
        />
      </div>
      {error && <p className="contact-form__error" role="alert">{error}</p>}
      <button type="submit" className={dark ? 'btn-gold' : 'btn-navy'} disabled={sending}>
        {sending ? 'Duke dërguar…' : 'Dërgo mesazhin'}
      </button>
    </form>
  );
}
