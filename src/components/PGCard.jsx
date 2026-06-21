import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export const amenityIcons = {
  wifi: { label: 'Wi-Fi', icon: () => '📶' },
  food: { label: 'Food', icon: () => '🍱' },
  ac: { label: 'AC', icon: () => '❄️' },
  gym: { label: 'Gym', icon: () => '🏋️' },
  laundry: { label: 'Laundry', icon: () => '🧺' },
  backup: { label: 'Power Backup', icon: () => '🔌' },
  security: { label: 'Security', icon: () => '🛡️' },
  parking: { label: 'Parking', icon: () => '🚗' }
};

export default function PGCard({ pg, onViewDetails }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Load wishlist state from localStorage
  useEffect(() => {
    const savedList = JSON.parse(localStorage.getItem('wishlist_pgs') || '[]');
    setIsSaved(savedList.includes(pg.id));
  }, [pg.id]);

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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Mock static ratings and review counts based on pricing/locality
  const ratingValue = pg.price % 3 === 0 ? '4.91' : (pg.price % 2 === 0 ? '4.86' : '4.78');
  const reviewCount = pg.price % 3 === 0 ? '128' : (pg.price % 2 === 0 ? '84' : '42');
  const isGuestFavorite = Number(ratingValue) >= 4.85;

  return (
    <div className="pg-card" onClick={() => onViewDetails({ ...pg, ratingValue, reviewCount })}>
      <div className="pg-image-container">
        {/* Floating Guest Favorite tag */}
        {isGuestFavorite && (
          <div className="guest-favorite-badge">
            <span className="badge" style={{ fontSize: '11px', fontWeight: 700 }}>GUEST FAVORITE</span>
          </div>
        )}

        {/* Floating Price Tag directly on image */}
        <div className="pg-price-tag-overlay">
          <span className="price-val">{formatPrice(pg.price)}</span>
          <span className="price-sub">/mo</span>
        </div>

        {/* Floating wishlist heart save button */}
        <button 
          className={`wishlist-heart-btn ${isSaved ? 'active' : ''}`}
          onClick={toggleWishlist}
          aria-label="Save listing"
        >
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', height: '20px', width: '20px', fill: isSaved ? 'var(--colors-accent-red)' : 'rgba(0, 0, 0, 0.4)', stroke: '#ffffff', strokeWidth: 2 }}>
            <path d="m16 28c7-4.733 14-10 14-17 0-4.417-3.583-8-8-8-2.6 0-4.883 1.25-6.3 3.167-1.417-1.917-3.7-3.167-6.3-3.167-4.417 0-8 3.583-8 8 0 7 7 12.267 14 17z" />
          </svg>
        </button>

        {images.length > 0 ? (
          <>
            <img 
              src={images[activeImageIndex]} 
              alt={`${pg.name} room`} 
              className="pg-img"
              loading="lazy"
            />
            {images.length > 1 && (
              <>
                <button className="image-nav-btn prev" onClick={handlePrevImage} aria-label="Previous image">
                  <ChevronLeft size={14} color="#222222" />
                </button>
                <button className="image-nav-btn next" onClick={handleNextImage} aria-label="Next image">
                  <ChevronRight size={14} color="#222222" />
                </button>
              </>
            )}
          </>
        ) : (
          <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-muted)', fontSize: '13px' }}>
            No images uploaded
          </div>
        )}
      </div>

      <div className="pg-card-info">
        <h3 className="pg-card-title" style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', margin: 0 }}>
          <span>{pg.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--colors-accent-blue)' }} title="Verified Owner Direct Listing">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </span>
        </h3>
        
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '6px', width: '100%' }}>
          <span style={{ fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 600 }}>
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
              {pg.amenities.slice(0, 3).map(amenity => (
                <span 
                  key={amenity} 
                  style={{ 
                    fontSize: '9px', 
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    backgroundColor: 'var(--colors-surface-soft)', 
                    color: 'var(--colors-body)', 
                    padding: '1px 5px', 
                    borderRadius: '2px',
                    border: '1px solid var(--colors-hairline)'
                  }}
                  title={amenityIcons[amenity]?.label || amenity}
                >
                  {amenityIcons[amenity]?.icon() || '✓'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
