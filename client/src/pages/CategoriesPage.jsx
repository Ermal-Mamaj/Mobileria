import { useRef } from 'react';
import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import RoomTile from '../components/RoomTile.jsx';
import { useApiGet } from '../lib/hooks.js';
import { gsap, introHeadline, MOTION_OK, refreshTriggers, useGSAP, wipeIn } from '../lib/motion.js';
import './CategoriesPage.css';

export default function CategoriesPage() {
  const { data: categories } = useApiGet('/categories', []);
  const ref = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(ref);
      introHeadline(q('.page-intro__title')[0]);
      gsap.from(q('.page-intro__text'), { autoAlpha: 0, y: 20, duration: 1, delay: 0.5 });
      gsap.from(q('.page-intro'), { '--rule': 0, duration: 1.4, ease: 'expo.inOut', delay: 0.3 });
      if (categories.length) wipeIn(q('.room-tile'), { inner: '.room-tile__image', stagger: 0.12 });
      refreshTriggers();
    });
    return () => mm.revert();
  }, { scope: ref, dependencies: [categories.length], revertOnUpdate: true });

  return (
    <div className="app-shell">
      <NavHeader />
      <div className="page-body" ref={ref}>
        <header className="page-intro">
          <h1 className="page-intro__title">Ambientet</h1>
          <p className="page-intro__text">
            Shfletoni mobiliet sipas ambientit — çdo dhomë e shtëpisë, me foto, materiale dhe çmime.
          </p>
        </header>

        <div className="rooms-grid">
          {categories.map((cat, i) => (
            <RoomTile key={cat.id} category={cat} index={i} />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
