import { savePhoto, getPhoto, deletePhoto } from './utils/db';
import { sanitizeText, validatePhone, validateEmail, validatePrice, validateFile } from './utils/sanitize';

// Try to load Firebase environment variables if present
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID
};

// Check if Firebase is fully configured
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null;
let auth = null;
let storage = null;
let firebaseApp = null;

// Initialize Firebase dynamically if keys are present
if (isFirebaseConfigured) {
  try {
    // Dynamic import to prevent app crash if Firebase fails to load
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    const { getStorage } = await import('firebase/storage');
    
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    storage = getStorage(firebaseApp);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase, falling back to Local Mode:", error);
  }
} else {
  console.log("No Firebase config detected. Running in Local Mode (LocalStorage + IndexedDB).");
}

export const isFirebaseActive = !!(db && auth && storage);

// ==========================================
// HMAC-SIGNED CREDIT STORE (Local Mode)
// ==========================================
// Simple tamper-detection for localStorage credits.
// NOTE: In Local Mode, the secret is in the client bundle — this raises
// the difficulty of casual tampering but is NOT cryptographically secure.
// True security requires Firebase Mode with server-side credit validation.

// Fall back to a dynamic session-based UUID key to avoid any hardcoded static secrets.
const CREDIT_SECRET = import.meta.env?.VITE_CREDIT_SECRET || (() => {
  let sessionSecret = sessionStorage.getItem('pg_wala_session_secret');
  if (!sessionSecret) {
    sessionSecret = 'dyn-' + crypto.randomUUID();
    sessionStorage.setItem('pg_wala_session_secret', sessionSecret);
  }
  return sessionSecret;
})();

async function hmacSign(value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(CREDIT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(value)));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacVerify(value, expectedSig) {
  const actualSig = await hmacSign(value);
  return actualSig === expectedSig;
}

// ==========================================
// CLIENT-SIDE RATE LIMITING
// ==========================================

// Login Rate Limiter (Max 5 attempts per 15 minutes)
function getLoginAttempts() {
  try {
    const stored = localStorage.getItem('pg_wala_login_attempts');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLoginAttempts(attempts) {
  try {
    localStorage.setItem('pg_wala_login_attempts', JSON.stringify(attempts));
  } catch (e) {
    console.error("Failed to write login attempts to localStorage:", e);
  }
}

export function checkLoginRateLimit() {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const attempts = getLoginAttempts().filter(timestamp => now - timestamp < windowMs);
  
  saveLoginAttempts(attempts);
  
  if (attempts.length >= 5) {
    const oldestAttempt = attempts[0];
    const timeRemainingMs = windowMs - (now - oldestAttempt);
    const minutesRemaining = Math.ceil(timeRemainingMs / 60 / 1000);
    return {
      blocked: true,
      error: `Too many login attempts. Please try again in ${minutesRemaining} minutes.`
    };
  }
  return { blocked: false };
}

export function registerFailedLoginAttempt() {
  const now = Date.now();
  const attempts = getLoginAttempts();
  attempts.push(now);
  saveLoginAttempts(attempts);
}

export function clearLoginAttempts() {
  try {
    localStorage.removeItem('pg_wala_login_attempts');
  } catch (e) {
    console.error("Failed to clear login attempts:", e);
  }
}

// General Endpoint Rate Limiter
function checkGeneralRateLimit(actionName, maxAttempts, timeWindowMs) {
  try {
    const key = `pg_wala_rate_${actionName}`;
    const now = Date.now();
    const stored = localStorage.getItem(key);
    let attempts = stored ? JSON.parse(stored) : [];
    
    // Filter old attempts
    attempts = attempts.filter(timestamp => now - timestamp < timeWindowMs);
    
    if (attempts.length >= maxAttempts) {
      return { 
        blocked: true, 
        error: `Rate limit exceeded for action: ${actionName.replace(/_/g, ' ')}. Max ${maxAttempts} requests per ${timeWindowMs / 60000} min. Please try again later.` 
      };
    }
    
    attempts.push(now);
    localStorage.setItem(key, JSON.stringify(attempts));
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}


// ==========================================
// CREDIT SYSTEM (Service Layer)
// ==========================================

const DEFAULT_CREDITS = 3;

export async function getUserCredits() {
  if (isFirebaseActive) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      // For unauthenticated users, use anonymous session ID
      const userId = user?.uid || getAnonymousUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().credits ?? DEFAULT_CREDITS;
      }
      // First visit — initialize credits
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', userId), { credits: DEFAULT_CREDITS, unlockedPGs: [] });
      return DEFAULT_CREDITS;
    } catch (error) {
      console.error("Error reading credits:", error);
      return DEFAULT_CREDITS;
    }
  }

  // Local Mode — HMAC-signed credits
  const stored = localStorage.getItem('pg_wala_credits_signed');
  if (stored) {
    try {
      const { value, sig } = JSON.parse(stored);
      const valid = await hmacVerify(value, sig);
      if (valid) return Number(value);
      // Signature mismatch — tampering detected, reset
      console.warn("Credit tampering detected. Resetting to default.");
    } catch {
      // Corrupt data — reset
    }
  }
  // Initialize
  await setLocalCredits(DEFAULT_CREDITS);
  return DEFAULT_CREDITS;
}

