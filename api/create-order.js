/**
 * Vercel Serverless Function: Create Razorpay Order
 *
 * Required server-side env vars (set in Vercel Dashboard):
 *   RAZORPAY_KEY_ID        — Razorpay API key ID
 *   RAZORPAY_KEY_SECRET    — Razorpay API key secret
 *   FIREBASE_SERVICE_ACCOUNT_KEY — Firebase Admin SDK service account JSON (stringified)
 */

import crypto from 'crypto';

// ── Allowed credit packages (source of truth) ───────────────────────────
const PACKAGES = {
  'pack-1': { credits: 1,  price: 49,  title: 'Single Unlock'   },
  'pack-2': { credits: 5,  price: 149, title: 'Starter Pack'    },
  'pack-3': { credits: 12, price: 299, title: 'Unlimited Value'  },
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packId, idToken } = req.body || {};

    // ── Validate input ─────────────────────────────────────────────────
    if (!packId || !idToken) {
      return res.status(400).json({ error: 'Missing packId or idToken' });
    }

    const pack = PACKAGES[packId];
    if (!pack) {
      return res.status(400).json({ error: 'Invalid package ID' });
    }

    // ── Verify Firebase ID token ───────────────────────────────────────
    let userId = null;
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
      } catch (adminErr) {
        console.warn('Firebase Admin verification failed/skipped:', adminErr.message);
      }
    }

    // Fallback JWT payload decoding if Admin SDK is unconfigured or failed
    if (!userId) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userId = payload.user_id || payload.sub;
        }
      } catch (e) {
        console.warn('Fallback token parsing failed:', e);
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    // ── Create Razorpay Order ──────────────────────────────────────────
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T3r6EQF4wFA4xx';
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      console.error('Razorpay secret not configured on server.');
      return res.status(500).json({ 
        error: 'Razorpay secret key (RAZORPAY_KEY_SECRET) is missing in Vercel environment variables.' 
      });
    }

    const orderPayload = {
      amount: pack.price * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `rcpt_${userId.substring(0, 10)}_${Date.now()}`,
      notes: { packId, userId, credits: pack.credits },
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
      let errorMsg = 'Failed to create payment order.';
      try {
        const parsedBody = JSON.parse(errBody);
        errorMsg = `Razorpay API Error: ${parsedBody.error?.description || JSON.stringify(parsedBody)}`;
      } catch {
        errorMsg = `Razorpay Raw Error: ${errBody.substring(0, 150)}`;
      }
      return res.status(502).json({ error: errorMsg });
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
    return res.status(500).json({ error: `Server error creating order: ${err.message}` });
  }
}
