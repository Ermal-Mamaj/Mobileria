import './ImageSlot.css';

// `priority` marks the one image that's on screen at first paint — the hero.
// It must load eagerly: lazy-loading the largest visible element would delay
// the very thing the visitor is waiting for. Everything else (grid tiles,
// gallery, images further down the page) defers until it's near the viewport.
export default function ImageSlot({ src, placeholder = 'Foto', alt, className = '', dark = false, priority = false }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? placeholder}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={`image-slot image-slot--filled ${dark ? 'image-slot--filled-dark' : ''} ${className}`}
      />
    );
  }
  return (
    <div className={`image-slot image-slot--empty ${dark ? 'image-slot--dark' : ''} ${className}`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="image-slot__caption">{placeholder}</span>
    </div>
  );
}