async function setLocalCredits(amount) {
  const sig = await hmacSign(amount);
  localStorage.setItem('pg_wala_credits_signed', JSON.stringify({ value: amount, sig }));
  // Remove old unsigned key if it exists
  localStorage.removeItem('pg_wala_credits');
}

export async function getUnlockedPGIds() {
  if (isFirebaseActive) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userId = auth.currentUser?.uid || getAnonymousUserId();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().unlockedPGs || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  // Local Mode
  const stored = localStorage.getItem('pg_wala_unlocked_ids');
  return stored ? JSON.parse(stored) : [];
}

function getAnonymousUserId() {
  let anonId = localStorage.getItem('pg_wala_anon_uid');
  if (!anonId) {
    anonId = 'anon-' + crypto.randomUUID();
    localStorage.setItem('pg_wala_anon_uid', anonId);
  }
  return anonId;
}

// ==========================================
// CONTACT DETAIL PROTECTION
// ==========================================

// Private contact store (Local Mode) — separate from public listings
const CONTACTS_STORE_KEY = 'pg_contacts_private';

function getPrivateContactStore() {
  const stored = localStorage.getItem(CONTACTS_STORE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function savePrivateContact(pgId, contacts) {
  const store = getPrivateContactStore();
  store[pgId] = contacts;
  localStorage.setItem(CONTACTS_STORE_KEY, JSON.stringify(store));
}

function deletePrivateContact(pgId) {
  const store = getPrivateContactStore();
  delete store[pgId];
  localStorage.setItem(CONTACTS_STORE_KEY, JSON.stringify(store));
}

/**
 * Mask a phone number for public display.
 * "+91 98765 43210" → "+91 98765 XXXXX"
 */
function maskPhoneNumber(phone) {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9+\s]/g, '');
  if (clean.length > 5) {
    return clean.substring(0, clean.length - 5) + 'XXXXX';
  }
  return 'XXXXX XXXXX';
}

/**
 * Mask an email for public display.
 * "dublin.stanza@example.com" → "dub****@example.com"
 */
function maskEmailAddress(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length < 2) return '****@****.com';
  return parts[0].substring(0, Math.min(parts[0].length, 3)) + '****@' + parts[1];
}

/**
 * Unlock a PG's contact details. Verifies credits, deducts 1, returns real contacts.
 * @param {string} pgId - The PG listing ID to unlock
 * @returns {Promise<{ phone: string, email: string, whatsapp: string } | null>}
 */
