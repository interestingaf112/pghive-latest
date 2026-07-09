import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, UploadCloud, Image as ImageIcon, 
  Loader2, KeyRound, Sparkles, MapPin, Grid, PlusCircle, ShieldAlert, Edit3 
} from 'lucide-react';
import { authenticateAdmin, sendPasswordReset } from '../firebase';
import { sanitizeText, validatePhone, validateEmail, validatePrice } from '../utils/sanitize';
import { BANGALORE_LOCALITIES } from '../utils/constants';

export default function AdminDashboard({ 
  adminUser, 
  onLoginSuccess, 
  pgs, 
  onAddPG, 
  onUpdatePG,
  getAdminPGContactDetails,
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
  const [pgDeposit, setPgDeposit] = useState('');
  const [pgGender, setPgGender] = useState('unisex');
  const [pgContactPhone, setPgContactPhone] = useState('');
  const [pgContactEmail, setPgContactEmail] = useState('');
  const [pgContactWhatsapp, setPgContactWhatsapp] = useState('');
  const [pgContactMapsUrl, setPgContactMapsUrl] = useState('');
  
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
  const [editingId, setEditingId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const fileInputRef = useRef(null);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Flow State
  const [showForgotFlow, setShowForgotFlow] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');

  const localities = BANGALORE_LOCALITIES;

  // Focus trap container ref
  const loginPanelRef = useRef(null);

  // Focus trap for admin login / forgot password forms
  useEffect(() => {
    if (adminUser || !loginPanelRef.current) return;
    const focusableElements = loginPanelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Wait a brief tick to ensure DOM is settled before focusing
    const focusTimeout = setTimeout(() => {
      firstElement?.focus();
    }, 50);

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => {
      clearTimeout(focusTimeout);
      window.removeEventListener('keydown', handleTab);
    };
  }, [adminUser, showForgotFlow]);

  // Handle Admin Login Form
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Username/email and password are required.');
      return;
    }

    if (loginUsername.length > 100 || loginPassword.length > 100) {
      setLoginError('Credentials exceed maximum length of 100 characters.');
      return;
    }

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

  // Handle Forgot Password Form
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email/username.');
      return;
    }

    setIsSendingReset(true);
    try {
      const res = await sendPasswordReset(forgotEmail.trim());
      setForgotSuccess(res.message);
      if (res.mockLink) {
        // Expose simulated reset link in developer mode
        console.log("Mock reset link generated:", res.mockLink);
        setForgotSuccess(`${res.message}\n\n[Dev Mode] Click the link below to verify link expiration:\n${res.mockLink}`);
      }
    } catch (err) {
      setForgotError(err.message || 'Failed to send reset link.');
    } finally {
      setIsSendingReset(false);
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

  const startEdit = async (pg) => {
    setFormError('');
    setFormSuccess('');
    setEditingId(pg.id);
    
    // Set basic text fields
    setPgName(pg.name || '');
    setPgLocality(pg.locality || 'Koramangala');
    setPgAddress(pg.address || '');
    setPgDescription(pg.description || '');
    setPgPrice(pg.price?.toString() || '');
    setPgDeposit(pg.deposit?.toString() || '');
    setPgGender(pg.gender || 'unisex');
    
    // Pre-populate sharing prices
    setSharingSingle(pg.sharing?.single?.toString() || '');
    setSharingDouble(pg.sharing?.double?.toString() || '');
    setSharingTriple(pg.sharing?.triple?.toString() || '');
    
    // Pre-populate amenities
    setSelectedAmenities({
      wifi: pg.amenities?.includes('wifi') || false,
      food: pg.amenities?.includes('food') || false,
      ac: pg.amenities?.includes('ac') || false,
      gym: pg.amenities?.includes('gym') || false,
      laundry: pg.amenities?.includes('laundry') || false,
      backup: pg.amenities?.includes('backup') || false,
      security: pg.amenities?.includes('security') || false,
      parking: pg.amenities?.includes('parking') || false,
    });
    
    // Pre-populate existing images
    setExistingImages(pg.images || []);
    
    // Reset file selections
    setSelectedImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    
    // Fetch unmasked real contact details from private subcollection
    try {
      if (getAdminPGContactDetails) {
        const privateContacts = await getAdminPGContactDetails(pg.id);
        if (privateContacts) {
          setPgContactPhone(privateContacts.phone || '');
          setPgContactEmail(privateContacts.email || '');
          setPgContactWhatsapp(privateContacts.whatsapp || '');
          setPgContactMapsUrl(privateContacts.googleMapsUrl || '');
        } else {
          setPgContactPhone(pg.contactPhone || '');
          setPgContactEmail(pg.contactEmail || '');
          setPgContactWhatsapp(pg.contactWhatsapp || '');
          setPgContactMapsUrl('');
        }
      }
    } catch (err) {
      console.error("Failed to load real contacts:", err);
      setPgContactPhone(pg.contactPhone || '');
      setPgContactEmail(pg.contactEmail || '');
      setPgContactWhatsapp(pg.contactWhatsapp || '');
      setPgContactMapsUrl('');
    }
    
    // Switch to form tab
    setActiveTab('add');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPgName('');
    setPgLocality('Koramangala');
    setPgAddress('');
    setPgDescription('');
    setPgPrice('');
    setPgDeposit('');
    setPgGender('unisex');
    setPgContactPhone('');
    setPgContactEmail('');
    setPgContactWhatsapp('');
    setPgContactMapsUrl('');
    setSharingSingle('');
    setSharingDouble('');
    setSharingTriple('');
    setSelectedAmenities({
      wifi: true,
      food: true,
      ac: false,
      gym: false,
      laundry: false,
      backup: false,
      security: true,
      parking: false
    });
    setExistingImages([]);
    setSelectedImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setFormError('');
    setFormSuccess('');
    setActiveTab('listings');
  };

  // Form Submit (Create or Update PG)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    // Simple Validation
    if (!pgName || !pgPrice || !pgDescription || !pgContactPhone) {
      setFormError('Please fill out all required fields marked with *');
      return;
    }

    if (selectedImages.length === 0 && existingImages.length === 0) {
      setFormError('Please upload or retain at least one photo of the PG.');
      return;
    }

    try {
      // 1. Sanitize text fields
      const cleanName = sanitizeText(pgName, 200);
      const cleanAddress = pgLocality; // default to locality to satisfy db schema
      const cleanDescription = sanitizeText(pgDescription, 2000);
      
      // 2. Validate price
      const priceVal = validatePrice(pgPrice);
      if (!priceVal.valid) {
        setFormError(`Price validation error: ${priceVal.error}`);
        return;
      }
      
      // Validate deposit (optional)
      let depositVal = 0;
      if (pgDeposit) {
        const depResult = validatePrice(pgDeposit);
        if (!depResult.valid) {
          setFormError(`Deposit validation error: ${depResult.error}`);
          return;
        }
        depositVal = depResult.value;
      }

      // 3. Validate phone number
      const phoneVal = validatePhone(pgContactPhone);
      if (!phoneVal.valid) {
        setFormError(`Phone validation error: ${phoneVal.error}`);
        return;
      }

      // 4. Validate WhatsApp (if provided)
      let whatsappClean = phoneVal.cleaned;
      if (pgContactWhatsapp) {
        const whatsappVal = validatePhone(pgContactWhatsapp);
        if (!whatsappVal.valid) {
          setFormError(`WhatsApp validation error: ${whatsappVal.error}`);
          return;
        }
        whatsappClean = whatsappVal.cleaned;
      }

      // 5. Validate email (if provided)
      if (pgContactEmail) {
        const emailVal = validateEmail(pgContactEmail);
        if (!emailVal.valid) {
          setFormError(`Email validation error: ${emailVal.error}`);
          return;
        }
      }

      // 6. Validate sharing prices
      const sharingData = {};
      if (sharingSingle) {
        const singleVal = validatePrice(sharingSingle);
        if (!singleVal.valid) {
          setFormError(`Single sharing price error: ${singleVal.error}`);
          return;
        }
        sharingData.single = singleVal.value;
      }
      if (sharingDouble) {
        const doubleVal = validatePrice(sharingDouble);
        if (!doubleVal.valid) {
          setFormError(`Double sharing price error: ${doubleVal.error}`);
          return;
        }
        sharingData.double = doubleVal.value;
      }
      if (sharingTriple) {
        const tripleVal = validatePrice(sharingTriple);
        if (!tripleVal.valid) {
          setFormError(`Triple sharing price error: ${tripleVal.error}`);
          return;
        }
        sharingData.triple = tripleVal.value;
      }

      setIsSubmitting(true);

      // Prepare data
      const activeAmenities = Object.keys(selectedAmenities).filter(key => selectedAmenities[key]);
      
      const pgData = {
        name: cleanName,
        locality: pgLocality,
        address: cleanAddress,
        description: cleanDescription,
        price: priceVal.value,
        deposit: depositVal,
        gender: pgGender,
        contactPhone: phoneVal.cleaned,
        contactEmail: pgContactEmail ? pgContactEmail.trim() : '',
        contactWhatsapp: whatsappClean,
        googleMapsUrl: pgContactMapsUrl ? pgContactMapsUrl.trim() : '',
        sharing: sharingData,
        amenities: activeAmenities
      };

      if (editingId) {
        const combinedImages = [...existingImages, ...selectedImages];
        await onUpdatePG(editingId, pgData, combinedImages);
        setFormSuccess('PG Listing successfully updated!');
      } else {
        await onAddPG(pgData, selectedImages);
        setFormSuccess('PG Listing successfully created!');
      }
      
      // Clear form
      setEditingId(null);
      setExistingImages([]);
      setPgName('');
      setPgAddress('');
      setPgDescription('');
      setPgPrice('');
      setPgDeposit('');
      setPgContactPhone('');
      setPgContactEmail('');
      setPgContactWhatsapp('');
      setPgContactMapsUrl('');
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
    if (showForgotFlow) {
      return (
        <div className="container">
          <div className="login-panel" ref={loginPanelRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <KeyRound size={26} style={{ color: 'var(--colors-primary)' }} />
              <h2 className="title-md" style={{ fontSize: '22px', fontWeight: 600 }}>Reset Password</h2>
            </div>
            <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
              Enter your admin email address to request a secure password reset link.
            </p>
            
            {forgotError && <div className="error-message" style={{ marginBottom: '16px' }}>{forgotError}</div>}
            {forgotSuccess && (
              <div className="success-message" style={{ marginBottom: '16px', color: 'var(--colors-accent-blue)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '13px' }}>
                {forgotSuccess}
              </div>
            )}

            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="forgot-email">
                  {isFirebaseActive ? 'Admin Email Address' : 'Admin Username'}
                </label>
                <input 
                  type={isFirebaseActive ? 'email' : 'text'} 
                  className="form-input" 
                  id="forgot-email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={isFirebaseActive ? 'admin@example.com' : 'admin'}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: '10px', width: '100%' }}
                disabled={isSendingReset}
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
              
              <button 
                type="button" 
                className="footer-link-btn"
                style={{ alignSelf: 'center', marginTop: '12px', background: 'none', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer' }}
                onClick={() => {
                  setShowForgotFlow(false);
                  setForgotError('');
                  setForgotSuccess('');
                }}
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="container">
        <div className="login-panel" ref={loginPanelRef}>
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
              <label className="form-label" htmlFor="login-username">
                {isFirebaseActive ? 'Admin Email Address' : 'Admin Username'}
              </label>
              <input 
                type={isFirebaseActive ? 'email' : 'text'} 
                className="form-input" 
                id="login-username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder={isFirebaseActive ? 'admin@example.com' : 'admin'}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="login-password">Password</label>
                <button 
                  type="button" 
                  className="footer-link-btn" 
                  style={{ fontSize: '12px', color: 'var(--colors-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowForgotFlow(true)}
                >
                  Forgot password?
                </button>
              </div>
              <input 
                type="password" 
                className="form-input" 
                id="login-password"
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
          <div className="admin-stat-icon-wrapper" style={{ color: 'var(--colors-boys-text)', backgroundColor: 'var(--colors-boys-bg)' }}>👦</div>
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
          onClick={() => {
            if (editingId) {
              cancelEdit();
            } else {
              setActiveTab('add');
            }
          }}
        >
          {editingId ? <Edit3 size={16} /> : <PlusCircle size={16} />}
          <span>{editingId ? 'Editing Property' : 'Add New Property'}</span>
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
                      ₹{Number(pg.price || 0).toLocaleString('en-IN')} <span style={{ fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 500 }}>/ mo starting</span>
                    </div>
                  </div>

                  <div className="admin-property-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEdit(pg)}
                      style={{ padding: '6px 12px', minHeight: '32px', width: 'auto', fontWeight: 700 }}
                    >
                      <Edit3 size={13} style={{ marginRight: '4px' }} />
                      Edit Listing
                    </button>
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
                <label className="form-label" htmlFor="add-pg-name">Property Title *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  id="add-pg-name"
                  placeholder="e.g. Stanza Living Dublin House" 
                  value={pgName}
                  onChange={e => setPgName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-pg-locality">Locality Hub *</label>
                   <input 
                    type="text"
                    className="form-input" 
                    id="add-pg-locality"
                    list="admin-pg-localities"
                    placeholder="e.g. Koramangala"
                    value={pgLocality}
                    onChange={e => setPgLocality(e.target.value)}
                    required
                  />
                  <datalist id="admin-pg-localities">
                    {localities.map(loc => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="add-pg-price">Rent / month *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    id="add-pg-price"
                    placeholder="e.g. 8500" 
                    value={pgPrice}
                    onChange={e => setPgPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="add-pg-deposit">Deposit (Optional)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    id="add-pg-deposit"
                    placeholder="e.g. 15000" 
                    value={pgDeposit}
                    onChange={e => setPgDeposit(e.target.value)}
                  />
                </div>
              </div>



              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="add-pg-description">Room Description & Guidelines *</label>
                <textarea 
                  className="form-textarea" 
                  id="add-pg-description"
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
                <label id="gender-label" className="form-label">Gender Target</label>
                <div role="radiogroup" aria-labelledby="gender-label" style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                  <label className="checkbox-label" htmlFor="gender-unisex" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="radio" 
                      name="gender" 
                      id="gender-unisex"
                      checked={pgGender === 'unisex'}
                      onChange={() => setPgGender('unisex')}
                      style={{ accentColor: 'var(--colors-accent-blue)' }}
                    />
                    <span>Coliving</span>
                  </label>
                  <label className="checkbox-label" htmlFor="gender-boys" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="radio" 
                      name="gender" 
                      id="gender-boys"
                      checked={pgGender === 'boys'}
                      onChange={() => setPgGender('boys')}
                      style={{ accentColor: 'var(--colors-accent-blue)' }}
                    />
                    <span>Boys Only</span>
                  </label>
                  <label className="checkbox-label" htmlFor="gender-girls" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="radio" 
                      name="gender" 
                      id="gender-girls"
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
                    aria-label="Single occupancy price"
                    value={sharingSingle}
                    onChange={e => setSharingSingle(e.target.value)}
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Double price" 
                    aria-label="Double occupancy price"
                    value={sharingDouble}
                    onChange={e => setSharingDouble(e.target.value)}
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Triple price" 
                    aria-label="Triple occupancy price"
                    value={sharingTriple}
                    onChange={e => setSharingTriple(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label id="amenities-label" className="form-label">Amenities Included</label>
                <div role="group" aria-labelledby="amenities-label" className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
                  {Object.keys(selectedAmenities).map(key => (
                    <label key={key} htmlFor={`amenity-${key}`} className="checkbox-label" style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        id={`amenity-${key}`}
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
                <label className="form-label" htmlFor="add-pg-phone">Mobile Number *</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  id="add-pg-phone"
                  placeholder="e.g. 9876543210" 
                  value={pgContactPhone}
                  onChange={e => setPgContactPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-pg-whatsapp">WhatsApp (Optional)</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  id="add-pg-whatsapp"
                  placeholder="WhatsApp if different" 
                  value={pgContactWhatsapp}
                  onChange={e => setPgContactWhatsapp(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-pg-email">Contact Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  id="add-pg-email"
                  placeholder="host@example.com" 
                  value={pgContactEmail}
                  onChange={e => setPgContactEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="add-pg-maps">Google Maps Link (Optional)</label>
                <input 
                  type="url" 
                  className="form-input" 
                  id="add-pg-maps"
                  placeholder="e.g. https://maps.google.com/?q=..." 
                  value={pgContactMapsUrl}
                  onChange={e => setPgContactMapsUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-card">
              <h4 className="admin-form-card-title">🖼️ Media & Photos</h4>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="add-pg-photos">Property Photos *</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  id="add-pg-photos"
                  style={{ display: 'none' }} 
                  multiple 
                  accept="image/*"
                  onChange={handleImageChange}
                />
                
                <div 
                  className="upload-zone" 
                  role="button"
                  tabIndex={0}
                  onClick={triggerFileSelect} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      triggerFileSelect();
                    }
                  }}
                  style={{ width: '100%', border: '2px dashed var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '24px 16px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--colors-surface-soft)', transition: 'border-color 0.2s ease' }}
                >
                  <UploadCloud size={28} style={{ margin: '0 auto 8px auto', color: 'var(--colors-muted)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--colors-muted)', marginTop: '2px', display: 'block' }}>Upload room layouts, mess facilities, or lobby photos</span>
                </div>

                {/* Render existing photos (when editing) */}
                {existingImages.length > 0 && (
                   <div style={{ marginTop: '12px' }}>
                     <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Photos ({existingImages.length})</label>
                     <div className="uploaded-preview-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', marginBottom: '12px' }}>
                       {existingImages.map((url, idx) => (
                         <div key={`exist-${idx}`} className="uploaded-preview-item" style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1.5px solid var(--colors-hairline)' }}>
                           <img src={url} className="uploaded-preview-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Existing room" />
                           <button 
                             type="button" 
                             className="uploaded-preview-del" 
                             onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                             style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(225, 29, 72, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                             title="Remove photo"
                           >
                             ✕
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Render newly selected files */}
                 {imagePreviews.length > 0 && (
                   <div style={{ marginTop: '12px' }}>
                     <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Photos to Upload ({imagePreviews.length})</label>
                     <div className="uploaded-preview-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                       {imagePreviews.map((url, idx) => (
                         <div key={idx} className="uploaded-preview-item" style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1.5px solid var(--colors-hairline)' }}>
                           <img src={url} className="uploaded-preview-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="New room upload" />
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
                   <span>{editingId ? 'Saving property details...' : 'Publishing room listing...'}</span>
                 </>
               ) : (
                 <>
                   {editingId ? <Edit3 size={16} /> : <Plus size={16} />}
                   <span>{editingId ? 'Save Changes' : 'Publish Property Listing'}</span>
                 </>
               )}
             </button>

             {editingId && (
               <button 
                 type="button" 
                 className="btn btn-secondary" 
                 onClick={cancelEdit}
                 style={{ width: '100%', height: '48px', fontWeight: 700, fontSize: '14.5px', marginTop: '8px', borderColor: 'var(--colors-hairline)' }}
               >
                 Cancel Editing
               </button>
             )}
          </div>
        </form>
      )}
    </div>
  );
}
