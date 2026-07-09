import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Key, Phone, Mail, Check, MapPin } from 'lucide-react';
import { amenityIcons } from '../utils/constants';
import DecryptedText from './DecryptedText';

const amenityNames = {
  wifi: 'Wi-Fi Included',
  food: 'Wholesome Food',
  ac: 'Air Conditioning',
  gym: 'Shared Gym',
  laundry: 'Laundry Service',
  backup: 'Power Backup',
  security: '24/7 Security Patrol',
  parking: 'Bike/Car Parking'
};

const LaurelWreath = () => (
  <svg viewBox="0 0 24 24" className="rating-wreath" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ height: '48px', width: '48px' }}>
    <path d="M4 4c2.5 2 4.5 6 4.5 10s-2 8-4.5 10M8.5 7.5c2 1 3.5 3 3.5 4.5M8.5 11c2 1 3.5 3 3.5 5.5M8 14.5c2 1 3.5 3 3.5 5.5M8.5 4c1.5.5 2.5 1.5 2.5 2.5" strokeLinecap="round"/>
  </svg>
);

export default function PGDetailsModal({ 
  pg, 
  onClose,
  unlockedPGIds = [],
  unlockedContacts = {},
  onUnlockPG,
  userCredits = 0
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const modalRef = useRef(null);

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

  const toggleWishlist = () => {
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

  // Focus trap & Escape close for accessibility
  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll(
            'button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pg.id, unlockedPGIds]);

  // Accordion Disclosure States
  const [isOpenDescription, setIsOpenDescription] = useState(true);
  const [isOpenAmenities, setIsOpenAmenities] = useState(true);
  const [isOpenPricing, setIsOpenPricing] = useState(false);

  // Reservation Form states
  const [activeSharing, setActiveSharing] = useState(
    pg.sharing && Object.keys(pg.sharing).includes('double') 
      ? 'double' 
      : (pg.sharing ? Object.keys(pg.sharing)[0] || 'single' : 'single')
  );
  const [guestsCount, setGuestsCount] = useState(1);

  if (!pg) return null;

  const images = pg.images || [];
  const isUnlocked = unlockedPGIds.includes(pg.id);
  const contacts = unlockedContacts[pg.id] || {};

  const handleNextImage = () => {
    if (images.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const handlePrevImage = () => {
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

  // Get active price based on sharing option selected
  const activePrice = pg.sharing && pg.sharing[activeSharing] ? pg.sharing[activeSharing] : pg.price;
  

  const getWhatsAppLink = () => {
    const phoneNumber = isUnlocked ? (contacts.whatsapp || contacts.phone || pg.contactPhone) : (pg.contactWhatsapp || pg.contactPhone || '');
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hi, I would like to book a reservation for "${pg.name}" (${activeSharing} sharing) in ${pg.locality}.`);
    return `https://wa.me/${cleanNumber.startsWith('91') ? cleanNumber : '91' + cleanNumber}?text=${message}`;
  };

  // Masking helpers for NoBroker locked state
  const maskPhone = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean.length > 5) {
      return clean.substring(0, clean.length - 5) + 'XXXXX';
    }
    return 'XXXXX XXXXX';
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length < 2) return 'xxxxx@xxxxx.com';
    return parts[0].substring(0, Math.min(parts[0].length, 3)) + 'xxxx@' + parts[1];
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} role="dialog" aria-modal="true">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close details">
          <X size={18} />
        </button>

        {/* Aspect Ratio Image banner */}
        <div className="modal-gallery">
          {images.length > 0 ? (
            <>
              <img 
                src={images[activeImageIndex]} 
                alt={`${pg.name} view`} 
                className="modal-gallery-img"
              />
              {images.length > 1 && (
                <>
                  <button className="image-nav-btn prev" onClick={handlePrevImage} aria-label="Previous image">
                    <span>❮</span>
                  </button>
                  <button className="image-nav-btn next" onClick={handleNextImage} aria-label="Next image">
                    <span>❯</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-muted)' }}>
              No images uploaded
            </div>
          )}
        </div>

        <div className="modal-body">
          {/* Header Title block */}
          <div className="modal-header">
            <h2 className="display-lg" style={{ fontSize: '26px', fontWeight: 600, color: 'var(--colors-ink)', marginBottom: '8px' }}>
              {pg.name}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '14px', color: 'var(--colors-muted)' }}>
              <span>{pg.locality}, Bangalore</span>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="modal-layout-grid">
            {/* Left Column: Disclosures */}
            <div style={{ width: '100%' }}>

              {/* Accordions */}
              <div className="disclosure-container">
                {/* Description */}
                <div>
                  <button 
                    className="disclosure-row" 
                    onClick={() => setIsOpenDescription(!isOpenDescription)}
                    aria-expanded={isOpenDescription}
                    aria-controls="details-description"
                  >
                    <span>Description</span>
                    <span>{isOpenDescription ? '▲' : '▼'}</span>
                  </button>
                  {isOpenDescription && (
                    <div className="disclosure-content" id="details-description">
                      <p className="body-md">{pg.description}</p>
                    </div>
                  )}
                </div>

                {/* Amenities */}
                <div>
                  <button 
                    className="disclosure-row" 
                    onClick={() => setIsOpenAmenities(!isOpenAmenities)}
                    aria-expanded={isOpenAmenities}
                    aria-controls="details-amenities"
                  >
                    <span>What this place offers</span>
                    <span>{isOpenAmenities ? '▲' : '▼'}</span>
                  </button>
                  {isOpenAmenities && (
                    <div className="disclosure-content" id="details-amenities">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%' }}>
                        {pg.amenities && pg.amenities.map(amenity => {
                          const IconComponent = amenityIcons[amenity]?.icon;
                          return (
                            <div key={amenity} style={{ fontSize: '14.5px', color: 'var(--colors-body)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', color: 'var(--colors-primary)' }} aria-hidden="true">
                                {IconComponent ? <IconComponent size={16} /> : <Check size={16} />}
                              </span>
                              <span>{amenityNames[amenity] || amenity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sharing Pricing info */}
                {pg.sharing && Object.keys(pg.sharing).length > 0 && (
                  <div>
                    <button 
                      className="disclosure-row" 
                      onClick={() => setIsOpenPricing(!isOpenPricing)}
                      aria-expanded={isOpenPricing}
                      aria-controls="details-pricing"
                    >
                      <span>Room Sharing Options</span>
                      <span>{isOpenPricing ? '▲' : '▼'}</span>
                    </button>
                    {isOpenPricing && (
                      <div className="disclosure-content" id="details-pricing">
                        <table className="modal-pricing-table-semantic" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                          <tbody>
                            {Object.entries(pg.sharing).map(([key, val]) => (
                              <tr key={key} style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                                <td style={{ padding: '8px 0', textAlign: 'left', textTransform: 'capitalize', color: 'var(--colors-body)' }}>{key} Sharing Room</td>
                                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>{formatPrice(val)} / mo</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sticky Reservation Card */}
            <div>
              <div className="reservation-card">
                <div className="reservation-price-row">
                  <div>
                    <span style={{ fontSize: '22px', fontWeight: 700 }}>{formatPrice(activePrice)}</span>
                    <span style={{ fontSize: '14px', color: 'var(--colors-muted)', fontWeight: 400 }}> / month</span>
                  </div>
                  <div className="pg-gender-pill unisex" style={{ display: 'none' }}></div>
                  <span className={`pg-gender-pill ${pg.gender}`}>
                    {pg.gender === 'unisex' ? 'Coliving' : pg.gender}
                  </span>
                </div>

                {/* Date & Guest Input boxes */}
                <div className="reservation-picker-box" style={{ width: '100%' }}>
                  <div className="reservation-picker-row" style={{ width: '100%' }}>
                    <div className="reservation-picker-cell">
                      <span className="reservation-picker-label">Sharing</span>
                      <select 
                        className="reservation-picker-value"
                        value={activeSharing}
                        onChange={e => setActiveSharing(e.target.value)}
                      >
                        {pg.sharing && Object.keys(pg.sharing).map(key => (
                          <option key={key} value={key} style={{ textTransform: 'capitalize' }}>
                            {key} Sharing
                          </option>
                        ))}
                        {!pg.sharing && <option value="single">Single Sharing</option>}
                      </select>
                    </div>

                    <div className="reservation-picker-cell">
                      <span className="reservation-picker-label">Guests</span>
                      <select 
                        className="reservation-picker-value"
                        value={guestsCount}
                        onChange={e => setGuestsCount(Number(e.target.value))}
                      >
                        <option value="1">1 Person</option>
                        <option value="2">2 People</option>
                        <option value="3">3 People</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="reservation-picker-cell" style={{ borderBottom: 'none', width: '100%' }}>
                    <span className="reservation-picker-label">Availability Check</span>
                    <span className="reservation-picker-value" style={{ fontWeight: 500, color: 'var(--colors-ink)', marginTop: '2px' }}>
                      Immediate Occupancy
                    </span>
                  </div>
                </div>

                {/* NoBroker Contact details block inside Reservation Card */}
                <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', marginTop: '4px', width: '100%' }}>
                  <span className="caption-sm" style={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                    Owner Contact details
                  </span>
                  
                  {isUnlocked ? (
                    <div className="reveal-animation" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', width: '100%', textAlign: 'left', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} style={{ color: 'var(--colors-accent-blue)' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>Phone: </span>
                          <a href={`tel:${contacts.phone || pg.contactPhone}`} style={{ fontWeight: 600, color: 'var(--colors-accent-blue)', display: 'inline-block' }}>
                            <DecryptedText
                              text={contacts.phone || pg.contactPhone}
                              animateOn="view"
                              speed={35}
                              maxIterations={12}
                              sequential={true}
                              characters="0123456789*#+!?$"
                            />
                          </a>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={14} style={{ color: '#16a34a' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>WhatsApp: </span>
                          <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#16a34a', display: 'inline-block' }}>
                            <DecryptedText
                              text={contacts.whatsapp || contacts.phone || pg.contactPhone}
                              animateOn="view"
                              speed={35}
                              maxIterations={12}
                              sequential={true}
                              characters="0123456789*#+!?$"
                            />
                          </a>
                        </div>
                      </div>
                      {(contacts.email || pg.contactEmail) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={14} style={{ color: 'var(--colors-accent-blue)' }} />
                          <div>
                            <span style={{ color: 'var(--colors-muted)' }}>Email: </span>
                            <a href={`mailto:${contacts.email || pg.contactEmail}`} style={{ color: 'var(--colors-ink)', fontWeight: 500, display: 'inline-block' }}>
                              <DecryptedText
                                text={contacts.email || pg.contactEmail}
                                animateOn="view"
                                speed={25}
                                maxIterations={10}
                                sequential={true}
                              />
                            </a>
                          </div>
                        </div>
                      )}
                      {contacts.googleMapsUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MapPin size={14} style={{ color: 'var(--colors-primary)' }} />
                          <div>
                            <span style={{ color: 'var(--colors-muted)' }}>Location: </span>
                            <a 
                              href={contacts.googleMapsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ color: 'var(--colors-primary)', fontWeight: 700, textDecoration: 'underline', display: 'inline-block' }}
                            >
                              Navigate on Google Maps ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', width: '100%', textAlign: 'left', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} style={{ color: 'var(--colors-muted)' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>Phone: </span>
                          <span style={{ fontWeight: 600, filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: 'var(--rounded-sm)' }}>
                            {maskPhone(pg.contactPhone)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={14} style={{ color: 'var(--colors-muted)' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>WhatsApp: </span>
                          <span style={{ filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: 'var(--rounded-sm)' }}>
                            {maskPhone(pg.contactWhatsapp || pg.contactPhone)}
                          </span>
                        </div>
                      </div>
                      {pg.contactEmail && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={14} style={{ color: 'var(--colors-muted)' }} />
                          <div>
                            <span style={{ color: 'var(--colors-muted)' }}>Email: </span>
                            <span style={{ filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: 'var(--rounded-sm)' }}>
                              {maskEmail(pg.contactEmail)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} style={{ color: 'var(--colors-muted)' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>Exact Location: </span>
                          <span style={{ filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: 'var(--rounded-sm)' }}>
                            https://maps.google.com/xxxxxx
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isUnlocked ? (
                  <>
                    <a 
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ width: '100%', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px' }}
                    >
                      <MessageSquare size={16} />
                      Reserve via WhatsApp
                    </a>
                    
                    <a 
                      href={`tel:${contacts.phone || pg.contactPhone}`}
                      className="btn btn-secondary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', marginTop: '8px', border: '1.5px solid var(--colors-ink)', fontWeight: 700 }}
                    >
                      <Phone size={16} />
                      Call Property Owner
                    </a>

                    <button
                      onClick={toggleWishlist}
                      className="btn btn-secondary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', marginTop: '8px', border: '1.5px solid var(--colors-ink)', fontWeight: 700 }}
                    >
                      <span>{isSaved ? '♥ Saved in List' : '♡ Save to List'}</span>
                    </button>
                    
                    <p className="body-sm" style={{ textAlign: 'center', marginTop: '6px', color: 'var(--colors-muted)' }}>
                      Connects directly to Owner. No middleman.
                    </p>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => onUnlockPG(pg.id)}
                      className="btn btn-primary"
                      style={{ width: '100%', display: 'flex', gap: '6px' }}
                    >
                      <Key size={16} />
                      <span>Unlock Contacts (1 Credit)</span>
                    </button>
                    <p className="body-sm" style={{ textAlign: 'center', marginTop: '4px', color: 'var(--colors-primary)', fontWeight: 600 }}>
                      You have {userCredits} credits remaining.
                    </p>
                  </>
                )}

                {/* Semantic Table Pricing Breakdown */}
                <table className="fee-breakdown-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '13.5px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                      <td style={{ padding: '8px 0', textAlign: 'left', color: 'var(--colors-muted)' }}>Monthly Rent ({activeSharing})</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>{formatPrice(activePrice)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                      <td style={{ padding: '8px 0', textAlign: 'left', color: 'var(--colors-muted)' }}>Security Deposit</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: pg.deposit ? 'var(--colors-ink)' : '#16a34a' }}>
                        {pg.deposit ? formatPrice(pg.deposit) : 'Zero Deposit'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
