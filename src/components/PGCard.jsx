import { useState } from 'react';
import { ChevronLeft, ChevronRight, Shield, Heart } from 'lucide-react';
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewDetails(pg);
    }
  };

  return (
    <article 
      className="pg-card-redesign" 
      onClick={() => onViewDetails(pg)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${pg.name} in ${pg.locality}`}
    >
      <style>{`
        .pg-card-redesign {
          background-color: var(--colors-surface-card);
          border: 1px solid var(--colors-hairline);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          text-align: left;
        }

        .pg-card-redesign:hover {
          transform: translateY(-5px);
          border-color: var(--colors-primary);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.06);
        }

        .pg-card-redesign:hover .pg-img-flat {
          transform: scale(1.05);
        }

        .pg-image-container-flat {
          position: relative;
          width: 100%;
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          background-color: var(--colors-surface-soft);
          border: 1px solid var(--colors-hairline-soft);
        }

        .pg-img-flat {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .wishlist-heart-btn-custom {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: 1px solid rgba(0, 0, 0, 0.05);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
        }

        .wishlist-heart-btn-custom:hover {
          transform: scale(1.1);
          background-color: #ffffff;
        }

        .wishlist-heart-btn-custom:active {
          transform: scale(0.9);
        }

        .image-nav-btn-custom {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.05);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .pg-card-redesign:hover .image-nav-btn-custom {
          opacity: 1;
        }

        .image-nav-btn-custom.prev {
          left: 8px;
        }

        .image-nav-btn-custom.next {
          right: 8px;
        }

        .image-nav-btn-custom:hover {
          background-color: #ffffff;
          transform: translateY(-50%) scale(1.05);
        }

        .pg-image-counter-custom {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background-color: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          z-index: 10;
        }

        .rating-badge-custom {
          position: absolute;
          top: 10px;
          left: 10px;
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(0, 0, 0, 0.05);
          padding: 3px 8px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 10;
        }
      `}</style>

      {/* Image Slider Section */}
      <div className="pg-image-container-flat">
        {!imageLoaded && images.length > 0 && (
          <div className="shimmer-skeleton" style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
        )}
        
        {images.length > 0 ? (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img 
              src={images[activeImageIndex]}
              alt={`${pg.name} co-living room in ${pg.locality}, Bangalore`}
              onLoad={() => setImageLoaded(true)}
              className="pg-img-flat"
              loading="lazy"
            />
            


            {/* Wishlist Heart Button */}
            <button 
              className="wishlist-heart-btn-custom"
              onClick={toggleWishlist}
              aria-label="Save listing"
            >
              <Heart 
                size={16} 
                fill={isSaved ? "var(--colors-accent-red)" : "none"} 
                color={isSaved ? "var(--colors-accent-red)" : "#475569"} 
              />
            </button>

            {/* Image Slider Counters */}
            {images.length > 1 && (
              <div className="pg-image-counter-custom">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button className="image-nav-btn-custom prev" onClick={handlePrevImage} aria-label="Previous image">
                  <ChevronLeft size={14} color="#1e293b" />
                </button>
                <button className="image-nav-btn-custom next" onClick={handleNextImage} aria-label="Next image">
                  <ChevronRight size={14} color="#1e293b" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-muted)', fontSize: '13px' }}>
            No images uploaded
          </div>
        )}
      </div>

      {/* Info Section */}
      <div style={{ padding: '12px 4px 4px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Locality & Verification tags */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--colors-primary)' }}>
            {pg.locality} • {pg.gender === 'unisex' ? 'Coliving' : pg.gender === 'boys' ? 'Gents' : 'Ladies'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>
            <span style={{ width: '4px', height: '4px', backgroundColor: '#16a34a', borderRadius: '50%', display: 'inline-block' }} />
            Verified
          </span>
        </div>

        {/* Title */}
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          color: 'var(--colors-ink)', 
          margin: '2px 0 4px 0', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          filter: isUnlocked ? 'none' : 'blur(4.5px)',
          transition: 'filter 0.3s ease'
        }}>
          {pg.name}
        </h3>

        {/* Contact Status banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', margin: '2px 0' }}>
          {isUnlocked ? (
            <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={12} /> Contact Details Unlocked
            </span>
          ) : (
            <span style={{ color: 'var(--colors-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Owner: <span style={{ filter: 'blur(3.5px)', userSelect: 'none', fontSize: '11px', fontFamily: 'monospace' }}>+91 988•• •••••</span>
              <span style={{ color: 'var(--colors-primary)', fontWeight: 600, fontSize: '10px', marginLeft: '4px', border: '1px dashed var(--colors-primary)', padding: '1px 4px', borderRadius: '4px' }}>
                Unlock
              </span>
            </span>
          )}
        </div>

        {/* Specs Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px', 
          fontSize: '12px', 
          color: 'var(--colors-body)', 
          padding: '10px 0', 
          borderTop: '1px solid var(--colors-hairline-soft)',
          borderBottom: '1px solid var(--colors-hairline-soft)',
          margin: '6px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--colors-muted)', fontSize: '11px', fontWeight: 600 }}>Type:</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: 'var(--colors-ink)', fontWeight: 600 }}>{pg.furnishing || 'Semi Furnished'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--colors-muted)', fontSize: '10px', fontWeight: 500 }}>Date:</span>
            <span style={{ fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 500 }}>{pg.availableFrom || 'Immediate'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--colors-muted)', fontSize: '10px', fontWeight: 500 }}>Sec. Dep:</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 500 }}>
              {(() => {
                let val = 0;
                if (pg.sharingDeposit && Object.keys(pg.sharingDeposit).length > 0) {
                  const values = Object.values(pg.sharingDeposit).filter(v => typeof v === 'number');
                  if (values.length > 0) val = Math.min(...values);
                }
                if (val === 0 && pg.deposit) val = pg.deposit;
                return val > 0 ? formatPrice(val) : 'Zero';
              })()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--colors-muted)', fontSize: '11px', fontWeight: 600 }}>Rent:</span>
            <span style={{ fontWeight: 800, color: 'var(--colors-primary)', fontSize: '15px' }}>{formatPrice(pg.price)}</span>
          </div>
        </div>

        {/* Footer info (Updated date & amenities icons list) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 500 }}>
            {(() => {
              if (!pg.createdAt) return 'Updated recently';
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
                      width: '22px',
                      height: '22px',
                      backgroundColor: 'var(--colors-surface-soft)', 
                      color: 'var(--colors-body)', 
                      borderRadius: '50%',
                      border: '1px solid var(--colors-hairline)'
                    }}
                    title={amenityIcons[amenity]?.label || amenity}
                  >
                    {IconComponent ? <IconComponent size={11} /> : '✓'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
