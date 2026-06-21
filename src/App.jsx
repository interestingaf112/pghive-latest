import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchAllPGs, 
  createPGListing, 
  deletePGListing, 
  logoutAdminSession, 
  subscribeToAuth,
  isFirebaseActive,
  getUserCredits,
  getUnlockedPGIds,
  unlockPGContact,
  addCredits
} from './firebase';
import Header from './components/Header';
import PGCard from './components/PGCard';
import PGDetailsModal from './components/PGDetailsModal';
import AdminDashboard from './components/AdminDashboard';
import PurchaseModal from './components/PurchaseModal';
import HelpCenterModal from './components/HelpCenterModal';
import TermsModal from './components/TermsModal';
import InfoModal from './components/InfoModal';
import ListYourPGModal from './components/ListYourPGModal';
import { useScrollReveal } from './hooks/useScrollReveal';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function App() {
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Full-page Loader States
  const [showLoader, setShowLoader] = useState(true);
  const [loaderFade, setLoaderFade] = useState(false);
  const [statusText, setStatusText] = useState('Locating verified properties...');

  // Scroll reveal observer
  const mainRef = useRef(null);
  useScrollReveal(mainRef);
  
  // Navigation State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  
  // Modals
  const [selectedPG, setSelectedPG] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [infoModalType, setInfoModalType] = useState(null); // 'investors' | 'features' | 'discrimination' | 'disability'
  const [showListModal, setShowListModal] = useState(false);

  // Credit system — loaded from service layer (not raw localStorage)
  const [userCredits, setUserCredits] = useState(0);
  const [unlockedPGIds, setUnlockedPGIds] = useState([]);
  // Map of pgId → { phone, email, whatsapp } for unlocked contacts
  const [unlockedContacts, setUnlockedContacts] = useState({});

  // Theme State (Light / Dark Mode)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('pg_wala_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pg_wala_theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
      return;
    }

    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];
      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 450,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  // Lock body scroll when any modal or loader screen is visible
  useEffect(() => {
    const isLocked = showLoader || !!selectedPG || showPurchaseModal || showHelpCenter || showTerms || !!infoModalType || showListModal;
    if (isLocked) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [showLoader, selectedPG, showPurchaseModal, showHelpCenter, showTerms, infoModalType, showListModal]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [rentValue, setRentValue] = useState(12000);
  
  // Filter chips for Amenities
  const [selectedAmenities, setSelectedAmenities] = useState({
    wifi: false,
    food: false,
    ac: false,
    gym: false,
    laundry: false,
    backup: false,
    security: false,
    parking: false
  });

  // Load PGs, Auth Status, and Credits on Mount
  useEffect(() => {
    // Dynamic status text loading messages
    const messages = [
      'Locating verified properties...',
      'Connecting to host server...',
      'Retrieving rental listings...',
      'Calculating credit unlock routes...',
      'Securing user portal session...'
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setStatusText(messages[msgIdx]);
    }, 900);

    async function loadData() {
      const startTime = Date.now();
      try {
        const [data, credits, unlocked] = await Promise.all([
          fetchAllPGs(),
          getUserCredits(),
          getUnlockedPGIds()
        ]);
        setPgs(data);
        setUserCredits(credits);
        setUnlockedPGIds(unlocked);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
        
        const elapsedTime = Date.now() - startTime;
        // Minimum total loading screen duration is 1.7s (1700ms).
        // The fade-out animation takes 500ms, so we start fade-out after (1700 - 500) = 1200ms minus elapsed time.
        const delayBeforeFade = Math.max(0, 1200 - elapsedTime);
        
        setTimeout(() => {
          setLoaderFade(true);
          setTimeout(() => {
            setShowLoader(false);
          }, 500);
        }, delayBeforeFade);
      }
    }
    loadData();

    // Subscribe to auth state updates
    const unsubscribe = subscribeToAuth((user) => {
      setAdminUser(user);
    });

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Hidden Admin Panel Query Parameter Activation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'admin' || params.get('admin') === 'true') {
      setIsAdminMode(true);
      // Clean up URL parameters to keep it hidden
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Database handlers
  const handleAddPG = async (pgData, imageFiles) => {
    const newListing = await createPGListing(pgData, imageFiles);
    const data = await fetchAllPGs();
    setPgs(data);
    return newListing;
  };

  const handleDeletePG = async (pgId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this PG listing?");
    if (!confirmDelete) return;

    try {
      await deletePGListing(pgId);
      const data = await fetchAllPGs();
      setPgs(data);
    } catch (err) {
      alert("Error deleting listing: " + err.message);
    }
  };

  const handleLogout = async () => {
    await logoutAdminSession();
    setIsAdminMode(false);
  };

  // NoBroker Unlock Handler — uses service-layer function
  const handleUnlockPG = async (pgId) => {
    if (unlockedPGIds.includes(pgId)) return;

    if (userCredits > 0) {
      const confirmUnlock = window.confirm(
        `Unlock owner contact details for 1 credit? (You have ${userCredits} credits remaining)`
      );
      if (confirmUnlock) {
        try {
          const contacts = await unlockPGContact(pgId);
          if (contacts) {
            // Update local state
            setUserCredits(prev => prev - 1);
            setUnlockedPGIds(prev => [...prev, pgId]);
            setUnlockedContacts(prev => ({ ...prev, [pgId]: contacts }));
          } else {
            alert("Unable to unlock contact details. Please try again.");
          }
        } catch (err) {
          alert("Error unlocking contacts: " + err.message);
        }
      }
    } else {
      const buyCredits = window.confirm(
        "You have 0 credits remaining! Would you like to buy a contact views package?"
      );
      if (buyCredits) {
        setShowPurchaseModal(true);
      }
    }
  };

  // Purchase handler — uses service-layer addCredits
  const handlePurchaseSuccess = async (purchasedCredits) => {
    try {
      await addCredits(purchasedCredits);
      // Refresh credits from service layer
      const newBalance = await getUserCredits();
      setUserCredits(newBalance);
    } catch (err) {
      console.error("Error adding credits:", err);
      alert("Failed to add credits. Please try again.");
    }
  };

  // Toggle Amenity Filter Chip
  const handleFilterAmenityToggle = (amenity) => {
    setSelectedAmenities(prev => ({
      ...prev,
      [amenity]: !prev[amenity]
    }));
  };

  // Default search localities for students/professionals
  const DEFAULT_LOCALITIES = ['SG Palya', 'Koramangala', 'HSR Layout', 'BTM Layout', 'Marathahalli'];

  // Helper to format locality for URL
  const getLocalitySlug = (loc) => {
    return loc.toLowerCase().replace(/\s+/g, '-');
  };

  // Sync state to URL client-side
  const handleLocalityChange = (loc) => {
    setSelectedLocality(loc);
    const slug = loc === 'all' ? '' : `/pg-in-${getLocalitySlug(loc)}`;
    const newPath = slug || '/';
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  };

  // Client-side SEO URL router mount & popstate handler
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/pg-in-([a-zA-Z0-9-]+)$/i);
      if (match) {
        const slug = match[1];
        const found = [...DEFAULT_LOCALITIES, ...pgs.map(p => p.locality)].find(
          loc => getLocalitySlug(loc) === slug
        );
        if (found) {
          setSelectedLocality(found);
        } else {
          const formatted = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          setSelectedLocality(formatted);
        }
      } else if (path === '/' || path === '') {
        setSelectedLocality('all');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [pgs]);

  // Dynamic SEO page Title and Meta description updates
  useEffect(() => {
    if (selectedLocality === 'all') {
      document.title = 'PG wala | Premium Paying Guest Accommodations in Bangalore';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Find the best Paying Guest (PG) accommodations in Bangalore with PG wala. Filter by locality, price, amenities, and gender preferences. Zero brokerage — contact owners directly.');
      }
    } else {
      document.title = `PG in ${selectedLocality} | Zero Brokerage PG accommodations on PG wala`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Find the best Paying Guest (PG) accommodations in ${selectedLocality}, Bangalore. Filter by price, amenities, and gender. Zero brokerage — contact owners directly on PG wala.`);
      }
    }
  }, [selectedLocality]);

  // Unique localities present in PG listings (for dropdown filters)
  const availableLocalities = ['all', ...new Set([...DEFAULT_LOCALITIES, ...pgs.map(pg => pg.locality)])];

  // Filtering Logic
  const filteredPGs = pgs.filter(pg => {
    // 1. Text Search query (match name, locality, address, description)
    const text = `${pg.name} ${pg.locality} ${pg.address} ${pg.description}`.toLowerCase();
    if (searchQuery && !text.includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Locality Filter (case-insensitive)
    if (selectedLocality !== 'all' && pg.locality.toLowerCase() !== selectedLocality.toLowerCase()) {
      return false;
    }

    // 3. Gender Filter
    if (selectedGender !== 'all' && pg.gender !== selectedGender) {
      return false;
    }

    // 4. Price Filter
    if (selectedPriceRange !== 'all') {
      if (selectedPriceRange === 'under-10000' && pg.price >= 10000) return false;
      if (selectedPriceRange === '10000-15000' && (pg.price < 10000 || pg.price > 15000)) return false;
      if (selectedPriceRange === 'above-15000' && pg.price <= 15000) return false;
    }

    // 5. Amenities Filters (ALL selected chips must match)
    const requiredAmenities = Object.keys(selectedAmenities).filter(key => selectedAmenities[key]);
    for (const amenity of requiredAmenities) {
      if (!pg.amenities || !pg.amenities.includes(amenity)) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      {/* Premium Animated Background Grid & Aurora Blobs */}
      <div className="animated-bg-blobs">
        <div className="bg-grid-overlay"></div>
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
      </div>

      <Header 
        isAdminMode={isAdminMode} 
        setIsAdminMode={setIsAdminMode} 
        adminUser={adminUser}
        onLogout={handleLogout}
        userCredits={userCredits}
        onOpenPurchaseModal={() => setShowPurchaseModal(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
        {isAdminMode ? (
          // ==========================================
          // ADMIN PORTAL VIEW
          // ==========================================
          <AdminDashboard 
            adminUser={adminUser}
            onLoginSuccess={(user) => setAdminUser(user)}
            pgs={pgs}
            onAddPG={handleAddPG}
            onDeletePG={handleDeletePG}
            isFirebaseActive={isFirebaseActive}
          />
        ) : (
          // ==========================================
          // MAIN MARKETPLACE CATALOG VIEW
          // ==========================================
          <div>
            {/* Split Premium Hero Banner */}
            <section className="campaign-hero">
              <div className="container" style={{ width: '100%' }}>
                <div className="hero-split-layout">
                  {/* Left Column: Context, Search */}
                  <div className="hero-left scroll-reveal">
                    <span className="hero-tagline">✨ Zero Brokerage Co-living</span>
                    {selectedLocality === 'all' ? (
                      <h1 className="hero-main-title" style={{ margin: 0 }}>
                        Zero brokerage — <span className="text-highlight">contact owners</span> directly
                      </h1>
                    ) : (
                      <h1 className="hero-main-title" style={{ margin: 0 }}>
                        Zero brokerage PGs in <span className="text-highlight">{selectedLocality}</span> — contact owners directly
                      </h1>
                    )}
                    <p className="campaign-hero-subtitle body-md" style={{ textAlign: 'left', maxWidth: '540px', margin: 0 }}>
                      Join Bangalore's largest co-living community with <strong>{pgs.length} verified listings</strong>. Skip broker calls. Unlock verified PG accommodations and chat directly with owners. Verified amenities, single/sharing options, and transparent pricing.
                    </p>
                    
                    {/* Hero Action Buttons */}
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          const gridEl = document.getElementById('catalog-grid');
                          gridEl?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ width: 'auto', padding: '10px 24px' }}
                      >
                        Explore PGs
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setShowListModal(true)}
                        style={{ width: 'auto', padding: '10px 24px', borderWidth: '1.5px', borderColor: 'var(--colors-ink)', fontWeight: 700 }}
                      >
                        List your PG free
                      </button>
                    </div>
                    
                    {/* Segmented Global Search Bar */}
                    <div className="search-bar-pill" style={{ width: '100%', marginTop: '8px' }}>
                      <div className="search-field-segment">
                        <span className="caption">Where</span>
                        <select 
                          className="search-segment-input"
                          value={selectedLocality}
                          onChange={(e) => handleLocalityChange(e.target.value)}
                        >
                          <option value="all">Search localities</option>
                          {availableLocalities.filter(l => l !== 'all').map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      <div className="search-field-segment">
                        <span className="caption">Who</span>
                        <select 
                          className="search-segment-input"
                          value={selectedGender}
                          onChange={(e) => setSelectedGender(e.target.value)}
                        >
                          <option value="all">Add preference</option>
                          <option value="boys">Boys Only</option>
                          <option value="girls">Girls Only</option>
                          <option value="unisex">Coliving</option>
                        </select>
                      </div>

                      <div className="search-field-segment">
                        <span className="caption">Budget</span>
                        <select 
                          className="search-segment-input"
                          value={selectedPriceRange}
                          onChange={(e) => setSelectedPriceRange(e.target.value)}
                        >
                          <option value="all">Any budget</option>
                          <option value="under-10000">Under ₹10,000</option>
                          <option value="10000-15000">₹10k - ₹15k</option>
                          <option value="above-15000">Above ₹15,000</option>
                        </select>
                      </div>

                      <button 
                        className="search-orb" 
                        onClick={() => {
                          const gridEl = document.getElementById('catalog-grid');
                          gridEl?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        aria-label="Search properties"
                      >
                        <Search className="search-orb-icon" size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Premium Brokerage Savings Calculator Widget */}
                  <div className="hero-right scroll-reveal" style={{ '--reveal-delay': '1' }}>
                    <div className="savings-calc-card">
                      <div className="calc-header">
                        <span className="calc-badge">💰 Zero-Brokerage Savings</span>
                        <h3 className="calc-title" style={{ margin: 0 }}>Brokerage Calculator</h3>
                      </div>
                      
                      <div className="calc-slider-group">
                        <div className="slider-label-row">
                          <span>Target Monthly Rent</span>
                          <span className="slider-value">₹{rentValue.toLocaleString('en-IN')}</span>
                        </div>
                        <input 
                          type="range" 
                          min="5000" 
                          max="30000" 
                          step="1000" 
                          value={rentValue} 
                          onChange={(e) => setRentValue(Number(e.target.value))}
                          className="calc-range-slider"
                        />
                        <div className="slider-ticks">
                          <span>₹5k</span>
                          <span>₹15k</span>
                          <span>₹30k</span>
                        </div>
                      </div>

                      <div className="calc-results">
                        <div className="result-item">
                          <span className="result-label">Agent Brokerage Cost (1 Month)</span>
                          <span className="result-val negative">₹{rentValue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="result-item">
                          <span className="result-label">PG wala Unlock Fee</span>
                          <span className="result-val positive">₹49</span>
                        </div>
                        <div className="result-divider"></div>
                        <div className="result-item total">
                          <span className="result-label">Total Savings</span>
                          <span className="result-val total-savings">₹{(rentValue - 49).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          const gridEl = document.getElementById('catalog-grid');
                          gridEl?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ width: '100%', marginTop: '8px' }}
                      >
                        Find Rooms & Save Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Explore Hubs Section */}
            <section className="hubs-section container" style={{ width: '100%' }}>
              <div className="scroll-reveal" style={{ marginBottom: '28px', textAlign: 'left' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Explore Bangalore's top co-living hubs</h3>
                <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>Quick filter by Bangalore's most popular professional neighborhoods</p>
              </div>

              <div className="hubs-grid">
                {[
                  { id: 'SG Palya', name: 'SG Palya', tag: 'Student Hub', desc: 'Popular among Christ University students & young professionals' },
                  { id: 'Koramangala', name: 'Koramangala', tag: 'Startup Hub', desc: 'Vibrant cafe culture, tech startups & tree-lined avenues' },
                  { id: 'HSR Layout', name: 'HSR Layout', tag: 'Tech Oasis', desc: 'Wide sectors, startups, parks & workspace hubs' },
                  { id: 'BTM Layout', name: 'BTM Layout', tag: 'Co-living Hub', desc: 'PG hotspot with great connectivity & affordable eating joints' },
                  { id: 'Marathahalli', name: 'Marathahalli', tag: 'IT Capital', desc: 'Close to ORR IT parks, shopping hubs & arterial transit lines' }
                ].map((hub, index) => {
                  const count = pgs.filter(pg => pg.locality.toLowerCase() === hub.id.toLowerCase()).length;
                  return (
                    <div 
                      key={hub.id} 
                      className="hub-card scroll-reveal" 
                      onClick={() => {
                        handleLocalityChange(hub.id);
                        const gridEl = document.getElementById('catalog-grid');
                        gridEl?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ cursor: 'pointer', '--reveal-delay': index }}
                    >
                      <div className="hub-card-number">0{index + 1}</div>
                      <div className="hub-card-content">
                        <span className="hub-badge">{hub.tag}</span>
                        <h4 className="hub-name">{hub.name}</h4>
                        <p className="hub-desc">{hub.desc}</p>
                        <span className="hub-count">{count} {count === 1 ? 'property' : 'properties'} →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Main Marketplace catalog grid */}
            <div className="container section-gap" id="catalog-grid" style={{ width: '100%' }}>
              
              {/* Keyword Search text input */}
              <div className="form-group scroll-reveal" style={{ maxWidth: '400px', marginBottom: '32px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Keywords Search</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', color: 'var(--colors-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search e.g. single sharing, wifi, security"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '40px', borderRadius: 'var(--rounded-full)', height: '44px' }}
                  />
                </div>
              </div>

              {/* Inactive & Inverted filter chips for Amenities */}
              <div className="scroll-reveal" style={{ textAlign: 'left', marginBottom: '40px', width: '100%' }}>
                <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlidersHorizontal size={14} />
                  <span>Filter by Amenities</span>
                </span>
                
                <div className="filter-chips-row">
                  {['wifi', 'food', 'ac', 'gym', 'laundry', 'backup', 'security', 'parking'].map(amenity => (
                    <button
                      key={amenity}
                      className={`filter-chip ${selectedAmenities[amenity] ? 'active' : ''}`}
                      onClick={() => handleFilterAmenityToggle(amenity)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {amenity === 'backup' ? 'Power Backup' : amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Header */}
              <div className="scroll-reveal" style={{ borderBottom: '1px solid var(--colors-hairline-soft)', paddingBottom: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
                <h2 className="display-sm" style={{ fontSize: '20px', fontWeight: 600 }}>Bangalore catalog</h2>
                <span className="body-sm">{filteredPGs.length} options</span>
              </div>

              {/* Catalog Grid */}
              {loading ? (
                <div className="pg-grid" style={{ width: '100%' }}>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="skeleton-card">
                      <div className="skeleton-image skeleton" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px' }}>
                        <div className="skeleton-title skeleton" />
                        <div className="skeleton-price skeleton" />
                      </div>
                      <div className="skeleton-text skeleton" style={{ width: '60%', marginTop: '8px' }} />
                      <div className="skeleton-text skeleton" style={{ width: '40%', marginTop: '4px' }} />
                    </div>
                  ))}
                </div>
              ) : filteredPGs.length === 0 ? (
                <div className="empty-state scroll-reveal" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', border: '1.5px dashed var(--colors-hairline)', borderRadius: '12px', background: 'var(--colors-surface-soft)' }}>
                  <h3 className="title-md" style={{ margin: 0 }}>No listings match your search</h3>
                  <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: '8px 0 20px 0', maxWidth: '400px', textAlign: 'center' }}>
                    Try resetting filters or search in a different locality. If you own a PG in this area, be the first to list it!
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSearchQuery('');
                        handleLocalityChange('all');
                        setSelectedGender('all');
                        setSelectedPriceRange('all');
                        setSelectedAmenities({
                          wifi: false,
                          food: false,
                          ac: false,
                          gym: false,
                          laundry: false,
                          backup: false,
                          security: false,
                          parking: false
                        });
                        const gridEl = document.getElementById('catalog-grid');
                        gridEl?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ width: 'auto', padding: '8px 18px', minHeight: '34px', border: '1.5px solid var(--colors-ink)' }}
                    >
                      Reset All Filters
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowListModal(true)}
                      style={{ width: 'auto', padding: '8px 18px', minHeight: '34px' }}
                    >
                      List your PG free
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pg-grid" style={{ width: '100%' }}>
                  {filteredPGs.map((pg, index) => (
                    <div key={pg.id} className="scroll-reveal" style={{ '--reveal-delay': index % 8 }}>
                      <PGCard 
                        pg={pg} 
                        onViewDetails={async (selected) => {
                          setSelectedPG(selected);
                          if (unlockedPGIds.includes(selected.id) && !unlockedContacts[selected.id]) {
                            try {
                              const contacts = await unlockPGContact(selected.id);
                              if (contacts) {
                                setUnlockedContacts(prev => ({ ...prev, [selected.id]: contacts }));
                              }
                            } catch (err) {
                              console.error("Error fetching unlocked contacts:", err);
                            }
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How It Works Step Guide */}
            <section className="how-it-works container" style={{ width: '100%' }}>
              <div className="scroll-reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Rent directly in 3 simple steps</h3>
                <p className="body-md" style={{ color: 'var(--colors-muted)', maxWidth: '500px', margin: '8px auto 0' }}>
                  No middleman agents, no hidden commissions. Just clean, transparent direct-to-host bookings.
                </p>
              </div>

              <div className="steps-grid">
                <div className="step-card scroll-reveal" style={{ '--reveal-delay': '0' }}>
                  <div className="step-icon-number">1</div>
                  <h4 className="step-title" style={{ margin: '0 0 8px 0' }}>Select Your Space</h4>
                  <p className="step-text">Browse fully-managed co-living rooms in Bangalore's premier hubs. Filter by price, sharing, gender, and ratings.</p>
                </div>
                <div className="step-card scroll-reveal" style={{ '--reveal-delay': '1' }}>
                  <div className="step-icon-number">2</div>
                  <h4 className="step-title" style={{ margin: '0 0 8px 0' }}>Unlock Host Contacts</h4>
                  <p className="step-text">Pay a nominal 1 credit (₹49) to unlock the owner's WhatsApp and phone number. Save thousands in brokerage.</p>
                </div>
                <div className="step-card scroll-reveal" style={{ '--reveal-delay': '2' }}>
                  <div className="step-icon-number">3</div>
                  <h4 className="step-title" style={{ margin: '0 0 8px 0' }}>Coordinate & Move In</h4>
                  <p className="step-text">Chat directly with the owner, inspect the property, and sign the rental agreement on your terms. Zero middleman fees.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedPG && (
        <PGDetailsModal 
          pg={selectedPG} 
          onClose={() => setSelectedPG(null)}
          unlockedPGIds={unlockedPGIds}
          unlockedContacts={unlockedContacts}
          onUnlockPG={handleUnlockPG}
          userCredits={userCredits}
        />
      )}

      {/* Owner Listing Modal */}
      {showListModal && (
        <ListYourPGModal 
          onClose={() => setShowListModal(false)}
          onAddPG={handleAddPG}
        />
      )}

      {/* Mobile Sticky Bottom Bar */}
      {!isAdminMode && (
        <div className="mobile-sticky-bar">
          <button 
            className="mobile-sticky-btn secondary"
            onClick={() => {
              const gridEl = document.getElementById('catalog-grid');
              gridEl?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            🔍 Search Catalog
          </button>
          <button 
            className="mobile-sticky-btn primary"
            onClick={() => setShowListModal(true)}
          >
            🏠 List PG Free
          </button>
        </div>
      )}

      {/* Credit Package Purchase Modal overlay */}
      {showPurchaseModal && (
        <PurchaseModal 
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      )}

      {/* Help Center Modal overlay */}
      {showHelpCenter && (
        <HelpCenterModal 
          onClose={() => setShowHelpCenter(false)}
        />
      )}

      {/* Terms and Conditions Modal overlay */}
      {showTerms && (
        <TermsModal 
          onClose={() => setShowTerms(false)}
        />
      )}

      {/* Info Modal overlay */}
      {infoModalType && (
        <InfoModal 
          type={infoModalType}
          onClose={() => setInfoModalType(null)}
        />
      )}

      {/* Clean White Footer (No contrast background) */}
      <footer>
        <div className="container" style={{ width: '100%' }}>
          <div className="footer-grid">
            <div className="scroll-reveal">
              <h4 className="footer-col-title">Support</h4>
              <ul className="footer-links">
                <li><button onClick={() => setShowHelpCenter(true)} className="footer-link-btn">Help Center</button></li>
                <li><button onClick={() => setInfoModalType('discrimination')} className="footer-link-btn">Anti-discrimination</button></li>
                <li><button onClick={() => setInfoModalType('disability')} className="footer-link-btn">Disability support</button></li>
              </ul>
            </div>

            <div className="scroll-reveal">
              <h4 className="footer-col-title">PG wala</h4>
              <ul className="footer-links">
                <li><button onClick={() => setInfoModalType('features')} className="footer-link-btn">New features</button></li>
                <li><button onClick={() => setInfoModalType('investors')} className="footer-link-btn">Investors</button></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom" style={{ width: '100%' }}>
            <div className="caption-sm" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>© {new Date().getFullYear()} PG wala, Inc.</span>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
              <span>·</span>
              <button onClick={() => setShowTerms(true)} className="footer-link-btn-flat">Terms</button>
              <span>·</span>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Sitemap</a>
              <span>·</span>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Company details</a>
            </div>
            <div className="caption-sm" style={{ fontWeight: 600, display: 'flex', gap: '12px' }}>
              <span>🌐 English (US)</span>
              <span>₹ INR</span>
            </div>
          </div>
        </div>
      </footer>

      {showLoader && (
        <div className={`page-loader-overlay ${loaderFade ? 'fade-out' : ''}`}>
          <div className="premium-loader-container">
            <div className="premium-loader-card">
              {/* Brand Logo with pulsing indicator */}
              <div className="premium-loader-logo">
                <span>pg.wala</span>
                <span className="premium-loader-dot"></span>
              </div>
              
              {/* Double Ring Geometric Spinner */}
              <div className="premium-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring-inner"></div>
              </div>
              
              <p className="premium-loader-text">{statusText}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