export async function unlockPGContact(pgId) {
  const limit = checkGeneralRateLimit('unlock_contact', 15, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  if (isFirebaseActive) {
    try {
      const { doc, getDoc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const userId = auth.currentUser?.uid || getAnonymousUserId();
      
      // Check if already unlocked
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : { credits: DEFAULT_CREDITS, unlockedPGs: [] };
      
      if ((userData.unlockedPGs || []).includes(pgId)) {
        // Already unlocked — return contacts without deduction
        const contactDoc = await getDoc(doc(db, 'pgs', pgId, 'private', 'contacts'));
        return contactDoc.exists() ? contactDoc.data() : null;
      }
      
      // Check credit balance
      if ((userData.credits || 0) <= 0) {
        return null; // No credits
      }
      
      // Deduct credit and mark as unlocked
      await updateDoc(doc(db, 'users', userId), {
        credits: (userData.credits || 0) - 1,
        unlockedPGs: arrayUnion(pgId)
      });
      
      // Return private contacts
      const contactDoc = await getDoc(doc(db, 'pgs', pgId, 'private', 'contacts'));
      return contactDoc.exists() ? contactDoc.data() : null;
    } catch (error) {
      console.error("Error unlocking PG contact:", error);
      throw error;
    }
  }

  // Local Mode
  const credits = await getUserCredits();
  const unlocked = await getUnlockedPGIds();
  
  if (unlocked.includes(pgId)) {
    // Already unlocked — return stored contacts
    const contacts = getPrivateContactStore()[pgId];
    return contacts || null;
  }
  
  if (credits <= 0) {
    return null; // No credits — caller should show purchase modal
  }
  
  // Deduct credit
  await setLocalCredits(credits - 1);
  
  // Mark as unlocked
  unlocked.push(pgId);
  localStorage.setItem('pg_wala_unlocked_ids', JSON.stringify(unlocked));
  
  // Return the private contacts
  const contacts = getPrivateContactStore()[pgId];
  return contacts || null;
}

/**
 * Add credits to the user's balance (called after payment verification).
 * @param {number} amount - Number of credits to add
 */
export async function addCredits(amount) {
  const limit = checkGeneralRateLimit('add_credits', 10, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  if (typeof amount !== 'number' || amount <= 0 || amount > 100) {
    throw new Error('Invalid credit amount');
  }
  
  if (isFirebaseActive) {
    try {
      const { doc, getDoc, updateDoc, setDoc } = await import('firebase/firestore');
      const userId = auth.currentUser?.uid || getAnonymousUserId();
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, { credits: (userDoc.data().credits || 0) + amount });
      } else {
        await setDoc(userDocRef, { credits: amount, unlockedPGs: [] });
      }
      return true;
    } catch (error) {
      console.error("Error adding credits:", error);
      throw error;
    }
  }

  // Local Mode
  const current = await getUserCredits();
  await setLocalCredits(current + amount);
  return true;
}

// ==========================================
// MOCK DATA & SERVICES (IndexedDB + LocalStorage)
// ==========================================

// Public mock data — contacts are MASKED, real contacts stored separately
const MOCK_PGS_PUBLIC = [
  {
    id: 'mock-1',
    name: 'Stanza Living Dublin House',
    locality: 'Koramangala',
    address: '4th Block, Koramangala, Near Sony World Signal, Bangalore - 560034',
    description: 'Dublin House by Stanza Living is a fully-equipped, modern living space for young professionals and students. Located in the heart of Bangalore\'s startup hub, it offers high-speed Wi-Fi, delicious home-style meals, daily housekeeping, and access to a vibrant community. The building features biometric security, lounge areas, and recreational zones.',
    price: 12500,
    gender: 'unisex',
    sharing: { single: 16000, double: 12500, triple: 9500 },
    amenities: ['wifi', 'food', 'ac', 'gym', 'laundry', 'backup', 'security'],
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80'
    ],
    // Only masked contacts in public object
    contactPhone: '+91 98765 XXXXX',
    contactEmail: 'dub****@example.com'
  },
  {
    id: 'mock-2',
    name: 'Zolo Staycation Gents PG',
    locality: 'HSR Layout',
    address: '14th Main Rd, Sector 3, HSR Layout, Near McDonald\'s, Bangalore - 560102',
    description: 'Zolo Staycation is an exclusive gents PG offering premium comfort and amenities at affordable prices. Enjoy spacious rooms with dedicated study desks, high-speed internet, power backup, and regular professional cleaning. Close to major IT hubs and local cafes.',
    price: 8000,
    gender: 'boys',
    sharing: { double: 10000, triple: 8000 },
    amenities: ['wifi', 'food', 'backup', 'security', 'parking'],
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 87654 XXXXX',
    contactEmail: 'sta****@example.com'
  },
  {
    id: 'mock-3',
    name: 'Nestaway Elite Girls Hostels',
    locality: 'Indiranagar',
    address: '100 Feet Rd, Indiranagar, Opposite Metro Station, Bangalore - 560038',
    description: 'A premium girls-only living space in the trendy locality of Indiranagar. Excellent connectivity via Metro, safe neighborhood with 24/7 CCTV surveillance, and walking distance to Bangalore\'s finest dining and shopping. Features cozy single occupancy rooms, laundry service, high-speed internet, and daily wholesome meals.',
    price: 15000,
    gender: 'girls',
    sharing: { single: 22000, double: 15000 },
    amenities: ['wifi', 'food', 'ac', 'laundry', 'backup', 'security'],
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 76543 XXXXX',
    contactEmail: 'eli****@example.com'
  },
  {
    id: 'mock-4',
    name: 'Colive Premium Co-living',
    locality: 'Whitefield',
    address: 'ITPB Road, Whitefield, Near Vydehi Hospital, Bangalore - 560066',
    description: 'Modern, community-focused coliving space designed for technology professionals in Whitefield. Features a fully equipped gym, gaming lounge, open rooftop dining area, and dedicated workspaces. High security, professional housekeeping, and vibrant community events.',
    price: 13000,
    gender: 'unisex',
    sharing: { single: 19000, double: 13000 },
    amenities: ['wifi', 'food', 'ac', 'gym', 'security', 'parking'],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 65432 XXXXX',
    contactEmail: 'whi****@example.com'
  }
];

