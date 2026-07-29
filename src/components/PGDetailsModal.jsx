import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Key, Phone, Mail, Check, MapPin, Users, Calendar, Home } from 'lucide-react';
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

export default function PGDetailsModal({ 
  pg, 
  onClose,
  unlockedPGIds = [],
  unlockedContacts = {},
  onUnlockPG,
  userCredits = 0
}) {
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

  // Reservation Form states
  const [activeSharing, setActiveSharing] = useState(
    pg.sharing && Object.keys(pg.sharing).includes('double') 
      ? 'double' 
      : (pg.sharing ? Object.keys(pg.sharing)[0] || 'single' : 'single')
  );

  // Fullscreen Gallery States
  const [showFullscreenGallery, setShowFullscreenGallery] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  if (!pg) return null;

  const images = pg.images || [];
  const isUnlocked = unlockedPGIds.includes(pg.id);
  const contacts = unlockedContacts[pg.id] || {};

  const handleOpenFullscreen = (index) => {
    setFullscreenImageIndex(index);
    setShowFullscreenGallery(true);
  };

  const handleNextFullscreen = (e) => {
    e.stopPropagation();
    if (images.length > 1) {
      setFullscreenImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const handlePrevFullscreen = (e) => {
    e.stopPropagation();
    if (images.length > 1) {
      setFullscreenImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
  
  // Get active deposit based on sharing option selected
  const activeDeposit = pg.sharingDeposit && pg.sharingDeposit[activeSharing] ? pg.sharingDeposit[activeSharing] : (pg.deposit || 0);

  const getWhatsAppLink = () => {
    const phoneNumber = isUnlocked ? (contacts.whatsapp || contacts.phone || pg.contactPhone) : (pg.contactWhatsapp || pg.contactPhone || '');
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hi, I would like to book a reservation for "${pg.name}" (${activeSharing} sharing) in ${pg.locality}.`);
    return `https://wa.me/${cleanNumber.startsWith('91') ? cleanNumber : '91' + cleanNumber}?text=${message}`;
  };

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

  // Escape close for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showFullscreenGallery) {
          setShowFullscreenGallery(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showFullscreenGallery]);

  return (
    <div className="pg-details-page container animate-reveal" style={{ padding: '32px 16px', maxWidth: '1200px', margin: '0 auto', textAlign: 'left', minHeight: '80vh' }}>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb" style={{ fontSize: '13px', color: 'var(--colors-muted)', marginBottom: '24px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={onClose} className="nav-link-hover">Home</span>
        <span>/</span>
        <span>PG in Bangalore</span>
        <span>/</span>
        <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={onClose} className="nav-link-hover">PG in {pg.locality}</span>
        <span>/</span>
        <span style={{ color: 'var(--colors-ink)', fontWeight: 600 }}>{pg.name}</span>
      </div>

      {/* Top Banner Title & Quick Info (NoBroker Style) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '24px', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'var(--colors-surface-soft)', padding: '12px', borderRadius: '12px', border: '1px solid var(--colors-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={32} style={{ color: 'var(--colors-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--colors-ink)', margin: '0 0 6px 0', filter: isUnlocked ? 'none' : 'blur(5.5px)', transition: 'filter 0.35s ease' }}>
              {pg.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', color: 'var(--colors-muted)' }}>
              <MapPin size={14} style={{ color: 'var(--colors-primary)', flexShrink: 0 }} />
              <span>{pg.address || `${pg.locality}, Bangalore`}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--colors-ink)' }}>{formatPrice(activePrice)}</span>
            <span style={{ fontSize: '12px', color: 'var(--colors-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Monthly Rent</span>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--colors-hairline)', paddingLeft: '32px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--colors-ink)' }}>{formatPrice(activeDeposit)}</span>
            <span style={{ fontSize: '12px', color: 'var(--colors-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Deposit</span>
          </div>
          
          <div style={{ borderLeft: '1px solid var(--colors-hairline)', paddingLeft: '32px' }}>
            {isUnlocked ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, borderRadius: '8px' }}>
                  <MessageSquare size={18} />
                  <span>WhatsApp Owner</span>
                </a>
                {contacts.googleMapsUrl && (
                  <a href={contacts.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, borderRadius: '8px', border: '1.5px solid var(--colors-ink)' }}>
                    <MapPin size={18} style={{ color: 'var(--colors-primary)' }} />
                    <span>Show in Maps</span>
                  </a>
                )}
              </div>
            ) : (
              <button onClick={() => onUnlockPG(pg.id)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontWeight: 700, borderRadius: '8px' }}>
                <Key size={18} />
                <span>Get Owner Details</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Grid */}
      <div className="modal-layout-grid">
        {/* Left Column: Details */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Photo Gallery */}
          <div>
            {images.length > 0 ? (
              <div className={`bento-gallery count-${Math.min(images.length, 5)}`} style={{ borderRadius: '12px', overflow: 'hidden' }}>
                {/* Featured Image */}
                <div className="bento-img-container bento-main" onClick={() => handleOpenFullscreen(0)}>
                  <img 
                    src={images[0]} 
                    alt={`${pg.name} featured co-living space room view in ${pg.locality}, Bangalore`} 
                    className="bento-img"
                    loading="eager"
                  />
                </div>
                
                {/* Grid Thumbnails (images 1 to 4) */}
                {images.slice(1, 5).map((img, idx) => (
                  <div 
                    key={idx} 
                    className="bento-img-container bento-thumb" 
                    onClick={() => handleOpenFullscreen(idx + 1)}
                  >
                    <img 
                      src={img} 
                      alt={`${pg.name} co-living room interior view in ${pg.locality}, Bangalore`} 
                      className="bento-img"
                      loading="lazy"
                    />
                  </div>
                ))}

                {/* Floating Photo Count Badge */}
                {images.length > 1 && (
                  <button className="view-all-badge" onClick={() => handleOpenFullscreen(0)}>
                    <span>Photos:</span> {images.length}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-muted)', backgroundColor: 'var(--colors-surface-soft)', border: '1px solid var(--colors-hairline)', borderRadius: '12px' }}>
                No images uploaded
              </div>
            )}
          </div>

          {/* About description */}
          <div style={{ backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '10px' }}>
              About this co-living space
            </h3>
            <p className="body-md" style={{ lineHeight: '1.6', color: 'var(--colors-body)', margin: 0 }}>
              {pg.description}
            </p>
          </div>

          {/* Sharing options table */}
          {pg.sharing && Object.keys(pg.sharing).length > 0 && (
            <div style={{ backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '14px' }}>
                Room Sharing Options
              </h3>
              <div style={{ background: 'var(--colors-canvas-parchment)', border: '1px solid var(--colors-hairline)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="modal-pricing-table-semantic" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--colors-hairline)', background: 'var(--colors-surface-soft)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--colors-ink)' }}>Room Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--colors-ink)' }}>Monthly Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pg.sharing).map(([key, val]) => (
                      <tr key={key} style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'left', textTransform: 'capitalize', color: 'var(--colors-body)', fontWeight: 600 }}>{key} Sharing Room</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--colors-ink)' }}>{formatPrice(val)} / mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Amenities grid */}
          <div style={{ backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '14px' }}>
              What this place offers
            </h3>
            <div className="amenities-grid-custom">
              {pg.amenities && pg.amenities.map(amenity => {
                const IconComponent = amenityIcons[amenity]?.icon;
                return (
                  <div key={amenity} className="amenity-badge-card">
                    <span className="icon-wrap" aria-hidden="true">
                      {IconComponent ? <IconComponent size={18} /> : <Check size={18} />}
                    </span>
                    <span>{amenityNames[amenity] || amenity}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Key Specifications, Quick Unlock, Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Key Specs Card (NoBroker Style) */}
          <div style={{ backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '20px', borderBottom: '1px solid var(--colors-hairline-soft)', paddingBottom: '12px' }}>
              Property Specifications
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Preferred Tenant</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)', textTransform: 'capitalize' }}>
                  {pg.gender === 'unisex' ? 'Coliving' : pg.gender}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Posted On</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)' }}>
                  {pg.postedOn || 'Jul 20, 2026'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Parking Facility</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)' }}>
                  {pg.parking || 'Bike Parking'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Possession</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)' }}>
                  {pg.possession || 'Immediately'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Food Provided</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)' }}>
                  {pg.foodProvided || (pg.amenities?.includes('food') ? 'Yes (All Meals)' : 'Not Provided')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Gate Closing Time</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)' }}>
                  {pg.gateClosing || 'Not Provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Booking & Contact Card */}
          <div className="reservation-card" style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colors-muted)', textTransform: 'uppercase' }}>Select Sharing Room Option</span>
                <select 
                  className="form-input" 
                  style={{ marginTop: '6px', height: '40px', fontSize: '14px' }}
                  value={activeSharing}
                  onChange={e => setActiveSharing(e.target.value)}
                >
                  {pg.sharing && Object.keys(pg.sharing).map(key => (
                    <option key={key} value={key} style={{ textTransform: 'capitalize' }}>
                      {key} Sharing — {formatPrice(pg.sharing[key])}/mo
                    </option>
                  ))}
                  {!pg.sharing && <option value="single">Single Sharing</option>}
                </select>
              </div>

              <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', width: '100%' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '12px', color: 'var(--colors-muted)' }}>
                  Owner Contact details
                </span>
                
                {isUnlocked ? (
                  <div className="reveal-animation" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', width: '100%', textAlign: 'left', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Home size={14} style={{ color: 'var(--colors-primary)' }} />
                      <div>
                        <span style={{ color: 'var(--colors-muted)' }}>PG Name: </span>
                        <span style={{ fontWeight: 700, color: 'var(--colors-ink)', display: 'inline-block' }}>
                          <DecryptedText
                            text={pg.name}
                            animateOn="view"
                            speed={35}
                            maxIterations={12}
                            sequential={true}
                          />
                        </span>
                      </div>
                    </div>
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
                            <span style={{ filter: isUnlocked ? 'none' : 'blur(4px)' }}>
                              {contacts.email || pg.contactEmail}
                            </span>
                          </a>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} style={{ color: 'var(--colors-primary)' }} />
                      <div>
                        <span style={{ color: 'var(--colors-muted)' }}>Location: </span>
                        {contacts.googleMapsUrl ? (
                          <a href={contacts.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'var(--colors-primary)' }}>
                            Show in Google Maps
                          </a>
                        ) : (
                          <span style={{ color: 'var(--colors-muted)', fontWeight: 600 }}>Not Provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', padding: '12px', border: '1px dashed var(--colors-hairline)', borderRadius: '6px', backgroundColor: 'var(--colors-canvas-parchment)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', filter: 'blur(3.5px)', userSelect: 'none' }}>
                        <Phone size={14} />
                        <span>+91 99999 99999</span>
                      </div>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.75)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--colors-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Locked details</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--colors-muted)', opacity: 0.7, marginTop: '2px' }}>
                      <MapPin size={14} />
                      <span style={{ filter: 'blur(3.5px)', userSelect: 'none' }}>https://maps.google.com/xxxxxx</span>
                    </div>
                    
                    <button 
                      onClick={() => onUnlockPG(pg.id)}
                      className="btn btn-primary animate-hover" 
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                    >
                      <Key size={16} />
                      <span>Unlock Contacts ({userCredits > 0 ? '1 Credit' : 'Buy Credits'})</span>
                    </button>
                    
                    {userCredits <= 0 && (
                      <p className="body-sm" style={{ textAlign: 'center', margin: 0, color: 'var(--colors-muted)' }}>
                        You have 0 credits.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick action buttons for already unlocked details */}
            {isUnlocked && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '16px' }}>
                <a 
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                >
                  <MessageSquare size={16} />
                  Reserve via WhatsApp
                </a>
                
                <a 
                  href={`tel:${contacts.phone || pg.contactPhone}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', border: '1.5px solid var(--colors-ink)', fontWeight: 700 }}
                >
                  <Phone size={16} />
                  Call Property Owner
                </a>

                {contacts.googleMapsUrl && (
                  <a 
                    href={contacts.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', border: '1.5px solid var(--colors-ink)', fontWeight: 700 }}
                  >
                    <MapPin size={16} style={{ color: 'var(--colors-primary)' }} />
                    <span>Show in Google Maps</span>
                  </a>
                )}

                <button
                  onClick={toggleWishlist}
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', border: '1.5px solid var(--colors-ink)', fontWeight: 700 }}
                >
                  <span>{isSaved ? 'Saved in List' : 'Save to List'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Report Property Card */}
          <div style={{ padding: '16px 20px', border: '1px solid #fee2e2', borderRadius: '12px', backgroundColor: '#fef2f2', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', textAlign: 'left' }}>
            <span style={{ fontWeight: 700, color: '#991b1b', display: 'block' }}>Report what was not correct in this property</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Wrong Info', 'Listed by Broker', 'Rented Out'].map((reason) => (
                <button 
                  key={reason} 
                  onClick={() => {
                    window.alert(`Thank you! Report submitted for reason: "${reason}". Our verification team will check this listing.`);
                  }}
                  style={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #fca5a5', 
                    color: '#b91c1c', 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.15s ease'
                  }}
                  className="report-btn-hover"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Slider Overlay */}
      {showFullscreenGallery && (
        <div className="fullscreen-gallery-overlay" onClick={(e) => { e.stopPropagation(); setShowFullscreenGallery(false); }} style={{ zIndex: 100000 }}>
          <button 
            className="fullscreen-gallery-close" 
            onClick={(e) => { e.stopPropagation(); setShowFullscreenGallery(false); }} 
            aria-label="Close fullscreen gallery"
          >
            <X size={22} />
          </button>
          <div className="fullscreen-gallery-viewport" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button 
                className="fullscreen-nav-btn prev" 
                onClick={handlePrevFullscreen} 
                aria-label="Previous photo"
              >
                ❮
              </button>
            )}
            <img 
              src={images[fullscreenImageIndex]} 
              alt={`${pg.name} co-living room view full photo in ${pg.locality}`} 
              className="fullscreen-gallery-img"
              loading="lazy"
            />
            {images.length > 1 && (
              <button 
                className="fullscreen-nav-btn next" 
                onClick={handleNextFullscreen} 
                aria-label="Next photo"
              >
                ❯
              </button>
            )}
          </div>
          <div className="fullscreen-gallery-counter">
            {fullscreenImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
