/**
 * Vercel Serverless Function: Create Razorpay Order
 * 
 * SECURITY FIX #3: Server-side payment order creation.
 * This endpoint creates a Razorpay order so that the payment can be verified
 * server-side after completion (via /api/verify-payment).
 * 
 * Required server-side env vars (set in Vercel Dashboard):
 *   RAZORPAY_KEY_ID        — Razorpay API key ID
 *   RAZORPAY_KEY_SECRET    — Razorpay API key secret
 *   FIREBASE_SERVICE_ACCOUNT_KEY — Firebase Admin SDK service account JSON (stringified)
 */

import crypto from 'crypto';

// ── Firebase Admin SDK (lazy-initialized singleton) ──────────────────────
let adminApp = null;

async function getFirebaseAdmin() {
  if (adminApp) return adminApp;
  
  // Dynamic import for Firebase Admin SDK
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

// ── Allowed credit packages (source of truth) ───────────────────────────
const PACKAGES = {
  'pack-1': { credits: 1, price: 49, title: 'Single Unlock' },
  'pack-2': { credits: 5, price: 149, title: 'Starter Pack' },
  'pack-3': { credits: 12, price: 299, title: 'Unlimited Value' },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packId, idToken } = req.body;

    // ── Validate input ─────────────────────────────────────────────────
    if (!packId || !idToken) {
      return res.status(400).json({ error: 'Missing packId or idToken' });
    }

    const pack = PACKAGES[packId];
    if (!pack) {
      return res.status(400).json({ error: 'Invalid package ID' });
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

    // ── Create Razorpay Order ──────────────────────────────────────────
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpaySecret) {
      console.error('Razorpay credentials not configured on server.');
      return res.status(500).json({ error: 'Payment system not configured.' });
    }

    const orderPayload = {
      amount: pack.price * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        packId,
        userId,
        credits: pack.credits,
      },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString('base64'),
      },
      body: JSON.stringify(orderPayload),
    });

    if (!razorpayResponse.ok) {
      const errBody = await razorpayResponse.text();
      console.error('Razorpay order creation failed:', errBody);
      return res.status(502).json({ error: 'Failed to create payment order.' });
    }

    const order = await razorpayResponse.json();

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      packId,
      credits: pack.credits,
    });

  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
