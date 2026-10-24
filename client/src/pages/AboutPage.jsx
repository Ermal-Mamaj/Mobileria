import { Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import Icon from '../components/Icon.jsx';
import { useApiGet } from '../lib/hooks.js';
import './AboutPage.css';

const VALUE_ICONS = [
  <path key="star" d="M12 3.5l2.5 5.6 6 .6-4.5 4 1.3 6-5.3-3.1-5.3 3.1 1.3-6-4.5-4 6-.6z" />,
  <path key="ruler" d="M3 16.5 16.5 3 21 7.5 7.5 21zM7 12.5l1.8 1.8M10 9.5l1.8 1.8M13 6.5l1.8 1.8" />,
  <path key="chat" d="M4 5h16v11H9l-5 4z" />,
];

// The story, values and quote are edited in the CMS (Faqet → Rreth Nesh),
// which shows them with these same classes.
export default function AboutPage() {
  const { data: about } = useApiGet('/content/about', {});
  const values = about.values_json || [];

  return (
    <div className="app-shell">
      <NavHeader />

      <div className="about-hero">
        <ImageSlot src={about.hero_image_url} placeholder="Foto e sallonit" alt="" dark priority className="about-hero__image" />
        <div className="about-hero__gradient" />
        <div className="about-hero__copy">
          <h1 className="about-hero__title">Historia Jonë</h1>
        </div>
      </div>

      <div className="page-body about-body">
        <p className="about-paragraph">{about.paragraph_1}</p>
        <p className="about-paragraph">{about.paragraph_2}</p>

        <h2 className="about-subheading">Vlerat Tona</h2>
        <div className="value-list">
          {values.map((v, i) => (
            <div className="value-item" key={i}>
              <div className="value-item__icon">
                <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                  {VALUE_ICONS[i % VALUE_ICONS.length]}
                </svg>
              </div>
              <div>
                <h3 className="value-item__title">{v.title}</h3>
                <p className="value-item__description">{v.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="about-quote">
          <p className="about-quote__text">&ldquo;{about.quote_text}&rdquo;</p>
          <p className="about-quote__author">— {about.quote_author}</p>
        </div>

        <div className="about-visit">
          <p>Mobiliet duken më mirë nga afër. Ejani në sallon, ose na shkruani se çfarë po kërkoni.</p>
          <div className="about-visit__actions">
            <Link to="/contact" className="btn-navy">Na kontaktoni <Icon name="arrow" className="btn-arrow" /></Link>
            <Link to="/categories" className="btn-outline">Shiko ambientet</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
