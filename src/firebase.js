import { savePhoto, getPhoto, deletePhoto } from './utils/db';
import { sanitizeText, validatePhone, validateEmail, validatePrice, validateFile } from './utils/sanitize';
import bcrypt from 'bcryptjs';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';

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

// Strict production failsafe: in production environment, reject local mode mock fallback
const isProd = import.meta.env?.PROD === true;
if (isProd && !isFirebaseConfigured) {
  throw new Error("CRITICAL SECURITY ERROR: Firebase configuration keys are missing in production environment. Failing closed.");
}

let db = null;
let auth = null;
let storage = null;
let firebaseApp = null;
let appCheck = null;

// Initialize Firebase synchronously if keys are present
if (isFirebaseConfigured) {
  try {
    // Enable local App Check debug tokens ONLY in local development contexts to prevent token leaks in production
    const isLocalDev = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.startsWith('192.168.'));

    if (isLocalDev && typeof window !== 'undefined') {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    storage = getStorage(firebaseApp);

    // Initialize App Check to secure backend services from DDOS / automated scripts
    try {
      const recaptchaSiteKey = import.meta.env?.VITE_RECAPTCHA_SITE_KEY || '';
      const hasRealSiteKey = recaptchaSiteKey && recaptchaSiteKey !== '6Ad-dummy-recaptcha-key-here-for-safety';
      
      if (isLocalDev || hasRealSiteKey) {
        appCheck = initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey || '6Ad-dummy-recaptcha-key-here-for-safety'),
          isTokenAutoRefreshEnabled: true
        });
        console.log(`Firebase App Check initialized successfully (${isLocalDev ? 'Debug' : 'ReCaptchaV3'} Provider active).`);
      } else {
        console.warn("Skipping App Check initialization: No VITE_RECAPTCHA_SITE_KEY configured in production.");
      }
    } catch (appCheckErr) {
      console.warn("App Check could not be initialized:", appCheckErr);
    }

    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase, falling back to Local Mode:", error);
  }
} else {
  console.log("No Firebase config detected. Running in Local Mode (LocalStorage + IndexedDB).");
}

export const isFirebaseActive = !!(db && auth);

export function isFirebaseOperational() {
  return !!(isFirebaseActive && auth?.currentUser);
}

/**
 * Get a Firebase ID token for the current authenticated user.
 * Used to authenticate requests to server-side API routes (e.g., /api/verify-payment).
 * Returns null if not authenticated or not in Firebase mode.
 */
export async function getFirebaseIdToken() {
  if (!isFirebaseActive || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(/* forceRefresh */ true);
  } catch (err) {
    console.error('Failed to get Firebase ID token:', err);
    return null;
  }
}

const TEST_ACCOUNTS = [
  'abhinandsreejith12@gmail.com',
  'amanmohdp53@gmail.com',
  'admin@pghive.com',
  'abhinandshopify@gmail.com'
];

export function checkIfTestEmail(email) {
  if (!email) return false;
  return TEST_ACCOUNTS.includes(email.trim().toLowerCase());
}

// ==========================================
// HMAC-SIGNED CREDIT STORE (Local Mode Only)
// ==========================================
// SECURITY FIX #4: Removed VITE_CREDIT_SECRET (was bundled into client JS, readable by anyone).
// Now uses a per-device random key stored in localStorage.
// NOTE: This is tamper-deterrence for Local Mode only — NOT a security control.
// True credit security is enforced server-side via Firestore rules + Admin SDK.

