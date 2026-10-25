import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApiGet } from '../lib/hooks.js';
import { whatsappUrl } from '../lib/brand.js';
import Icon from './Icon.jsx';
import './WhatsAppFloat.css';

// A WhatsApp button that stays in the corner on phones and tablets, so a
// question is always one tap away. Shown only when a WhatsApp number is set
// in Site Settings; hidden in the CMS, and while the menu or a product
// sheet is open (the sheet has its own WhatsApp button).
export default function WhatsAppFloat() {
  const { pathname } = useLocation();
  const { data: settings } = useApiGet('/site-settings', {});
  // On Home the hero already has its own buttons and figures along its
  // foot, so the button waits until the page is scrolled.
  const onHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!onHome) return undefined;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onHome]);
  if ((onHome && !scrolled) || !settings?.whatsapp || pathname.startsWith('/bellacasa-cms')) return null;

  return (
    <a
      href={whatsappUrl(settings.whatsapp, 'Përshëndetje, kam një pyetje për mobiliet tuaja.')}
      className="wa-float"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Na shkruani në WhatsApp"
    >
      <Icon name="whatsapp" />
    </a>
  );
}
