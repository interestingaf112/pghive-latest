import { useState, useEffect, useRef } from 'react';
import { 
  fetchAllPGs, 
  createPGListing, 
  deletePGListing, 
  updatePGListing,
  getAdminPGContactDetails,
  logoutAdminSession, 
  subscribeToAuth,
  isFirebaseActive,
  getUserCredits,
  getUnlockedPGIds,
  unlockPGContact,
  addCredits,
  logoutTenantUser
} from './firebase';
import Header from './components/Header';
import DecryptedText from './components/DecryptedText';
import PGCard from './components/PGCard';
import PGDetailsModal from './components/PGDetailsModal';
import AdminDashboard from './components/AdminDashboard';
import PurchaseModal from './components/PurchaseModal';
import HelpCenterModal from './components/HelpCenterModal';
import TermsModal from './components/TermsModal';
import PrivacyModal from './components/PrivacyModal';
import InfoModal from './components/InfoModal';
import ListYourPGModal from './components/ListYourPGModal';
import AuthModal from './components/AuthModal';
import AccountCentreModal from './components/AccountCentreModal';
import { Analytics } from '@vercel/analytics/react';
import { useScrollReveal } from './hooks/useScrollReveal';
import { Search, SlidersHorizontal, Home, Coins, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { BANGALORE_LOCALITIES } from './utils/constants';

const DEFAULT_LOCALITIES = BANGALORE_LOCALITIES;

export default function App() {
  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scroll reveal observer
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  const hubsGridRef = useRef(null);

  const scrollHubs = (direction) => {
    if (hubsGridRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      hubsGridRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  // Navigation State - lazy initialize from URL params
  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isAdmin = params.get('portal') === 'admin' || params.get('admin') === 'true';
      if (isAdmin) {
        setTimeout(() => {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }, 0);
      }
      return isAdmin;
    }
    return false;
  });
  const [adminUser, setAdminUser] = useState(null);
  
  // Modals
  const [selectedPG, setSelectedPG] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [infoModalType, setInfoModalType] = useState(null); // 'investors' | 'features' | 'discrimination' | 'disability'
  const [showListModal, setShowListModal] = useState(false);

  // Authentication Modals & Session States - lazy initialize session
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined' && !isFirebaseActive) {
      const storedTenant = localStorage.getItem('tenant_session');
      if (storedTenant) {
        try {
          return JSON.parse(storedTenant);
        } catch (e) {
          console.error("Error loading mock tenant session:", e);
        }
      }
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountCentre, setShowAccountCentre] = useState(false);

  // Credit system — loaded from service layer (not raw localStorage)
  const [userCredits, setUserCredits] = useState(0);
  const [unlockedPGIds, setUnlockedPGIds] = useState([]);
  // Map of pgId → { phone, email, whatsapp } for unlocked contacts
  const [unlockedContacts, setUnlockedContacts] = useState({});

  // Theme State - Forced to Light Mode permanently as default
  const theme = 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('pg_wala_theme', 'light');
  }, []);

  const toggleTheme = () => {};

  // Lock body scroll when any modal is visible
  useEffect(() => {
    const isLocked = !!selectedPG || showPurchaseModal || showHelpCenter || showTerms || showPrivacy || !!infoModalType || showListModal;
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
  }, [selectedPG, showPurchaseModal, showHelpCenter, showTerms, showPrivacy, infoModalType, showListModal]);

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

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Mobile Bottom Sheet
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Onboarding - lazy initialize
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('pg_wala_onboarded');
    }
    return false;
  });
  const [onboardingStep, setOnboardingStep] = useState(1);

  const closeOnboarding = () => {
    localStorage.setItem('pg_wala_onboarded', 'true');
    setShowOnboarding(false);
  };

  // Load PGs, Auth Status, and Credits on Mount
  useEffect(() => {
    async function loadData() {
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
      }
    }
    loadData();

    // Subscribe to auth state updates
    const adminEmail = import.meta.env?.VITE_ADMIN_USER;
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        if (user.email === adminEmail || user.username === adminEmail || user.uid === 'local-admin') {
          setAdminUser(user);
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
        if (isFirebaseActive) {
          setCurrentUser(null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Database handlers
  const handleAddPG = async (pgData, imageFiles) => {
    const newListing = await createPGListing(pgData, imageFiles);
    const data = await fetchAllPGs();
    setPgs(data);
    return newListing;
  };

  const handleUpdatePG = async (pgId, pgData, imageFilesOrUrls) => {
    const updatedListing = await updatePGListing(pgId, pgData, imageFilesOrUrls);
    const data = await fetchAllPGs();
    setPgs(data);
    return updatedListing;
  };

  const handleDeletePG = async (pgId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this PG listing?");
    if (!confirmDelete) return;

    try {
      await deletePGListing(pgId);
      const data = await fetchAllPGs();
      setPgs(data);
    } catch (err) {
      showToast("Error deleting listing: " + err.message, "error");
    }
  };

  const handleLogout = async () => {
    await logoutAdminSession();
    setIsAdminMode(false);
  };

  // Sync credits and unlocked listings when the user session changes
  useEffect(() => {
    async function syncUserData() {
      try {
        const [credits, unlocked] = await Promise.all([
          getUserCredits(),
          getUnlockedPGIds()
        ]);
        setUserCredits(credits);
        setUnlockedPGIds(unlocked);
      } catch (err) {
        console.error("Error syncing user data on auth change:", err);
      }
    }
    syncUserData();
  }, [currentUser]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogoutUser = async () => {
    try {
      await logoutTenantUser();
    } catch (err) {
      console.error("User signout error:", err);
    }
    setCurrentUser(null);
    setShowAccountCentre(false);
    window.location.reload();
  };

  const handleOpenPurchaseModal = () => {
    if (!currentUser) {
      showToast("Please sign in or create an account to buy credits.", "info");
      setShowAuthModal(true);
      return;
    }
    setShowPurchaseModal(true);
  };

  // NoBroker Unlock Handler — uses service-layer function
  const handleUnlockPG = async (pgId) => {
    if (unlockedPGIds.includes(pgId)) return;

    if (!currentUser) {
      showToast("Please sign in or create an account to unlock contacts.", "info");
      setShowAuthModal(true);
      return;
    }

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
            showToast("Unable to unlock contact details. Please try again.", "error");
          }
        } catch (err) {
          showToast("Error unlocking contacts: " + err.message, "error");
        }
      }
    } else {
      const buyCredits = window.confirm(
        "You have 0 credits remaining! Would you like to buy a contact views package?"
      );
      if (buyCredits) {
        if (!currentUser) {
          showToast("Please sign in or create an account to buy credits.", "info");
          setShowAuthModal(true);
        } else {
          setShowPurchaseModal(true);
        }
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
      showToast("Failed to add credits. Please try again.", "error");
    }
  };

  // Toggle Amenity Filter Chip
  const handleFilterAmenityToggle = (amenity) => {
    setSelectedAmenities(prev => ({
      ...prev,
      [amenity]: !prev[amenity]
    }));
  };

  // Helper to open details modal and update URL query params
  const handleSelectPG = async (pg) => {
    setSelectedPG(pg);
    if (pg) {
      // Add ?pg=pgId to URL query params
      const params = new URLSearchParams(window.location.search);
      params.set('pg', pg.id);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);

      // Pre-fetch unlocked contacts if already unlocked
      if (unlockedPGIds.includes(pg.id) && !unlockedContacts[pg.id]) {
        try {
          const contacts = await unlockPGContact(pg.id);
          if (contacts) {
            setUnlockedContacts(prev => ({ ...prev, [pg.id]: contacts }));
          }
        } catch (err) {
          console.error("Error fetching unlocked contacts:", err);
        }
      }
    } else {
      // Remove ?pg parameter cleanly from URL
      const params = new URLSearchParams(window.location.search);
      params.delete('pg');
      const searchStr = params.toString();
      const newUrl = searchStr ? `${window.location.pathname}?${searchStr}` : window.location.pathname;
      window.history.pushState({}, '', newUrl);
    }
  };

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
      // 1. Locality routing
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

      // 2. Deep linking check for ?pg=pgId
      const params = new URLSearchParams(window.location.search);
      const pgId = params.get('pg');
      if (pgId && pgs.length > 0) {
        const foundPG = pgs.find(p => p.id === pgId);
        if (foundPG) {
          setSelectedPG(foundPG);
          if (unlockedPGIds.includes(pgId) && !unlockedContacts[pgId]) {
            unlockPGContact(pgId).then(contacts => {
              if (contacts) {
                setUnlockedContacts(prev => ({ ...prev, [pgId]: contacts }));
              }
            }).catch(err => console.error("Error fetching prefetched contacts:", err));
          }
        }
      } else {
        setSelectedPG(null);
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [pgs, unlockedPGIds, unlockedContacts]);

  // Dynamic SEO page Title, Meta description, and JSON-LD schema updates for selected PG listing
  useEffect(() => {
    if (selectedPG) {
      // Dynamic Title
      document.title = `${selectedPG.name} | PG in ${selectedPG.locality} - PG wala`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const amenitiesStr = selectedPG.amenities ? Object.keys(selectedPG.amenities).filter(k => selectedPG.amenities[k]).join(', ') : '';
        metaDesc.setAttribute('content', `Explore ${selectedPG.name} co-living in ${selectedPG.locality}, Bangalore. Preferred for: ${selectedPG.preferredGender}. Key amenities: ${amenitiesStr}. Rent starts at ₹${selectedPG.price}/month. Zero brokerage on PG wala.`);
      }

      // Dynamic JSON-LD Schema
      const existingSchema = document.getElementById('dynamic-pg-schema');
      if (existingSchema) existingSchema.remove();

      const schemaData = {
        "@context": "https://schema.org",
        "@type": "Accommodation",
        "name": selectedPG.name,
        "description": selectedPG.description,
        "image": selectedPG.thumbnail || (selectedPG.photos && selectedPG.photos[0]) || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": selectedPG.locality,
          "addressRegion": "Karnataka",
          "addressCountry": "IN"
        },
        "offers": {
          "@type": "Offer",
          "price": selectedPG.price,
          "priceCurrency": "INR",
          "category": "Rent"
        },
        "amenityFeature": selectedPG.amenities ? Object.keys(selectedPG.amenities).filter(k => selectedPG.amenities[k]).map(key => ({
          "@type": "LocationFeatureSpecification",
          "name": key,
          "value": true
        })) : []
      };

      const script = document.createElement('script');
      script.id = 'dynamic-pg-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schemaData);
      document.head.appendChild(script);

      return () => {
        // Revert title & description to locality level
        if (selectedLocality === 'all') {
          document.title = 'PG wala | Premium Paying Guest Accommodations in Bangalore';
          const metaDescDefault = document.querySelector('meta[name="description"]');
          if (metaDescDefault) {
            metaDescDefault.setAttribute('content', 'Find the best Paying Guest (PG) accommodations in Bangalore with PG wala. Filter by locality, price, amenities, and gender preferences. Zero brokerage — contact owners directly.');
          }
        } else {
          document.title = `PG in ${selectedLocality} | Zero Brokerage PG accommodations on PG wala`;
          const metaDescLoc = document.querySelector('meta[name="description"]');
          if (metaDescLoc) {
            metaDescLoc.setAttribute('content', `Find the best Paying Guest (PG) accommodations in ${selectedLocality}, Bangalore. Filter by price, amenities, and gender. Zero brokerage — contact owners directly on PG wala.`);
          }
        }

        const activeSchema = document.getElementById('dynamic-pg-schema');
        if (activeSchema) activeSchema.remove();
      };
    }
  }, [selectedPG, selectedLocality]);

  // Unique localities present in PG listings (for dropdown filters)
  const availableLocalities = ['all', ...new Set([...DEFAULT_LOCALITIES, ...pgs.map(pg => pg.locality)])];

  // Filtering Logic
  const filteredPGs = pgs.filter(pg => {
    // 1. Text Search query (match name, locality, address, description)
    const text = `${pg.name} ${pg.locality} ${pg.address} ${pg.description}`.toLowerCase();
    if (searchQuery && !text.includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Locality Filter (case-insensitive partial match)
    if (selectedLocality !== 'all' && !pg.locality.toLowerCase().includes(selectedLocality.toLowerCase()) && !selectedLocality.toLowerCase().includes(pg.locality.toLowerCase())) {
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

  // Inject/update main directory list schema (ItemList) - Declared after filteredPGs is initialized
  useEffect(() => {
    const existingListSchema = document.getElementById('directory-list-schema');
    if (existingListSchema) existingListSchema.remove();

    if (filteredPGs.length > 0) {
      const itemListElement = filteredPGs.map((pg, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://pgwala.vercel.app/?pg=${pg.id}`,
        "name": pg.name
      }));

      const schemaData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": selectedLocality === 'all' ? "Paying Guest listings in Bangalore" : `Paying Guest listings in ${selectedLocality}, Bangalore`,
        "numberOfItems": filteredPGs.length,
        "itemListElement": itemListElement
      };

      const script = document.createElement('script');
      script.id = 'directory-list-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schemaData);
      document.head.appendChild(script);
    }

    return () => {
      const activeListSchema = document.getElementById('directory-list-schema');
      if (activeListSchema) activeListSchema.remove();
    };
  }, [filteredPGs, selectedLocality]);

  return (
    <>
      {/* Clean Minimalist Background Grid */}
      <div className="animated-bg-blobs">
        <div className="bg-grid-overlay"></div>
      </div>

      <Header 
        isAdminMode={isAdminMode} 
        setIsAdminMode={setIsAdminMode} 
        adminUser={adminUser}
        onLogout={handleLogout}
        userCredits={userCredits}
        onOpenPurchaseModal={handleOpenPurchaseModal}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          console.log("onOpenAuthModal called in App.jsx, setting showAuthModal to true");
          setShowAuthModal(true);
        }}
        onLogoutUser={handleLogoutUser}
        onOpenAccountCentre={() => setShowAccountCentre(true)}
      />

      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1 }} className="app-main-content">
        {isAdminMode ? (
          // ==========================================
          // ADMIN PORTAL VIEW
          // ==========================================
          <AdminDashboard 
            adminUser={adminUser}
            onLoginSuccess={(user) => setAdminUser(user)}
            pgs={pgs}
            onAddPG={handleAddPG}
            onUpdatePG={handleUpdatePG}
            getAdminPGContactDetails={getAdminPGContactDetails}
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
              {/* Premium Background Animations Container */}
              <div className="hero-animations-container">
                <div className="hero-blob blob-1"></div>
                <div className="hero-blob blob-2"></div>
                <div className="hero-blob blob-3"></div>
                <div className="hero-grid-overlay"></div>
              </div>
              <div className="container" style={{ width: '100%' }}>
                <div className="hero-split-layout">
                  {/* Left Column: Context, Search */}
                  <div className="hero-left scroll-reveal">
                    <span className="hero-tagline">✨ Zero Brokerage Co-living</span>
                    {selectedLocality === 'all' ? (
                      <h1 className="hero-main-title" style={{ margin: 0 }}>
                        <DecryptedText text="Zero brokerage — contact owners directly" animateOn="view" useOriginalCharsOnly />
                      </h1>
                    ) : (
                      <h1 className="hero-main-title" style={{ margin: 0 }}>
                        <DecryptedText text={`PGs in ${selectedLocality}`} animateOn="view" useOriginalCharsOnly />
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
                        <input 
                          type="text"
                          list="global-search-localities"
                          className="search-segment-input"
                          placeholder="Search localities..."
                          value={selectedLocality === 'all' ? '' : selectedLocality}
                          onChange={(e) => handleLocalityChange(e.target.value || 'all')}
                          style={{ backgroundImage: 'none', paddingRight: 0 }}
                        />
                        <datalist id="global-search-localities">
                          {availableLocalities.filter(l => l !== 'all').map(loc => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
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
                        <span className="calc-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Coins size={12} /> Zero-Brokerage Savings
                        </span>
                        <h3 className="calc-title" style={{ margin: 0 }}>Brokerage Calculator</h3>
                      </div>
                      
                      <div className="calc-body-redesign">
                        <div className="calc-slider-group">
                          <div className="slider-label-row">
                            <span className="slider-title">Monthly Rent Target</span>
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
                            style={{ '--slider-progress': `${((rentValue - 5000) / 25000) * 100}%` }}
                          />
                          <div className="slider-ticks">
                            <span>₹5,000</span>
                            <span>₹15,000</span>
                            <span>₹30,000</span>
                          </div>
                        </div>

                        <div className="comparison-bars-container">
                          <div className="comparison-bar-item broker-loss">
                            <div className="bar-label-row">
                              <span className="bar-name">Broker Agent Fee</span>
                              <span className="bar-cost">₹{rentValue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="bar-track">
                              <div className="bar-fill red-fill" style={{ width: '100%' }}></div>
                            </div>
                          </div>

                          <div className="comparison-bar-item pgwala-win">
                            <div className="bar-label-row">
                              <span className="bar-name">PG wala Fee</span>
                              <span className="bar-cost">₹49</span>
                            </div>
                            <div className="bar-track">
                              <div className="bar-fill green-fill" style={{ width: `${(49 / rentValue) * 100}%`, minWidth: '4px' }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="savings-summary-banner">
                          <div className="summary-left">
                            <span className="summary-title">TOTAL SAVINGS</span>
                            <span className="summary-amount">₹{(rentValue - 49).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="summary-right">
                            <span className="savings-badge-pill">99.6% Saved</span>
                            <span className="savings-multiplier">{Math.round(rentValue / 49)}x Cheaper</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        className="btn btn-primary animate-pulse" 
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

            {/* Main Marketplace catalog grid */}
            <div className="container section-gap" id="catalog-grid" style={{ width: '100%' }}>
              
              {/* Sticky Filter Bar */}
              <div className="sticky-filter-bar scroll-reveal" style={{ 
                position: 'sticky', 
                top: '72px', 
                zIndex: 200, 
                backgroundColor: 'var(--colors-surface-card)', 
                border: '1px solid var(--colors-hairline)', 
                borderRadius: 'var(--rounded-md)',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                {/* Search field input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 250px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--colors-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search by keywords (single room, wifi...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '34px', borderRadius: 'var(--rounded-full)', height: '36px', fontSize: '12px', marginBottom: 0 }}
                  />
                </div>

                {/* Desktop-only selectors */}
                <div className="desktop-filters-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input 
                    type="text"
                    list="global-search-localities"
                    className="form-input" 
                    placeholder="All Localities"
                    value={selectedLocality === 'all' ? '' : selectedLocality}
                    onChange={e => handleLocalityChange(e.target.value || 'all')}
                    style={{ height: '36px', padding: '0 12px', fontSize: '12px', width: '130px', marginBottom: 0 }}
                  />

                  <select 
                    className="form-input" 
                    value={selectedGender} 
                    onChange={e => setSelectedGender(e.target.value)}
                    style={{ height: '36px', padding: '0 12px', fontSize: '12px', width: '120px', marginBottom: 0 }}
                  >
                    <option value="all">Any Gender</option>
                    <option value="boys">Boys Only</option>
                    <option value="girls">Girls Only</option>
                    <option value="unisex">Coliving</option>
                  </select>

                  <select 
                    className="form-input" 
                    value={selectedPriceRange} 
                    onChange={e => setSelectedPriceRange(e.target.value)}
                    style={{ height: '36px', padding: '0 12px', fontSize: '12px', width: '120px', marginBottom: 0 }}
                  >
                    <option value="all">Any Budget</option>
                    <option value="under-10000">Under ₹10k</option>
                    <option value="10000-15000">₹10k - ₹15k</option>
                    <option value="above-15000">Above ₹15k</option>
                  </select>
                </div>

                {/* Mobile Filter sheet Trigger Button */}
                <button 
                  className="btn btn-secondary mobile-filters-trigger"
                  onClick={() => setShowMobileFilters(true)}
                  style={{ display: 'none', height: '36px', padding: '0 16px', fontSize: '12px', width: 'auto', alignItems: 'center', gap: '6px', marginBottom: 0, fontWeight: 700 }}
                >
                  <SlidersHorizontal size={12} />
                  <span>Filters</span>
                </button>
              </div>

              {/* Quick Filter Chips (Instantly updates states) */}
              <div className="quick-filter-chips scroll-reveal" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <button 
                  className={`filter-chip ${selectedPriceRange === 'under-10000' ? 'active' : ''}`}
                  onClick={() => setSelectedPriceRange(prev => prev === 'under-10000' ? 'all' : 'under-10000')}
                >
                  Under ₹10k
                </button>
                <button 
                  className={`filter-chip ${selectedAmenities.ac ? 'active' : ''}`}
                  onClick={() => handleFilterAmenityToggle('ac')}
                >
                  Air Conditioned (AC)
                </button>
                <button 
                  className={`filter-chip ${selectedGender === 'girls' ? 'active' : ''}`}
                  onClick={() => setSelectedGender(prev => prev === 'girls' ? 'all' : 'girls')}
                >
                  Girls Only
                </button>
                <button 
                  className={`filter-chip ${selectedGender === 'unisex' ? 'active' : ''}`}
                  onClick={() => setSelectedGender(prev => prev === 'unisex' ? 'all' : 'unisex')}
                >
                  Coliving
                </button>
                <button 
                  className={`filter-chip ${selectedPriceRange === '10000-15000' ? 'active' : ''}`}
                  onClick={() => setSelectedPriceRange(prev => prev === '10000-15000' ? 'all' : '10000-15000')}
                >
                  ₹10k - ₹15k
                </button>
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
                      className="btn btn-primary" 
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
                        isUnlocked={unlockedPGIds.includes(pg.id)}
                        onViewDetails={handleSelectPG}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explore Hubs Section */}
            <section className="hubs-section container" style={{ width: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div className="scroll-reveal" style={{ textAlign: 'left' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>Explore Bangalore's top co-living hubs</h3>
                  <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>Quick filter by Bangalore's most popular professional neighborhoods</p>
                </div>
                
                {/* Scroll Navigation Buttons */}
                <div className="desktop-only" style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => scrollHubs('left')}
                    className="btn btn-secondary" 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'unset' }}
                    aria-label="Scroll hubs left"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => scrollHubs('right')}
                    className="btn btn-secondary" 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'unset' }}
                    aria-label="Scroll hubs right"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div ref={hubsGridRef} className="hubs-grid" style={{ scrollBehavior: 'smooth' }}>
                {[
                  { id: 'SG Palya', name: 'SG Palya', tag: 'Student Hub', desc: 'Popular among Christ University students & young professionals', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80' },
                  { id: 'Koramangala', name: 'Koramangala', tag: 'Startup Hub', desc: 'Vibrant cafe culture, tech startups & tree-lined avenues', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80' },
                  { id: 'HSR Layout', name: 'HSR Layout', tag: 'Tech Oasis', desc: 'Wide sectors, startups, parks & workspace hubs', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
                  { id: 'BTM Layout', name: 'BTM Layout', tag: 'Co-living Hub', desc: 'PG hotspot with great connectivity & affordable eating joints', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80' },
                  { id: 'Marathahalli', name: 'Marathahalli', tag: 'IT Capital', desc: 'Close to ORR IT parks, shopping hubs & arterial transit lines', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' }
                ].map((hub, index) => {
                  const count = pgs.filter(pg => pg.locality.toLowerCase() === hub.id.toLowerCase()).length;
                  return (
                    <div 
                      key={hub.id} 
                      className={`hub-card scroll-reveal ${index === 0 ? 'featured' : ''}`} 
                      onClick={() => {
                        handleLocalityChange(hub.id);
                        const gridEl = document.getElementById('catalog-grid');
                        gridEl?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ cursor: 'pointer', '--reveal-delay': index }}
                    >
                      <div className="hub-card-bg" style={{ backgroundImage: `url(${hub.image})` }}></div>
                      <div className="hub-card-overlay"></div>
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
            
            {/* About Us Premium Section */}
            <section id="about-section" className="about-us-section container section-gap" style={{ width: '100%', borderTop: '1px solid var(--colors-hairline)', paddingTop: '64px' }}>
              <div className="hero-split-layout" style={{ gap: '32px' }}>
                <div className="scroll-reveal" style={{ textAlign: 'left' }}>
                  <span className="hero-tagline" style={{ display: 'inline-block', marginBottom: '16px' }}>🔑 About PG wala</span>
                  <h3 className="section-title" style={{ margin: '0 0 16px 0', fontSize: '32px', lineHeight: 1.2 }}>
                    Simplifying co-living in Bangalore <span className="text-highlight">without the broker fee</span>
                  </h3>
                  <p className="body-md" style={{ color: 'var(--colors-body)', lineHeight: 1.7, marginBottom: '16px' }}>
                    Finding a comfortable, managed room in Bangalore shouldn't cost you an arm and a leg. Traditional platforms force you to talk to brokers who charge up to a full month's rent as a commission fee for simply sharing a phone number.
                  </p>
                  <p className="body-md" style={{ color: 'var(--colors-body)', lineHeight: 1.7 }}>
                    <strong>PG wala</strong> was founded to disrupt this outdated system. We connect paying guests directly with property owners and hosts. By checking verification certificates, managing amenities details, and offering direct chat routes, we make co-living secure, simple, and entirely brokerage-free.
                  </p>
                </div>

                <div className="scroll-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '16px', '--reveal-delay': '1' }}>
                  <div style={{ 
                    backgroundColor: 'var(--colors-surface-card)', 
                    border: '1px solid var(--colors-hairline)', 
                    borderRadius: 'var(--rounded-md)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--colors-primary)', fontWeight: 700, fontSize: '16px' }}>🚫 Zero Brokerage, Period</h4>
                    <p className="body-sm" style={{ margin: 0, color: 'var(--colors-muted)', lineHeight: 1.5 }}>
                      We do not charge commissions, processing fees, or hidden charges. Pay host contacts directly and save thousands.
                    </p>
                  </div>

                  <div style={{ 
                    backgroundColor: 'var(--colors-surface-card)', 
                    border: '1px solid var(--colors-hairline)', 
                    borderRadius: 'var(--rounded-md)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--colors-primary)', fontWeight: 700, fontSize: '16px' }}>🛡️ 100% Verified Hosts</h4>
                    <p className="body-sm" style={{ margin: 0, color: 'var(--colors-muted)', lineHeight: 1.5 }}>
                      Every PG listed on our marketplace has undergone a direct checklist audit to confirm rooms, furnishing, amenities, and security.
                    </p>
                  </div>

                  <div style={{ 
                    backgroundColor: 'var(--colors-surface-card)', 
                    border: '1px solid var(--colors-hairline)', 
                    borderRadius: 'var(--rounded-md)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--colors-primary)', fontWeight: 700, fontSize: '16px' }}>💬 Direct Owner Connection</h4>
                    <p className="body-sm" style={{ margin: 0, color: 'var(--colors-muted)', lineHeight: 1.5 }}>
                      Unlock phone numbers or chat on WhatsApp to coordinate virtual or physical site visits immediately.
                    </p>
                  </div>
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
          onClose={() => handleSelectPG(null)}
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

      {/* Auth Modal overlay */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Account Centre Modal overlay */}
      <AccountCentreModal 
        isOpen={showAccountCentre}
        onClose={() => setShowAccountCentre(false)}
        currentUser={currentUser}
        userCredits={userCredits}
        onOpenPurchaseModal={() => {
          setShowAccountCentre(false);
          setShowPurchaseModal(true);
        }}
        onLogout={handleLogoutUser}
        pgs={pgs}
        unlockedPGIds={unlockedPGIds}
      />

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
            <Search size={14} /> Search Catalog
          </button>
          <button 
            className="mobile-sticky-btn primary"
            onClick={() => setShowListModal(true)}
          >
            <Home size={14} /> List PG Free
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

      {/* Privacy Policy Modal overlay */}
      {showPrivacy && (
        <PrivacyModal 
          onClose={() => setShowPrivacy(false)}
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
              <button onClick={() => setShowPrivacy(true)} className="footer-link-btn-flat">Privacy</button>
              <span>·</span>
              <button onClick={() => setShowTerms(true)} className="footer-link-btn-flat">Terms</button>
              <span>·</span>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Sitemap</a>
              <span>·</span>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Company details</a>
            </div>
            <div className="caption-sm" style={{ fontWeight: 600, display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button className="footer-link-btn-flat" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} />
                <span>English (US)</span>
              </button>
              <button className="footer-link-btn-flat" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>₹</span>
                <span>INR</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <div className="toast-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '350px' }}>
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`toast-item ${t.type}`} 
            style={{ 
              padding: '12px 16px', 
              borderRadius: 'var(--rounded-md)', 
              backgroundColor: t.type === 'error' ? '#ef4444' : (t.type === 'success' ? '#10b981' : '#3b82f6'), 
              color: '#ffffff', 
              fontSize: '13px', 
              fontWeight: 600, 
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <span>{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {showMobileFilters && (
        <div className="mobile-bottom-sheet-overlay" onClick={() => setShowMobileFilters(false)}>
          <div className="mobile-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">Filter Listings</span>
              <button className="sheet-close" onClick={() => setShowMobileFilters(false)}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="form-group">
                <label className="form-label" htmlFor="mobile-locality-select">Locality</label>
                <input 
                  type="text"
                  id="mobile-locality-select"
                  list="global-search-localities"
                  className="form-input" 
                  placeholder="All localities"
                  value={selectedLocality === 'all' ? '' : selectedLocality}
                  onChange={e => handleLocalityChange(e.target.value || 'all')}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobile-gender-select">Gender Preference</label>
                <select id="mobile-gender-select" className="form-input" value={selectedGender} onChange={e => setSelectedGender(e.target.value)}>
                  <option value="all">Any Gender</option>
                  <option value="boys">Boys Only</option>
                  <option value="girls">Girls Only</option>
                  <option value="unisex">Coliving / Unisex</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobile-price-select">Monthly Rent</label>
                <select id="mobile-price-select" className="form-input" value={selectedPriceRange} onChange={e => setSelectedPriceRange(e.target.value)}>
                  <option value="all">Any budget</option>
                  <option value="under-10000">Under ₹10,000</option>
                  <option value="10000-15000">₹10,000 - ₹15,000</option>
                  <option value="above-15000">Above ₹15,000</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amenities</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {['wifi', 'food', 'ac', 'gym', 'laundry', 'backup', 'security', 'parking'].map(amenity => (
                    <button
                      key={`sheet-${amenity}`}
                      className={`filter-chip ${selectedAmenities[amenity] ? 'active' : ''}`}
                      onClick={() => handleFilterAmenityToggle(amenity)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {amenity === 'backup' ? 'Power Backup' : amenity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-Step Onboarding Modal */}
      {showOnboarding && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '36px', borderRadius: 'var(--rounded-md)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--colors-accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                How It Works • Step {onboardingStep} of 3
              </div>
              
              {onboardingStep === 1 && (
                <div>
                  <h3 className="title-md" style={{ marginBottom: '12px', fontSize: '18px' }}><span role="img" aria-hidden="true">🔍</span> 1. Search Localities</h3>
                  <p className="body-md" style={{ color: 'var(--colors-muted)', lineHeight: '1.6', marginBottom: '24px', fontSize: '13px' }}>
                    Explore verified co-living properties in Bangalore's tech hubs like HSR, Koramangala, Indiranagar, and Whitefield. Use filters to match your budget and gender preferences.
                  </p>
                </div>
              )}

              {onboardingStep === 2 && (
                <div>
                  <h3 className="title-md" style={{ marginBottom: '12px', fontSize: '18px' }}><span role="img" aria-hidden="true">🔑</span> 2. Unlock Direct Contacts</h3>
                  <p className="body-md" style={{ color: 'var(--colors-muted)', lineHeight: '1.6', marginBottom: '24px', fontSize: '13px' }}>
                    Pay a nominal 1 credit (₹49) to unlock the host's direct phone number and WhatsApp. Skip the spammy agent calls.
                  </p>
                </div>
              )}

              {onboardingStep === 3 && (
                <div>
                  <h3 className="title-md" style={{ marginBottom: '12px', fontSize: '18px' }}><span role="img" aria-hidden="true">🏠</span> 3. Move In & Save</h3>
                  <p className="body-md" style={{ color: 'var(--colors-muted)', lineHeight: '1.6', marginBottom: '24px', fontSize: '13px' }}>
                    Negotiate directly with property owners and move in! Save up to ₹15,000+ in agent brokerage commissions.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: onboardingStep === 1 ? 'var(--colors-primary)' : 'var(--colors-hairline-soft)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: onboardingStep === 2 ? 'var(--colors-primary)' : 'var(--colors-hairline-soft)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: onboardingStep === 3 ? 'var(--colors-primary)' : 'var(--colors-hairline-soft)' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {onboardingStep > 1 && (
                  <button className="btn btn-secondary" onClick={() => setOnboardingStep(prev => prev - 1)} style={{ width: 'auto', padding: '8px 20px', minHeight: '36px' }}>
                    Back
                  </button>
                )}
                {onboardingStep < 3 ? (
                  <button className="btn btn-primary" onClick={() => setOnboardingStep(prev => prev + 1)} style={{ width: 'auto', padding: '8px 20px', minHeight: '36px' }}>
                    Next
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={closeOnboarding} style={{ width: 'auto', padding: '8px 20px', minHeight: '36px' }}>
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Analytics />
    </>
  );
}
