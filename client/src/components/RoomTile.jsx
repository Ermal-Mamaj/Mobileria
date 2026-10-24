import { Link } from 'react-router-dom';
import ImageSlot from './ImageSlot.jsx';
import Icon from './Icon.jsx';
import { roomTone } from '../lib/brand.js';
import './RoomTile.css';

// One room of the showroom: its photo over a caption painted in the room's
// own wall colour. `index` is the room's place in the CMS list, which picks
// the colour, so a room looks the same everywhere it appears.
export default function RoomTile({ category, index, className = '' }) {
  const count = Number(category.product_count) || 0;
  return (
    <Link to={`/rooms/${category.slug}`} className={`room-tile tone-${roomTone(index)} ${className}`}>
      <div className="room-tile__image">
        <ImageSlot src={category.hero_image_url} placeholder="Foto" alt="" />
      </div>
      <div className="room-tile__caption">
        <div className="room-tile__text">
          <h3 className="room-tile__name">{category.name}</h3>
          {category.tagline && <p className="room-tile__tagline">{category.tagline}</p>}
        </div>
        <div className="room-tile__meta">
          {count > 0 && <span className="room-tile__count">{count} {count === 1 ? 'produkt' : 'produkte'}</span>}
          <span className="room-tile__arrow"><Icon name="arrow" /></span>
        </div>
      </div>
    </Link>
  );
}
