import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApiGet } from '../lib/hooks.js';
import './NavHeader.css';

const LINKS = [
  { key: 'home', label: 'Ballina', to: '/' },
  { key: 'categories', label: 'Ambientet', to: '/categories' },
  { key: 'about', label: 'Rreth Nesh', to: '/about' },
  { key: 'contact', label: 'Na Kontaktoni', to: '/contact' },
];

function activeKeyFor(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/rooms')) return 'categories';
  const match = LINKS.find((l) => l.to !== '/' && pathname.startsWith(l.to));
  return match ? match.key : '';
}

export default function NavHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const active = activeKeyFor(pathname);
  const { data: settings } = useApiGet('/site-settings', {});

  return (
    <div className="nav-header">
      <div className="nav-header__bar">
        <Link to="/" className="nav-header__brand" onClick={() => setMenuOpen(false)}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Bella Casa" className="nav-header__logo" />
          ) : (
            <span className="wordmark nav-header__logo--text">Bella Casa</span>
          )}
        </Link>
        <button
          type="button"
          className="nav-header__toggle"
          aria-label="Menyja"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-header__menu ${menuOpen ? 'is-open' : ''}`}>
          <nav>
            {LINKS.map((link) => (
              <Link
                key={link.key}
                to={link.to}
                className={`nav-header__link ${active === link.key ? 'is-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