const CREDIT_SECRET = (() => {
  let deviceSecret = localStorage.getItem('pg_hub_device_secret');
  if (!deviceSecret) {
    deviceSecret = 'dev-' + crypto.randomUUID();
    localStorage.setItem('pg_hub_device_secret', deviceSecret);
  }
  return deviceSecret;
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
// CLIENT-SIDE RATE LIMITING (HMAC-SIGNED)
// ==========================================
// SECURITY NOTE (Fix #7): These rate limits run entirely in the browser (localStorage).
// They provide UX-level throttling for honest users but are NOT security controls.
// An attacker scripting directly against Firebase Auth/Firestore bypasses them entirely.
// Real abuse protection requires: Firebase App Check, server-side rate limiting,
// and Firebase Auth's built-in brute-force protection.

async function getSignedAttempts(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const { value, sig } = JSON.parse(stored);
    const valid = await hmacVerify(JSON.stringify(value), sig);
    if (valid && Array.isArray(value)) {
      return value;
    }
    console.warn(`Rate limit tampering detected for ${key}. Resetting.`);
    return [];
  } catch {
    return [];
  }
}

async function saveSignedAttempts(key, attempts) {
  try {
    const valueStr = JSON.stringify(attempts);
    const sig = await hmacSign(valueStr);
    localStorage.setItem(key, JSON.stringify({ value: attempts, sig }));
  } catch (e) {
    console.error("Failed to save signed attempts:", e);
  }
}

// Login Rate Limiter (Max 5 attempts per 15 minutes)
export async function checkLoginRateLimit() {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const key = 'pg_hub_login_attempts_signed';
  const attempts = (await getSignedAttempts(key)).filter(timestamp => now - timestamp < windowMs);
  
  await saveSignedAttempts(key, attempts);
  
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

export async function registerFailedLoginAttempt() {
  const now = Date.now();
  const key = 'pg_hub_login_attempts_signed';
  const attempts = await getSignedAttempts(key);
  attempts.push(now);
  await saveSignedAttempts(key, attempts);
}

export async function clearLoginAttempts() {
  try {
    localStorage.removeItem('pg_hub_login_attempts_signed');
  } catch (e) {
    console.error("Failed to clear login attempts:", e);
  }
}

// ==========================================
// CLIENT-SIDE ACCOUNT LOCKOUT (HMAC-SIGNED)
// ==========================================
// SECURITY NOTE (Fix #7): Same caveat as rate limiting above — client-side only.
// Firebase Auth has built-in account lockout for excessive failed sign-in attempts.

async function getAccountLockState(email) {
  try {
    const key = `pg_hub_lock_${email.replace(/[^a-zA-Z0-9]/g, '_')}_signed`;
    const stored = localStorage.getItem(key);
    if (!stored) return { failedAttempts: 0, lockedUntil: 0 };
    const { value, sig } = JSON.parse(stored);
    const valid = await hmacVerify(JSON.stringify(value), sig);
    if (valid && typeof value === 'object') {
      return value;
    }
    return { failedAttempts: 0, lockedUntil: 0 };
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
}

async function saveAccountLockState(email, state) {
  try {
    const key = `pg_hub_lock_${email.replace(/[^a-zA-Z0-9]/g, '_')}_signed`;
    const valueStr = JSON.stringify(state);
    const sig = await hmacSign(valueStr);
    localStorage.setItem(key, JSON.stringify({ value: state, sig }));
  } catch (e) {
    console.error("Failed to save account lock state:", e);
  }
}

async function recordFailedLogin(email) {
  const state = await getAccountLockState(email);
  const now = Date.now();
  
  // Filter old failed attempts (15 minute window)
  const windowMs = 15 * 60 * 1000;
  if (state.lastAttempt && now - state.lastAttempt > windowMs) {
    state.failedAttempts = 0;
  }
  
  state.failedAttempts += 1;
  state.lastAttempt = now;
  
  if (state.failedAttempts >= 5) {
    state.lockedUntil = now + windowMs; // Lock for 15 minutes
    console.warn(`[SECURITY LOG] Account temporarily locked: ${email} (Unlock at: ${new Date(state.lockedUntil).toLocaleTimeString()})`);
  }
  
  await saveAccountLockState(email, state);
  return state;
}

async function clearFailedLogin(email) {
  const key = `pg_hub_lock_${email.replace(/[^a-zA-Z0-9]/g, '_')}_signed`;
  localStorage.removeItem(key);
}


// Device Fingerprint Helper
async function getDeviceFingerprint() {
  if (typeof window === 'undefined') return 'server';
  const ua = navigator.userAgent || '';
  const screenW = window.screen?.width || 0;
  const screenH = window.screen?.height || 0;
  const lang = navigator.language || '';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const rawString = `${ua}|${screenW}x${screenH}|${lang}|${tz}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// General Endpoint Rate Limiter
async function checkGeneralRateLimit(actionName, maxAttempts, timeWindowMs) {
  try {
    const key = `pg_hub_rate_${actionName}_signed`;
    const now = Date.now();
    let attempts = await getSignedAttempts(key);
    
    // Filter old attempts
    attempts = attempts.filter(timestamp => now - timestamp < timeWindowMs);
    
    if (attempts.length >= maxAttempts) {
      return { 
        blocked: true, 
        error: `Rate limit exceeded for action: ${actionName.replace(/_/g, ' ')}. Max ${maxAttempts} requests per ${timeWindowMs / 60000} min. Please try again later.` 
      };
    }
    
    attempts.push(now);
    await saveSignedAttempts(key, attempts);
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}



// ==========================================
// CREDIT SYSTEM (Service Layer)
// ==========================================

const DEFAULT_CREDITS = 1;

export async function getUserCredits() {
  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      const userId = user.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      const isTestEmail = user?.email && checkIfTestEmail(user.email);
      
      if (userDoc.exists()) {
        if (isTestEmail && (userDoc.data().credits === undefined || userDoc.data().credits < 10)) {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', userId), { credits: 10 });
          return 10;
        }
        return userDoc.data().credits ?? DEFAULT_CREDITS;
      }
      // First visit — initialize credits
      const { setDoc } = await import('firebase/firestore');
      const initialCredits = isTestEmail ? 10 : DEFAULT_CREDITS;
      await setDoc(doc(db, 'users', userId), { credits: initialCredits, unlockedPGs: [] });
      return initialCredits;
    } catch (error) {
      console.error("Error reading credits:", error);
      return DEFAULT_CREDITS;
    }
  }

  // Local Mode — HMAC-signed credits (user-specific keys to prevent credit bleed)
  const user = getLocalSessionUser();
  const emailKey = user ? `_${user.email}` : '';
  const stored = localStorage.getItem(`pg_hub_credits_signed${emailKey}`);
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
  const user = getLocalSessionUser();
  const emailKey = user ? `_${user.email}` : '';
  const sig = await hmacSign(amount);
  localStorage.setItem(`pg_hub_credits_signed${emailKey}`, JSON.stringify({ value: amount, sig }));
  // Remove old unsigned keys if they exist
  localStorage.removeItem(`pg_hub_credits${emailKey}`);
}

export async function getUnlockedPGIds() {
  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userId = auth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().unlockedPGs || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  // Local Mode (user-specific unlocked lists)
  const user = getLocalSessionUser();
  const emailKey = user ? `_${user.email}` : '';
  const stored = localStorage.getItem(`pg_hub_unlocked_ids${emailKey}`);
  return stored ? JSON.parse(stored) : [];
}

function getAnonymousUserId() {
  let anonId = localStorage.getItem('pg_hub_anon_uid');
  if (!anonId) {
    anonId = 'anon-' + crypto.randomUUID();
    localStorage.setItem('pg_hub_anon_uid', anonId);
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
  if (typeof pgId !== 'string' || pgId.trim().length === 0 || pgId.length > 100) {
    throw new Error("Invalid listing ID format.");
  }

  const limit = await checkGeneralRateLimit('unlock_contact', 15, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  const currentFingerprint = await getDeviceFingerprint();

  if (isFirebaseOperational()) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated.");
      }

      // Email verification gate (prevent throwaway accounts)
      const isTestEmail = currentUser.email && checkIfTestEmail(currentUser.email);
      if (!currentUser.emailVerified && !isTestEmail) {
        throw new Error("Email verification required. Please check your inbox and verify your email to unlock listing contacts.");
      }

      // Bot protection verification
      try {
        if (appCheck) {
          await getToken(appCheck, false);
        }
      } catch (appCheckErr) {
        console.warn("App Check verification failed on unlock:", appCheckErr);
        const hasRealSiteKey = !!(import.meta.env?.VITE_RECAPTCHA_SITE_KEY && import.meta.env?.VITE_RECAPTCHA_SITE_KEY !== '6Ad-dummy-recaptcha-key-here-for-safety');
        if (isProd && hasRealSiteKey) {
          throw new Error("Bot protection verification failed. Request blocked.", { cause: appCheckErr });
        }
      }

      // Get authenticated user ID Token
      const idToken = await currentUser.getIdToken(true);

      // Call serverless API endpoint
      const response = await fetch('/api/unlock-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken,
          pgId,
          deviceFingerprint: currentFingerprint
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock contacts.');
      }

      return data.contacts;
    } catch (error) {
      console.error("Error unlocking PG contact:", error);
      throw error;
    }
  }

  // Local Mode
  const credits = await getUserCredits();
  const unlocked = await getUnlockedPGIds();
  
  const user = getLocalSessionUser();
  const isTestEmail = user?.email && checkIfTestEmail(user.email);
  if (user && !user.emailVerified && !isTestEmail) {
    throw new Error("Email verification required. Please click the verification link in the console to verify your email first.");
  }

  // Local Mode Fingerprint tracking
  const localUsers = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
  const userEmail = user?.email || 'guest.pghive@example.com';
  const uIdx = localUsers.findIndex(u => u.email === userEmail);
  if (uIdx !== -1) {
    const localUser = localUsers[uIdx];
    const fingerprints = localUser.fingerprints || [];
    if (fingerprints.length > 0 && !fingerprints.includes(currentFingerprint)) {
      console.warn(`[SECURITY WARNING] Suspicious local unlock attempt from new device fingerprint: ${currentFingerprint}`);
      localUser.fingerprints = [...fingerprints, currentFingerprint];
      localUser.suspiciousFlags = [...(localUser.suspiciousFlags || []), { timestamp: Date.now(), reason: 'New device unlock request' }];
      localUsers[uIdx] = localUser;
      localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsers));
    } else if (!fingerprints.includes(currentFingerprint)) {
      localUser.fingerprints = [...fingerprints, currentFingerprint];
      localUsers[uIdx] = localUser;
      localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsers));
    }
  }

  if (unlocked.includes(pgId)) {
    // Already unlocked — return stored contacts
    const contacts = getPrivateContactStore()[pgId];
    if (contacts) return contacts;
    if (pgId.startsWith('mock-') && MOCK_PRIVATE_CONTACTS[pgId]) {
      return MOCK_PRIVATE_CONTACTS[pgId];
    }
    return { phone: '+91 99999 99999', email: 'owner@pghive.com', whatsapp: '+91 99999 99999' };
  }
  
  if (credits <= 0) {
    return null; // No credits — caller should show purchase modal
  }
  
  // Deduct credit
  await setLocalCredits(credits - 1);
  
  // Mark as unlocked
  unlocked.push(pgId);
  const emailKey = user ? `_${user.email}` : '';
  localStorage.setItem(`pg_hub_unlocked_ids${emailKey}`, JSON.stringify(unlocked));

  // Record usage log locally
  const usageEntry = {
    id: 'use_' + Math.random().toString(36).slice(2, 11),
    pgId,
    creditsSpent: 1,
    timestamp: Date.now(),
    description: 'Unlocked PG contact details',
    deviceFingerprint: currentFingerprint,
    ipHash: 'hash-' + currentFingerprint.substring(0, 10),
    paymentRef: 'ref_local_credit'
  };
  const logsKey = `pg_hub_usage_log_${userEmail}`;
  const existingLogs = JSON.parse(localStorage.getItem(logsKey) || '[]');
  existingLogs.push(usageEntry);
  localStorage.setItem(logsKey, JSON.stringify(existingLogs));
  
  // Return the private contacts
  const contacts = getPrivateContactStore()[pgId];
  if (contacts) return contacts;
  if (pgId.startsWith('mock-') && MOCK_PRIVATE_CONTACTS[pgId]) {
    return MOCK_PRIVATE_CONTACTS[pgId];
  }
  return { phone: '+91 99999 99999', email: 'owner@pghive.com', whatsapp: '+91 99999 99999' };
}

/**
 * Add credits to the user's balance.
 * 
 * SECURITY FIX #3: In Firebase Mode, credits can ONLY be granted server-side
 * via /api/verify-payment (Admin SDK). Client-side credit increments are blocked
 * by Firestore rules. This function is retained for Local Mode only.
 * 
 * @param {number} amount - Number of credits to add
 */
export async function addCredits(amount) {
  // SECURITY: In Firebase mode, credit grants must go through the server-side
  // /api/verify-payment endpoint which verifies Razorpay signatures.
  if (isFirebaseActive) {
    throw new Error(
      'Credits cannot be added client-side in Firebase Mode. ' +
      'Use the /api/verify-payment endpoint with a verified Razorpay payment.'
    );
  }

  const limit = await checkGeneralRateLimit('add_credits', 10, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  if (typeof amount !== 'number' || amount <= 0 || amount > 100) {
    throw new Error('Invalid credit amount');
  }

  // Local Mode only — credits stored in HMAC-signed localStorage
  const current = await getUserCredits();
  await setLocalCredits(current + amount);

  // Record payment in local payments list
  const packageTitle = amount === 1 ? 'Single Unlock' : amount === 5 ? 'Starter Pack' : amount === 12 ? 'Unlimited Value' : 'Custom Pack';
  const price = amount === 1 ? 49 : amount === 5 ? 149 : amount === 12 ? 299 : amount * 49;
  const paymentEntry = {
    id: 'tx_local_' + Math.random().toString(36).slice(2, 11),
    packageTitle,
    credits: amount,
    price,
    timestamp: Date.now(),
    status: 'Local Mode'
  };
  const user = getLocalSessionUser();
  const userEmail = user?.email || 'guest.pghive@example.com';
  const paymentsKey = `pg_hub_payments_${userEmail}`;
  const existingPayments = JSON.parse(localStorage.getItem(paymentsKey) || '[]');
  existingPayments.push(paymentEntry);
  localStorage.setItem(paymentsKey, JSON.stringify(existingPayments));
  
  return true;
}

// Helpers for Account Centre Dashboard
function getLocalSessionUser() {
  const session = localStorage.getItem('tenant_session');
  return session ? JSON.parse(session) : null;
}

export async function getUserPayments() {
  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userId = auth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data().payments || [] : [];
    } catch {
      return [];
    }
  }
  const user = getLocalSessionUser();
  const userEmail = user?.email || 'guest.pghive@example.com';
  const paymentsKey = `pg_hub_payments_${userEmail}`;
  return JSON.parse(localStorage.getItem(paymentsKey) || '[]');
}

export async function getUserUsageLog() {
  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const userId = auth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data().usageLog || [] : [];
    } catch {
      return [];
    }
  }
  const user = getLocalSessionUser();
  const userEmail = user?.email || 'guest.pghive@example.com';
  const logsKey = `pg_hub_usage_log_${userEmail}`;
  return JSON.parse(localStorage.getItem(logsKey) || '[]');
}

export async function fetchAdminUnlockLogs() {
  if (isFirebaseActive) {
    try {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const q = query(collection(db, 'unlocks'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const logs = [];
      querySnapshot.forEach((doc) => {
        logs.push(doc.data());
      });
      return logs;
    } catch (err) {
      console.error("Error fetching admin unlock logs:", err);
      return [];
    }
  }
  const user = getLocalSessionUser();
  const userEmail = user?.email || 'guest.pghive@example.com';
  const logsKey = `pg_hub_usage_log_${userEmail}`;
  return JSON.parse(localStorage.getItem(logsKey) || '[]');
}

export async function fetchAdminPurchaseLogs() {
  if (isFirebaseActive) {
    try {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const q = query(collection(db, 'purchases'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const logs = [];
      querySnapshot.forEach((doc) => {
        logs.push(doc.data());
      });
      return logs;
    } catch (err) {
      console.error("Error fetching admin purchase logs:", err);
      return [];
    }
  }
  const user = getLocalSessionUser();
  const userEmail = user?.email || 'guest.pghive@example.com';
  const paymentsKey = `pg_hub_payments_${userEmail}`;
  return JSON.parse(localStorage.getItem(paymentsKey) || '[]');
}

export async function getAllUnlockedContacts(unlockedIds) {
  const contactsMap = {};
  if (!unlockedIds || unlockedIds.length === 0) return contactsMap;
  
  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      await Promise.all(
        unlockedIds.map(async (pgId) => {
          const contactDoc = await getDoc(doc(db, 'pgs', pgId, 'private', 'contacts'));
          if (contactDoc.exists()) {
            contactsMap[pgId] = contactDoc.data();
          }
        })
      );
    } catch (error) {
      console.error("Error fetching all unlocked contacts:", error);
    }
    return contactsMap;
  }
  
  // Local Mode
  const localStore = getPrivateContactStore();
  unlockedIds.forEach((pgId) => {
    if (localStore[pgId]) {
      contactsMap[pgId] = localStore[pgId];
    }
  });
  return contactsMap;
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
    contactEmail: 'dub****@example.com',
    lat: 12.9352,
    lng: 77.6245
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
    contactEmail: 'sta****@example.com',
    lat: 12.9121,
    lng: 77.6446
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
    contactEmail: 'eli****@example.com',
    lat: 12.9719,
    lng: 77.6412
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
    contactEmail: 'whi****@example.com',
    lat: 12.9698,
    lng: 77.7500
  },
  {
    id: 'mock-5',
    name: 'Stanza Living Chicago House',
    locality: 'SG Palya',
    address: 'Christ University Lane, SG Palya, Bangalore - 560029',
    description: 'Chicago House by Stanza Living is a vibrant student co-living space located right next to Christ University. Features premium single and double sharing rooms, high-speed Wi-Fi, fully managed laundry services, daily meals, and robust CCTV security. Perfect for students wanting walking-distance convenience.',
    price: 11000,
    gender: 'unisex',
    sharing: { single: 15500, double: 11000 },
    amenities: ['wifi', 'food', 'laundry', 'backup', 'security'],
    images: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 95432 XXXXX',
    contactEmail: 'chi****@example.com',
    lat: 12.9341,
    lng: 77.6063
  },
  {
    id: 'mock-6',
    name: 'Zolo Horizon Co-living',
    locality: 'BTM Layout',
    address: '29th Main Rd, BTM Layout 2nd Stage, Bangalore - 560076',
    description: 'Horizon by Zolo is a premium co-living property offering air-conditioned rooms, daily home-style food, and parking spaces. Well connected to Outer Ring Road and Tech Parks. Includes lounges, high-speed Wi-Fi, and 24/7 security.',
    price: 9500,
    gender: 'unisex',
    sharing: { double: 13000, triple: 9500 },
    amenities: ['wifi', 'food', 'ac', 'laundry', 'security', 'parking'],
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 84321 XXXXX',
    contactEmail: 'hor****@example.com',
    lat: 12.9121,
    lng: 77.6446
  },
  {
    id: 'mock-7',
    name: 'Olive Premium Living',
    locality: 'Koramangala',
    address: '80 Feet Rd, 3rd Block, Koramangala, Bangalore - 560034',
    description: 'Olive Premium is a luxury girls-only co-living residence. Features spacious AC rooms with modern furniture, a fully-equipped gym, organic meals, power backup, and gated security. Located in the best residential block of Koramangala.',
    price: 16000,
    gender: 'girls',
    sharing: { single: 24000, double: 16000 },
    amenities: ['wifi', 'food', 'ac', 'gym', 'laundry', 'security', 'parking'],
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 73210 XXXXX',
    contactEmail: 'oli****@example.com',
    lat: 12.9352,
    lng: 77.6245
  },
  {
    id: 'mock-8',
    name: 'HelloWorld Tech Forest PG',
    locality: 'Marathahalli',
    address: 'Outer Ring Rd, Marathahalli, Near Innovative Multiplex, Bangalore - 560037',
    description: 'HelloWorld Tech Forest is a gents-only PG designed for tech professionals working along the Outer Ring Road. Offers fully-furnished rooms with AC, high-speed internet, power backup, daily cleaning, and dedicated bike parking.',
    price: 10500,
    gender: 'boys',
    sharing: { single: 15000, double: 10500 },
    amenities: ['wifi', 'ac', 'laundry', 'backup', 'security', 'parking'],
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 62109 XXXXX',
    contactEmail: 'tec****@example.com',
    lat: 12.9569,
    lng: 77.7011
  },
  {
    id: 'mock-9',
    name: 'Jain Nest student co-living',
    locality: 'Jayanagar',
    address: '9th Block, Jayanagar, near Jain University campus, Bangalore - 560069',
    description: 'A premium student accommodation right next to Jain University Jayanagar campus. Offering fully furnished double and triple sharing rooms, daily nutritious meals, high-speed Wi-Fi, study rooms, power backup, and regular housekeeping.',
    price: 9000,
    gender: 'unisex',
    sharing: { double: 12000, triple: 9000 },
    amenities: ['wifi', 'food', 'backup', 'security'],
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 93210 XXXXX',
    contactEmail: 'jai****@example.com',
    lat: 12.9152,
    lng: 77.5845
  },
  {
    id: 'mock-10',
    name: 'Colive Infinity Hub',
    locality: 'Benniganahalli',
    address: 'Near RMZ Infinity, Old Madras Road, Benniganahalli, Bangalore - 560016',
    description: 'Premium co-living PG near RMZ Infinity tech park and Old Madras Road. Offers twin sharing and single rooms, high-speed Wi-Fi, daily meals, laundry, and 24/7 security. Ideal for working professionals near RMZ Old Madras Road.',
    price: 11500,
    gender: 'unisex',
    sharing: { single: 16000, double: 11500 },
    amenities: ['wifi', 'food', 'ac', 'laundry', 'backup', 'security'],
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
    ],
    contactPhone: '+91 82109 XXXXX',
    contactEmail: 'inf****@example.com',
    lat: 12.9934,
    lng: 77.6602
  }
];

// Private contacts (stored separately, never shipped to listing views)
const MOCK_PRIVATE_CONTACTS = {
  'mock-1': { phone: '+91 98765 43210', email: 'dublin.stanza@example.com', whatsapp: '+91 98765 43210' },
  'mock-2': { phone: '+91 87654 32109', email: 'staycation.zolo@example.com', whatsapp: '+91 87654 32109' },
  'mock-3': { phone: '+91 76543 21098', email: 'elite.nestaway@example.com', whatsapp: '+91 76543 21098' },
  'mock-4': { phone: '+91 65432 10987', email: 'whitefield.colive@example.com', whatsapp: '+91 65432 10987' },
  'mock-5': { phone: '+91 95432 09876', email: 'chicago.stanza@example.com', whatsapp: '+91 95432 09876' },
  'mock-6': { phone: '+91 84321 98765', email: 'horizon.zolo@example.com', whatsapp: '+91 84321 98765' },
  'mock-7': { phone: '+91 73210 87654', email: 'olive.premium@example.com', whatsapp: '+91 73210 87654' },
  'mock-8': { phone: '+91 62109 76543', email: 'techforest.hello@example.com', whatsapp: '+91 62109 76543' },
  'mock-9': { phone: '+91 93210 76543', email: 'jainnest.co@example.com', whatsapp: '+91 93210 76543' },
  'mock-10': { phone: '+91 82109 65432', email: 'infinity.colive@example.com', whatsapp: '+91 82109 65432' }
};

// Initialize localStorage stores on first visit
const existingPgsList = JSON.parse(localStorage.getItem('pgs_list') || '[]');
if (existingPgsList.length < MOCK_PGS_PUBLIC.length) {
  localStorage.setItem('pgs_list', JSON.stringify(MOCK_PGS_PUBLIC));
}
// Merge any missing mock private contacts (robust fallback for local storage cache)
const currentContacts = getPrivateContactStore();
let needsUpdate = false;
Object.keys(MOCK_PRIVATE_CONTACTS).forEach(key => {
  if (!currentContacts[key]) {
    currentContacts[key] = MOCK_PRIVATE_CONTACTS[key];
    needsUpdate = true;
  }
});
if (needsUpdate || !localStorage.getItem(CONTACTS_STORE_KEY)) {
  localStorage.setItem(CONTACTS_STORE_KEY, JSON.stringify(currentContacts));
}

// Seed tester mock user account (email: tester@pghive.com, password: password123, verified: true)
const MOCK_TESTER_EMAIL = 'tester@pghive.com';
const localUsersList = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
if (!localUsersList.find(u => u.email === MOCK_TESTER_EMAIL)) {
  localUsersList.push({
    uid: 'tester-uid',
    email: MOCK_TESTER_EMAIL,
    emailVerified: true
  });
  localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsersList));
}

// Seed 10 credits for tester user account
const testerCreditsKey = `pg_hub_credits_signed_${MOCK_TESTER_EMAIL}`;
if (!localStorage.getItem(testerCreditsKey)) {
  (async () => {
    try {
      const sig = await hmacSign(10);
      localStorage.setItem(testerCreditsKey, JSON.stringify({ value: 10, sig }));
    } catch (e) {
      console.error("Failed to seed tester credits:", e);
    }
  })();
}

// ==========================================
// DATABASE SERVICES (API INTERFACE)
// ==========================================

export async function fetchAllPGs() {
  try {
    const currentUserId = isFirebaseActive ? auth.currentUser?.uid : getLocalSessionUser()?.uid;
    const adminEmail = import.meta.env?.VITE_ADMIN_USER || 'admin@pghive.com';
    const currentUserEmail = isFirebaseActive ? auth.currentUser?.email : getLocalSessionUser()?.email;
    const isAdmin = currentUserEmail === adminEmail || currentUserId === 'local-admin';

    if (isFirebaseActive) {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const pgCol = collection(db, 'pgs');
        const pgSnapshot = await getDocs(pgCol);
        const pgList = [];
        
        pgSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const isOwner = data.ownerId === currentUserId;
          const isActive = data.isActive !== false || isOwner || isAdmin;
          
          if (isActive) {
            pgList.push({
              id: doc.id,
              ...data,
              contactPhone: maskPhoneNumber(data.contactPhone || ''),
              contactEmail: maskEmailAddress(data.contactEmail || ''),
              // Remove raw WhatsApp from public response
              contactWhatsapp: undefined
            });
          }
        });
        return pgList.length > 0 ? pgList : MOCK_PGS_PUBLIC;
      } catch (error) {
        console.error("Firebase fetch failed, reading from local:", error);
      }
    }
    
    // Local Mode / Fallback — data already has masked contacts
    const stored = localStorage.getItem('pgs_list');
    const pgs = stored ? JSON.parse(stored) : MOCK_PGS_PUBLIC;
    
    const filteredPgs = pgs.filter(pg => {
      if (!pg) return false;
      const isOwner = pg.ownerId === currentUserId;
      const isActive = pg.isActive !== false || isOwner || isAdmin;
      return isActive;
    });
    
    // For any local image store, fetch the base64 data from IndexedDB
    const enrichedPgs = await Promise.all(filteredPgs.map(async (pg) => {
      const imagesList = pg.images || [];
      const enrichedImages = await Promise.all(imagesList.map(async (img) => {
        if (img && img.startsWith('local-img-')) {
          try {
            const base64 = await getPhoto(img);
            return base64 || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'; // fallback
          } catch {
            return 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80';
          }
        }
        return img || '';
      }));
      return { ...pg, images: enrichedImages };
    }));
    
    return enrichedPgs;
  } catch (globalError) {
    console.error("Critical error in fetchAllPGs, returning public mocks:", globalError);
    return MOCK_PGS_PUBLIC;
  }
}

/**
 * Helper to compress and convert file to a base64 JPEG string.
 * Resizes the image to fit within maxWidth/maxHeight and lowers quality.
 */
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as jpeg to keep file size small
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Helper to compute a secure SHA-256 hash of base64 image data
async function calculateBase64Hash(base64Str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64Str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createPGListing(pgData, imageFiles) {
  if (!pgData || typeof pgData !== 'object') {
    throw new Error("Invalid listing data.");
  }
  if (typeof pgData.name !== 'string' || pgData.name.trim().length === 0 || pgData.name.length > 200) {
    throw new Error("Name must be between 1 and 200 characters.");
  }
  if (typeof pgData.locality !== 'string' || pgData.locality.trim().length === 0 || pgData.locality.length > 100) {
    throw new Error("Locality must be between 1 and 100 characters.");
  }
  if (typeof pgData.address !== 'string' || pgData.address.trim().length === 0 || pgData.address.length > 500) {
    throw new Error("Address must be between 1 and 500 characters.");
  }
  if (typeof pgData.description !== 'string' || pgData.description.trim().length === 0 || pgData.description.length > 2000) {
    throw new Error("Description must be between 1 and 2000 characters.");
  }

  const limit = await checkGeneralRateLimit('create_listing', 10, 5 * 60 * 1000);
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

  // Validate sharing deposits
  const validatedSharingDeposit = {};
  for (const [key, val] of Object.entries(pgData.sharingDeposit || {})) {
    if (val) {
      const shareDeposit = validatePrice(val);
      if (shareDeposit.valid) {
        validatedSharingDeposit[key] = shareDeposit.value;
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
    deposit: pgData.deposit ? Number(pgData.deposit) : 0,
    sharingDeposit: validatedSharingDeposit,
    gender: ['boys', 'girls', 'unisex'].includes(pgData.gender) ? pgData.gender : 'unisex',
    sharing: validatedSharing,
    amenities: Array.isArray(pgData.amenities) 
      ? pgData.amenities.filter(a => typeof a === 'string' && a.length < 50) 
      : [],
    furnishing: sanitizeText(pgData.furnishing || 'Semi Furnished', 50),
    availableFrom: sanitizeText(pgData.availableFrom || 'Immediate', 50),
    ...(pgData.lat !== undefined && !isNaN(Number(pgData.lat)) && { lat: Number(pgData.lat) }),
    ...(pgData.lng !== undefined && !isNaN(Number(pgData.lng)) && { lng: Number(pgData.lng) })
  };

  // Real contacts (stored privately)
  const realContacts = {
    phone: phoneResult.cleaned,
    email: pgData.contactEmail ? pgData.contactEmail.trim() : '',
    whatsapp: pgData.contactWhatsapp 
      ? validatePhone(pgData.contactWhatsapp).cleaned || phoneResult.cleaned
      : phoneResult.cleaned,
    googleMapsUrl: pgData.googleMapsUrl ? pgData.googleMapsUrl.trim() : ''
  };

  // Masked contacts (stored in public listing)
  const maskedContacts = {
    contactPhone: maskPhoneNumber(realContacts.phone),
    contactEmail: maskEmailAddress(realContacts.email)
  };

  if (isFirebaseOperational()) {
    try {
      const { collection, addDoc, doc, setDoc, query, where, getDocs, getDoc } = await import('firebase/firestore');
      const userId = auth.currentUser.uid;

      // 1. Phone number deduplication check (only admins can query across all private contacts due to Firestore security rules)
      {
        const adminEmail = import.meta.env?.VITE_ADMIN_USER || 'admin@pghive.com';
        const currentUserEmail = auth.currentUser?.email;
        const isAdmin = currentUserEmail === adminEmail;

        if (isAdmin) {
          const { collectionGroup } = await import('firebase/firestore');
          const contactQuery = query(collectionGroup(db, 'private'), where('phone', '==', realContacts.phone));
          const querySnapshot = await getDocs(contactQuery);
          const ownerIds = new Set();
          for (const d of querySnapshot.docs) {
            const pgDocRef = d.ref.parent.parent;
            if (pgDocRef) {
              const pgSnap = await getDoc(pgDocRef);
              if (pgSnap.exists() && pgSnap.data().ownerId !== userId) {
                ownerIds.add(pgSnap.data().ownerId);
              }
            }
          }
          if (ownerIds.size >= 3) {
            throw new Error("This phone number is associated with too many different accounts. Please contact support.");
          }
        }
      }
      
      // 2. Compress, upload to Firebase Storage, and get URLs
      const uploadedImageUrls = [];
      const newHashes = [];
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
          const base64Str = await compressImage(file);
          const response = await fetch(base64Str);
          const blob = await response.blob();
          
          const fileId = 'img_' + Math.random().toString(36).substring(2, 15);
          const imageRef = ref(storage, `listings/${userId}/${fileId}.jpg`);
          await uploadBytes(imageRef, blob);
          const downloadUrl = await getDownloadURL(imageRef);
          
          uploadedImageUrls.push(downloadUrl);
          const h = await calculateBase64Hash(base64Str);
          newHashes.push(h);
        } catch (compressErr) {
          console.error("Firebase Storage upload failed, using fallback Base64:", compressErr);
          const fallbackBase64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          uploadedImageUrls.push(fallbackBase64);
          const h = await calculateBase64Hash(fallbackBase64);
          newHashes.push(h);
        }
      }

      // 3. Image hash duplicate check (prevent spam duplicates)
      const duplicateQuery = query(collection(db, 'pgs'), where('imageHashes', 'array-contains-any', newHashes));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      for (const d of duplicateSnapshot.docs) {
        if (d.data().ownerId !== userId) {
          throw new Error("Duplicate image detected. Reusing photos from another listing is not permitted.");
        }
      }

      // 4. Delayed activation check (delay listings by 2 hours for accounts < 24h old, except admins)
      const creationTime = auth.currentUser?.metadata.creationTime;
      const accountAgeMs = creationTime ? Date.now() - new Date(creationTime).getTime() : 0;
      const isNewAccount = accountAgeMs < 24 * 60 * 60 * 1000;
      const adminEmail = import.meta.env?.VITE_ADMIN_USER || 'admin@pghive.com';
      const currentUserEmail = auth.currentUser?.email;
      const isAdmin = currentUserEmail === adminEmail;
      
      const delayHours = (isNewAccount && !isAdmin) ? 2 : 0;
      const isActive = !isNewAccount || isAdmin;
      
      // Create public firestore record
      const publicData = {
        ...sanitizedData,
        ...maskedContacts,
        ownerId: userId,
        images: uploadedImageUrls,
        imageHashes: newHashes,
        isActive,
        activationTime: Date.now() + delayHours * 60 * 60 * 1000,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'pgs'), publicData);
      
      // Store private contacts in subcollection
      await setDoc(doc(db, 'pgs', docRef.id, 'private', 'contacts'), realContacts);
      
      return { id: docRef.id, ...publicData };
    } catch (error) {
      console.error("Firebase PG creation failed:", error);
      throw error;
    }
  }
  
  // Local Mode
  const pgsList = JSON.parse(localStorage.getItem('pgs_list') || '[]');
  if (pgsList.length >= 25) {
    throw new Error("Local listing capacity reached. Delete existing mock listings to create new ones.");
  }
  const newId = `pg-${Date.now()}`;
  
  // 1. Phone deduplication check locally
  const privateStore = getPrivateContactStore();
  const ownerIdsLocal = new Set();
  for (const [id, contact] of Object.entries(privateStore)) {
    if (contact.phone === realContacts.phone) {
      const parentPG = pgsList.find(p => p.id === id);
      if (parentPG && parentPG.ownerId !== getAnonymousUserId()) {
        ownerIdsLocal.add(parentPG.ownerId);
      }
    }
  }
  if (ownerIdsLocal.size >= 3) {
    throw new Error("This phone number is associated with too many different accounts. Please contact support.");
  }

  // 2. Save images to IndexedDB
  const imageKeys = [];
  const resolvedImages = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const imageKey = `local-img-${newId}-${i}`;
    const base64 = await savePhoto(imageKey, file);
    imageKeys.push(imageKey);
    resolvedImages.push(base64);
  }

  // 3. Image hash duplicate check locally
  const newHashesLocal = [];
  for (const base64 of resolvedImages) {
    const h = await calculateBase64Hash(base64);
    newHashesLocal.push(h);
  }
  for (const p of pgsList) {
    if (p.ownerId !== getAnonymousUserId() && p.imageHashes) {
      const hasOverlap = p.imageHashes.some(h => newHashesLocal.includes(h));
      if (hasOverlap) {
        throw new Error("Duplicate image detected. Reusing photos from another listing is not permitted.");
      }
    }
  }

  // 4. Delayed activation check locally
  const user = getLocalSessionUser();
  const localUsersList = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
  const localUser = localUsersList.find(u => u.email === (user?.email || ''));
  const userCreationTime = localUser?.createdAt || Date.now();
  const accountAgeMs = Date.now() - userCreationTime;
  const isNewAccount = accountAgeMs < 24 * 60 * 60 * 1000;
  const delayHours = isNewAccount ? 2 : 0;
  const isActive = !isNewAccount;
  
  // Add to public localStorage
  const newPG = {
    id: newId,
    ...sanitizedData,
    ...maskedContacts,
    ownerId: getAnonymousUserId(),
    images: imageKeys,
    imageHashes: newHashesLocal,
    isActive,
    activationTime: Date.now() + delayHours * 60 * 60 * 1000,
    createdAt: new Date().toISOString()
  };
  
  pgsList.push(newPG);
  localStorage.setItem('pgs_list', JSON.stringify(pgsList));
  
  // Store private contacts separately
  savePrivateContact(newId, realContacts);
  
  return { ...newPG, images: resolvedImages };
}

export async function deletePGListing(pgId) {
  if (typeof pgId !== 'string' || pgId.trim().length === 0 || pgId.length > 100) {
    throw new Error("Invalid listing ID format.");
  }

  const limit = await checkGeneralRateLimit('delete_listing', 10, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  if (isFirebaseOperational()) {
    try {
      const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
      const { ref, deleteObject } = await import('firebase/storage');
      
      const docRef = doc(db, 'pgs', pgId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Listing does not exist.");
      }
      
      const pgData = docSnap.data();
      const currentUserId = auth.currentUser?.uid;
      
      // Check if user is the owner, or if they are admin (non-anonymous logged in admin)
      const isAdminUser = auth.currentUser && !auth.currentUser.isAnonymous;
      
      if (pgData.ownerId !== currentUserId && !isAdminUser) {
        throw new Error("Unauthorized: You do not have permission to delete this listing.");
      }
      
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
    const isLocalAdmin = await getVerifyLocalAdmin();
    const localUserId = getAnonymousUserId();
    
    if (pgToDelete.ownerId !== localUserId && !isLocalAdmin) {
      throw new Error("Unauthorized: You do not have permission to delete this listing.");
    }
    
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

export async function updatePGListing(pgId, pgData, imageFilesOrUrls) {
  if (typeof pgId !== 'string' || pgId.trim().length === 0 || pgId.length > 100) {
    throw new Error("Invalid listing ID format.");
  }
  if (!pgData || typeof pgData !== 'object') {
    throw new Error("Invalid listing data.");
  }
  if (typeof pgData.name !== 'string' || pgData.name.trim().length === 0 || pgData.name.length > 200) {
    throw new Error("Name must be between 1 and 200 characters.");
  }
  if (typeof pgData.locality !== 'string' || pgData.locality.trim().length === 0 || pgData.locality.length > 100) {
    throw new Error("Locality must be between 1 and 100 characters.");
  }
  if (typeof pgData.address !== 'string' || pgData.address.trim().length === 0 || pgData.address.length > 500) {
    throw new Error("Address must be between 1 and 500 characters.");
  }
  if (typeof pgData.description !== 'string' || pgData.description.trim().length === 0 || pgData.description.length > 2000) {
    throw new Error("Description must be between 1 and 2000 characters.");
  }

  const limit = await checkGeneralRateLimit('update_listing', 15, 5 * 60 * 1000);
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  // Validate images count
  if (!Array.isArray(imageFilesOrUrls) || imageFilesOrUrls.length === 0) {
    throw new Error('Please upload/retain at least one room photo.');
  }
  
  if (imageFilesOrUrls.length > 5) {
    throw new Error('You can upload a maximum of 5 images per listing.');
  }

  // Process images: separate existing strings from new Files
  const finalImages = [];
  const newHashes = [];

  for (let i = 0; i < imageFilesOrUrls.length; i++) {
    const item = imageFilesOrUrls[i];
    if (item instanceof File || (item && typeof item === 'object' && item.name)) {
      // Validate the file
      const fileCheck = validateFile(item);
      if (!fileCheck.valid) {
        throw new Error(fileCheck.error);
      }
      
      // Compress new File
      let base64 = "";
      try {
        base64 = await compressImage(item);
      } catch (compressErr) {
        console.error("Compression failed, using fallback FileReader:", compressErr);
        base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(item);
        });
      }
      
      // Save locally if in Local Mode, else upload to Firebase Storage
      if (isFirebaseOperational()) {
        try {
          const response = await fetch(base64);
          const blob = await response.blob();
          const userId = auth.currentUser.uid;
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const fileId = 'img_' + Math.random().toString(36).substring(2, 15);
          const imageRef = ref(storage, `listings/${userId}/${fileId}.jpg`);
          await uploadBytes(imageRef, blob);
          const downloadUrl = await getDownloadURL(imageRef);
          
          finalImages.push(downloadUrl);
          const h = await calculateBase64Hash(base64);
          newHashes.push(h);
        } catch (uploadErr) {
          console.error("Firebase Storage upload failed, using fallback Base64:", uploadErr);
          finalImages.push(base64);
          const h = await calculateBase64Hash(base64);
          newHashes.push(h);
        }
      } else {
        const imageKey = `local-img-${pgId}-${Date.now()}-${i}`;
        const savedBase64 = await savePhoto(imageKey, item);
        finalImages.push(imageKey);
        const h = await calculateBase64Hash(savedBase64);
        newHashes.push(h);
      }
    } else if (typeof item === 'string') {
      // Existing image URL / Base64 / Local key
      finalImages.push(item);
      if (isFirebaseOperational()) {
        const h = await calculateBase64Hash(item);
        newHashes.push(h);
      } else {
        // Resolve local key to get its content to calculate hash
        let base64 = item;
        if (item.startsWith('local-img-')) {
          base64 = await getPhoto(item) || "";
        }
        const h = await calculateBase64Hash(base64);
        newHashes.push(h);
      }
    }
  }

  // Sanitizations
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

  const validatedSharing = {};
  for (const [key, val] of Object.entries(pgData.sharing || {})) {
    if (val) {
      const sharePrice = validatePrice(val);
      if (sharePrice.valid) {
        validatedSharing[key] = sharePrice.value;
      }
    }
  }

  // Validate sharing deposits
  const validatedSharingDeposit = {};
  for (const [key, val] of Object.entries(pgData.sharingDeposit || {})) {
    if (val) {
      const shareDeposit = validatePrice(val);
      if (shareDeposit.valid) {
        validatedSharingDeposit[key] = shareDeposit.value;
      }
    }
  }

  const sanitizedData = {
    name: nameClean,
    locality: sanitizeText(pgData.locality, 100),
    address: addressClean,
    description: descClean,
    price: priceResult.value,
    deposit: pgData.deposit ? Number(pgData.deposit) : 0,
    sharingDeposit: validatedSharingDeposit,
    gender: ['boys', 'girls', 'unisex'].includes(pgData.gender) ? pgData.gender : 'unisex',
    sharing: validatedSharing,
    amenities: Array.isArray(pgData.amenities) 
      ? pgData.amenities.filter(a => typeof a === 'string' && a.length < 50) 
      : [],
    furnishing: sanitizeText(pgData.furnishing || 'Semi Furnished', 50),
    availableFrom: sanitizeText(pgData.availableFrom || 'Immediate', 50),
    ...(pgData.lat !== undefined && !isNaN(Number(pgData.lat)) && { lat: Number(pgData.lat) }),
    ...(pgData.lng !== undefined && !isNaN(Number(pgData.lng)) && { lng: Number(pgData.lng) })
  };

  const realContacts = {
    phone: phoneResult.cleaned,
    email: pgData.contactEmail ? pgData.contactEmail.trim() : '',
    whatsapp: pgData.contactWhatsapp 
      ? validatePhone(pgData.contactWhatsapp).cleaned || phoneResult.cleaned
      : phoneResult.cleaned,
    googleMapsUrl: pgData.googleMapsUrl ? pgData.googleMapsUrl.trim() : ''
  };

  const maskedContacts = {
    contactPhone: maskPhoneNumber(realContacts.phone),
    contactEmail: maskEmailAddress(realContacts.email)
  };

  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc, updateDoc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'pgs', pgId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Listing does not exist.");
      }

      const existingData = docSnap.data();
      const currentUserId = auth.currentUser.uid;
      const isAdminUser = auth.currentUser && !auth.currentUser.isAnonymous;

      if (existingData.ownerId !== currentUserId && !isAdminUser) {
        throw new Error("Unauthorized: You do not have permission to update this listing.");
      }

      // Update public document
      const publicUpdate = {
        ...sanitizedData,
        ...maskedContacts,
        images: finalImages,
        imageHashes: newHashes,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, publicUpdate);

      // Update private subdocument
      await setDoc(doc(db, 'pgs', pgId, 'private', 'contacts'), realContacts);

      return { id: pgId, ...existingData, ...publicUpdate };
    } catch (err) {
      console.error("Firebase PG update failed:", err);
      throw err;
    }
  }

  // Local Mode
  let pgsList = JSON.parse(localStorage.getItem('pgs_list') || '[]');
  const index = pgsList.findIndex(p => p.id === pgId);
  if (index === -1) {
    throw new Error("Listing does not exist.");
  }

  const existingLocal = pgsList[index];
  const isLocalAdmin = await getVerifyLocalAdmin();
  const localUserId = getAnonymousUserId();

  if (existingLocal.ownerId !== localUserId && !isLocalAdmin) {
    throw new Error("Unauthorized: You do not have permission to update this listing.");
  }

  // Clean old local images that are not in finalImages list
  const removedImages = existingLocal.images.filter(img => img.startsWith('local-img-') && !finalImages.includes(img));
  for (const imgKey of removedImages) {
    await deletePhoto(imgKey);
  }

  const updatedPG = {
    ...existingLocal,
    ...sanitizedData,
    ...maskedContacts,
    images: finalImages,
    imageHashes: newHashes,
    updatedAt: new Date().toISOString()
  };

  pgsList[index] = updatedPG;
  localStorage.setItem('pgs_list', JSON.stringify(pgsList));

  savePrivateContact(pgId, realContacts);

  // Return the resolved images for immediate UI updates
  const resolvedImages = [];
  for (const img of finalImages) {
    if (img.startsWith('local-img-')) {
      const dataUrl = await getPhoto(img);
      resolvedImages.push(dataUrl || "");
    } else {
      resolvedImages.push(img);
    }
  }

  return { ...updatedPG, images: resolvedImages };
}

export async function getAdminPGContactDetails(pgId) {
  if (isFirebaseOperational()) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const contactDoc = await getDoc(doc(db, 'pgs', pgId, 'private', 'contacts'));
      if (contactDoc.exists()) {
        return contactDoc.data();
      }
    } catch (err) {
      console.error("Error fetching admin contact details:", err);
      throw err;
    }
  } else {
    return getPrivateContactStore()[pgId] || null;
  }
  return null;
}

// ==========================================
// AUTHENTICATION SERVICES
// ==========================================

// Admin credentials from environment variables (NOT hardcoded)
const ENV_ADMIN_USER = import.meta.env?.VITE_ADMIN_USER;
const ENV_ADMIN_PASS = import.meta.env?.VITE_ADMIN_PASS;
const isLocalAdminConfigured = !!(ENV_ADMIN_USER && (ENV_ADMIN_PASS || localStorage.getItem('pg_hub_admin_pass')));

export { isLocalAdminConfigured };

export async function getVerifyLocalAdmin() {
  const session = localStorage.getItem('admin_session');
  if (!session) return false;
  try {
    const parsed = JSON.parse(session);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem('admin_session');
      return false;
    }
    // Verify HMAC signature
    const payload = { uid: parsed.uid, username: parsed.username, expiresAt: parsed.expiresAt };
    const valid = await hmacVerify(JSON.stringify(payload), parsed.sig);
    return valid;
  } catch {
    localStorage.removeItem('admin_session');
    return false;
  }
}

async function hashPassword(password) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Basic fallback hash for non-secure HTTP contexts if crypto.subtle is not present
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fallback-' + hash.toString(16);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function hashPasswordWithBcrypt(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPasswordWithBcrypt(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function authenticateAdmin(usernameOrEmail, password) {
  // Enforce credentials types and maximum lengths to prevent overflow/DoS
  if (typeof usernameOrEmail !== 'string' || typeof password !== 'string') {
    throw new Error("Invalid username/email or password format.");
  }
  if (usernameOrEmail.length > 100 || password.length > 100) {
    throw new Error("Credentials exceed maximum length.");
  }

  // Check rate limit
  const limitCheck = await checkLoginRateLimit();
  if (limitCheck.blocked) {
    throw new Error(limitCheck.error);
  }

  if (isFirebaseActive) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, usernameOrEmail, password);
      await clearLoginAttempts(); // Clear history upon successful login
      return { uid: userCredential.user.uid, email: userCredential.user.email };
    } catch (error) {
      console.error("Firebase Auth sign in failed:", error);
      await registerFailedLoginAttempt(); // Log failed attempt
      throw new Error("Invalid admin credentials", { cause: error });
    }
  }
  
  // Local Mode Auth — credentials from env vars only
  if (!isLocalAdminConfigured) {
    throw new Error("Admin login is not configured. Set VITE_ADMIN_USER and VITE_ADMIN_PASS in your .env file.");
  }
  
  const storedPass = localStorage.getItem('pg_hub_admin_pass');
  let isValid = false;

  if (storedPass) {
    // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$') || storedPass.startsWith('$2y$')) {
      isValid = await verifyPasswordWithBcrypt(password, storedPass);
    } else {
      // Legacy SHA-256 validation
      const inputHash = await hashPassword(password);
      if (inputHash === storedPass) {
        // Upgrade legacy hash on successful login
        const upgradedHash = await hashPasswordWithBcrypt(password);
        localStorage.setItem('pg_hub_admin_pass', upgradedHash);
        isValid = true;
      }
    }
  } else {
    // Fall back to VITE_ADMIN_PASS from environment variables
    const fallbackPassword = ENV_ADMIN_PASS || '';
    if (password === fallbackPassword) {
      // Create and save the new bcrypt hash immediately
      const newHash = await hashPasswordWithBcrypt(password);
      localStorage.setItem('pg_hub_admin_pass', newHash);
      isValid = true;
    }
  }
  
  if (usernameOrEmail === ENV_ADMIN_USER && isValid) {
    const adminUser = { uid: 'local-admin', username: ENV_ADMIN_USER };
    // Store session with timestamp for expiry and HMAC signature
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hour expiry
    const payload = { uid: adminUser.uid, username: adminUser.username, expiresAt };
    const sig = await hmacSign(JSON.stringify(payload));
    const session = {
      ...adminUser,
      createdAt: Date.now(),
      expiresAt,
      sig
    };
    localStorage.setItem('admin_session', JSON.stringify(session));
    await clearLoginAttempts(); // Clear history upon successful login
    return adminUser;
  } else {
    await registerFailedLoginAttempt(); // Log failed attempt
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

let anonymousAuthFailed = false;

export function subscribeToAuth(callback) {
  if (isFirebaseActive) {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (!user.isAnonymous) {
          callback({ uid: user.uid, email: user.email });
        } else {
          callback(null);
        }
      } else {
        // Automatically sign in anonymously if not authenticated, giving them a real Firebase Auth UUID
        if (!anonymousAuthFailed) {
          try {
            const { signInAnonymously } = await import('firebase/auth');
            await signInAnonymously(auth);
          } catch (e) {
            console.error("Anonymous authentication failed:", e);
            anonymousAuthFailed = true;
          }
        }
        callback(null);
      }
    });
    return unsub;
  }
  
  // Local Mode Auth listener setup
  const checkSession = async () => {
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
        // Verify signature
        const payload = { uid: parsed.uid, username: parsed.username, expiresAt: parsed.expiresAt };
        const valid = await hmacVerify(JSON.stringify(payload), parsed.sig);
        if (valid) {
          // Rotate session signature for security
          const nextExpires = Date.now() + 2 * 60 * 60 * 1000;
          const nextPayload = { uid: parsed.uid, username: parsed.username, expiresAt: nextExpires };
          const nextSig = await hmacSign(JSON.stringify(nextPayload));
          localStorage.setItem('admin_session', JSON.stringify({ ...nextPayload, sig: nextSig }));
          callback(parsed);
        } else {
          localStorage.removeItem('admin_session');
          callback(null);
        }
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

// ==========================================
// PASSWORD RESET SERVICE
// ==========================================

export async function sendPasswordReset(email) {
  if (typeof email !== 'string' || email.trim().length === 0 || email.length > 254) {
    throw new Error("Invalid email format.");
  }
  const emailRes = validateEmail(email);
  if (!emailRes.valid) {
    throw new Error(emailRes.error || "Invalid email format.");
  }

  const limit = await checkGeneralRateLimit('password_reset', 3, 15 * 60 * 1000); // Limit reset calls
  if (limit.blocked) {
    throw new Error(limit.error);
  }

  if (isFirebaseActive) {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset link sent to your email." };
  }
  
  if (email !== ENV_ADMIN_USER) {
    throw new Error("Email address not found.");
  }
  
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
  localStorage.setItem('pg_hub_reset_token', JSON.stringify({ token, email, expiresAt }));
  console.log(`[MOCK RESET LINK] http://localhost:5173/?reset-token=${token}`);
  return { 
    success: true, 
    message: "Password reset link generated.", 
    mockLink: `${window.location.origin}/?reset-token=${token}` 
  };
}

export async function verifyResetTokenAndChangePassword(token, newPassword) {
  if (typeof token !== 'string' || token.trim().length === 0 || token.length > 100) {
    throw new Error("Invalid password reset token.");
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 100) {
    throw new Error("Password must be between 6 and 100 characters long.");
  }

  if (isFirebaseActive) {
    const { confirmPasswordReset } = await import('firebase/auth');
    await confirmPasswordReset(auth, token, newPassword);
    return true;
  }
  
  const stored = localStorage.getItem('pg_hub_reset_token');
  if (!stored) {
    throw new Error("Invalid or expired password reset link.");
  }
  
  try {
    const { token: storedToken, expiresAt } = JSON.parse(stored);
    if (storedToken !== token || Date.now() > expiresAt) {
      localStorage.removeItem('pg_hub_reset_token');
      throw new Error("This password reset link has expired.");
    }
    
    // Update password locally using Bcrypt
    const hashedNewPassword = await hashPasswordWithBcrypt(newPassword);
    localStorage.setItem('pg_hub_admin_pass', hashedNewPassword);
    localStorage.removeItem('pg_hub_reset_token');
    return true;
  } catch (err) {
    throw new Error(err.message || "Invalid or expired password reset link.", { cause: err });
  }
}

export async function registerTenantUser(email, password) {
  if (typeof email !== 'string' || email.trim().length === 0 || email.length > 254) {
    throw new Error("Invalid email format.");
  }
  const emailRes = validateEmail(email);
  if (!emailRes.valid) {
    throw new Error(emailRes.error || "Invalid email format.");
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    throw new Error("Password must be between 6 and 100 characters long.");
  }

  if (isFirebaseActive) {
    const { createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const isTestEmail = checkIfTestEmail(email);
    if (!isTestEmail) {
      await sendEmailVerification(userCredential.user);
    }
    const user = userCredential.user;
    user.isNewUser = true;
    return user;
  }
  
  // Local mode mock registration
  const localUsers = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
  if (localUsers.find(u => u.email === email)) {
    throw new Error("Email already registered.");
  }
  const passwordHash = await hashPasswordWithBcrypt(password);
  const newUser = { uid: crypto.randomUUID(), email, emailVerified: false, passwordHash, createdAt: Date.now() };
  localUsers.push(newUser);
  localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsers));
  
  // Log mock verification link to console for developers
  const mockToken = crypto.randomUUID();
  localStorage.setItem(`verify_${newUser.uid}`, mockToken);
  console.log(`[MOCK EMAIL VERIFICATION] ${window.location.origin}/?verify-uid=${newUser.uid}&token=${mockToken}`);
  
  // Return clean user profile without exposing password hashes
  const cleanUser = { uid: newUser.uid, email: newUser.email, emailVerified: newUser.emailVerified };
  return cleanUser;
}

export async function loginTenantUser(email, password) {
  if (typeof email !== 'string' || email.trim().length === 0 || email.length > 254) {
    throw new Error("Incorrect email or password.");
  }
  const emailRes = validateEmail(email);
  if (!emailRes.valid) {
    throw new Error("Incorrect email or password.");
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    throw new Error("Incorrect email or password.");
  }

  // Check account lockout status first (Simulated database server-side lockout check)
  const lockState = await getAccountLockState(email);
  const now = Date.now();
  if (lockState.lockedUntil && now < lockState.lockedUntil) {
    console.warn(`[SECURITY LOCKOUT] Login attempt blocked for locked account: ${email}`);
    throw new Error("Incorrect email or password.");
  }

  if (isFirebaseActive) {
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
    const isTestEmail = checkIfTestEmail(email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified && !isTestEmail) {
        await signOut(auth);
        console.warn(`[SECURITY LOG] Unverified user login blocked: ${email}`);
        throw new Error("Incorrect email or password.");
      }
      // Successful login -> Clear lockout count
      await clearFailedLogin(email);
      return user;
    } catch (error) {
      console.error("[FIREBASE LOGIN FAILURE DETECTED]:", error);
      // Auto-register mock tester account on Firebase if not existing yet
      if (isTestEmail && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password')) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await clearFailedLogin(email);
          return userCredential.user;
        } catch (regError) {
          console.error("Auto-registration of tester account failed:", regError);
        }
      }
      
      // SECURITY FIX #11: Genericize error message to prevent account enumeration.
      // Detailed error is logged to console for debugging but not exposed to the user.
      await recordFailedLogin(email);
      console.error('[Auth Debug]', error.code, error.message);
      throw new Error('Incorrect email or password.');
    }
  }
  
  // Local Mode Mock Login
  const localUsers = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
  const userIndex = localUsers.findIndex(u => u.email === email);
  if (userIndex === -1) {
    await recordFailedLogin(email);
    throw new Error("Incorrect email or password.");
  }
  const user = localUsers[userIndex];

  let isValidPassword = false;
  if (user.passwordHash) {
    isValidPassword = await verifyPasswordWithBcrypt(password, user.passwordHash);
  } else {
    // Safe Migration Check: Seeded mock users (e.g. tester@pghive.com) default to 'password123'
    if (password === 'password123') {
      const upgradedHash = await hashPasswordWithBcrypt(password);
      user.passwordHash = upgradedHash;
      localUsers[userIndex] = user;
      localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsers));
      isValidPassword = true;
    }
  }

  if (!isValidPassword) {
    await recordFailedLogin(email);
    throw new Error("Incorrect email or password.");
  }

  if (!user.emailVerified) {
    console.warn(`[SECURITY LOG] Unverified local mock user login blocked: ${email}`);
    throw new Error("Incorrect email or password.");
  }

  // Clear failures upon successful auth
  await clearFailedLogin(email);

  // Return clean user profile without exposing password hashes
  const cleanUser = { uid: user.uid, email: user.email, emailVerified: user.emailVerified };
  localStorage.setItem('tenant_session', JSON.stringify(cleanUser));
  return cleanUser;
}

