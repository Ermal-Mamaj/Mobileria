import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApiGet } from '../lib/hooks.js';
import { BRAND, telUrl, whatsappUrl } from '../lib/brand.js';
import Icon from './Icon.jsx';
import { lockScroll, ScrollTrigger, unlockScroll } from '../lib/motion.js';
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
  // On the Home page the bar starts see-through over the hero photo and turns
  // solid once the page scrolls; every other page gets the solid bar.
  // Scrolling down tucks the bar away to give the photos the screen;
  // scrolling up brings it straight back.
  const overHero = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        setScrolled(y > 24);
        if (y < 160) setTucked(false);
        else if (Math.abs(self.getVelocity()) > 40) setTucked(self.direction === 1);
      },
    });
    return () => trigger.kill();
  }, [pathname]);

  // The open menu covers the page: freeze the page behind it, close on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    lockScroll();
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const transparent = overHero && !scrolled && !menuOpen;
  const close = () => setMenuOpen(false);

  return (
    <header
      className={`nav-header ${transparent ? 'is-transparent' : ''} ${menuOpen ? 'is-menu-open' : ''} ${tucked && !menuOpen ? 'is-tucked' : ''}`}
      onFocus={() => setTucked(false)}
    >
      <div className="nav-header__bar">
        <Link to="/" className="nav-header__brand" onClick={close} aria-label={`${BRAND} — Ballina`}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={BRAND} className="nav-header__logo" />
          ) : (
            <span className="wordmark nav-header__logo--text">{BRAND}</span>
          )}
        </Link>

        <nav className="nav-header__links" aria-label="Kryesore">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              to={link.to}
              className={`nav-header__link ${active === link.key ? 'is-active' : ''}`}
              aria-current={active === link.key ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {settings?.phone && (
          <a href={telUrl(settings.phone)} className="nav-header__call">
            <Icon name="phone" />
            <span>{settings.phone}</span>
          </a>
        )}

        <button
          type="button"
          className="nav-header__toggle"
          aria-label={menuOpen ? 'Mbyll menynë' : 'Hap menynë'}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>

      <div id="site-menu" className="nav-header__menu" hidden={!menuOpen} data-lenis-prevent>
        <nav aria-label="Menyja">
          {LINKS.map((link, i) => (
            <Link
              key={link.key}
              to={link.to}
              className={`nav-header__menu-link ${active === link.key ? 'is-active' : ''}`}
              aria-current={active === link.key ? 'page' : undefined}
              style={{ '--i': i }}
              onClick={close}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {(settings?.phone || settings?.whatsapp) && (
          <div className="nav-header__menu-contact">
            {settings.phone && (
              <a href={telUrl(settings.phone)} className="btn-gold">
                <Icon name="phone" /> Telefononi
              </a>
            )}
            {settings.whatsapp && (
              <a href={whatsappUrl(settings.whatsapp)} className="btn-ghost" target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