// Private contacts (stored separately, never shipped to listing views)
const MOCK_PRIVATE_CONTACTS = {
  'mock-1': { phone: '+91 98765 43210', email: 'dublin.stanza@example.com', whatsapp: '+91 98765 43210' },
  'mock-2': { phone: '+91 87654 32109', email: 'staycation.zolo@example.com', whatsapp: '+91 87654 32109' },
  'mock-3': { phone: '+91 76543 21098', email: 'elite.nestaway@example.com', whatsapp: '+91 76543 21098' },
  'mock-4': { phone: '+91 65432 10987', email: 'whitefield.colive@example.com', whatsapp: '+91 65432 10987' }
};

// Initialize localStorage stores on first visit
if (!localStorage.getItem('pgs_list')) {
  localStorage.setItem('pgs_list', JSON.stringify(MOCK_PGS_PUBLIC));
}
if (!localStorage.getItem(CONTACTS_STORE_KEY)) {
  localStorage.setItem(CONTACTS_STORE_KEY, JSON.stringify(MOCK_PRIVATE_CONTACTS));
}

// ==========================================
// DATABASE SERVICES (API INTERFACE)
// ==========================================

export async function fetchAllPGs() {
  if (isFirebaseActive) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const pgCol = collection(db, 'pgs');
      const pgSnapshot = await getDocs(pgCol);
      const pgList = pgSnapshot.docs.map(doc => {
        const data = doc.data();
        // Strip private contacts from public listing — return only masked versions
        return {
          id: doc.id,
          ...data,
          contactPhone: maskPhoneNumber(data.contactPhone || ''),
          contactEmail: maskEmailAddress(data.contactEmail || ''),
          // Remove raw WhatsApp from public response
          contactWhatsapp: undefined
        };
      });
      return pgList.length > 0 ? pgList : MOCK_PGS_PUBLIC;
    } catch (error) {
      console.error("Firebase fetch failed, reading from local:", error);
    }
  }
  
  // Local Mode — data already has masked contacts
  const stored = localStorage.getItem('pgs_list');
  const pgs = stored ? JSON.parse(stored) : MOCK_PGS_PUBLIC;
  
  // For any local image store, fetch the base64 data from IndexedDB
  const enrichedPgs = await Promise.all(pgs.map(async (pg) => {
    const enrichedImages = await Promise.all(pg.images.map(async (img) => {
      if (img.startsWith('local-img-')) {
        try {
          const base64 = await getPhoto(img);
          return base64 || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'; // fallback
        } catch {
          return 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80';
        }
      }
      return img;
    }));
    return { ...pg, images: enrichedImages };
  }));
  
  return enrichedPgs;
}

