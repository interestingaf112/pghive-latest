import { useState, useEffect, useRef } from 'react';
import { 
  fetchAllPGs, 
  subscribeToAuth,
  isFirebaseActive,
  getUserCredits,
  getUnlockedPGIds,
  unlockPGContact,
  logoutTenantUser
} from './firebase';
import Header from './components/Header';
import DecryptedText from './components/DecryptedText';
import PGCard from './components/PGCard';
import PGDetailsModal from './components/PGDetailsModal';
import PurchaseModal from './components/PurchaseModal';
import HelpCenterModal from './components/HelpCenterModal';
import TermsModal from './components/TermsModal';
import PrivacyModal from './components/PrivacyModal';
import RefundModal from './components/RefundModal';
import InfoModal from './components/InfoModal';

import AuthModal from './components/AuthModal';
import AccountCentreModal from './components/AccountCentreModal';
import { Analytics } from '@vercel/analytics/react';
import { getLocalitySlug, getListingSlug } from './utils/sanitize';
import { Search, SlidersHorizontal, Home, Coins, Globe, ChevronLeft, ChevronRight, RotateCcw, ChevronDown } from 'lucide-react';
import { BANGALORE_LOCALITIES, CITIES } from './utils/constants';

const FAQS = [
  {
    q: "What is a PG (Paying Guest) accommodation?",
    a: "A PG, or Paying Guest accommodation, is a furnished room or shared living space rented out by a property owner, typically including basic amenities like Wi-Fi, housekeeping, and sometimes food. PGs are a popular housing option in Bangalore for students, working professionals, and newcomers to the city who want a hassle-free, flexible living arrangement without a long-term lease commitment."
  },
  {
    q: "How much does a PG cost in Bangalore?",
    a: "PG rents in Bangalore generally range from ₹6,000 to ₹20,000 per month, depending on the locality, sharing type (single, double, or triple occupancy), and whether food is included. Areas closer to major tech hubs like Koramangala, HSR Layout, and Marathahalli tend to be priced higher, while localities slightly further from the city center offer more budget-friendly options."
  },
  {
    q: "Which are the best areas for PGs in Bangalore?",
    a: "Popular PG localities in Bangalore include Koramangala, HSR Layout, Indiranagar, BTM Layout, Marathahalli, and SG Palya — each suited to different needs. Areas near tech parks (Koramangala, HSR Layout, Marathahalli) work well for IT professionals, while SG Palya is popular with students due to its proximity to Christ University."
  },
  {
    q: "Do PGs in Bangalore include food?",
    a: "Many PGs in Bangalore include food as part of the rent, usually covering breakfast and dinner on weekdays. Some PGs also offer a food-optional plan at a reduced rate for those who prefer to manage their own meals."
  },
  {
    q: "Are there separate PGs for girls, boys, and co-living options?",
    a: "Yes, Bangalore has a wide range of PG options catering to boys-only, girls-only, and unisex/co-living arrangements. You can filter listings on PGhive by gender preference to find PGs that suit your requirements."
  },
  {
    q: "What should I check before finalizing a PG in Bangalore?",
    a: "Before finalizing a PG, it's a good idea to check the amenities included (Wi-Fi, power backup, laundry, food), the sharing configuration and total rent, house rules (visitor policy, curfew timings if any), and to visit the property in person or speak directly with the owner before making any payment."
  },
  {
    q: "What is PGhive?",
    a: "PGhive is a direct-to-owner PG and co-living marketplace for Bangalore. Instead of going through brokers who charge commission, PGhive connects PG seekers directly with verified property owners, so you can negotiate rent and terms without middlemen."
  },
  {
    q: "How does PGhive work?",
    a: "Browse and filter PG listings in Bangalore by locality, budget, sharing type, and gender preference. When you find a PG you're interested in, unlock the owner's direct phone number and WhatsApp contact for a small one-time fee. From there, you coordinate the visit, lease terms, and move-in directly with the property owner."
  },
  {
    q: "Is PGhive really zero brokerage?",
    a: "Yes. PGhive doesn't charge any brokerage or commission on your rent. The only cost is a small nominal fee to unlock a verified owner's contact details — a fraction of what a traditional broker would typically charge."
  },
  {
    q: "How much does it cost to unlock a PG owner's contact on PGhive?",
    a: "Unlocking a single owner's contact details costs 1 credit (₹49). PGhive also offers credit packs for those exploring multiple PGs — a Starter Pack (5 credits) and an Unlimited Value pack (12 credits) at a lower per-unlock cost."
  },
  {
    q: "Is it safe to pay for contact unlock on PGhive?",
    a: "Payments are processed securely through Razorpay, a trusted and widely-used payment gateway in India. PGhive does not handle or store your card/payment details directly — all transactions are verified and processed through Razorpay's secure system."
  },
  {
    q: "How do I know a listing on PGhive is genuine?",
    a: "PGhive listings are added by verified hosts through the platform's dashboard. As with any online marketplace, it's recommended to speak with the owner and visit the property in person before making any payment or commitment."
  }
];

const ITEMS_PER_PAGE = 12;

