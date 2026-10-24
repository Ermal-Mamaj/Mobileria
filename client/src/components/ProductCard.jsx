import { Link } from 'react-router-dom';
import ImageSlot from './ImageSlot.jsx';
import PriceTag from './PriceTag.jsx';
import Icon from './Icon.jsx';
import { isOnSale } from '../lib/price.js';
import './ProductCard.css';

// A product as it sits in a grid or carousel. Pass `to` to make it a link
// (Home → the product's room), or `onOpen` to make it a button (a room page
// opens the product's photos in place).
export default function ProductCard({ product, to, onOpen, showRoom = false, photoCount = 0, className = '' }) {
  const badge = isOnSale(product) ? 'Zbritje' : product.badge;
  const body = (
    <>
      <div className="product-card__image" data-cursor="Shiko">
        <ImageSlot src={product.image_url} placeholder="Foto" alt={product.name} />
        {badge && <span className={`product-card__badge ${isOnSale(product) ? 'is-sale' : ''}`}>{badge}</span>}
        {photoCount > 1 && (
          <span className="product-card__count">
            <Icon name="photos" /> {photoCount}
          </span>
        )}
      </div>
      <div className="product-card__body">
        {showRoom && product.category_name && <p className="product-card__room">{product.category_name}</p>}
        <h3 className="product-card__name">{product.name}</h3>
        {product.material && <p className="product-card__material">{product.material}</p>}
        <PriceTag product={product} className="product-card__price" />
      </div>
    </>
  );

  if (to) {
    return <Link to={to} className={`product-card ${className}`}>{body}</Link>;
  }
  return (
    <button type="button" className={`product-card ${className}`} onClick={onOpen}>
      {body}
    </button>
  );
}