export async function verifyTenantEmailLocally(uid, token) {
  if (typeof uid !== 'string' || uid.trim().length === 0 || uid.length > 100) {
    throw new Error("Invalid user ID format.");
  }
  if (typeof token !== 'string' || token.trim().length === 0 || token.length > 100) {
    throw new Error("Invalid verification token format.");
  }
  const storedToken = localStorage.getItem(`verify_${uid}`);
  if (storedToken && storedToken === token) {
    const localUsers = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
    const updated = localUsers.map(u => u.uid === uid ? { ...u, emailVerified: true } : u);
    localStorage.setItem('pg_hub_mock_users', JSON.stringify(updated));
    localStorage.removeItem(`verify_${uid}`);
    return true;
  }
  throw new Error("Invalid or expired verification link.");
}

export async function signInWithGoogle() {
  if (isFirebaseActive) {
    const { signInWithPopup, signInWithRedirect, GoogleAuthProvider, getAdditionalUserInfo } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); // Enforce showing the Google Account Selection screen
    
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const additionalInfo = getAdditionalUserInfo(userCredential);
      if (additionalInfo?.isNewUser) {
        user.isNewUser = true;
      }
      await getUserCredits(); // auto-initialize credits
      return user;
    } catch (error) {
      console.error("[GOOGLE AUTH ERROR POPUP]:", error);
      
      const isPopupBlocked = error.code === 'auth/popup-blocked' || 
                            error.code === 'auth/popup-closed-by-user' ||
                            error.code === 'auth/cancelled-popup-request';
                            
      if (isPopupBlocked) {
        try {
          await signInWithRedirect(auth, provider);
          return new Promise(() => {}); // Page will redirect, return pending promise
        } catch (redirectError) {
          console.error("Google Sign-In Redirect failed:", redirectError);
          throw new Error(`Google Authentication failed. (Detail: ${redirectError.code || redirectError.message})`, { cause: redirectError });
        }
      }
      
      throw new Error(`Google Authentication failed. (Detail: ${error.code || error.message})`, { cause: error });
    }
  }

  // Local Mode Mock Google Sign-In
  const mockEmail = `google.user.${Math.random().toString(36).substring(2, 10)}@gmail.com`;
  const mockUser = {
    uid: `google-${crypto.randomUUID()}`,
    email: mockEmail,
    displayName: 'Google User',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
    emailVerified: true
  };

  const localUsers = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
  localUsers.push({
    uid: mockUser.uid,
    email: mockUser.email,
    emailVerified: true,
    passwordHash: null,
    createdAt: Date.now()
  });
  localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsers));

  const emailKey = `_${mockUser.email}`;
  const sig = await hmacSign(10);
  localStorage.setItem(`pg_hub_credits_signed${emailKey}`, JSON.stringify({ value: 10, sig }));

  localStorage.setItem('tenant_session', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('storage'));
  return mockUser;
}

