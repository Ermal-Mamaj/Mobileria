import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './AdminAuth.jsx';
import { adminAuth } from '../lib/api.js';
// The CMS keeps its own type (Fraunces); the public site is set in Cormorant.
import '@fontsource-variable/fraunces/full.css';
import './admin.css';

function LoginForm() {
  const { checked, loggedIn, login, setup } = useAdminAuth();
  const [needsSetup, setNeedsSetup] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // A brand-new site has no admin yet: the first visit creates one.
  useEffect(() => {
    adminAuth.setupStatus().then((res) => setNeedsSetup(!!res.needsSetup));
  }, []);

  if (!checked || needsSetup === null) return null;
  if (loggedIn) return <Navigate to="/bellacasa-cms" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (needsSetup) {
      if (password.length < 10) return setError('Fjalëkalimi duhet të ketë të paktën 10 karaktere.');
      if (password !== confirm) return setError('Fjalëkalimet nuk përputhen.');
    }
    setSubmitting(true);
    try {
      if (needsSetup) await setup(username.trim(), password);
      else await login(username, password);
    } catch (err) {
      setError(err.message);
      // Someone else finished setup first: fall back to the normal login.
      if (needsSetup && /ekziston/.test(err.message)) setNeedsSetup(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <h1 className="admin-login__title">Bella Casa</h1>
        <p className="admin-login__subtitle">
          {needsSetup
            ? 'Mirë se vini! Krijoni llogarinë e administratorit. Këtë e bëni vetëm një herë.'
            : 'Hyni për të menaxhuar faqen, koleksionet dhe shitjet.'}
        </p>
        <input
          type="text"
          placeholder="Përdoruesi"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder={needsSetup ? 'Fjalëkalimi (të paktën 10 karaktere)' : 'Fjalëkalimi'}
          autoComplete={needsSetup ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {needsSetup && (
          <input
            type="password"
            placeholder="Përsëritni fjalëkalimin"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
        {error && <p className="admin-login__error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting
            ? (needsSetup ? 'Po krijohet...' : 'Po identifikoheni...')
            : (needsSetup ? 'Krijo llogarinë' : 'Hyr')}
        </button>
      </form>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <AdminAuthProvider>
      <LoginForm />
    </AdminAuthProvider>
  );
}
