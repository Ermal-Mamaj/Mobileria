import { useRef } from 'react';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import PageBanner from '../components/PageBanner.jsx';
import RoomCard from '../components/RoomCard.jsx';
import { useApiGet, usePageTitle } from '../lib/hooks.js';
import { gsap, MOTION_OK, refreshTriggers, riseIn, useGSAP, wipeIn } from '../lib/motion.js';
import './CategoriesPage.css';

export default function CategoriesPage() {
  const { data: categories } = useApiGet('/categories', []);
  usePageTitle('Ambientet', 'Mobilie për çdo ambient të shtëpisë: dhoma e ndenjes, e gjumit, kuzhina, dhoma e ngrënies, zyra dhe më shumë.');
  const { data: home } = useApiGet('/content/home', {});
  const ref = useRef(null);

  useGSAP(() => {
    if (!categories.length) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(ref);
      wipeIn(q('.room-card'), { inner: '.image-slot', stagger: 0.12 });
      riseIn(q('.room-card__body'), { y: 24, stagger: 0.12 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: ref, dependencies: [categories.length], revertOnUpdate: true });

  // The banner shows the Home hero photo, so it changes with what the owner
  // sets there; the first room's photo stands in until one is uploaded.
  const bannerImage = home.hero_image_url || categories[0]?.hero_image_url;

  return (
    <div className="app-shell">
      <NavHeader />
      <PageBanner
        title="Ambientet"
        text="Shfletoni mobiliet sipas ambientit — çdo dhomë e shtëpisë, me foto, materiale dhe çmime."
        image={bannerImage}
      />
      <section className="band-latte rooms-band" ref={ref} aria-label="Ambientet">
        <div className="rooms-grid">
          {categories.map((cat, i) => (
            <RoomCard key={cat.id} category={cat} index={i} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
