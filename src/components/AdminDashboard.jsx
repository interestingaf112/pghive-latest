import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, UploadCloud, Image as ImageIcon, 
  Loader2, KeyRound, Sparkles, MapPin 
} from 'lucide-react';
import { authenticateAdmin } from '../firebase';

export default function AdminDashboard({ 
  adminUser, 
  onLoginSuccess, 
  pgs, 
  onAddPG, 
  onDeletePG,
  isFirebaseActive 
}) {
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // PG Creation Form State
  const [pgName, setPgName] = useState('');
  const [pgLocality, setPgLocality] = useState('Koramangala');
  const [pgAddress, setPgAddress] = useState('');
  const [pgDescription, setPgDescription] = useState('');
  const [pgPrice, setPgPrice] = useState('');
  const [pgGender, setPgGender] = useState('unisex');
  const [pgContactPhone, setPgContactPhone] = useState('');
  const [pgContactEmail, setPgContactEmail] = useState('');
  const [pgContactWhatsapp, setPgContactWhatsapp] = useState('');
  
  // Room sharing price options
  const [sharingSingle, setSharingSingle] = useState('');
  const [sharingDouble, setSharingDouble] = useState('');
  const [sharingTriple, setSharingTriple] = useState('');

  // Selected Amenities
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

  // Images state
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popular Bangalore localities for options
  const localities = [
    'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 
    'Electronic City', 'Marathahalli', 'BTM Layout', 'Jayanagar', 
    'Hebbal', 'Bellandur', 'Kammanahalli', 'Rajajinagar'
  ];

  // Handle Admin Login Form
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const user = await authenticateAdmin(loginUsername, loginPassword);
      onLoginSuccess(user);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Toggle Amenity Checkbox
  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities(prev => ({
      ...prev,
      [amenity]: !prev[amenity]
    }));
  };

  // Handle Image Selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate image types
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setFormError('Some files were ignored because they are not valid images.');
    }

    setSelectedImages(prev => [...prev, ...validFiles]);

    // Create previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeSelectedImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Form Submit (Create PG)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    // Simple Validation
    if (!pgName || !pgAddress || !pgPrice || !pgDescription || !pgContactPhone) {
      setFormError('Please fill out all required fields marked with *');
      return;
    }

    if (selectedImages.length === 0) {
      setFormError('Please upload at least one photo of the PG.');
      return;
    }

    setIsSubmitting(true);

    // Prepare data
    const activeAmenities = Object.keys(selectedAmenities).filter(key => selectedAmenities[key]);
    
    const sharingData = {};
    if (sharingSingle) sharingData.single = Number(sharingSingle);
    if (sharingDouble) sharingData.double = Number(sharingDouble);
    if (sharingTriple) sharingData.triple = Number(sharingTriple);

    const pgData = {
      name: pgName,
      locality: pgLocality,
      address: pgAddress,
      description: pgDescription,
      price: Number(pgPrice),
      gender: pgGender,
      contactPhone: pgContactPhone,
      contactEmail: pgContactEmail,
      contactWhatsapp: pgContactWhatsapp || pgContactPhone,
      sharing: sharingData,
      amenities: activeAmenities
    };

    try {
      await onAddPG(pgData, selectedImages);
      setFormSuccess('PG Listing successfully created!');
      
      // Clear form
      setPgName('');
      setPgAddress('');
      setPgDescription('');
      setPgPrice('');
      setPgContactPhone('');
      setPgContactEmail('');
      setPgContactWhatsapp('');
      setSharingSingle('');
      setSharingDouble('');
      setSharingTriple('');
      setSelectedImages([]);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(err.message || 'Failed to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // VIEW: Admin Login Screen (Airbnb styling)
  // ==========================================
  if (!adminUser) {
    return (
      <div className="container">
        <div className="login-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <KeyRound size={26} style={{ color: 'var(--colors-primary)' }} />
            <h2 className="title-md" style={{ fontSize: '22px', fontWeight: 600 }}>Host Portal Login</h2>
          </div>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
            Log in to your dashboard to manage room properties and view reservations.
          </p>
          
          {loginError && <div className="error-message">{loginError}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {isFirebaseActive ? 'Admin Email Address' : 'Admin Username'}
              </label>
              <input 
                type={isFirebaseActive ? 'email' : 'text'} 
                className="form-input" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder={isFirebaseActive ? 'admin@example.com' : 'admin'}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '10px', width: '100%' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Admin Dashboard Panel
  // ==========================================
  const [activeTab, setActiveTab] = useState('listings');

  // local stats calculation
  const totalListings = pgs.length;
  const boysListings = pgs.filter(p => p.gender === 'boys').length;
  const girlsListings = pgs.filter(p => p.gender === 'girls').length;
  const colivingListings = pgs.filter(p => p.gender === 'unisex').length;

  return (
    <div className="container admin-container">
      {/* Admin header */}
      <div className="admin-header" style={{ borderBottom: '1px solid var(--colors-hairline-soft)', paddingBottom: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
        <div>
          <h2 className="display-lg" style={{ margin: 0 }}>Host Control Panel</h2>
          <p className="body-sm" style={{ marginTop: '4px', marginBottom: 0 }}>
            List vacancies, upload room photos, and manage active listings.
          </p>
        </div>
        <div>
          <span className="caption-sm" style={{ display: 'inline-flex', padding: '6px 12px', border: '1.5px solid var(--colors-hairline)', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isFirebaseActive ? 'CLOUD SYNCHRONIZED' : 'OFFLINE LOCALSTORAGE'}
          </span>
        </div>
      </div>

      {/* Summary stats bar */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper" style={{ color: 'var(--colors-accent-blue)' }}>🏠</div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{totalListings}</span>
            <span className="admin-stat-label">Total Listings</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper" style={{ color: '#1d4ed8', backgroundColor: 'var(--colors-boys-bg)' }}>👦</div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{boysListings}</span>
            <span className="admin-stat-label">Boys Only</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper" style={{ color: '#db2777', backgroundColor: 'var(--colors-girls-bg)' }}>👧</div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{girlsListings}</span>
            <span className="admin-stat-label">Girls Only</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper" style={{ color: '#15803d', backgroundColor: 'var(--colors-unisex-bg)' }}>👥</div>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{colivingListings}</span>
            <span className="admin-stat-label">Coliving Hubs</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="admin-tab-switcher">
        <button 
          className={`admin-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}
        >
          <Grid size={16} />
          <span>Active Listings ({pgs.length})</span>
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <PlusCircle size={16} />
          <span>Add New Property</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'listings' ? (
        <div>
          {pgs.length === 0 ? (
            <div className="empty-state scroll-reveal" style={{ border: '1.5px dashed var(--colors-hairline)', borderRadius: '12px', background: 'var(--colors-surface-soft)', padding: '64px 20px' }}>
              <ShieldAlert size={40} style={{ margin: '0 auto 12px auto', color: 'var(--colors-muted)' }} />
              <h3 className="title-md" style={{ margin: 0 }}>No active listings found</h3>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: '8px 0 16px 0' }}>
                Get started by listing your property details and room configurations.
              </p>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('add')}
                style={{ width: 'auto', padding: '8px 18px', minHeight: '34px' }}
              >
                List Your First PG
              </button>
            </div>
          ) : (
            <div className="admin-listings-grid">
              {pgs.map(pg => (
                <div key={pg.id} className="admin-property-card">
                  <div className="admin-property-thumb-wrapper">
                    {pg.images && pg.images.length > 0 ? (
                      <img src={pg.images[0]} className="admin-property-thumb" alt={pg.name} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--colors-surface-soft)', color: 'var(--colors-muted)' }}>
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <span className={`admin-property-gender-tag pg-gender-pill ${pg.gender}`}>
                      {pg.gender === 'unisex' ? 'Coliving' : pg.gender}
                    </span>
                  </div>

                  <div className="admin-property-details">
                    <h4 className="admin-property-title">{pg.name}</h4>
                    <div className="admin-property-meta">
                      <MapPin size={13} style={{ color: 'var(--colors-muted)' }} />
                      <span>{pg.locality}</span>
                    </div>
                    <div className="admin-property-price">
                      ₹{pg.price.toLocaleString('en-IN')} <span style={{ fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 500 }}>/ mo starting</span>
                    </div>
                  </div>

                  <div className="admin-property-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onDeletePG(pg.id)}
                      style={{ padding: '6px 12px', minHeight: '32px', borderColor: 'var(--colors-accent-red)', color: 'var(--colors-accent-red)', width: 'auto', fontWeight: 700 }}
                    >
                      <Trash2 size={13} style={{ marginRight: '4px' }} />
                      Delete Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="admin-form-split">
          {/* Left Column: Form Details */}
          <div>
            <div className="admin-form-card">
              <h4 className="admin-form-card-title">
                <Sparkles size={16} style={{ color: 'var(--colors-accent-blue)' }} />
                General Information
              </h4>
              
              {formError && <div className="error-message" style={{ marginBottom: '16px' }}>{formError}</div>}
              {formSuccess && <div className="success-message" style={{ marginBottom: '16px' }}>{formSuccess}</div>}

              <div className="form-group">
                <label className="form-label">Property Title *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Stanza Living Dublin House" 
                  value={pgName}
                  onChange={e => setPgName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Locality Hub *</label>
                  <select 
                    className="form-select"
                    value={pgLocality}
                    onChange={e => setPgLocality(e.target.value)}
                  >
                    {localities.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rent / month (starting) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 8500" 
                    value={pgPrice}
                    onChange={e => setPgPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Address *</label>
                <textarea 
                  className="form-textarea" 
                  rows="2"
                  placeholder="Street address, nearby landmarks"
                  value={pgAddress}
                  onChange={e => setPgAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Room Description & Guidelines *</label>
                <textarea 
                  className="form-textarea" 
                  rows="4"
                  placeholder="Detail room facilities, visiting timings, mess guidelines, and deposit terms."
                  value={pgDescription}
                  onChange={e => setPgDescription(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="admin-form-card">
              <h4 className="admin-form-card-title">👥 Occupancy & Amenities</h4>
              
              <div className="form-group">
                <label className="form-label">Gender Target</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                  <label className="checkbox-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="radio" 
                      name="gender" 
                      checked={pgGender === 'unisex'}
                      onChange={() => setPgGender('unisex')}
                      style={{ accentColor: 'var(--colors-accent-blue)' }}
                    />
                    <span>Coliving</span>
                  </label>
                  <label className="checkbox-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="radio" 
                      name="gender" 
                      checked={pgGender === 'boys'}
                      onChange={() => setPgGender('boys')}
                      style={{ accentColor: 'var(--colors-accent-blue)' }}
                    />
                    <span>Boys Only</span>
                  </label>
                  <label className="checkbox-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="radio" 
                      name="gender" 
                      checked={pgGender === 'girls'}
                      onChange={() => setPgGender('girls')}
                      style={{ accentColor: 'var(--colors-accent-blue)' }}
                    />
                    <span>Girls Only</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sharing Options (₹/mo)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Single price" 
                    value={sharingSingle}
                    onChange={e => setSharingSingle(e.target.value)}
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Double price" 
                    value={sharingDouble}
                    onChange={e => setSharingDouble(e.target.value)}
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Triple price" 
                    value={sharingTriple}
                    onChange={e => setSharingTriple(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Amenities Included</label>
                <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
                  {Object.keys(selectedAmenities).map(key => (
                    <label key={key} className="checkbox-label" style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedAmenities[key]}
                        onChange={() => handleAmenityToggle(key)}
                        style={{ accentColor: 'var(--colors-accent-blue)' }}
                      />
                      <span>{key === 'backup' ? 'Power Backup' : key}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Media */}
          <div>
            <div className="admin-form-card">
              <h4 className="admin-form-card-title">📞 Contact Information</h4>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="e.g. 9876543210" 
                  value={pgContactPhone}
                  onChange={e => setPgContactPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp (Optional)</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="WhatsApp if different" 
                  value={pgContactWhatsapp}
                  onChange={e => setPgContactWhatsapp(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Contact Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="host@example.com" 
                  value={pgContactEmail}
                  onChange={e => setPgContactEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-card">
              <h4 className="admin-form-card-title">🖼️ Media & Photos</h4>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Property Photos *</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  multiple 
                  accept="image/*"
                  onChange={handleImageChange}
                />
                
                <div className="upload-zone" onClick={triggerFileSelect} style={{ width: '100%', border: '2px dashed var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '24px 16px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--colors-surface-soft)', transition: 'border-color 0.2s ease' }}>
                  <UploadCloud size={28} style={{ margin: '0 auto 8px auto', color: 'var(--colors-muted)' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, display: 'block' }}>Click to browse media files</span>
                  <span style={{ fontSize: '11px', color: 'var(--colors-muted)', marginTop: '2px', display: 'block' }}>Upload room layouts, mess facilities, or lobby photos</span>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="uploaded-preview-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {imagePreviews.map((url, idx) => (
                      <div key={idx} className="uploaded-preview-item" style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1.5px solid var(--colors-hairline)' }}>
                        <img src={url} className="uploaded-preview-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail" />
                        <button 
                          type="button" 
                          className="uploaded-preview-del" 
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
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '48px', fontWeight: 700, fontSize: '14.5px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Publishing room listing...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Publish Property Listing</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
