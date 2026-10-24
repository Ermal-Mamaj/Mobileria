import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './AdminAuth.jsx';
import './admin.css';

function LoginForm() {
  const { checked, loggedIn, login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!checked) return null;
  if (loggedIn) return <Navigate to="/mamaj-cms" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <h1 className="admin-login__title">Bella Casa</h1>
        <p className="admin-login__subtitle">Hyni për të menaxhuar faqen, koleksionet dhe shitjet.</p>
        <input
          type="text"
          placeholder="Përdoruesi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Fjalëkalimi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="admin-login__error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Po identifikoheni...' : 'Hyr'}
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
