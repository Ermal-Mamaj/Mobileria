import { useRef } from 'react';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ContactForm from '../components/ContactForm.jsx';
import PageBanner from '../components/PageBanner.jsx';
import Icon from '../components/Icon.jsx';
import { useApiGet, usePageTitle } from '../lib/hooks.js';
import { mapsUrl, socialUrl, telUrl, whatsappUrl } from '../lib/brand.js';
import { gsap, MOTION_OK, refreshTriggers, riseIn, useGSAP, EASE } from '../lib/motion.js';
import './ContactPage.css';

export default function ContactPage() {
  const { data: settings } = useApiGet('/site-settings', {});
  usePageTitle('Na Kontaktoni', 'Telefononi, shkruani në WhatsApp ose vizitoni sallonin Bella Casa.');
  const { data: about } = useApiGet('/content/about', {});
  const { data: home } = useApiGet('/content/home', {});
  const ref = useRef(null);

  // Contact rows slide in from the left one by one, the form panel rises
  // beside them.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(ref);
      if (!settings.id) return;
      gsap.from(q('.contact-channel'), { autoAlpha: 0, x: -40, duration: 1, stagger: 0.1, delay: 0.6 });
      gsap.from(q('.contact-form-panel'), { autoAlpha: 0, y: 60, duration: 1.2, ease: EASE.enter, delay: 0.7 });
      riseIn([...q('.contact-visit__title'), ...q('.contact-hours'), ...q('.contact-location-card'), ...q('.contact-social')], { y: 28, stagger: 0.08 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: ref, dependencies: [settings.id], revertOnUpdate: true });

  // Every way to reach the showroom that's filled in under Site Settings.
  const channels = [
    settings.phone && { key: 'phone', icon: 'phone', label: 'Telefoni', value: settings.phone, href: telUrl(settings.phone) },
    settings.whatsapp && { key: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', value: settings.whatsapp, href: whatsappUrl(settings.whatsapp), external: true },
    settings.email && { key: 'email', icon: 'mail', label: 'Email', value: settings.email, href: `mailto:${settings.email}` },
  ].filter(Boolean);

  // Each set address opens Google Maps with directions straight to it — no
  // API key needed, and it works the same as a plain link on desktop (opens
  // Google Maps in the browser) or on mobile (opens the Maps/Waze app if
  // installed). The address itself isn't shown: it may be coordinates.
  const locations = [
    settings.address && { label: 'Lokacioni 1', address: settings.address },
    settings.address_2 && { label: 'Lokacioni 2', address: settings.address_2 },
  ].filter(Boolean);

  const socials = [
    settings.facebook && { key: 'facebook', label: 'Facebook', href: socialUrl('facebook', settings.facebook) },
    settings.instagram && { key: 'instagram', label: 'Instagram', href: socialUrl('instagram', settings.instagram) },
  ].filter(Boolean);

  return (
    <div className="app-shell">
      <NavHeader />
      {/* The showroom photo from Rreth Nesh; the Home photo until one is set. */}
      <PageBanner
        title="Na Kontaktoni"
        text="Do të gëzoheshim t'ju dëgjonim — për një pyetje, një çmim, apo një mobilie me porosi."
        image={about.hero_image_url || home.hero_image_url}
      />
      <section className="band-latte contact-band">
        <div className="page-body" ref={ref}>
          <div className="contact-layout">
            <div className="contact-info">
              {channels.length > 0 && (
                <ul className="contact-channels">
                  {channels.map((c) => (
                    <li key={c.key}>
                      <a
                        href={c.href}
                        className="contact-channel"
                        {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        <Icon name={c.icon} />
                        <span className="contact-channel__text">
                          <small>{c.label}</small>
                          <span>{c.value}</span>
                        </span>
                        <Icon name="arrowUpRight" className="contact-channel__go" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {(locations.length > 0 || settings.business_hours) && (
                <div className="contact-visit">
                  <h2 className="contact-visit__title">Vizitoni sallonin</h2>
                  {settings.business_hours && (
                    <p className="contact-hours">
                      <Icon name="clock" />
                      <span><small>Orari i Punës</small>{settings.business_hours}</span>
                    </p>
                  )}
                  {locations.length > 0 && (
                    <div className="contact-locations">
                      {locations.map((loc) => (
                        <a
                          key={loc.label}
                          className="contact-location-card"
                          href={mapsUrl(loc.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon name="pin" />
                          <span className="contact-location-card__label">{loc.label}</span>
                          <span className="contact-location-card__cta">Merr drejtimin <Icon name="arrow" /></span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {socials.length > 0 && (
                <div className="contact-socials">
                  {socials.map((s) => (
                    <a key={s.key} href={s.href} className="contact-social" target="_blank" rel="noopener noreferrer">
                      <Icon name={s.key} /> {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="contact-form-panel">
              <h2 className="contact-form-panel__heading">Dërgo një Mesazh</h2>
              <p className="contact-form-panel__intro">Keni pyetje? Do t'ju përgjigjemi së shpejti.</p>
              <ContactForm dark />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
