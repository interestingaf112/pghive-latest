/**
 * Vercel Serverless Function: Unlock listing contacts using user credits.
 * Bypasses Firestore client-side security rules to prevent race conditions.
 *
 * Required server-side env vars (set in Vercel Dashboard):
 *   FIREBASE_SERVICE_ACCOUNT_KEY — Firebase Admin SDK service account JSON (stringified)
 */

const TEST_ACCOUNTS = [
  'admin@pghive.com',
  'abhinandshopify@gmail.com',
  'amanmohdp53@gmail.com',
  'abhinandsreejith12@gmail.com'
];

const DEFAULT_CREDITS = 1;

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

function checkIfTestEmail(email) {
  if (!email) return false;
  return TEST_ACCOUNTS.includes(email.trim().toLowerCase());
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idToken, pgId, deviceFingerprint } = req.body || {};

    if (!idToken || !pgId) {
      return res.status(400).json({ error: 'Missing required fields: idToken or pgId.' });
    }

    // ── Verify Firebase ID token ───────────────────────────────────────
    let userId = null;
    let userEmail = null;
    let isAdminInitialized = false;
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountRaw) {
      try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');

        if (getApps().length === 0) {
          let serviceAccount = JSON.parse(serviceAccountRaw);
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          initializeApp({ credential: cert(serviceAccount) });
        }

        const decodedToken = await getAuth().verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || null;
        isAdminInitialized = true;
      } catch (adminErr) {
        console.warn('Firebase Admin verification failed:', adminErr.message);
      }
    }

    if (!userId) {
      // Decode JWT payload as fallback when Admin SDK service key is not configured locally
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userId = payload.user_id || payload.sub;
          userEmail = payload.email || null;
        }
      } catch (e) {
        console.warn('Fallback token parsing failed:', e);
      }
      
      if (!userId) {
        return res.status(401).json({ error: 'Invalid authentication token.' });
      }
    }

    if (!isAdminInitialized) {
      if (pgId.startsWith('mock-')) {
        console.warn('Firebase Admin SDK is not initialized, but returning mock contacts for', pgId);
        const contactsData = MOCK_PRIVATE_CONTACTS[pgId] || { phone: '+91 99999 99999', email: 'owner@pghive.com', whatsapp: '+91 99999 99999' };
        return res.status(200).json({
          success: true,
          contacts: contactsData
        });
      }
      console.error('Firebase Admin SDK could not be initialized.');
      return res.status(500).json({ error: 'Server configuration error: Firebase Admin SDK is not initialized.' });
    }

    const { getFirestore } = await import('firebase-admin/firestore');
    const firestore = getFirestore();

    const userDocRef = firestore.collection('users').doc(userId);
    const pgDocRef = firestore.collection('pgs').doc(pgId);

    let contactsData = null;

    // Run Firestore Transaction
    await firestore.runTransaction(async (transaction) => {
      const [userDoc, pgDoc] = await Promise.all([
        transaction.get(userDocRef),
        transaction.get(pgDocRef)
      ]);

      let userData = userDoc.exists 
        ? userDoc.data() 
        : { credits: checkIfTestEmail(userEmail) ? 10 : DEFAULT_CREDITS, unlockedPGs: [] };

      // Initialize doc on transaction run if missing
      if (!userDoc.exists) {
        transaction.set(userDocRef, {
          credits: userData.credits,
          unlockedPGs: []
        });
      }

      const pgName = pgDoc.exists ? pgDoc.data().name : (pgId.startsWith('mock-') ? 'Mock Co-living Space' : 'Unknown PG');

      const isAlreadyUnlocked = (userData.unlockedPGs || []).includes(pgId);

      if (isAlreadyUnlocked) {
        // Already unlocked — no credit deduction needed
        console.log(`User ${userId} already unlocked listing ${pgId}. Returning contacts directly.`);
        return;
      }

      // Check credits balance
      if ((userData.credits || 0) <= 0) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      // Create usage entry log
      const usageId = 'use_' + Math.random().toString(36).slice(2, 11);
      const usageEntry = {
        id: usageId,
        pgId,
        pgName,
        creditsSpent: 1,
        timestamp: Date.now(),
        description: 'Unlocked PG contact details via Serverless API',
        deviceFingerprint: deviceFingerprint || 'unknown-serverless',
        ipHash: 'hash-' + (req.headers['x-forwarded-for'] || 'unknown').substring(0, 10),
        paymentRef: 'ref_credit_verification'
      };

      const newCredits = userData.credits - 1;
      const newUnlockedPGs = [...(userData.unlockedPGs || []), pgId];
      const newUsageLog = [...(userData.usageLog || []), usageEntry];

      const updateFields = {
        credits: newCredits,
        unlockedPGs: newUnlockedPGs,
        usageLog: newUsageLog
      };

      // Handle fingerprint tracking
      const currentFingerprints = userData.fingerprints || [];
      const needsFingerprint = deviceFingerprint && !currentFingerprints.includes(deviceFingerprint);
      if (needsFingerprint) {
        updateFields.fingerprints = [...currentFingerprints, deviceFingerprint];
        if (currentFingerprints.length > 0) {
          const currentFlags = userData.suspiciousFlags || [];
          updateFields.suspiciousFlags = [...currentFlags, { timestamp: Date.now(), reason: 'New device unlock request' }];
        }
      }

      transaction.update(userDocRef, updateFields);

      // Write centralized unlock log
      const unlockLogRef = firestore.collection('unlocks').doc(usageId);
      transaction.set(unlockLogRef, {
        unlockId: usageId,
        userId: userId,
        userEmail: userEmail || 'anonymous@pghive.co.in',
        pgId,
        pgName,
        creditsSpent: 1,
        timestamp: Date.now()
      });
    });

    // Transaction committed successfully — fetch private contact details bypasses rules
    const contactsDocRef = firestore.collection('pgs').doc(pgId).collection('private').doc('contacts');
    const contactsSnap = await contactsDocRef.get();

    if (contactsSnap.exists) {
      contactsData = contactsSnap.data();
    } else if (pgId.startsWith('mock-') && MOCK_PRIVATE_CONTACTS[pgId]) {
      contactsData = MOCK_PRIVATE_CONTACTS[pgId];
    } else {
      contactsData = { phone: '+91 99999 99999', email: 'owner@pghive.com', whatsapp: '+91 99999 99999' };
    }

    return res.status(200).json({
      success: true,
      contacts: contactsData
    });

  } catch (err) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      return res.status(403).json({ error: 'No credits remaining. Please buy credits to unlock.' });
    }
    console.error('Error in unlock-contact serverless function:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
