import { Link } from 'react-router-dom';
import ImageSlot from './ImageSlot.jsx';
import Icon from './Icon.jsx';
import { roomTone } from '../lib/brand.js';
import './RoomCard.css';

// A room as a whole photo with its name over it, in the style of the Home
// hero. The room's wall colour (`index` is its place in the CMS list) fills
// the card while the photo loads.
export default function RoomCard({ category, index }) {
  const count = Number(category.product_count) || 0;
  return (
    <Link to={`/rooms/${category.slug}`} className={`room-card tone-${roomTone(index)}`}>
      <div className="room-card__media">
        <ImageSlot src={category.hero_image_url} placeholder="Foto" alt="" dark />
      </div>
      <div className="room-card__body">
        <h3 className="room-card__name">{category.name}</h3>
        {category.tagline && <p className="room-card__tagline">{category.tagline}</p>}
        <span className="room-card__meta">
          {count > 0 ? `${count} ${count === 1 ? 'produkt' : 'produkte'}` : 'Shiko ambientin'}
          <Icon name="arrow" />
        </span>
      </div>
    </Link>
  );
}