export async function logoutTenantUser() {
  if (isFirebaseActive) {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (err) {
      console.error("Firebase signout error:", err);
    }
  }
  localStorage.removeItem('tenant_session');
}

export async function setupRecaptcha(containerId) {
  if (!isFirebaseActive) return null;
  const { RecaptchaVerifier } = await import('firebase/auth');
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
    return recaptchaVerifier;
  } catch (error) {
    console.error("Error setting up RecaptchaVerifier:", error);
    throw error;
  }
}

export async function sendOTPToPhone(phoneNumber, verifier) {
  if (isFirebaseActive) {
    const { signInWithPhoneNumber } = await import('firebase/auth');
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return confirmationResult;
    } catch (error) {
      console.error("[OTP SEND ERROR]:", error);
      throw new Error(`Failed to send OTP. (Detail: ${error.code || error.message})`, { cause: error });
    }
  }

  // Local Mode Mock OTP
  console.log(`[MOCK OTP] Sending code "123456" to phone: ${phoneNumber}`);
  return {
    confirm: async (code) => {
      if (code === '123456') {
        const mockEmail = `phone.${phoneNumber.replace(/[+]/g, '')}@pghive.com`;
        const mockUser = {
          uid: `phone-${crypto.randomUUID()}`,
          email: mockEmail,
          phoneNumber: phoneNumber,
          displayName: 'Phone User',
          emailVerified: true
        };

        const localUsers = JSON.parse(localStorage.getItem('pg_hub_mock_users') || '[]');
        if (!localUsers.find(u => u.uid === mockUser.uid)) {
          localUsers.push({
            uid: mockUser.uid,
            email: mockUser.email,
            emailVerified: true,
            passwordHash: null,
            createdAt: Date.now()
          });
          localStorage.setItem('pg_hub_mock_users', JSON.stringify(localUsers));
        }

        const emailKey = `_${mockUser.email}`;
        const sig = await hmacSign(10);
        localStorage.setItem(`pg_hub_credits_signed${emailKey}`, JSON.stringify({ value: 10, sig }));

        localStorage.setItem('tenant_session', JSON.stringify(mockUser));
        window.dispatchEvent(new Event('storage'));
        return { user: mockUser };
      } else {
        throw new Error("Invalid verification code.");
      }
    }
  };
}