export default function App() {
  const [pgs, setPgs] = useState([]);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [is404, setIs404] = useState(false);
  const [selectedCity, setSelectedCity] = useState('bangalore');
  
  const currentCityConfig = CITIES[selectedCity] || CITIES.bangalore;
  const currentCityLocalities = currentCityConfig.localities;

  // Scroll reveal observer
  const mainRef = useRef(null);

  const hubsGridRef = useRef(null);

  const scrollHubs = (direction) => {
    if (hubsGridRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      hubsGridRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  

  
  // Modals
  const [selectedPG, setSelectedPG] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [infoModalType, setInfoModalType] = useState(null); // 'investors' | 'features' | 'discrimination' | 'disability'
  const [showListModal, setShowListModal] = useState(false);

  // Authentication Modals & Session States - lazy initialize session
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedTenant = localStorage.getItem('tenant_session');
      if (storedTenant) {
        try {
          return JSON.parse(storedTenant);
        } catch (e) {
          console.error("Error loading tenant session:", e);
        }
      }
    }
    return null;
  });

  // Sync Tenant User state to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tenant_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tenant_session');
    }
  }, [currentUser]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountCentre, setShowAccountCentre] = useState(false);

  // Auto-close Auth Modal when user session is active
  useEffect(() => {
    if (currentUser) {
      setShowAuthModal(false);
    }
  }, [currentUser]);

  // Credit system — loaded from service layer (not raw localStorage)
  const [userCredits, setUserCredits] = useState(0);
  const [unlockedPGIds, setUnlockedPGIds] = useState([]);
  // Map of pgId → { phone, email, whatsapp } for unlocked contacts
  const [unlockedContacts, setUnlockedContacts] = useState({});

  // Theme State - Forced to Light Mode permanently as default
  const theme = 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('pg_hub_theme', 'light');
  }, []);

  const toggleTheme = () => {};

  // Lock body scroll when any modal is visible (excluding selectedPG since it is now a full page)
  useEffect(() => {
    const isLocked = showPurchaseModal || showHelpCenter || showTerms || showPrivacy || showRefund || !!infoModalType || showListModal;
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPurchaseModal, showHelpCenter, showTerms, showPrivacy, showRefund, infoModalType, showListModal]);

  // Scroll to top of page when active listing changes (page navigation)
  useEffect(() => {
    if (selectedPG) {
      window.scrollTo(0, 0);
    }
  }, [selectedPG]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [rentValue, setRentValue] = useState(12000);

  // AI Finder State
  const [aiInputQuery, setAiInputQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiMatchingIds, setAiMatchingIds] = useState(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // Cookie Consent State
  const [cookieConsent, setCookieConsent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pg_hub_cookie_consent') || 'pending';
    }
    return 'pending';
  });

  const handleAcceptCookies = () => {
    localStorage.setItem('pg_hub_cookie_consent', 'accepted');
    setCookieConsent('accepted');
  };

  const handleDenyCookies = () => {
    localStorage.setItem('pg_hub_cookie_consent', 'denied');
    setCookieConsent('denied');
  };
  

  
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

  // Reset pagination page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocality, selectedPriceRange, selectedGender, selectedAmenities, searchQuery, aiMatchingIds]);

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedLocality !== 'all' || 
    selectedGender !== 'all' || 
    selectedPriceRange !== 'all' || 
    Object.values(selectedAmenities).some(Boolean);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedLocality('all');
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
  };

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
      return !localStorage.getItem('pg_hub_onboarded');
    }
    return false;
  });
  const [onboardingStep, setOnboardingStep] = useState(1);

  const closeOnboarding = () => {
    localStorage.setItem('pg_hub_onboarded', 'true');
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

    // Subscribe to auth state updates for regular users
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        if (isFirebaseActive) {
          setCurrentUser(null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
    
    // Clear any active admin session to prevent conflicts
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_session_user');
    localStorage.setItem('pg_hub_is_admin_mode', 'false');

    if (user?.isNewUser) {
      window.alert("🎉 Welcome to PG Hive! You've received 1 free credit as a signup bonus to unlock contacts.");
      showToast("🎉 1 Free Credit added to your account!", "success");
    }
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
      showToast("Please sign in or create an account to purchase credits.", "info");
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
          showToast("Please sign in or create an account to purchase credits.", "info");
          setShowAuthModal(true);
          return;
        }
        setShowPurchaseModal(true);
      }
    }
  };

  // Purchase handler — uses service-layer addCredits
  const handlePurchaseSuccess = async () => {
    try {
      // Refresh credits from service layer (backend already added them securely)
      const newBalance = await getUserCredits();
      setUserCredits(newBalance);
    } catch (err) {
      console.error("Error refreshing credits:", err);
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
      const newUrl = `/pg/${getLocalitySlug(pg.locality)}/${getListingSlug(pg.name)}-${pg.id}`;
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
      const parentUrl = selectedLocality === 'all' ? '/' : `/pg/${getLocalitySlug(selectedLocality)}`;
      window.history.pushState({}, '', parentUrl);
    }
  };

  // Sync state to URL client-side
  const handleLocalityChange = (loc) => {
    setSelectedLocality(loc);
    const slug = loc === 'all' ? '' : `/pg/${getLocalitySlug(loc)}`;
    const newPath = slug || '/';
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  };

  const handleFooterLocalityClick = (e, loc) => {
    e.preventDefault();
    handleLocalityChange(loc);
    const gridEl = document.getElementById('catalog-grid') || document.getElementById('explore-section');
    gridEl?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiInputQuery.trim()) return;

    setIsAiSearching(true);
    setAiError('');
    setAiResponse('');
    setAiMatchingIds(null);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: aiInputQuery })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search using AI.');
      }

      setAiResponse(data.response);
      setAiMatchingIds(data.matchingIds || []);
    } catch (err) {
      console.error("AI Search Failed:", err);
      setAiError(err.message);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleResetAiSearch = () => {
    setAiInputQuery('');
    setAiResponse('');
    setAiMatchingIds(null);
    setAiError('');
  };

  const parseSimpleMarkdown = (text) => {
    if (!text) return '';
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^- (.*?)$/gm, '• $1');
    return html;
  };

  // Client-side SEO URL router mount & popstate handler
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      let validRoute = false;
      let targetLocality = 'all';
      let targetPGId = null;

      // 1. Match listing details route: /pg/[locality-slug]/[listing-slug]-[id]
      const listingMatch = path.match(/^\/pg\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)-([a-zA-Z0-9]+)$/i);
      // 2. Match clean locality route: /pg/[locality-slug]
      const localityMatch = path.match(/^\/pg\/([a-zA-Z0-9-]+)$/i);
      // 3. Match legacy locality route: /pg-in-[locality-slug]
      const legacyLocalityMatch = path.match(/^\/pg-in-([a-zA-Z0-9-]+)$/i);

      if (listingMatch) {
        validRoute = true;
        const localitySlug = listingMatch[1];
        targetPGId = listingMatch[3];
        
        // Find locality
        const foundLoc = [...currentCityLocalities, ...pgs.map(p => p.locality)].find(
          loc => getLocalitySlug(loc) === localitySlug
        );
        targetLocality = foundLoc || localitySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else if (localityMatch) {
        validRoute = true;
        const localitySlug = localityMatch[1];
        
        const foundLoc = [...currentCityLocalities, ...pgs.map(p => p.locality)].find(
          loc => getLocalitySlug(loc) === localitySlug
        );
        targetLocality = foundLoc || localitySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else if (legacyLocalityMatch) {
        validRoute = true;
        const localitySlug = legacyLocalityMatch[1];
        
        const foundLoc = [...currentCityLocalities, ...pgs.map(p => p.locality)].find(
          loc => getLocalitySlug(loc) === localitySlug
        );
        targetLocality = foundLoc || localitySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        // Client-side canonical rewrite to clean url: /pg/:locality
        window.history.replaceState({}, '', `/pg/${localitySlug}`);
      } else if (path === '/' || path === '' || path === '/index.html') {
        validRoute = true;
        targetLocality = 'all';
      }

      setIs404(!validRoute);
      setSelectedLocality(targetLocality);

      // Deep linking check for matched listing ID
      if (targetPGId) {
        if (pgs.length > 0) {
          const foundPG = pgs.find(p => p.id === targetPGId);
          if (foundPG) {
            setSelectedPG(foundPG);
            if (unlockedPGIds.includes(targetPGId) && !unlockedContacts[targetPGId]) {
              unlockPGContact(targetPGId).then(contacts => {
                if (contacts) {
                  setUnlockedContacts(prev => ({ ...prev, [targetPGId]: contacts }));
                }
              }).catch(err => console.error("Error fetching prefetched contacts:", err));
            }
          } else {
            // Soft-404: listing ID was not found in database
            setSelectedPG(null);
            setIs404(true);
          }
        }
      } else {
        // Support backward compatibility check for query-based ?pg=pgId
        const params = new URLSearchParams(window.location.search);
        const queryPgId = params.get('pg');
        if (queryPgId && pgs.length > 0) {
          const foundPG = pgs.find(p => p.id === queryPgId);
          if (foundPG) {
            setSelectedPG(foundPG);
            // Replace search param with clean path
            window.history.replaceState({}, '', `/pg/${getLocalitySlug(foundPG.locality)}/${getListingSlug(foundPG.name)}-${foundPG.id}`);
          }
        } else {
          setSelectedPG(null);
        }
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
      document.title = `${selectedPG.name} | PG in ${selectedPG.locality} - PGhive`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const amenitiesStr = selectedPG.amenities ? Object.keys(selectedPG.amenities).filter(k => selectedPG.amenities[k]).join(', ') : '';
        metaDesc.setAttribute('content', `Explore ${selectedPG.name} co-living in ${selectedPG.locality}, Bangalore. Preferred for: ${selectedPG.preferredGender}. Key amenities: ${amenitiesStr}. Rent starts at ₹${selectedPG.price}/month. Zero brokerage on PGhive.`);
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
          document.title = `PGhive | Premium Paying Guest Accommodations in ${currentCityConfig.name}`;
          const metaDescDefault = document.querySelector('meta[name="description"]');
          if (metaDescDefault) {
            metaDescDefault.setAttribute('content', `Find the best Paying Guest (PG) accommodations in ${currentCityConfig.name} with PGhive. Filter by locality, price, amenities, and gender preferences. Zero brokerage — contact owners directly.`);
          }
        } else {
          document.title = `PG in ${selectedLocality} | Zero Brokerage PG accommodations on PGhive`;
          const metaDescLoc = document.querySelector('meta[name="description"]');
          if (metaDescLoc) {
            metaDescLoc.setAttribute('content', `Find the best Paying Guest (PG) accommodations in ${selectedLocality}, ${currentCityConfig.name}. Filter by price, amenities, and gender. Zero brokerage — contact owners directly on PGhive.`);
          }
        }

        const activeSchema = document.getElementById('dynamic-pg-schema');
        if (activeSchema) activeSchema.remove();
      };
    }
  }, [selectedPG, selectedLocality, selectedCity]);

  // Unique localities present in PG listings (for dropdown filters)
  const availableLocalities = ['all', ...new Set([...currentCityLocalities, ...pgs.map(pg => pg.locality)])];

  // Filtering Logic
  const rawFilteredPGs = pgs.filter(pg => {
    // 0. City filter
    const pgCity = pg.city || 'bangalore';
    if (pgCity !== selectedCity) {
      return false;
    }

    // 1. Text Search query (match name, locality, address, description)
    const text = `${pg.name} ${pg.locality} ${pg.address} ${pg.description}`.toLowerCase();
    if (searchQuery && !text.includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Locality Filter (slug-normalized comparison to support typos & variations like SG Palya/SG Palaya)
    if (selectedLocality !== 'all') {
      const pgLoc = pg.locality || '';
      const pgSlug = getLocalitySlug(pgLoc);
      const filterSlug = getLocalitySlug(selectedLocality);
      
      const normalizeSg = (s) => s.replace(/[^a-z0-9]/g, '').replace('palaya', 'palya');
      const pgNormalized = normalizeSg(pgSlug);
      const filterNormalized = normalizeSg(filterSlug);
      
      const isMatch = pgNormalized === filterNormalized || 
                      pgSlug.includes(filterSlug) || 
                      filterSlug.includes(pgSlug) ||
                      pgNormalized.includes(filterNormalized) ||
                      filterNormalized.includes(pgNormalized);
                      
      if (!isMatch) {
        return false;
      }
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

    // 6. AI Match Filter (if search is active)
    if (aiMatchingIds !== null && !aiMatchingIds.includes(pg.id)) {
      return false;
    }

    return true;
  });

  // Sort: Featured ads (isFeatured: true) stay on top
  const filteredPGs = [...rawFilteredPGs].sort((a, b) => {
    const aFeatured = a.isFeatured === true ? 1 : 0;
    const bFeatured = b.isFeatured === true ? 1 : 0;
    return bFeatured - aFeatured;
  });

  // Pagination calculation parameters
  const totalItems = filteredPGs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentPGs = filteredPGs.slice(indexOfFirstItem, indexOfLastItem);

  // Inject/update main directory list schema (ItemList) - Declared after filteredPGs is initialized
  useEffect(() => {
    const existingListSchema = document.getElementById('directory-list-schema');
    if (existingListSchema) existingListSchema.remove();

    if (filteredPGs.length > 0) {
      const itemListElement = filteredPGs.map((pg, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://www.pghive.co.in/pg/${getLocalitySlug(pg.locality)}/${getListingSlug(pg.name)}-${pg.id}`,
        "name": pg.name
      }));

      const schemaData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": selectedLocality === 'all' ? `Paying Guest listings in ${currentCityConfig.name}` : `Paying Guest listings in ${selectedLocality}, ${currentCityConfig.name}`,
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
  }, [filteredPGs, selectedLocality, selectedCity]);

  // Inject/update FAQPage Schema
  useEffect(() => {
    const existingFaqSchema = document.getElementById('faq-page-schema');
    if (existingFaqSchema) existingFaqSchema.remove();

    if (selectedLocality === 'all') {
      const faqSchemaData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQS.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      };

      const script = document.createElement('script');
      script.id = 'faq-page-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(faqSchemaData);
      document.head.appendChild(script);
    }

    return () => {
      const activeFaqSchema = document.getElementById('faq-page-schema');
      if (activeFaqSchema) activeFaqSchema.remove();
    };
  }, [selectedLocality]);

  return (
    <>
      {/* Clean Minimalist Background Grid */}
      <div className="animated-bg-blobs">
      </div>

      <Header 
        isAdminMode={false} 
        adminUser={null}
        userCredits={userCredits}
        onOpenPurchaseModal={handleOpenPurchaseModal}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          console.log("onOpenAuthModal called in App.jsx, setting showAuthModal to true");
          setShowAuthModal(true);
        }}
        onLogout={handleLogoutUser}
        onOpenAccountCentre={() => setShowAccountCentre(true)}
        onAuthSuccess={handleAuthSuccess}
        onLogoClick={() => {
          handleSelectPG(null);
          handleLocalityChange('all');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1 }} className="app-main-content">
        {is404 ? (
          // ==========================================
          // 404 PAGE NOT FOUND
          // ==========================================
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', textAlign: 'center', minHeight: '60vh' }}>
            <h1 style={{ fontSize: '96px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--colors-primary) 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>404</h1>
            <h2 className="title-lg" style={{ margin: '24px 0 12px 0', fontSize: '26px', fontWeight: 800 }}>Lost in Bangalore Traffic?</h2>
            <p className="body-md" style={{ color: 'var(--colors-muted)', maxWidth: '520px', margin: '0 auto 32px auto', lineHeight: 1.6, fontSize: '15px' }}>
              The page you are looking for has either been relocated, demolished, or is currently stuck in the Silk Board underpass. Let's get you back to safety.
            </p>
            <button 
              className="btn btn-primary animate-hover" 
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new Event('popstate'));
              }}
              style={{ width: 'auto', padding: '12px 36px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
            >
              Go Back Home
            </button>
          </div>
        ) : selectedPG ? (
          // ==========================================
          // PG DETAILS PAGE VIEW
          // ==========================================
          <PGDetailsModal 
            pg={selectedPG} 
            onClose={() => handleSelectPG(null)}
            unlockedPGIds={unlockedPGIds}
            unlockedContacts={unlockedContacts}
            onUnlockPG={handleUnlockPG}
            userCredits={userCredits}
          />
        ) : (
          // ==========================================
          // MAIN MARKETPLACE CATALOG VIEW
          // ==========================================
          <div>
            {/* Split Premium Hero Banner */}
            <section className="campaign-hero">
              <div className="container" style={{ width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', gap: '24px' }}>
                  {/* Centered Hero Content */}
                  <div className="hero-left " style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px', width: '100%' }}>
                    <span className="hero-tagline" style={{ margin: '0 auto' }}>Zero Brokerage Co-living</span>
                    {selectedLocality === 'all' ? (
                      <h1 className="hero-main-title animate-fade-in-up" style={{ margin: 0, textAlign: 'center' }}>
                        Zero brokerage — contact owners directly
                      </h1>
                    ) : (
                      <h1 className="hero-main-title" style={{ margin: 0, textAlign: 'center' }}>
                        <DecryptedText text={`PGs in ${selectedLocality}`} animateOn="view" useOriginalCharsOnly />
                      </h1>
                    )}
                    <p className="campaign-hero-subtitle body-md" style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
                      Join Bangalore's largest co-living community with <strong>{pgs.length} verified listings</strong>. Skip broker calls. Unlock verified PG accommodations and chat directly with owners. Verified amenities, single/sharing options, and transparent pricing.
                    </p>
                    
                    {/* Hero Action Buttons */}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                    </div>
                  </div>
                </div>
              </div>
            </section>



            {/* Main Marketplace catalog grid */}
            <div className="container section-gap" id="catalog-grid" style={{ width: '100%' }}>
              
              {/* Sticky Filter Bar */}
              <div className="sticky-filter-bar " style={{ 
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
                {/* City and search inputs layout */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 350px', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 16px',
                    borderRadius: 'var(--rounded-full)',
                    backgroundColor: 'var(--colors-surface-soft)',
                    border: '1px solid var(--colors-hairline)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--colors-primary)',
                    height: '36px',
                    whiteSpace: 'nowrap'
                  }}>
                    📍 Bangalore
                  </div>

                  <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--colors-muted)' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={`Search properties in ${currentCityConfig.name}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '34px', borderRadius: 'var(--rounded-full)', height: '36px', fontSize: '12px', marginBottom: 0, width: '100%' }}
                    />
                  </div>
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
              <div className="quick-filter-chips " style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
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
                {hasActiveFilters && (
                  <button 
                    className="filter-chip"
                    onClick={handleClearAllFilters}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: 'rgb(239, 68, 68)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={11} />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>

              {/* Grid Header */}
              <div className="" style={{ borderBottom: '1px solid var(--colors-hairline-soft)', paddingBottom: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <h2 className="display-sm" style={{ fontSize: '20px', fontWeight: 600 }}>{currentCityConfig.name} catalog</h2>
                  <span className="body-sm">{filteredPGs.length} options</span>
                </div>
              </div>

              {/* Catalog Grid or Map */}
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
                <div className="empty-state " style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', border: '1.5px dashed var(--colors-hairline)', borderRadius: '12px', background: 'var(--colors-surface-soft)' }}>
                  <h3 className="title-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>No matches (The landlord is checking your birth chart)</span>
                  </h3>
                  <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: '12px 0 20px 0', maxWidth: '480px', textAlign: 'center', lineHeight: 1.6 }}>
                    We couldn't find any rooms matching these exact filters. Either the host is still auditing your salary slips and family history, or the listings are stuck in Silk Board traffic. Try resetting your filters to find a match!
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
                        handleResetAiSearch();
                        const gridEl = document.getElementById('catalog-grid');
                        gridEl?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ width: 'auto', padding: '8px 18px', minHeight: '34px', border: '1.5px solid var(--colors-ink)' }}
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <div className="pg-grid" style={{ width: '100%' }}>
                    {currentPGs.map((pg, index) => (
                      <div key={pg.id} className="" style={{ '--reveal-delay': index % 8 }}>
                        <PGCard 
                          pg={pg} 
                          isUnlocked={unlockedPGIds.includes(pg.id)}
                          onViewDetails={handleSelectPG}
                        />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', width: '100%', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary animate-hover"
                        disabled={currentPage === 1}
                        onClick={() => {
                          setCurrentPage(prev => Math.max(prev - 1, 1));
                          const gridEl = document.getElementById('explore-section') || document.getElementById('catalog-grid');
                          gridEl?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ padding: '8px 16px', minHeight: '38px', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                        const isNearCurrent = Math.abs(pageNum - currentPage) <= 1;
                        const isFirstOrLast = pageNum === 1 || pageNum === totalPages;
                        if (!isNearCurrent && !isFirstOrLast && totalPages > 5) {
                          if (pageNum === 2 || pageNum === totalPages - 1) {
                            return <span key={pageNum} style={{ color: 'var(--colors-muted)', padding: '0 4px' }}>...</span>;
                          }
                          return null;
                        }

                        const isCurrent = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              const gridEl = document.getElementById('explore-section') || document.getElementById('catalog-grid');
                              gridEl?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} animate-hover`}
                            style={{
                              width: '38px',
                              height: '38px',
                              padding: 0,
                              minHeight: 'unset',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isCurrent ? 'var(--colors-primary)' : 'var(--colors-surface-card)',
                              color: isCurrent ? '#ffffff' : 'var(--colors-body)',
                              border: isCurrent ? 'none' : '1px solid var(--colors-hairline)',
                              cursor: 'pointer'
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        className="btn btn-secondary animate-hover"
                        disabled={currentPage === totalPages}
                        onClick={() => {
                          setCurrentPage(prev => Math.min(prev + 1, totalPages));
                          const gridEl = document.getElementById('explore-section') || document.getElementById('catalog-grid');
                          gridEl?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ padding: '8px 16px', minHeight: '38px', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Explore Hubs Section */}
            <section className="hubs-section container" id="hubs-section" style={{ width: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div className="" style={{ textAlign: 'left' }}>
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
                  const count = pgs.filter(pg => {
                    if (!pg || !pg.locality) return false;
                    
                    // City filter (only count listings matching the active city)
                    const pgCity = pg.city || 'bangalore';
                    if (pgCity !== selectedCity) return false;

                    const pgSlug = getLocalitySlug(pg.locality);
                    const hubSlug = getLocalitySlug(hub.id);
                    
                    const normalizeSg = (s) => s.replace(/[^a-z0-9]/g, '').replace('palaya', 'palya');
                    const pgNormalized = normalizeSg(pgSlug);
                    const filterNormalized = normalizeSg(hubSlug);
                    
                    return pgNormalized === filterNormalized || 
                           pgSlug.includes(hubSlug) || 
                           hubSlug.includes(pgSlug) ||
                           pgNormalized.includes(filterNormalized) ||
                           filterNormalized.includes(pgNormalized);
                  }).length;
                  return (
                    <div 
                      key={hub.id} 
                      className={`hub-card ${index === 0 ? 'featured' : ''}`} 
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
            <section className="how-it-works container" id="how-it-works" style={{ width: '100%' }}>
              <div className="" style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Rent directly in 3 simple steps</h3>
                <p className="body-md" style={{ color: 'var(--colors-muted)', maxWidth: '500px', margin: '8px auto 0' }}>
                  No middleman agents, no hidden commissions. Just clean, transparent direct-to-host bookings.
                </p>
              </div>

              <div className="steps-grid">
                <div className="step-card " style={{ '--reveal-delay': '0' }}>
                  <div className="step-icon-number">1</div>
                  <h4 className="step-title" style={{ margin: '0 0 8px 0' }}>Select Your Space</h4>
                  <p className="step-text">Browse fully-managed co-living rooms in Bangalore's premier hubs. Filter by price, sharing, and gender.</p>
                </div>
                <div className="step-card " style={{ '--reveal-delay': '1' }}>
                  <div className="step-icon-number">2</div>
                  <h4 className="step-title" style={{ margin: '0 0 8px 0' }}>Unlock Host Contacts</h4>
                  <p className="step-text">Pay a nominal 1 credit (₹49) to unlock the owner's WhatsApp and phone number. Save thousands in brokerage.</p>
                </div>
                <div className="step-card " style={{ '--reveal-delay': '2' }}>
                  <div className="step-icon-number">3</div>
                  <h4 className="step-title" style={{ margin: '0 0 8px 0' }}>Coordinate & Move In</h4>
                  <p className="step-text">Chat directly with the owner, inspect the property, and sign the rental agreement on your terms. Zero middleman fees.</p>
                </div>
              </div>
            </section>
            
            {/* Company Profile Premium Section */}
            <section id="about-section" className="about-us-section container section-gap" style={{ width: '100%', borderTop: '1px solid var(--colors-hairline)', paddingTop: '64px', paddingBottom: '32px' }}>
              <div className="hero-split-layout" style={{ gap: '48px', marginBottom: '48px' }}>
                <div className="" style={{ textAlign: 'left' }}>
                  <span className="hero-tagline" style={{ display: 'inline-block', marginBottom: '16px' }}>PGhive Company Profile</span>
                  <h3 className="section-title" style={{ margin: '0 0 16px 0', fontSize: '36px', lineHeight: 1.2, fontWeight: 800 }}>
                    Democratizing co-living in Bangalore <span className="text-highlight">without the broker fee</span>
                  </h3>
                  <p className="body-md" style={{ color: 'var(--colors-body)', lineHeight: 1.7, marginBottom: '16px', fontSize: '15px' }}>
                    Finding a comfortable, managed Paying Guest (PG) room in Bangalore shouldn't cost you an arm and a leg. Traditional platforms are saturated with brokers charging up to a full month's rent (₹10,000 to ₹30,000) as commission just for sharing a landlord's phone number.
                  </p>
                  <p className="body-md" style={{ color: 'var(--colors-body)', lineHeight: 1.7, fontSize: '15px' }}>
                    <strong>PGhive</strong> was founded to disrupt this outdated system. We connect paying guests directly with verified property hosts. By automating check lists, enforcing strict verification steps, and offering direct chat routes, we make co-living secure, simple, and entirely brokerage-free.
                  </p>
                </div>

                <div className="" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', '--reveal-delay': '1' }}>
                  {/* Visual Stats Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '24px', backgroundColor: 'var(--colors-surface-soft)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--colors-primary)' }}>₹0</div>
                      <div style={{ fontSize: '12px', color: 'var(--colors-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Brokerage Fees</div>
                    </div>
                    <div style={{ padding: '24px', backgroundColor: 'var(--colors-surface-soft)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--colors-primary)' }}>100%</div>
                      <div style={{ fontSize: '12px', color: 'var(--colors-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Verified Hosts</div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'var(--colors-surface-card)', 
                    border: '1px solid var(--colors-hairline)', 
                    borderRadius: 'var(--rounded-md)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--colors-primary)', fontWeight: 700, fontSize: '16px' }}>Our Mission</h4>
                    <p className="body-sm" style={{ margin: 0, color: 'var(--colors-muted)', lineHeight: 1.6 }}>
                      To build India's most transparent direct-to-owner rental ecosystem, letting students and young professionals find rooms efficiently, affordably, and safely.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Business Values Grid */}
              <div className="" style={{ textAlign: 'left', marginTop: '32px' }}>
                <h4 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: 'var(--colors-ink)' }}>Our Operational Values</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                  <div style={{ padding: '24px', backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)' }}>🔒 Tamper-Proof Verification</h5>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--colors-muted)', lineHeight: 1.6 }}>
                      Every host must pass mobile and email checks, and listing photos undergo digital anti-spam checks to eliminate duplicate listings.
                    </p>
                  </div>
                  <div style={{ padding: '24px', backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)' }}>⚡ Microtransaction Model</h5>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--colors-muted)', lineHeight: 1.6 }}>
                      We do not charge heavy subscription fees. Users only pay tiny, flat fees (as low as ₹49) to unlock specific contact info, keeping access democratic.
                    </p>
                  </div>
                  <div style={{ padding: '24px', backgroundColor: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)' }}>🏢 Direct Owner Routing</h5>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--colors-muted)', lineHeight: 1.6 }}>
                      No intermediate support or middleman. Tenants chat directly with hosts via WhatsApp or direct calls to schedule visits immediately.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ Accordion Section */}
            <section className="faq-section container animate-reveal" id="faq-section" style={{ width: '100%' }}>
              <div className="faq-header">
                <span className="hero-tagline" style={{ display: 'inline-block', marginBottom: '16px' }}>Got Questions?</span>
                <h3 className="section-title" style={{ margin: '0 0 16px 0', fontSize: '36px', lineHeight: 1.2, fontWeight: 800 }}>
                  Frequently Asked Questions
                </h3>
                <p className="body-md" style={{ color: 'var(--colors-muted)', maxWidth: '600px', margin: '0 auto' }}>
                  Everything you need to know about PGs in Bangalore and how PGhive makes co-living simple.
                </p>
              </div>

              <div className="faq-grid-layout">
                {/* Column 1: PGs in Bangalore */}
                <div className="faq-column">
                  <h4 className="faq-column-title">PGs in Bangalore</h4>
                  {FAQS.slice(0, 6).map((faq, index) => {
                    const actualIndex = index;
                    const isActive = expandedFaqIndex === actualIndex;
                    return (
                      <div 
                        key={actualIndex} 
                        className={`faq-item ${isActive ? 'active' : ''}`}
                      >
                        <button 
                          className="faq-trigger"
                          onClick={() => setExpandedFaqIndex(isActive ? null : actualIndex)}
                          aria-expanded={isActive}
                        >
                          <span className="faq-question">{faq.q}</span>
                          <span className="faq-icon">
                            <ChevronDown size={16} />
                          </span>
                        </button>
                        <div className="faq-content">
                          <p className="faq-answer">{faq.a}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Column 2: About PGhive */}
                <div className="faq-column">
                  <h4 className="faq-column-title">About PGhive</h4>
                  {FAQS.slice(6, 12).map((faq, index) => {
                    const actualIndex = index + 6;
                    const isActive = expandedFaqIndex === actualIndex;
                    return (
                      <div 
                        key={actualIndex} 
                        className={`faq-item ${isActive ? 'active' : ''}`}
                      >
                        <button 
                          className="faq-trigger"
                          onClick={() => setExpandedFaqIndex(isActive ? null : actualIndex)}
                          aria-expanded={isActive}
                        >
                          <span className="faq-question">{faq.q}</span>
                          <span className="faq-icon">
                            <ChevronDown size={16} />
                          </span>
                        </button>
                        <div className="faq-content">
                          <p className="faq-answer">{faq.a}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>




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
      <div className="mobile-sticky-bar">
        <button 
          className="mobile-sticky-btn primary"
          onClick={() => {
            const gridEl = document.getElementById('catalog-grid');
            gridEl?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Search size={14} /> Search Catalog
        </button>
      </div>

      {/* Credit Package Purchase Modal overlay */}
      {showPurchaseModal && (
        <PurchaseModal 
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseSuccess={handlePurchaseSuccess}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
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

      {/* Refund Policy Modal overlay */}
      {showRefund && (
        <RefundModal 
          onClose={() => setShowRefund(false)}
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
            <div className="">
              <h4 className="footer-col-title">Support</h4>
              <ul className="footer-links">
                <li><button onClick={() => setShowHelpCenter(true)} className="footer-link-btn">Help Center</button></li>
                <li><button onClick={() => setInfoModalType('discrimination')} className="footer-link-btn">Anti-discrimination</button></li>
                <li><button onClick={() => setInfoModalType('disability')} className="footer-link-btn">Disability support</button></li>
              </ul>
            </div>

            <div className="">
              <h4 className="footer-col-title">PGhive</h4>
              <ul className="footer-links">
                <li><button onClick={() => setInfoModalType('features')} className="footer-link-btn">New features</button></li>
                <li><button onClick={() => setInfoModalType('investors')} className="footer-link-btn">Investors</button></li>
              </ul>
            </div>

            <div className="">
              <h4 className="footer-col-title">Popular Localities</h4>
              <ul className="footer-links">
                {['Koramangala', 'HSR Layout', 'Indiranagar', 'BTM Layout', 'Marathahalli', 'SG Palya'].map(loc => (
                  <li key={loc}>
                    <a 
                      href={`/pg/${getLocalitySlug(loc)}`}
                      onClick={(e) => handleFooterLocalityClick(e, loc)}
                      className="footer-link-btn"
                      style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'inline-block' }}
                    >
                      PGs in {loc}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footer-bottom" style={{ width: '100%' }}>
            <div className="caption-sm" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>© {new Date().getFullYear()} PGhive, Inc.</span>
              <button onClick={() => setShowPrivacy(true)} className="footer-link-btn-flat">Privacy</button>
              <span>·</span>
              <button onClick={() => setShowTerms(true)} className="footer-link-btn-flat">Terms</button>
              <span>·</span>
              <button onClick={() => setShowRefund(true)} className="footer-link-btn-flat">Refund Policy</button>
              <span>·</span>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Sitemap</a>
              <span>·</span>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>Company details</a>
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
                  <h3 className="title-md" style={{ marginBottom: '12px', fontSize: '18px' }}>1. Search Localities</h3>
                  <p className="body-md" style={{ color: 'var(--colors-muted)', lineHeight: '1.6', marginBottom: '24px', fontSize: '13px' }}>
                    Explore verified co-living properties in Bangalore's tech hubs like HSR, Koramangala, Indiranagar, and Whitefield. Use filters to match your budget and gender preferences.
                  </p>
                </div>
              )}

              {onboardingStep === 2 && (
                <div>
                  <h3 className="title-md" style={{ marginBottom: '12px', fontSize: '18px' }}>2. Unlock Direct Contacts</h3>
                  <p className="body-md" style={{ color: 'var(--colors-muted)', lineHeight: '1.6', marginBottom: '24px', fontSize: '13px' }}>
                    Pay a nominal 1 credit (₹49) to unlock the host's direct phone number and WhatsApp. Skip the spammy agent calls.
                  </p>
                </div>
              )}

              {onboardingStep === 3 && (
                <div>
                  <h3 className="title-md" style={{ marginBottom: '12px', fontSize: '18px' }}>3. Move In & Save</h3>
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

      {/* Cookie Consent Banner */}
      {cookieConsent === 'pending' && (
        <div 
          className="cookie-banner-custom"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            maxWidth: '380px',
            backgroundColor: 'var(--colors-surface-card)',
            border: '1px solid var(--colors-hairline)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(16px)',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--colors-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🍪 Cookie Consent
            </h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--colors-body)', lineHeight: 1.5 }}>
              We use cookies to improve your browsing experience, analyze site traffic, and optimize direct-to-owner listing unlocks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleDenyCookies}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, minHeight: '36px', fontSize: '12.5px', padding: '6px 12px', borderColor: 'var(--colors-hairline)', fontWeight: 600 }}
            >
              Deny
            </button>
            <button 
              onClick={handleAcceptCookies}
              className="btn btn-primary btn-sm"
              style={{ flex: 1, minHeight: '36px', fontSize: '12.5px', padding: '6px 12px', fontWeight: 700 }}
            >
              Accept All
            </button>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @media (max-width: 480px) {
              .cookie-banner-custom {
                right: 16px !important;
                left: 16px !important;
                bottom: 16px !important;
                max-width: none !important;
              }
            }
          `}</style>
        </div>
      )}

      <Analytics />
    </>
  );
}