export async function createPGListing(pgData, imageFiles) {
  const limit = checkGeneralRateLimit('create_listing', 10, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  // Validate images count and properties
  if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
    throw new Error('Please upload at least one room photo.');
  }
  
  if (imageFiles.length > 5) {
    throw new Error('You can upload a maximum of 5 images per listing.');
  }

  for (const file of imageFiles) {
    const fileCheck = validateFile(file);
    if (!fileCheck.valid) {
      throw new Error(fileCheck.error);
    }
  }

  // ---- SERVER-SIDE VALIDATION ----
  const nameClean = sanitizeText(pgData.name, 200);
  const addressClean = sanitizeText(pgData.address, 500);
  const descClean = sanitizeText(pgData.description, 2000);
  
  if (!nameClean || !addressClean || !descClean) {
    throw new Error('Required text fields cannot be empty after sanitization.');
  }
  
  const priceResult = validatePrice(pgData.price);
  if (!priceResult.valid) {
    throw new Error(`Invalid price: ${priceResult.error}`);
  }
  
  const phoneResult = validatePhone(pgData.contactPhone);
  if (!phoneResult.valid) {
    throw new Error(`Invalid phone: ${phoneResult.error}`);
  }
  
  if (pgData.contactEmail) {
    const emailResult = validateEmail(pgData.contactEmail);
    if (!emailResult.valid) {
      throw new Error(`Invalid email: ${emailResult.error}`);
    }
  }

  // Validate sharing prices
  const validatedSharing = {};
  for (const [key, val] of Object.entries(pgData.sharing || {})) {
    if (val) {
      const sharePrice = validatePrice(val);
      if (sharePrice.valid) {
        validatedSharing[key] = sharePrice.value;
      }
    }
  }
  
  // Sanitized data object
  const sanitizedData = {
    name: nameClean,
    locality: sanitizeText(pgData.locality, 100),
    address: addressClean,
    description: descClean,
    price: priceResult.value,
    gender: ['boys', 'girls', 'unisex'].includes(pgData.gender) ? pgData.gender : 'unisex',
    sharing: validatedSharing,
    amenities: Array.isArray(pgData.amenities) 
      ? pgData.amenities.filter(a => typeof a === 'string' && a.length < 50) 
      : [],
    furnishing: sanitizeText(pgData.furnishing || 'Semi Furnished', 50),
    availableFrom: sanitizeText(pgData.availableFrom || 'Immediate', 50)
  };

  // Real contacts (stored privately)
  const realContacts = {
    phone: phoneResult.cleaned,
    email: pgData.contactEmail ? pgData.contactEmail.trim() : '',
    whatsapp: pgData.contactWhatsapp 
      ? validatePhone(pgData.contactWhatsapp).cleaned || phoneResult.cleaned
      : phoneResult.cleaned
  };

  // Masked contacts (stored in public listing)
  const maskedContacts = {
    contactPhone: maskPhoneNumber(realContacts.phone),
    contactEmail: maskEmailAddress(realContacts.email)
  };

  if (isFirebaseActive) {
    try {
      const { collection, addDoc, doc, setDoc } = await import('firebase/firestore');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      
      // 1. Upload images to Firebase Storage
      const uploadedImageUrls = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const { sanitizedName } = validateFile(file);
        const filename = `${Date.now()}_${i}_${sanitizedName}`;
        const imgRef = ref(storage, `pg_images/${filename}`);
        const snapshot = await uploadBytes(imgRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        uploadedImageUrls.push(downloadUrl);
      }
      
      // 2. Create public firestore record (no raw contacts)
      const publicData = {
        ...sanitizedData,
        ...maskedContacts,
        images: uploadedImageUrls,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'pgs'), publicData);
      
      // 3. Store private contacts in subcollection
      await setDoc(doc(db, 'pgs', docRef.id, 'private', 'contacts'), realContacts);
      
      return { id: docRef.id, ...publicData };
    } catch (error) {
      console.error("Firebase PG creation failed:", error);
      throw error;
    }
  }
  
  // Local Mode
  const pgs = JSON.parse(localStorage.getItem('pgs_list') || '[]');
  const newId = `pg-${Date.now()}`;
  
  // 1. Save images to IndexedDB
  const imageKeys = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const imageKey = `local-img-${newId}-${i}`;
    await savePhoto(imageKey, file);
    imageKeys.push(imageKey);
  }
  
  // 2. Add to public localStorage (masked contacts only)
  const newPG = {
    id: newId,
    ...sanitizedData,
    ...maskedContacts,
    images: imageKeys
  };
  
  pgs.push(newPG);
  localStorage.setItem('pgs_list', JSON.stringify(pgs));
  
  // 3. Store private contacts separately
  savePrivateContact(newId, realContacts);
  
  // Return PG with resolved base64 images so UI updates instantly
  const resolvedImages = [];
  for (const key of imageKeys) {
    const base64 = await getPhoto(key);
    resolvedImages.push(base64);
  }
  
  return { ...newPG, images: resolvedImages };
}

