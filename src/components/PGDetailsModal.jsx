import React, { useState } from 'react';
import { X, MessageSquare, Key, Phone, Mail } from 'lucide-react';

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
  
  // Fee Breakdown calculations
  const maintenanceFee = 500;
  const serviceFee = 250;
  const totalPricing = activePrice + maintenanceFee + serviceFee;

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
              <span className="caption" style={{ color: 'var(--colors-primary)' }}>★ {pg.ratingValue || '4.85'}</span>
              <span>•</span>
              <span style={{ textDecoration: 'underline', fontWeight: 500, color: 'var(--colors-ink)' }}>{pg.reviewCount || '84'} reviews</span>
              <span>•</span>
              <span>{pg.locality}, Bangalore</span>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="modal-layout-grid">
            {/* Left Column: Wreath Rating & Disclosures */}
            <div style={{ width: '100%' }}>
              
              {/* Laurel Wreath Card */}
              <div className="rating-display-card">
                <div className="rating-display-header">
                  <LaurelWreath />
                  <span className="rating-display-number">{pg.ratingValue || '4.85'}</span>
                  <div className="rating-wreath rating-wreath-flipped" style={{ display: 'block', height: '48px', width: '48px' }}>
                    <LaurelWreath />
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '12px' }}>Guest favorite</div>
                <div className="body-sm" style={{ marginTop: '4px', maxWidth: '300px' }}>
                  One of the most loved PGs on PG wala, based on ratings, reviews, and reliability.
                </div>
              </div>

              {/* Accordions */}
              <div className="disclosure-container">
                {/* Description */}
                <div>
                  <button className="disclosure-row" onClick={() => setIsOpenDescription(!isOpenDescription)}>
                    <span>Description</span>
                    <span>{isOpenDescription ? '▲' : '▼'}</span>
                  </button>
                  {isOpenDescription && (
                    <div className="disclosure-content">
                      <p className="body-md">{pg.description}</p>
                      <p className="body-sm" style={{ marginTop: '12px' }}><strong>Address:</strong> {pg.address}</p>
                    </div>
                  )}
                </div>

                {/* Amenities */}
                <div>
                  <button className="disclosure-row" onClick={() => setIsOpenAmenities(!isOpenAmenities)}>
                    <span>What this place offers</span>
                    <span>{isOpenAmenities ? '▲' : '▼'}</span>
                  </button>
                  {isOpenAmenities && (
                    <div className="disclosure-content">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%' }}>
                        {pg.amenities && pg.amenities.map(amenity => (
                          <div key={amenity} style={{ fontSize: '14.5px', color: 'var(--colors-body)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--colors-accent-blue)', display: 'inline-block' }}></span>
                            <span>{amenityNames[amenity] || amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sharing Pricing info */}
                {pg.sharing && Object.keys(pg.sharing).length > 0 && (
                  <div>
                    <button className="disclosure-row" onClick={() => setIsOpenPricing(!isOpenPricing)}>
                      <span>Room Sharing Options</span>
                      <span>{isOpenPricing ? '▲' : '▼'}</span>
                    </button>
                    {isOpenPricing && (
                      <div className="disclosure-content">
                        <div className="modal-pricing-table" style={{ width: '100%' }}>
                          {Object.entries(pg.sharing).map(([key, val]) => (
                            <div className="modal-pricing-row" key={key} style={{ width: '100%' }}>
                              <span style={{ textTransform: 'capitalize' }}>{key} Sharing Room</span>
                              <strong>{formatPrice(val)} / mo</strong>
                            </div>
                          ))}
                        </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', width: '100%', textAlign: 'left', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} style={{ color: 'var(--colors-accent-blue)' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>Phone: </span>
                          <a href={`tel:${contacts.phone || pg.contactPhone}`} style={{ fontWeight: 600, color: 'var(--colors-accent-blue)' }}>
                            {contacts.phone || pg.contactPhone}
                          </a>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', display: 'inline-flex', width: '14px', justifyContent: 'center' }}>💬</span>
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>WhatsApp: </span>
                          <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#16a34a' }}>
                            {contacts.whatsapp || contacts.phone || pg.contactPhone}
                          </a>
                        </div>
                      </div>
                      {(contacts.email || pg.contactEmail) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={14} style={{ color: 'var(--colors-accent-blue)' }} />
                          <div>
                            <span style={{ color: 'var(--colors-muted)' }}>Email: </span>
                            <a href={`mailto:${contacts.email || pg.contactEmail}`} style={{ color: 'var(--colors-ink)', fontWeight: 500 }}>
                              {contacts.email || pg.contactEmail}
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
                          <span style={{ fontWeight: 600, filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: '4px' }}>
                            {maskPhone(pg.contactPhone)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', display: 'inline-flex', width: '14px', justifyContent: 'center' }}>💬</span>
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>WhatsApp: </span>
                          <span style={{ filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: '4px' }}>
                            {maskPhone(pg.contactWhatsapp || pg.contactPhone)}
                          </span>
                        </div>
                      </div>
                      {pg.contactEmail && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={14} style={{ color: 'var(--colors-muted)' }} />
                          <div>
                            <span style={{ color: 'var(--colors-muted)' }}>Email: </span>
                            <span style={{ filter: 'blur(3.5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: '4px' }}>
                              {maskEmail(pg.contactEmail)}
                            </span>
                          </div>
                        </div>
                      )}
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
                      style={{ width: '100%', textDecoration: 'none' }}
                    >
                      <MessageSquare size={16} style={{ marginRight: '4px' }} />
                      Reserve via WhatsApp
                    </a>
                    <p className="body-sm" style={{ textAlign: 'center', marginTop: '4px' }}>
                      Connects directly to Owner.
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

                {/* Fee Breakdowns */}
                <div className="fee-breakdown-stack" style={{ width: '100%' }}>
                  <div className="fee-row" style={{ width: '100%' }}>
                    <span style={{ textDecoration: 'underline' }}>Monthly Rent ({activeSharing})</span>
                    <span>{formatPrice(activePrice)}</span>
                  </div>
                  <div className="fee-row" style={{ width: '100%' }}>
                    <span style={{ textDecoration: 'underline' }}>Maintenance Charges</span>
                    <span>{formatPrice(maintenanceFee)}</span>
                  </div>
                  <div className="fee-row" style={{ width: '100%' }}>
                    <span style={{ textDecoration: 'underline' }}>Service & Booking Fee</span>
                    <span>{formatPrice(serviceFee)}</span>
                  </div>
                  
                  <div className="fee-row fee-row-total" style={{ width: '100%' }}>
                    <span>Total due monthly</span>
                    <span>{formatPrice(totalPricing)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
