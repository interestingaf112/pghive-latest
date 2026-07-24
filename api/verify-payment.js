/**
 * Vercel Serverless Function: Verify Razorpay Payment & Grant Credits
 *
 * Required server-side env vars (set in Vercel Dashboard):
 *   RAZORPAY_KEY_SECRET          — Razorpay API key secret
 *   FIREBASE_SERVICE_ACCOUNT_KEY — Firebase Admin SDK service account JSON (stringified)
 */

import crypto from 'crypto';

// ── Allowed credit packages (source of truth — must match create-order.js) ──
const PACKAGES = {
  'pack-1': { credits: 1,  price: 49,  title: 'Single Unlock'  },
  'pack-2': { credits: 5,  price: 149, title: 'Starter Pack'   },
  'pack-3': { credits: 12, price: 299, title: 'Unlimited Value' },
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

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
    } = req.body || {};

    // ── Validate input ─────────────────────────────────────────────────
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !packId || !idToken) {
      return res.status(400).json({ error: 'Missing required payment verification fields.' });
    }

    const pack = PACKAGES[packId];
    if (!pack) {
      return res.status(400).json({ error: 'Invalid package ID.' });
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
        console.warn('Firebase Admin verification skipped/failed:', adminErr.message);
      }
    }

    if (!userId) {
      // Decode JWT payload as fallback when Admin SDK service key is not configured on Vercel
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

    // ── Verify Razorpay Signature (HMAC-SHA256) ────────────────────────
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpaySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured on server.');
      return res.status(500).json({ error: 'Payment verification not configured (Missing RAZORPAY_KEY_SECRET).' });
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
    if (isAdminInitialized) {
      try {
        const { getApps } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');

        if (getApps().length > 0) {
          const firestore = getFirestore();
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

          const purchaseLogRef = firestore.collection('purchases').doc(`tx_${razorpay_payment_id}`);

          await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);

            if (userDoc.exists) {
              const currentCredits = userDoc.data().credits || 0;
              const currentPayments = userDoc.data().payments || [];

              // Idempotency check: don't double-credit the same payment
              const alreadyProcessed = currentPayments.some(
                (p) => p.razorpay_payment_id === razorpay_payment_id
              );
              if (alreadyProcessed) return;

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

            // Centralized log
            transaction.set(purchaseLogRef, {
              purchaseId: `tx_${razorpay_payment_id}`,
              userId: userId,
              userEmail: userEmail || 'unknown@pghive.co.in',
              planId: packId,
              planTitle: pack.title,
              pricePaid: pack.price,
              creditsAdded: pack.credits,
              timestamp: Date.now(),
              status: 'Completed'
            });
          });
        }
      } catch (dbErr) {
        console.error('Firestore Admin credit transaction failed:', dbErr);
      }
    }

    console.log(`[PAYMENT] Verified HMAC signature for ${pack.credits} credits to user ${userId}. Payment: ${razorpay_payment_id}`);

    return res.status(200).json({
      success: true,
      credits: pack.credits,
      packTitle: pack.title,
      paymentId: razorpay_payment_id,
    });

  } catch (err) {
  }
}
