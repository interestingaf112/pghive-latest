import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import TiltedCard from './TiltedCard';
import { amenityIcons } from '../utils/constants';

export default function PGCard({ pg, onViewDetails, isUnlocked }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [prevActiveImageIndex, setPrevActiveImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const [prevPgId, setPrevPgId] = useState(pg.id);
  const [isSaved, setIsSaved] = useState(() => {
    const savedList = JSON.parse(localStorage.getItem('wishlist_pgs') || '[]');
    return savedList.includes(pg.id);
  });

  // Adjust state during render when props change
  if (pg.id !== prevPgId) {
    setPrevPgId(pg.id);
    const savedList = JSON.parse(localStorage.getItem('wishlist_pgs') || '[]');
    setIsSaved(savedList.includes(pg.id));
  }

  if (activeImageIndex !== prevActiveImageIndex) {
    setPrevActiveImageIndex(activeImageIndex);
    setImageLoaded(false);
  }

  const toggleWishlist = (e) => {
    e.stopPropagation();
    const savedList = JSON.parse(localStorage.getItem('wishlist_pgs') || '[]');
    let newList;
    if (isSaved) {
      newList = savedList.filter(id => id !== pg.id);
    } else {
      newList = [...savedList, pg.id];
    }
    localStorage.setItem('wishlist_pgs', JSON.stringify(newList));
    setIsSaved(!isSaved);
  };

  const images = pg.images || [];

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (images.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (images.length > 1) {
      setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const formatPrice = (price) => {
    const val = Number(price || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Mock static ratings and review counts based on pricing/locality
  const ratingValue = (pg.price || 0) % 3 === 0 ? '4.91' : ((pg.price || 0) % 2 === 0 ? '4.86' : '4.78');
  const reviewCount = (pg.price || 0) % 3 === 0 ? '128' : ((pg.price || 0) % 2 === 0 ? '84' : '42');
  const isGuestFavorite = Number(ratingValue) >= 4.85;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewDetails({ ...pg, ratingValue, reviewCount });
    }
  };

  return (
    <div 
      className="pg-card" 
      onClick={() => onViewDetails({ ...pg, ratingValue, reviewCount })}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${pg.name} in ${pg.locality}`}
    >
      <div className="pg-image-container" style={{ overflow: 'visible', border: 'none', background: 'none', boxShadow: 'none', position: 'relative' }}>
        {!imageLoaded && images.length > 0 && (
          <div className="shimmer-skeleton" style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: '12px' }} />
        )}
        {images.length > 0 ? (
          <TiltedCard
            imageSrc={images[activeImageIndex]}
            altText={`${pg.name} room`}
            containerHeight="220px"
            containerWidth="100%"
            imageHeight="220px"
            imageWidth="100%"
            scaleOnHover={1.05}
            rotateAmplitude={12}
            showMobileWarning={false}
            showTooltip={false}
            displayOverlayContent={true}
            onLoad={() => setImageLoaded(true)}
            overlayContent={
              <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
                {/* Floating Guest Favorite tag */}
                {isGuestFavorite && (
                  <div className="guest-favorite-badge" style={{ pointerEvents: 'auto', zIndex: 10 }}>
                    <span className="badge" style={{ fontSize: '11px', fontWeight: 700 }}>GUEST FAVORITE</span>
                  </div>
                )}

                {/* Floating Price Tag directly on image */}
                <div className="pg-price-tag-overlay" style={{ pointerEvents: 'auto', zIndex: 10 }}>
                  <span className="price-val">{formatPrice(pg.price)}</span>
                  <span className="price-sub">/mo</span>
                </div>

                {/* Floating wishlist heart save button */}
                <button 
                  className={`wishlist-heart-btn ${isSaved ? 'active' : ''}`}
                  onClick={toggleWishlist}
                  aria-label="Save listing"
                  style={{ pointerEvents: 'auto', zIndex: 15 }}
                >
                  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', height: '20px', width: '20px', fill: isSaved ? 'var(--colors-accent-red)' : 'rgba(0, 0, 0, 0.4)', stroke: '#ffffff', strokeWidth: 2 }}>
                    <path d="m16 28c7-4.733 14-10 14-17 0-4.417-3.583-8-8-8-2.6 0-4.883 1.25-6.3 3.167-1.417-1.917-3.7-3.167-6.3-3.167-4.417 0-8 3.583-8 8 0 7 7 12.267 14 17z" />
                  </svg>
                </button>

                {/* Active Image Indicator Pill Counter */}
                {images.length > 1 && (
                  <div className="pg-image-counter" style={{ pointerEvents: 'auto', zIndex: 10 }}>
                    <span>{activeImageIndex + 1} / {images.length}</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button className="image-nav-btn prev" onClick={handlePrevImage} aria-label="Previous image" style={{ pointerEvents: 'auto', zIndex: 20 }}>
                      <ChevronLeft size={14} color="#222222" />
                    </button>
                    <button className="image-nav-btn next" onClick={handleNextImage} aria-label="Next image" style={{ pointerEvents: 'auto', zIndex: 20 }}>
                      <ChevronRight size={14} color="#222222" />
                    </button>
                  </>
                )}
              </div>
            }
          />
        ) : (
          <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-muted)', fontSize: '13px', border: '1px solid var(--colors-hairline-soft)', borderRadius: '12px', backgroundColor: 'var(--colors-surface-soft)' }}>
            No images uploaded
          </div>
        )}
      </div>

      <div className="pg-card-info">
        <h3 className="pg-card-title" style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', margin: 0 }}>
          <span>{pg.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }} title="Verified Owner Direct Listing">
            <span className="verified-pulse-dot" style={{ marginRight: '2px' }} />
            Verified
          </span>
        </h3>
        
        {/* Blurred Contact Preview CTA */}
        <div style={{ marginTop: '6px', marginBottom: '6px', display: 'flex', alignItems: 'center', fontSize: '12px' }}>
          {isUnlocked ? (
            <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Direct Host Contact Unlocked
            </span>
          ) : (
            <span style={{ color: 'var(--colors-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Owner: <span style={{ filter: 'blur(3.5px)', userSelect: 'none', fontFamily: 'monospace' }}>+91 988•• •••••</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--colors-surface-soft)', padding: '2px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 600 }}>
                🔒 Unlock Details
              </span>
            </span>
          )}
        </div>

        <div className="pg-card-meta-row">
          <span className="meta-locality">{pg.locality}</span>
          <span className="meta-divider">·</span>
          <span className="meta-gender">
            {pg.gender === 'unisex' ? 'Coliving' : `${pg.gender}`}
          </span>
          <span className="meta-divider">·</span>
          <div className="meta-rating">
            <Star size={12} fill="currentColor" style={{ marginRight: '2px', color: 'var(--colors-star-rating)' }} />
            <span>{ratingValue}</span>
          </div>
        </div>

        <div className="pg-card-details-row" style={{ display: 'flex', gap: '6px', fontSize: '12px', color: 'var(--colors-body)', marginTop: '2px', fontWeight: 500 }}>
          <span>{pg.furnishing || 'Semi Furnished'}</span>
          <span style={{ color: 'var(--colors-hairline)' }}>•</span>
          <span>Available: {pg.availableFrom || 'Immediate'}</span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--colors-ink)', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Deposit:</span>
          {pg.deposit ? (
            <span style={{ color: '#16a34a' }}>{formatPrice(pg.deposit)}</span>
          ) : (
            <span style={{ color: '#16a34a', textTransform: 'uppercase', fontSize: '10.5px', fontWeight: 700 }}>Zero Deposit</span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '10px', width: '100%' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--colors-muted)', fontWeight: 600 }}>
            {(() => {
              if (!pg.createdAt) return 'Updated 2 days ago';
              const createdDate = new Date(pg.createdAt);
              const diffTime = Math.abs(new Date() - createdDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 1) return 'Updated today';
              if (diffDays === 2) return 'Updated yesterday';
              if (diffDays <= 7) return `Updated ${diffDays} days ago`;
              return 'Updated recently';
            })()}
          </span>
          {pg.amenities && pg.amenities.length > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {pg.amenities.slice(0, 3).map(amenity => {
                const IconComponent = amenityIcons[amenity]?.icon;
                return (
                  <span 
                    key={amenity} 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--colors-surface-soft)', 
                      color: 'var(--colors-body)', 
                      padding: '4px 6px', 
                      borderRadius: 'var(--rounded-sm)',
                      border: '1px solid var(--colors-hairline)'
                    }}
                    title={amenityIcons[amenity]?.label || amenity}
                  >
                    {IconComponent ? <IconComponent size={12} /> : '✓'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
