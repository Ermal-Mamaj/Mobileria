import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { adminAuth } from '../lib/api.js';
import { useAdminAuth } from './AdminAuth.jsx';
import { useUnsavedChanges } from './UnsavedChangesContext.jsx';
import { useConfirm } from './useConfirm.jsx';

const TABS = [
  { to: '/bellacasa-cms', label: 'Paneli', icon: '📊', end: true },
  { to: '/bellacasa-cms/collections', label: 'Koleksionet', icon: '🗂️' },
  { to: '/bellacasa-cms/sales', label: 'Shitjet', icon: '🧾' },
  { to: '/bellacasa-cms/pages', label: 'Përmbajtja e Faqeve', icon: '📄' },
  { to: '/bellacasa-cms/messages', label: 'Mesazhet', icon: '📬' },
  { to: '/bellacasa-cms/settings', label: 'Cilësimet', icon: '⚙️' },
];

export default function AdminLayout({ children }) {
  const { username, logout } = useAdminAuth();
  const { isDirty, setIsDirty } = useUnsavedChanges();
  const { confirm, modal } = useConfirm();
  const navigate = useNavigate();
  const [sessionLost, setSessionLost] = useState(false);

  // Any API call that finds the session gone raises this. Signing in again
  // happens in a new tab; when this tab gets focus back and the session is
  // valid again, the banner clears and the user just presses save again.
  useEffect(() => {
    const onLost = () => setSessionLost(true);
    const onFocus = () => {
      adminAuth.me().then((res) => { if (res.loggedIn) setSessionLost(false); });
    };
    window.addEventListener('admin-session-expired', onLost);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('admin-session-expired', onLost);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Every nav click (sidebar or mobile tabs) goes through here — if the
  // current page has unsaved edits, confirm before actually leaving instead
  // of silently discarding them. Since we render the app's own nav (not
  // arbitrary links), intercepting clicks here covers every way to switch
  // CMS pages without needing a full data-router migration for
  // React Router's useBlocker.
  async function handleNavClick(e, to) {
    if (!isDirty) return;
    e.preventDefault();
    const leave = await confirm({
      title: 'Keni ndryshime të paruajtura',
      message: 'Nëse largoheni tani, ndryshimet e fundit nuk do të ruhen. Dëshironi të largoheni pa i ruajtur?',
      confirmLabel: 'Largohu pa ruajtur',
      cancelLabel: 'Qëndro këtu',
      danger: true,
    });
    if (leave) {
      setIsDirty(false);
      navigate(to);
    }
  }

  return (
    <div className="admin-layout">
      {/* Sidebar — visible on desktop, collapses to a top bar on mobile */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <h1 className="admin-sidebar__title">Bella Casa</h1>
          <span className="admin-sidebar__subtitle">CMS</span>
        </div>

        <nav className="admin-sidebar__nav">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              onClick={(e) => handleNavClick(e, tab.to)}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'is-active' : ''}`}
            >
              <span className="admin-nav-item__icon">{tab.icon}</span>
              <span className="admin-nav-item__label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <span className="admin-sidebar__avatar">{(username || 'A')[0].toUpperCase()}</span>
            <span className="admin-sidebar__username">{username}</span>
          </div>
          <button type="button" className="admin-sidebar__logout" onClick={logout}>Dil</button>
        </div>
      </aside>

      {/* Mobile top bar — hidden on desktop where sidebar takes over */}
      <header className="admin-topbar">
        <h1 className="admin-topbar__title">Bella Casa</h1>
        <div className="admin-topbar__right">
          <span className="admin-topbar__user">{username}</span>
          <button type="button" className="admin-btn-secondary admin-btn--sm" onClick={logout}>Dil</button>
        </div>
      </header>

      {/* Mobile horizontal tabs */}
      <nav className="admin-mobile-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            onClick={(e) => handleNavClick(e, tab.to)}
            className={({ isActive }) => `admin-layout__tab ${isActive ? 'is-active' : ''}`}
          >
            <span className="admin-tab-icon">{tab.icon}</span>
            <span className="admin-tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="admin-main">
        {sessionLost && (
          <div className="admin-session-banner" role="alert">
            <span>Seanca juaj ka përfunduar — hyni përsëri për të vazhduar. Ndryshimet në këtë faqe mbeten.</span>
            <a href="/bellacasa-cms/login" target="_blank" rel="noopener" className="admin-session-banner__btn">
              Hyr përsëri ↗
            </a>
          </div>
        )}
        {children}
      </main>
      {modal}
    </div>
  );
}
