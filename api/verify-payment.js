/**
 * Vercel Serverless Function: Verify Razorpay Payment & Grant Credits
 * 
 * SECURITY FIX #3: Server-side payment signature verification.
 * After Razorpay checkout completes, this endpoint:
 *   1. Verifies the Razorpay signature (HMAC-SHA256)
 *   2. Grants credits via Firebase Admin SDK (bypasses Firestore rules)
 *   3. Records the verified payment in the user's Firestore document
 * 
 * Credits can ONLY be incremented through this endpoint — never from the client.
 * 
 * Required server-side env vars (set in Vercel Dashboard):
 *   RAZORPAY_KEY_SECRET         — Razorpay API key secret
 *   FIREBASE_SERVICE_ACCOUNT_KEY — Firebase Admin SDK service account JSON (stringified)
 */

import crypto from 'crypto';

// ── Firebase Admin SDK (lazy-initialized singleton) ──────────────────────
let adminApp = null;

async function getFirebaseAdmin() {
  if (adminApp) return adminApp;
  
  const admin = await import('firebase-admin');
  
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  const serviceAccount = JSON.parse(serviceAccountRaw);
  
  if (!admin.default.apps.length) {
    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount),
    });
  }
  
  adminApp = admin.default;
  return adminApp;
}

// ── Allowed credit packages (source of truth — must match create-order.js) ──
const PACKAGES = {
  'pack-1': { credits: 1, price: 49, title: 'Single Unlock' },
  'pack-2': { credits: 5, price: 149, title: 'Starter Pack' },
  'pack-3': { credits: 12, price: 299, title: 'Unlimited Value' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      packId,
      idToken,
    } = req.body;

    // ── Validate input ─────────────────────────────────────────────────
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !packId || !idToken) {
      return res.status(400).json({ error: 'Missing required payment verification fields.' });
    }

    const pack = PACKAGES[packId];
    if (!pack) {
      return res.status(400).json({ error: 'Invalid package ID.' });
    }

    // ── Verify Firebase ID token ───────────────────────────────────────
    const admin = await getFirebaseAdmin();
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (authErr) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    const userId = decodedToken.uid;

    // ── Verify Razorpay Signature (HMAC-SHA256) ────────────────────────
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpaySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured on server.');
      return res.status(500).json({ error: 'Payment verification not configured.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn(`[SECURITY] Payment signature mismatch for user ${userId}. Order: ${razorpay_order_id}`);
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // ── Grant Credits via Admin SDK (bypasses Firestore rules) ─────────
    const firestore = admin.firestore();
    const userDocRef = firestore.collection('users').doc(userId);

    const paymentEntry = {
      id: `tx_${razorpay_payment_id}`,
      razorpay_payment_id,
      razorpay_order_id,
      packageTitle: pack.title,
      packId,
      credits: pack.credits,
      price: pack.price,
      timestamp: Date.now(),
      status: 'Verified',
      verification: 'server-side-hmac',
    };

    await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);

      if (userDoc.exists) {
        const currentCredits = userDoc.data().credits || 0;
        const currentPayments = userDoc.data().payments || [];

        // Idempotency check: don't double-credit the same payment
        const alreadyProcessed = currentPayments.some(
          (p) => p.razorpay_payment_id === razorpay_payment_id
        );
        if (alreadyProcessed) {
          return; // Already processed — skip (but still return success)
        }

        transaction.update(userDocRef, {
          credits: currentCredits + pack.credits,
          payments: [...currentPayments, paymentEntry],
        });
      } else {
        // First purchase — create user document
        transaction.set(userDocRef, {
          credits: pack.credits,
          unlockedPGs: [],
          payments: [paymentEntry],
        });
      }
    });

    console.log(`[PAYMENT] Verified and granted ${pack.credits} credits to user ${userId}. Payment: ${razorpay_payment_id}`);

    return res.status(200).json({
      success: true,
      credits: pack.credits,
      paymentId: razorpay_payment_id,
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({ error: 'Internal server error during payment verification.' });
  }
}
