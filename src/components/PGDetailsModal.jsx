import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Key, Phone, Mail, Check, MapPin, Users, Calendar, Home } from 'lucide-react';
import { amenityIcons, LOCALITY_COORDINATES } from '../utils/constants';
import DecryptedText from './DecryptedText';
import LocationAutocomplete from './LocationAutocomplete';

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

const POPULAR_LANDMARKS = {
  christ: { name: "Christ University (SG Palaya)", lat: 12.9362, lng: 77.6062 },
  jain: { name: "Jain University (Jayanagar)", lat: 12.9192, lng: 77.5796 },
  rmz_ecospace: { name: "RMZ Ecospace (Sarjapur)", lat: 12.9234, lng: 77.6798 },
  manyata: { name: "Manyata Tech Park (Hebbal)", lat: 13.0451, lng: 77.6266 },
  bagmane: { name: "Bagmane Constellation (Outer Ring Rd)", lat: 12.8984, lng: 77.6698 },
  itpl: { name: "ITPL (Whitefield)", lat: 12.9866, lng: 77.7335 },
  forum: { name: "Nexus Forum Mall (Koramangala)", lat: 12.9350, lng: 77.6113 }
};

const CUSTOM_LANDMARKS = [
  // Colleges
  { name: "Christ University (SG Palaya Campus)", aliases: ["christ university", "christ sg palaya", "christ college", "sg palaya campus"], lat: 12.9362, lng: 77.6062 },
  { name: "Christ University (Bannerghatta Road)", aliases: ["christ bannerghatta", "christ bgr"], lat: 12.9105, lng: 77.6018 },
  { name: "Christ University (Kengeri Campus)", aliases: ["christ kengeri"], lat: 12.8633, lng: 77.4378 },
  { name: "Jain University (Jayanagar)", aliases: ["jain university", "jain jayanagar", "jain college"], lat: 12.9192, lng: 77.5796 },
  { name: "Jain University (JC Road)", aliases: ["jain jc road"], lat: 12.9632, lng: 77.5878 },
  { name: "PES University (RR Campus)", aliases: ["pes university", "pes rr", "pesit", "pes rr road"], lat: 12.9344, lng: 77.5350 },
  { name: "PES University (Electronic City)", aliases: ["pes electronic city", "pes ecotown", "pes ec"], lat: 12.8504, lng: 77.6669 },
  { name: "MS Ramaiah Institute of Technology", aliases: ["ramaiah", "msrit", "ms ramaiah", "rit"], lat: 13.0305, lng: 77.5649 },
  { name: "RV College of Engineering", aliases: ["rvce", "rv college", "rvce mysore road"], lat: 12.9237, lng: 77.4987 },
  { name: "BMS College of Engineering", aliases: ["bmsce", "bms college", "bms basavanagudi"], lat: 12.9416, lng: 77.5661 },
  { name: "Mount Carmel College", aliases: ["mount carmel", "mcc"], lat: 12.9904, lng: 77.5882 },
  { name: "St. Joseph's University", aliases: ["st joseph", "josephs", "sjc"], lat: 12.9626, lng: 77.6019 },
  
  // Tech Parks & Offices
  { name: "EY (Ernst & Young) - RMZ Ecoworld", aliases: ["ey", "ey office", "ernst & young", "ey ecoworld", "ey bellandur", "ernst and young"], lat: 12.9231, lng: 77.6804 },
  { name: "EY (Ernst & Young) - Manyata Tech Park", aliases: ["ey manyata", "ey hebbal"], lat: 13.0451, lng: 77.6266 },
  { name: "Goldman Sachs (Outer Ring Road)", aliases: ["goldman sachs", "goldman", "gs"], lat: 12.9228, lng: 77.6804 },
  { name: "Google (RMZ Infinity / Bagmane)", aliases: ["google office", "google bangalore", "google"], lat: 12.9782, lng: 77.6607 },
  { name: "Microsoft (Outer Ring Road)", aliases: ["microsoft", "ms office"], lat: 12.9240, lng: 77.6790 },
  { name: "Deloitte (Manyata Tech Park)", aliases: ["deloitte"], lat: 13.0451, lng: 77.6266 },
  { name: "KPMG (Embassy GolfLinks)", aliases: ["kpmg"], lat: 12.9469, lng: 77.6444 },
  { name: "PwC (RMZ Ecospace)", aliases: ["pwc", "price waterhouse coopers"], lat: 12.9242, lng: 77.6798 },
  { name: "RMZ Ecospace (Outer Ring Road)", aliases: ["ecospace", "rmz ecospace", "bellandur ecospace"], lat: 12.9234, lng: 77.6798 },
  { name: "Manyata Tech Park (Hebbal)", aliases: ["manyata", "manyata tech park", "manyata park"], lat: 13.0451, lng: 77.6266 },
  { name: "Bagmane Constellation Business Park", aliases: ["bagmane constellation", "constellation", "bagmane outer ring road"], lat: 12.8984, lng: 77.6698 },
  { name: "Bagmane Tech Park (CV Raman Nagar)", aliases: ["bagmane tech park", "bagmane cv raman", "btp"], lat: 12.9782, lng: 77.6607 },
  { name: "ITPL (International Tech Park Bangalore)", aliases: ["itpl", "international tech park", "itpl whitefield"], lat: 12.9866, lng: 77.7335 },
  { name: "Embassy GolfLinks (EGL)", aliases: ["egl", "embassy golflinks", "golflinks"], lat: 12.9469, lng: 77.6444 },
  { name: "Cessna Business Park", aliases: ["cessna", "cessna tech park", "cessna park"], lat: 12.9348, lng: 77.6917 },
  { name: "Prestige Tech Park", aliases: ["prestige tech park", "ptp"], lat: 12.9366, lng: 77.6946 },
  { name: "Global Village Tech Park", aliases: ["global village", "global village mysore road"], lat: 12.9221, lng: 77.5020 },
  
  // Malls & Hubs
  { name: "Nexus Forum Mall (Koramangala)", aliases: ["forum mall", "forum koramangala", "nexus forum"], lat: 12.9350, lng: 77.6113 },
  { name: "Phoenix Marketcity (Mahadevapura)", aliases: ["phoenix", "phoenix marketcity", "phoenix mall"], lat: 12.9959, lng: 77.6963 },
  { name: "Orion Mall (Rajajinagar)", aliases: ["orion mall", "orion", "orion gateway"], lat: 13.0111, lng: 77.5550 },
  { name: "Vega City Mall (Bannerghatta Rd)", aliases: ["vega city", "vega city mall", "vega"], lat: 12.9069, lng: 77.6013 },
  { name: "Nexus Shantiniketan (Whitefield)", aliases: ["shantiniketan", "nexus shantiniketan"], lat: 12.9893, lng: 77.7281 },
  
  // Localities & Metro Hubs
  { name: "Majestic Railway/Bus Station", aliases: ["majestic", "kempegowda bus station", "majestic station"], lat: 12.9779, lng: 77.5724 },
  { name: "Indiranagar Metro Station", aliases: ["indiranagar metro", "indiranagar station"], lat: 12.9784, lng: 77.6387 },
  { name: "MG Road Metro Station", aliases: ["mg road", "mg road metro"], lat: 12.9755, lng: 77.6068 },
  { name: "Koramangala 5th Block", aliases: ["koramangala 5th block", "koramangala club"], lat: 12.9348, lng: 77.6189 },
  { name: "HSR Layout Sector 1", aliases: ["hsr layout", "hsr sector 1", "hsr"], lat: 12.9101, lng: 77.6450 },
  { name: "BTM Layout 2nd Stage", aliases: ["btm layout", "btm 2nd stage", "btm"], lat: 12.9121, lng: 77.6446 },
  { name: "Jayanagar 4th Block", aliases: ["jayanagar 4th block", "jayanagar complex"], lat: 12.9308, lng: 77.5802 }
];

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

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

  const [distanceLandmark, setDistanceLandmark] = useState('all');
  const [customPlace, setCustomPlace] = useState('');
  const [apiResult, setApiResult] = useState(null);
  const [customError, setCustomError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchLabel, setSearchLabel] = useState('');

  // Adjust state during render when props change
  if (pg.id !== prevPgId) {
    setPrevPgId(pg.id);
    const savedList = JSON.parse(localStorage.getItem('wishlist_pgs') || '[]');
    setIsSaved(savedList.includes(pg.id));
    setDistanceLandmark('all');
    setCustomPlace('');
    setApiResult(null);
    setCustomError('');
    setSearchLabel('');
  }

  const getActiveCoords = () => {
    if (pg.lat && pg.lng) {
      const latNum = parseFloat(pg.lat);
      const lngNum = parseFloat(pg.lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        return { lat: latNum, lng: lngNum };
      }
    }
    const cleanedLocality = pg.locality?.trim().toLowerCase();
    if (cleanedLocality) {
      // 1. Direct case-insensitive match
      const directMatchKey = Object.keys(LOCALITY_COORDINATES).find(
        key => key.toLowerCase() === cleanedLocality
      );
      if (directMatchKey) {
        return LOCALITY_COORDINATES[directMatchKey];
      }

      // 2. Substring matching fallback (e.g. "electronic city phase 1" matches "electronic city")
      const subMatchKey = Object.keys(LOCALITY_COORDINATES).find(
        key => cleanedLocality.includes(key.toLowerCase()) || key.toLowerCase().includes(cleanedLocality)
      );
      if (subMatchKey) {
        return LOCALITY_COORDINATES[subMatchKey];
      }
    }
    return { lat: 12.9308, lng: 77.5802 }; // Fallback to Jayanagar
  };

  const activePGCoords = getActiveCoords();

  const getProximityMatrix = () => {
    if (!activePGCoords || !activePGCoords.lat || !activePGCoords.lng) return [];
    return CUSTOM_LANDMARKS.map(landmark => {
      const straightLineDist = getHaversineDistance(activePGCoords.lat, activePGCoords.lng, landmark.lat, landmark.lng);
      const estRoadDist = straightLineDist * 1.35; // Estimate winding road routes
      const estDuration = Math.round(estRoadDist * 3 + 4); // Commute time based on Bangalore traffic average
      return {
        ...landmark,
        straightLineDist,
        estRoadDist,
        estDuration
      };
    })
    .sort((a, b) => a.straightLineDist - b.straightLineDist)
    .slice(0, 4);
  };

  const handleCheckDistance = async (destinationName, optCoords = null) => {
    if (!destinationName) return;
    setIsCalculating(true);
    setCustomError('');
    setApiResult(null);

    // 1. Resolve coordinates (try offline landmarks lookup first)
    const query = destinationName.trim().toLowerCase();
    const localMatch = CUSTOM_LANDMARKS.find(landmark => 
      landmark.name.toLowerCase().includes(query) || 
      landmark.aliases.some(alias => query.includes(alias) || alias.includes(query))
    );

    // Calculate straight-line distance client-side instantly for zero-delay UX
    let straightLineDist = null;
    let formattedStraight = '';
    
    let destLat = optCoords?.lat;
    let destLng = optCoords?.lng;

    if (destLat && destLng) {
      straightLineDist = getHaversineDistance(activePGCoords.lat, activePGCoords.lng, destLat, destLng);
    } else if (localMatch) {
      destLat = localMatch.lat;
      destLng = localMatch.lng;
      straightLineDist = getHaversineDistance(activePGCoords.lat, activePGCoords.lng, destLat, destLng);
    }

    if (straightLineDist !== null) {
      formattedStraight = straightLineDist < 1 
        ? `${Math.round(straightLineDist * 1000)} m` 
        : `${straightLineDist.toFixed(1)} km`;
    }

    // Call backend API, passing coordinates or landmark name to calculate road driving route
    try {
      let url = `/api/distance?originLat=${activePGCoords.lat}&originLng=${activePGCoords.lng}&destination=${encodeURIComponent(destinationName)}`;
      if (destLat && destLng) {
        url += `&destLat=${destLat}&destLng=${destLng}`;
      } else if (localMatch) {
        url = `/api/distance?originLat=${activePGCoords.lat}&originLng=${activePGCoords.lng}&destination=${encodeURIComponent(localMatch.name)}&destLat=${localMatch.lat}&destLng=${localMatch.lng}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate distance.');
      }
      const data = await response.json();
      setApiResult({
        ...data,
        straightLineDist: formattedStraight || data.straightLineDist
      });
    } catch (e) {
      console.error(e);
      // Failsafe offline fallback uses our instant straight-line calculation
      if (straightLineDist !== null) {
        setApiResult({
          distance: formattedStraight,
          duration: `${Math.round(straightLineDist * 4)} mins`,
          isFallback: true,
          provider: "Straight-Line (Offline Fallback)",
          mode: "straight-line"
        });
      } else {
        setCustomError(e.message || "Failed to fetch distance from online maps. Try searching a popular landmark.");
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const renderDistanceResults = () => {
    if (customError) {
      return (
        <div style={{ color: 'var(--colors-error)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
          {customError}
        </div>
      );
    }

    if (!apiResult) return null;

    const { distance, duration } = apiResult;

    // Parse distance string to extract KM for walking time estimation
    let distKm = 0;
    const cleaned = distance.toLowerCase().replace(/,/g, '');
    if (cleaned.includes('km')) {
      distKm = parseFloat(cleaned);
    } else if (cleaned.includes('m')) {
      distKm = parseFloat(cleaned) / 1000;
    } else {
      distKm = parseFloat(cleaned) || 0;
    }

    const walkTime = Math.round(distKm * 12); // ~5 km/h walking speed
    const driveTime = duration || `${Math.round(distKm * 4)} mins`;

    const placeLabel = distanceLandmark !== 'all' 
      ? POPULAR_LANDMARKS[distanceLandmark].name 
      : customPlace;

    return (
      <div className="reveal-animation" style={{ 
        marginTop: '8px', 
        padding: '16px', 
        borderRadius: 'var(--rounded-md)', 
        backgroundColor: 'var(--colors-surface-card)', 
        border: '1px solid var(--colors-hairline-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--colors-muted)' }}>Distance to <strong style={{ color: 'var(--colors-ink)' }}>{placeLabel}</strong>:</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--colors-primary)', display: 'block' }}>{distance}</span>
            {apiResult.straightLineDist && apiResult.straightLineDist !== distance && (
              <span style={{ fontSize: '11px', color: 'var(--colors-muted)', display: 'block', marginTop: '2px' }}>
                {apiResult.straightLineDist} (straight-line)
              </span>
            )}
          </div>
        </div>
        
        <div style={{ height: '1px', backgroundColor: 'var(--colors-hairline-soft)', margin: '4px 0' }} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Drive:</span>
            <div>
              <span style={{ color: 'var(--colors-muted)', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Est. Commute</span>
              <span style={{ fontWeight: 700, color: 'var(--colors-ink)' }}>~{driveTime}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Walk:</span>
            <div>
              <span style={{ color: 'var(--colors-muted)', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Est. Walk</span>
              <span style={{ fontWeight: 700, color: 'var(--colors-ink)' }}>~{walkTime} mins</span>
            </div>
          </div>
        </div>
        
        <div style={{ fontSize: '10px', color: 'var(--colors-muted)', marginTop: '4px', fontStyle: 'italic' }}>
          *Note: Route calculated via {apiResult.provider || (apiResult.isFallback ? 'straight-line geocoding' : 'road navigation APIs')}.
        </div>
        <div style={{ fontSize: '9px', color: 'var(--colors-muted)', opacity: 0.8 }}>
          Origin: [{activePGCoords.lat.toFixed(4)}, {activePGCoords.lng.toFixed(4)}] ({pg.lat && pg.lng ? 'Exact Coordinates' : `Locality: ${pg.locality || 'Default'}`})
        </div>
      </div>
    );
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

  // Fullscreen Gallery States
  const [showFullscreenGallery, setShowFullscreenGallery] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  // Initial focus for accessibility (only when PG changes/opens)
  useEffect(() => {
    if (modalRef.current && !showFullscreenGallery) {
      const focusable = modalRef.current.querySelectorAll('button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [pg.id]);

  // Focus trap & Escape close for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showFullscreenGallery) {
          setShowFullscreenGallery(false);
        } else {
          onClose();
        }
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
  }, [onClose, pg.id, unlockedPGIds, showFullscreenGallery]);



  // Reservation Form states
  const [activeSharing, setActiveSharing] = useState(
    pg.sharing && Object.keys(pg.sharing).includes('double') 
      ? 'double' 
      : (pg.sharing ? Object.keys(pg.sharing)[0] || 'single' : 'single')
  );


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

        {/* Bento Grid Photo Wall */}
        {images.length > 0 ? (
          <div className={`bento-gallery count-${Math.min(images.length, 5)}`}>
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
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-muted)', borderBottom: '1px solid var(--colors-hairline)' }}>
            No images uploaded
          </div>
        )}

        <div className="modal-body">
          {/* Header Title block */}
          <div className="modal-header">
            <span className="caption-sm" style={{ textTransform: 'uppercase', color: 'var(--colors-primary)', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              {pg.gender === 'unisex' ? 'Coliving' : pg.gender === 'boys' ? 'Gents' : 'Ladies'} PG in {pg.locality}
            </span>
            <h2 className="display-lg" style={{ 
              fontSize: '26px', 
              fontWeight: 600, 
              color: 'var(--colors-ink)', 
              marginBottom: '8px',
              filter: isUnlocked ? 'none' : 'blur(5.5px)',
              transition: 'filter 0.35s ease',
              userSelect: isUnlocked ? 'auto' : 'none'
            }}>
              {pg.name}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '14px', color: 'var(--colors-muted)' }}>
              <MapPin size={14} style={{ color: 'var(--colors-primary)' }} />
              <span>{pg.locality}, Bangalore</span>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="modal-layout-grid">
            {/* Left Column: Details */}
            <div style={{ width: '100%' }}>

              {/* Distance Calculator Section */}
              <div style={{ 
                marginBottom: '32px', 
                textAlign: 'left',
                padding: '20px',
                borderRadius: 'var(--rounded-md)',
                backgroundColor: 'var(--colors-surface-soft)',
                border: '1px solid var(--colors-hairline)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Check Distance to your College/Office
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Landmark Select Dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: 'var(--colors-muted)' }}>Select Popular Destination</label>
                    <select 
                      className="form-input" 
                      style={{ height: '38px', fontSize: '13px', paddingRight: '24px' }}
                      value={distanceLandmark}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDistanceLandmark(val);
                        setCustomPlace('');
                        if (val !== 'all') {
                          handleCheckDistance(POPULAR_LANDMARKS[val].name, { lat: POPULAR_LANDMARKS[val].lat, lng: POPULAR_LANDMARKS[val].lng });
                        } else {
                          setApiResult(null);
                          setCustomError('');
                        }
                      }}
                    >
                      <option value="all">-- Select popular landmark --</option>
                      {Object.entries(POPULAR_LANDMARKS).map(([key, item]) => (
                        <option key={key} value={key}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* OR custom text input via Photon Autocomplete */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--colors-hairline-soft)' }} />
                      <span style={{ padding: '0 10px', fontSize: '10px', fontWeight: 700, color: 'var(--colors-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Or search custom location</span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--colors-hairline-soft)' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', width: '100%', flexDirection: 'column' }}>
                      <LocationAutocomplete
                        onSelect={(selection) => {
                          setCustomPlace(selection.label);
                          handleCheckDistance(selection.label, { lat: selection.lat, lng: selection.lng });
                        }}
                        placeholder="Search college, office, mall, or landmark..."
                      />
                    </div>
                  </div>

                  {/* Output Results display */}
                  {renderDistanceResults()}
                </div>
              </div>

              {/* Key Specs Row */}
              <div className="specs-row">
                <div className="spec-card">
                  <span className="spec-icon-wrapper"><Users size={20} /></span>
                  <div>
                    <span className="spec-label">Occupancy Type</span>
                    <span className="spec-val">{pg.gender === 'unisex' ? 'Coliving' : pg.gender}</span>
                  </div>
                </div>
                <div className="spec-card">
                  <span className="spec-icon-wrapper"><Calendar size={20} /></span>
                  <div>
                    <span className="spec-label">Availability</span>
                    <span className="spec-val">Immediate</span>
                  </div>
                </div>
                <div className="spec-card">
                  <span className="spec-icon-wrapper"><Home size={20} /></span>
                  <div>
                    <span className="spec-label">Starting Rent</span>
                    <span className="spec-val">{formatPrice(pg.price)}/mo</span>
                  </div>
                </div>
              </div>

              {/* Property Description */}
              <div style={{ marginBottom: '32px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '10px' }}>
                  About this co-living space
                </h3>
                <p className="body-md" style={{ lineHeight: '1.6', color: 'var(--colors-body)', margin: 0 }}>
                  {pg.description}
                </p>
              </div>

              {/* Amenities List */}
              <div style={{ marginBottom: '32px', textAlign: 'left' }}>
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

              {/* Sharing Room Pricing Options */}
              {pg.sharing && Object.keys(pg.sharing).length > 0 && (
                <div style={{ marginBottom: '32px', textAlign: 'left' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--colors-ink)', marginBottom: '14px' }}>
                    Room Sharing Options
                  </h3>
                  <div style={{ background: 'var(--colors-canvas-parchment)', border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-md)', overflow: 'hidden' }}>
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
            </div>

            {/* Right Column: Sticky Reservation Card */}
            <div>
              <div className="reservation-card">
                <div className="reservation-price-row">
                  <div>
                    <span style={{ fontSize: '22px', fontWeight: 700 }}>{formatPrice(activePrice)}</span>
                    <span style={{ fontSize: '14px', color: 'var(--colors-muted)', fontWeight: 400 }}> / month</span>
                  </div>
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


                  </div>
                  
                  <div className="reservation-picker-cell" style={{ borderBottom: 'none', width: '100%' }}>
                    <span className="reservation-picker-label">Availability Check</span>
                    <span className="reservation-picker-value" style={{ fontWeight: 500, color: 'var(--colors-ink)', marginTop: '2px' }}>
                      Immediate Occupancy
                    </span>
                  </div>
                </div>

                {/* Owner Contact details block inside Reservation Card */}
                <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', marginTop: '4px', width: '100%' }}>
                  <span className="caption-sm" style={{ fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
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
                        <Home size={14} style={{ color: 'var(--colors-muted)' }} />
                        <div>
                          <span style={{ color: 'var(--colors-muted)' }}>PG Name: </span>
                          <span style={{ fontWeight: 700, filter: 'blur(5px)', userSelect: 'none', background: 'var(--colors-surface-strong)', padding: '1px 6px', borderRadius: 'var(--rounded-sm)', display: 'inline-block' }}>
                            {pg.name}
                          </span>
                        </div>
                      </div>
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
                      <span>{isSaved ? 'Saved in List' : 'Save to List'}</span>
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

                {/* Pricing Breakdown */}
                <table className="fee-breakdown-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '13.5px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                      <td style={{ padding: '8px 0', textAlign: 'left', color: 'var(--colors-muted)' }}>Monthly Rent ({activeSharing})</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>{formatPrice(activePrice)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                      <td style={{ padding: '8px 0', textAlign: 'left', color: 'var(--colors-muted)' }}>Security Deposit</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: activeDeposit ? 'var(--colors-ink)' : '#16a34a' }}>
                        {activeDeposit ? formatPrice(activeDeposit) : 'Zero Deposit'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Slider Overlay */}
      {showFullscreenGallery && (
        <div className="fullscreen-gallery-overlay" onClick={(e) => { e.stopPropagation(); setShowFullscreenGallery(false); }}>
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
