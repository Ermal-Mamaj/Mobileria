import { formatPrice, isOnSale, discountPercent } from '../lib/price.js';
import './PriceTag.css';

export default function PriceTag({ product, className = '' }) {
  const price = formatPrice(product?.price);
  if (!price) return null;

  if (isOnSale(product)) {
    const salePrice = formatPrice(product.sale_price);
    const percent = discountPercent(product);
    return (
      <div className={`price-tag ${className}`}>
        <span className="price-tag__sale">{salePrice}</span>
        <span className="price-tag__original"><span className="sr-only">Më parë </span>{price}</span>
        <span className="price-tag__discount">-{percent}%</span>
      </div>
    );
  }

  return (
    <div className={`price-tag ${className}`}>
      <span className="price-tag__current">{price}</span>
    </div>
  );
}
