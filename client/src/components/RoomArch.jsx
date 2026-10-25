import { Link } from 'react-router-dom';
import ImageSlot from './ImageSlot.jsx';
import Icon from './Icon.jsx';
import { roomTone } from '../lib/brand.js';
import './RoomArch.css';

// One room of the showroom, framed in an arch — the circle of the Bella Casa
// logo — with a thin gold arch drawn just outside it, so any photo the owner
// uploads sits in the same shape. The room's wall colour (`index` is its
// place in the CMS list) fills the arch while the photo loads.
export default function RoomArch({ category, index, className = '' }) {
  const count = Number(category.product_count) || 0;
  return (
    <Link to={`/rooms/${category.slug}`} className={`room-arch tone-${roomTone(index)} ${className}`}>
      <div className="room-arch__frame" data-cursor="Hap">
        <span className="room-arch__line" aria-hidden="true" />
        <div className="room-arch__photo">
          <ImageSlot src={category.hero_image_url} placeholder="Foto" alt="" />
        </div>
      </div>
      <div className="room-arch__caption">
        <h3 className="room-arch__name">{category.name}</h3>
        {category.tagline && <p className="room-arch__tagline">{category.tagline}</p>}
        <span className="room-arch__meta">
          {count > 0 ? `${count} ${count === 1 ? 'produkt' : 'produkte'}` : 'Shiko ambientin'}
          <Icon name="arrow" />
        </span>
      </div>
    </Link>
  );
}
