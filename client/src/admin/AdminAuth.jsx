import { createContext, useContext, useEffect, useState } from 'react';
import { adminAuth } from '../lib/api.js';

const AuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState({ checked: false, loggedIn: false, username: null });

  useEffect(() => {
    adminAuth.me().then((res) => setStatus({ checked: true, loggedIn: !!res.loggedIn, username: res.username || null }));
  }, []);

  async function login(username, password) {
    const res = await adminAuth.login(username, password);
    setStatus({ checked: true, loggedIn: true, username: res.username });
  }

  async function setup(username, password) {
    const res = await adminAuth.setup(username, password);
    setStatus({ checked: true, loggedIn: true, username: res.username });
  }

  async function logout() {
    await adminAuth.logout();
    setStatus({ checked: true, loggedIn: false, username: null });
  }

  return <AuthContext.Provider value={{ ...status, login, setup, logout }}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
