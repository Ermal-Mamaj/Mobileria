import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import { useApiGet } from '../lib/hooks.js';
import './AboutPage.css';

const VALUE_ICONS = [
  <path key="star" d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />,
  <path key="plus" d="M12 2v20M2 12h20" />,
  <path key="check" d="M20 6L9 17l-5-5" />,
];

export default function AboutPage() {
  const { data: about } = useApiGet('/content/about', {});
  const values = about.values_json || [];

  return (
    <div className="app-shell">
      <NavHeader />

      <div className="about-hero">
        <ImageSlot src={about.hero_image_url} placeholder="Foto e sallonit" dark priority className="about-hero__image" />
        <div className="about-hero__gradient" />
        <div className="about-hero__copy">
          <h1 className="about-hero__title">Historia Jonë</h1>
        </div>
      </div>

      <div className="page-body">
        <p className="about-paragraph">{about.paragraph_1}</p>
        <p className="about-paragraph">{about.paragraph_2}</p>

        <h2 className="about-subheading">Vlerat Tona</h2>
        <div className="value-list">
          {values.map((v, i) => (
            <div className="value-item" key={i}>
              <div className="value-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C3428" strokeWidth="2">
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
      </div>

      <Footer />
    </div>
  );
}