export async function deletePGListing(pgId) {
  const limit = checkGeneralRateLimit('delete_listing', 10, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  if (isFirebaseActive) {
    try {
      const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
      const { ref, deleteObject } = await import('firebase/storage');
      
      const docRef = doc(db, 'pgs', pgId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const pgData = docSnap.data();
        // Delete all images in Firebase Storage
        if (pgData.images && Array.isArray(pgData.images)) {
          for (const url of pgData.images) {
            if (url.includes('firebasestorage.googleapis.com')) {
              try {
                const imgRef = ref(storage, url);
                await deleteObject(imgRef);
              } catch (e) {
                console.error("Error deleting image from storage:", e);
              }
            }
          }
        }
      }
      
      // Delete private contacts subcollection
      try {
        await deleteDoc(doc(db, 'pgs', pgId, 'private', 'contacts'));
      } catch (e) {
        console.error("Error deleting private contacts:", e);
      }
      
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Firebase PG delete failed:", error);
      throw error;
    }
  }
  
  // Local Mode
  let pgs = JSON.parse(localStorage.getItem('pgs_list') || '[]');
  const pgToDelete = pgs.find(p => p.id === pgId);
  
  if (pgToDelete) {
    // Delete files in IndexedDB
    for (const imgKey of pgToDelete.images) {
      if (imgKey.startsWith('local-img-')) {
        await deletePhoto(imgKey);
      }
    }
    
    // Remove from public listing
    pgs = pgs.filter(p => p.id !== pgId);
    localStorage.setItem('pgs_list', JSON.stringify(pgs));
    
    // Remove private contacts
    deletePrivateContact(pgId);
    
    return true;
  }
  
  return false;
}

// ==========================================
// AUTHENTICATION SERVICES
// ==========================================

// Admin credentials from environment variables (NOT hardcoded)
const ENV_ADMIN_USER = import.meta.env?.VITE_ADMIN_USER;
const ENV_ADMIN_PASS = import.meta.env?.VITE_ADMIN_PASS;
const isLocalAdminConfigured = !!(ENV_ADMIN_USER && ENV_ADMIN_PASS);

export { isLocalAdminConfigured };

export async function authenticateAdmin(usernameOrEmail, password) {
  // Enforce credentials types and maximum lengths to prevent overflow/DoS
  if (typeof usernameOrEmail !== 'string' || typeof password !== 'string') {
    throw new Error("Invalid username/email or password format.");
  }
  if (usernameOrEmail.length > 100 || password.length > 100) {
    throw new Error("Credentials exceed maximum length.");
  }

  // Check rate limit
  const limitCheck = checkLoginRateLimit();
  if (limitCheck.blocked) {
    throw new Error(limitCheck.error);
  }

  if (isFirebaseActive) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, usernameOrEmail, password);
      clearLoginAttempts(); // Clear history upon successful login
      return { uid: userCredential.user.uid, email: userCredential.user.email };
    } catch (error) {
      console.error("Firebase Auth sign in failed:", error);
      registerFailedLoginAttempt(); // Log failed attempt
      throw new Error("Invalid admin credentials");
    }
  }
  
  // Local Mode Auth — credentials from env vars only
  if (!isLocalAdminConfigured) {
    throw new Error("Admin login is not configured. Set VITE_ADMIN_USER and VITE_ADMIN_PASS in your .env file.");
  }
  
  if (usernameOrEmail === ENV_ADMIN_USER && password === ENV_ADMIN_PASS) {
    const adminUser = { uid: 'local-admin', username: ENV_ADMIN_USER };
    // Store session with timestamp for expiry
    const session = {
      ...adminUser,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hour expiry
    };
    localStorage.setItem('admin_session', JSON.stringify(session));
    clearLoginAttempts(); // Clear history upon successful login
    return adminUser;
  } else {
    registerFailedLoginAttempt(); // Log failed attempt
    throw new Error("Invalid username or password");
  }
}

export async function logoutAdminSession() {
  if (isFirebaseActive) {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Firebase Auth sign out failed:", error);
    }
  }
  
  localStorage.removeItem('admin_session');
  return true;
}

export function subscribeToAuth(callback) {
  if (isFirebaseActive) {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        callback({ uid: user.uid, email: user.email });
      } else {
        callback(null);
      }
    });
    return unsub;
  }
  
  // Local Mode Auth listener setup
  const checkSession = () => {
    const session = localStorage.getItem('admin_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        // Check session expiry
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem('admin_session');
          callback(null);
          return;
        }
        callback(parsed);
      } catch {
        localStorage.removeItem('admin_session');
        callback(null);
      }
    } else {
      callback(null);
    }
  };
  
  checkSession();
  
  // Simple polling listener for tab events or local changes
  const interval = setInterval(checkSession, 5000);
  return () => clearInterval(interval);
}

