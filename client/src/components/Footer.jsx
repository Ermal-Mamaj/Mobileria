import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApiGet } from '../lib/hooks.js';
import { BRAND, BRAND_LINE, LOGO_FULL, mapsUrl, socialUrl, telUrl, whatsappUrl } from '../lib/brand.js';
import Icon from './Icon.jsx';
import { gsap, MOTION_OK, riseIn, useGSAP } from '../lib/motion.js';
import './Footer.css';

// Everything here comes from the CMS: rooms from Categories, the rest from
// Site Settings. A column with nothing filled in is left out.
export default function Footer() {
  const { data: settings } = useApiGet('/site-settings', {});
  const { data: categories } = useApiGet('/categories', []);
  const ref = useRef(null);

  // The closing flourish: the logo wipes up out of the dark as the footer
  // comes up, and the columns follow.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(ref);
      gsap.fromTo(q('.footer__logo'), { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 12 }, {
        clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
      });
      riseIn([...q('.footer__line'), ...q('.footer__col')], { y: 30, stagger: 0.08, start: 'top 95%' });
    });
    return () => mm.revert();
  }, { scope: ref, dependencies: [categories.length, settings?.id, settings?.logo_url], revertOnUpdate: true });

  const locations = [
    settings?.address && { label: 'Lokacioni 1', address: settings.address },
    settings?.address_2 && { label: 'Lokacioni 2', address: settings.address_2 },
  ].filter(Boolean);
  const hasContact = settings?.phone || settings?.whatsapp || settings?.email;
  const hasVisit = locations.length > 0 || settings?.business_hours;
  const hasSocial = settings?.facebook || settings?.instagram;

  return (
    <footer className="footer" ref={ref}>
      <div className="footer__inner">
        <div className="footer__brand">
          <img
            src={settings?.logo_url || LOGO_FULL}
            alt={BRAND}
            className={`footer__logo ${settings?.logo_url ? '' : 'is-full'}`}
            loading="lazy"
            width="720"
            height="704"
          />
          <p className="footer__line">{BRAND_LINE}</p>
        </div>

        <div className="footer__cols">
          {categories.length > 0 && (
            <div className="footer__col">
              <h2 className="footer__heading">Ambientet</h2>
              <ul>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/rooms/${cat.slug}`} className="footer__link">{cat.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasContact && (
            <div className="footer__col">
              <h2 className="footer__heading">Kontakti</h2>
              <ul>
                {settings.phone && (
                  <li>
                    <a href={telUrl(settings.phone)} className="footer__link footer__link--icon">
                      <Icon name="phone" /> {settings.phone}
                    </a>
                  </li>
                )}
                {settings.whatsapp && (
                  <li>
                    <a href={whatsappUrl(settings.whatsapp)} className="footer__link footer__link--icon" target="_blank" rel="noopener noreferrer">
                      <Icon name="whatsapp" /> WhatsApp
                    </a>
                  </li>
                )}
                {settings.email && (
                  <li>
                    <a href={`mailto:${settings.email}`} className="footer__link footer__link--icon">
                      <Icon name="mail" /> {settings.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {hasVisit && (
            <div className="footer__col">
              <h2 className="footer__heading">Na Vizitoni</h2>
              <ul>
                {locations.map((loc) => (
                  <li key={loc.label}>
                    <a href={mapsUrl(loc.address)} className="footer__link footer__link--icon" target="_blank" rel="noopener noreferrer">
                      <Icon name="pin" /> {loc.label}
                      <Icon name="arrowUpRight" className="footer__ext" />
                    </a>
                  </li>
                ))}
                {settings.business_hours && (
                  <li className="footer__text footer__link--icon">
                    <Icon name="clock" /> {settings.business_hours}
                  </li>
                )}
              </ul>
            </div>
          )}

          {hasSocial && (
            <div className="footer__col">
              <h2 className="footer__heading">Na Ndiqni</h2>
              <ul>
                {settings.facebook && (
                  <li>
                    <a href={socialUrl('facebook', settings.facebook)} className="footer__link footer__link--icon" target="_blank" rel="noopener noreferrer">
                      <Icon name="facebook" /> Facebook
                    </a>
                  </li>
                )}
                {settings.instagram && (
                  <li>
                    <a href={socialUrl('instagram', settings.instagram)} className="footer__link footer__link--icon" target="_blank" rel="noopener noreferrer">
                      <Icon name="instagram" /> Instagram
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} {BRAND}</p>
        <p>{BRAND_LINE}</p>
      </div>
    </footer>
  );
}
