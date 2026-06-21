import React, { useState, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ListYourPGModal({ onClose, onAddPG }) {
  const [pgName, setPgName] = useState('');
  const [pgLocality, setPgLocality] = useState('SG Palya');
  const [pgAddress, setPgAddress] = useState('');
  const [pgDescription, setPgDescription] = useState('');
  const [pgPrice, setPgPrice] = useState('');
  const [pgGender, setPgGender] = useState('unisex');
  const [pgFurnishing, setPgFurnishing] = useState('Semi Furnished');
  const [pgAvailableFrom, setPgAvailableFrom] = useState('Immediate');
  const [pgContactPhone, setPgContactPhone] = useState('');
  const [pgContactEmail, setPgContactEmail] = useState('');
  const [pgContactWhatsapp, setPgContactWhatsapp] = useState('');
  
  const [selectedAmenities, setSelectedAmenities] = useState({
    wifi: true,
    food: true,
    ac: false,
    gym: false,
    laundry: false,
    backup: false,
    security: true,
    parking: false
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const localities = [
    'SG Palya', 'Koramangala', 'HSR Layout', 'BTM Layout', 'Marathahalli',
    'Indiranagar', 'Whitefield', 'Electronic City', 'Jayanagar'
  ];

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

    setIsSubmitting(true);
    const activeAmenities = Object.keys(selectedAmenities).filter(key => selectedAmenities[key]);

    const pgData = {
      name: pgName,
      locality: pgLocality,
      address: pgAddress,
      description: pgDescription,
      price: Number(pgPrice),
      gender: pgGender,
      furnishing: pgFurnishing,
      availableFrom: pgAvailableFrom,
      contactPhone: pgContactPhone,
      contactEmail: pgContactEmail,
      contactWhatsapp: pgContactWhatsapp || pgContactPhone,
      amenities: activeAmenities
    };

    try {
      await onAddPG(pgData, selectedImages);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit listing. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close form">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px', maxHeight: '85vh', overflowY: 'auto' }}>
          {isSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
              <CheckCircle2 size={56} style={{ color: 'var(--colors-accent-blue)', marginBottom: '20px' }} />
              <h3 className="title-md" style={{ fontSize: '22px', marginBottom: '8px' }}>Property Listed Free!</h3>
              <p className="body-md" style={{ color: 'var(--colors-body)', marginBottom: '24px', maxWidth: '320px' }}>
                Your room has been published successfully and is now active in the catalog grid!
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
                  <label className="form-label">PG Accommodation Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Srinidhi Premium Co-living" 
                    value={pgName}
                    onChange={(e) => setPgName(e.target.value)}
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Locality Hub *</label>
                    <select 
                      className="form-input" 
                      value={pgLocality} 
                      onChange={(e) => setPgLocality(e.target.value)}
                    >
                      {localities.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Monthly Rent (INR) *</label>
                    <input 
                      type="number" 
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
                    <label className="form-label">Gender Type *</label>
                    <select className="form-input" value={pgGender} onChange={(e) => setPgGender(e.target.value)}>
                      <option value="unisex">Coliving</option>
                      <option value="boys">Boys Only</option>
                      <option value="girls">Girls Only</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Furnishing *</label>
                    <select className="form-input" value={pgFurnishing} onChange={(e) => setPgFurnishing(e.target.value)}>
                      <option value="Semi Furnished">Semi Furnished</option>
                      <option value="Fully Furnished">Fully Furnished</option>
                      <option value="Unfurnished">Unfurnished</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Available From *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Immediate / Date" 
                      value={pgAvailableFrom}
                      onChange={(e) => setPgAvailableFrom(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="House number, Street, Landmark details" 
                    value={pgAddress}
                    onChange={(e) => setPgAddress(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Property Description *</label>
                  <textarea 
                    className="form-input" 
                    rows="3" 
                    placeholder="Detail rooms, sharing options, safety, food service hours..."
                    value={pgDescription}
                    onChange={(e) => setPgDescription(e.target.value)}
                    style={{ resize: 'vertical', minHeight: '80px', padding: '10px 12px' }}
                    required
                  />
                </div>

                {/* Contacts stack */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Owner Mobile *</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="10 digit number" 
                      value={pgContactPhone}
                      onChange={(e) => setPgContactPhone(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">WhatsApp (Optional)</label>
                    <input 
                      type="tel" 
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
                        {key === 'backup' ? 'Power' : key}
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
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                  style={{ width: '100%', height: '46px', fontWeight: 700, fontSize: '14px', borderRadius: '4px', marginTop: '12px' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Publishing room listing...</span>
                    </>
                  ) : (
                    <span>Publish Listing Free</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
