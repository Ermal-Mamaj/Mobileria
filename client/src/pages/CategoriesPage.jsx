import NavHeader from '../components/NavHeader.jsx';
import Footer from '../components/Footer.jsx';
import RoomTile from '../components/RoomTile.jsx';
import { useApiGet } from '../lib/hooks.js';
import './CategoriesPage.css';

export default function CategoriesPage() {
  const { data: categories } = useApiGet('/categories', []);

  return (
    <div className="app-shell">
      <NavHeader />
      <div className="page-body">
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
