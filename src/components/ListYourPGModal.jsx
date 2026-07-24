import { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Loader2, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { CITIES, LOCALITY_COORDINATES } from '../utils/constants';
import LocationPicker from './LocationPicker';

export default function ListYourPGModal({ onClose, onAddPG }) {
  const [pgName, setPgName] = useState('');
  const [pgCity, setPgCity] = useState('bangalore');
  const [pgLocality, setPgLocality] = useState(CITIES.bangalore.localities[0]);
  const [pgAddress, setPgAddress] = useState('');
  const [pgDescription, setPgDescription] = useState('');
  const [pgPrice, setPgPrice] = useState('');
  const [pgGender, setPgGender] = useState('unisex');
  const [pgFurnishing, setPgFurnishing] = useState('Semi Furnished');
  const [pgAvailableFrom, setPgAvailableFrom] = useState('Immediate');
  const [pgContactPhone, setPgContactPhone] = useState('');
  const [pgContactWhatsapp, setPgContactWhatsapp] = useState('');
  const [pgCoords, setPgCoords] = useState(null);
  
  const [pgShowPhone, setPgShowPhone] = useState(true);

  const handleCityChange = (cityKey) => {
    setPgCity(cityKey);
    const firstLoc = CITIES[cityKey]?.localities[0] || '';
    setPgLocality(firstLoc);
  };

  const [selectedAmenities, setSelectedAmenities] = useState({
    wifi: true,
    food: true,
    ac: false,
    gym: false,
    laundry: false,
    backup: false,
    security: true,
    parking: false,
    lift: false
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset all form fields to initial values
  const handleReset = () => {
    setPgName('');
    setPgCity('bangalore');
    setPgLocality(CITIES.bangalore.localities[0]);
    setPgAddress('');
    setPgDescription('');
    setPgPrice('');
    setPgGender('unisex');
    setPgFurnishing('Semi Furnished');
    setPgAvailableFrom('Immediate');
    setPgContactPhone('');
    setPgContactWhatsapp('');
    setPgCoords(null);
    setPgShowPhone(true);
    setSelectedAmenities({
      wifi: true,
      food: true,
      ac: false,
      gym: false,
      laundry: false,
      backup: false,
      security: true,
      parking: false,
      lift: false
    });
    setSelectedImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setErrorMsg('');
  };

  // Focus trap & Escape key close for accessibility
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
  }, [onClose]);



  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities(prev => ({ ...prev, [amenity]: !prev[amenity] }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setErrorMsg('Please select only valid image files.');
    }

    if (selectedImages.length + validFiles.length > 5) {
      setErrorMsg('You can upload a maximum of 5 photos.');
      return;
    }

    setSelectedImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setErrorMsg('');
  };

  const removeSelectedImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!pgName || !pgAddress || !pgPrice || !pgDescription || !pgContactPhone) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    if (selectedImages.length === 0) {
      setErrorMsg('Please upload at least one room photo.');
      return;
    }

    if (!pgCoords) {
      setErrorMsg('Please pin-drop your exact PG location on the map.');
      return;
    }

    setIsSubmitting(true);
    const activeAmenities = Object.keys(selectedAmenities).filter(key => selectedAmenities[key]);

    const pgData = {
      name: pgName,
      city: pgCity,
      locality: pgLocality,
      address: pgAddress,
      description: pgDescription,
      price: Number(pgPrice),
      gender: pgGender,
      furnishing: pgFurnishing,
      availableFrom: pgAvailableFrom,
      lat: pgCoords.lat,
      lng: pgCoords.lng,
      contactPhone: pgContactPhone,
      contactEmail: '',
      contactWhatsapp: pgContactWhatsapp || pgContactPhone,
      showPhone: pgShowPhone,
      amenities: activeAmenities
    };

    try {
      await onAddPG(pgData, selectedImages);
      setShowConfetti(true);
      setTimeout(() => {
        setIsSuccess(true);
        setShowConfetti(false);
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit listing. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)', position: 'relative', overflow: 'hidden' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close form">
          <X size={18} />
        </button>

        {/* Confetti animation overlay */}
        {showConfetti && (
          <div className="publish-confetti-overlay">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.6}s`,
                  animationDuration: `${1 + Math.random() * 1.5}s`,
                  backgroundColor: ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][i % 6],
                  width: `${6 + Math.random() * 6}px`,
                  height: `${6 + Math.random() * 6}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            ))}
            <div className="publish-success-pulse">
              <CheckCircle2 size={64} strokeWidth={2.5} />
            </div>
          </div>
        )}

        <div className="modal-body" style={{ padding: '32px', maxHeight: '85vh', overflowY: 'auto' }}>
          {isSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
              <CheckCircle2 size={56} style={{ color: '#22C55E', marginBottom: '20px' }} />
              <h3 className="title-md" style={{ fontSize: '22px', marginBottom: '8px' }}>Property Listed!</h3>
              <p className="body-md" style={{ color: 'var(--colors-body)', marginBottom: '24px', maxWidth: '320px' }}>
                Your room has been published successfully and is now live in the catalog!
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ maxWidth: '160px', padding: '8px 24px' }}>
                Go to Catalog
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={20} style={{ color: 'var(--colors-accent-blue)' }} />
                <h3 className="title-md" style={{ fontSize: '20px', margin: 0 }}>List Your PG Free</h3>
              </div>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
                Target students and professionals directly. Zero commission, zero registration fees.
              </p>

              {errorMsg && <div className="error-message" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                {/* Form fields */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pg-name">PG Accommodation Name *</label>
                  <input 
                    type="text" 
                    id="pg-name"
                    className="form-input" 
                    placeholder="e.g. Srinidhi Premium Co-living" 
                    value={pgName}
                    onChange={(e) => setPgName(e.target.value)}
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-city">City *</label>
                    <select id="pg-city" className="form-input" value={pgCity} onChange={(e) => handleCityChange(e.target.value)} style={{ paddingRight: '8px' }}>
                      {Object.entries(CITIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-locality">Locality *</label>
                    <input 
                      type="text"
                      id="pg-locality"
                      list="list-pg-localities"
                      className="form-input" 
                      placeholder="e.g. Koramangala"
                      value={pgLocality} 
                      onChange={(e) => setPgLocality(e.target.value)}
                      required
                    />
                    <datalist id="list-pg-localities">
                      {(CITIES[pgCity]?.localities || []).map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-price">Rent (INR) *</label>
                    <input 
                      type="number" 
                      id="pg-price"
                      className="form-input" 
                      placeholder="e.g. 9500" 
                      value={pgPrice}
                      onChange={(e) => setPgPrice(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-gender">Gender Type *</label>
                    <select id="pg-gender" className="form-input" value={pgGender} onChange={(e) => setPgGender(e.target.value)}>
                      <option value="unisex">Coliving</option>
                      <option value="boys">Boys Only</option>
                      <option value="girls">Girls Only</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-furnishing">Furnishing *</label>
                    <select id="pg-furnishing" className="form-input" value={pgFurnishing} onChange={(e) => setPgFurnishing(e.target.value)}>
                      <option value="Semi Furnished">Semi Furnished</option>
                      <option value="Fully Furnished">Fully Furnished</option>
                      <option value="Unfurnished">Unfurnished</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-available-from">Available From *</label>
                    <input 
                      type="text" 
                      id="pg-available-from"
                      className="form-input" 
                      placeholder="Immediate / Date" 
                      value={pgAvailableFrom}
                      onChange={(e) => setPgAvailableFrom(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pg-address">Full Address *</label>
                  <input 
                    type="text" 
                    id="pg-address"
                    className="form-input" 
                    placeholder="House number, Street, Landmark details" 
                    value={pgAddress}
                    onChange={(e) => setPgAddress(e.target.value)}
                    required 
                  />
                </div>

                <LocationPicker 
                  onSelect={(coords) => setPgCoords(coords)} 
                  defaultCenter={(() => {
                    const cleaned = pgLocality?.trim().toLowerCase();
                    if (cleaned) {
                      const match = Object.keys(LOCALITY_COORDINATES).find(
                        key => key.toLowerCase() === cleaned
                      );
                      if (match) {
                        return [LOCALITY_COORDINATES[match].lat, LOCALITY_COORDINATES[match].lng];
                      }
                    }
                    return [12.9716, 77.5946];
                  })()}
                  value={pgCoords}
                />

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pg-description">Property Description *</label>
                  <textarea 
                    id="pg-description"
                    className="form-input" 
                    rows="3" 
                    placeholder="Detail rooms, sharing options, safety, food service hours..."
                    value={pgDescription}
                    onChange={(e) => setPgDescription(e.target.value)}
                    style={{ resize: 'vertical', minHeight: '80px', padding: '10px 12px' }}
                    required
                  />
                </div>

                {/* Phone number display option */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={pgShowPhone}
                      onChange={() => setPgShowPhone(!pgShowPhone)}
                      style={{ accentColor: 'var(--colors-accent-blue)', cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Display phone number on listing
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--colors-muted)', marginTop: '4px', display: 'block' }}>
                    When unchecked, users will only see your WhatsApp. Your phone stays private.
                  </span>
                </div>

                {/* Contacts stack */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-contact-phone">Owner Mobile *</label>
                    <input 
                      type="tel" 
                      id="pg-contact-phone"
                      className="form-input" 
                      placeholder="10 digit number" 
                      value={pgContactPhone}
                      onChange={(e) => setPgContactPhone(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="pg-contact-whatsapp">WhatsApp (Optional)</label>
                    <input 
                      type="tel" 
                      id="pg-contact-whatsapp"
                      className="form-input" 
                      placeholder="WhatsApp if different" 
                      value={pgContactWhatsapp}
                      onChange={(e) => setPgContactWhatsapp(e.target.value)}
                    />
                  </div>
                </div>

                {/* Amenities checklist */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>Amenities Included</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {Object.keys(selectedAmenities).map(key => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedAmenities[key]} 
                          onChange={() => handleAmenityToggle(key)} 
                          style={{ accentColor: 'var(--colors-accent-blue)', cursor: 'pointer' }}
                        />
                        {key === 'backup' ? 'Power' : key === 'lift' ? 'Lift' : key}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Photos upload area */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Upload Photos (Min 1, Max 5) *</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageChange} 
                  />
                  <div 
                    onClick={triggerFileSelect}
                    style={{ border: '2px dashed var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '20px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--colors-surface-soft)', transition: 'border-color 0.2s ease' }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--colors-ink)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--colors-hairline)'}
                  >
                    <UploadCloud size={28} style={{ margin: '0 auto 8px auto', color: 'var(--colors-muted)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Click to select images</span>
                    <span style={{ fontSize: '11px', color: 'var(--colors-muted)' }}>JPEG, PNG up to 4MB</span>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {imagePreviews.map((url, idx) => (
                        <div key={idx} className="uploaded-preview-item" style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1.5px solid var(--colors-hairline)' }}>
                          <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail" />
                          <button 
                            type="button" 
                            onClick={() => removeSelectedImage(idx)}
                            style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(9, 9, 11, 0.75)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleReset}
                    style={{ height: '46px', fontWeight: 600, fontSize: '13px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', flexShrink: 0 }}
                    title="Reset all fields"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isSubmitting}
                    style={{ flex: 1, height: '46px', fontWeight: 700, fontSize: '14px', borderRadius: '4px' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <span>Publish Listing Free</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
