import { useState, useEffect, useRef } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import { isFirebaseActive, getFirebaseIdToken } from '../firebase';

export default function PurchaseModal({ onClose, onPurchaseSuccess, currentUser, onOpenAuth }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successPack, setSuccessPack] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const modalRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (successPack && successRef.current) {
      gsap.fromTo(successRef.current, 
        { scale: 0.5, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }
      );
    }
  }, [successPack]);

  // Focus trap & Escape close for accessibility
  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll('button, [href], select, textarea, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [onClose, successPack]);

  const packages = [
    { id: 'pack-1', title: 'Single Unlock', credits: 1, price: 49, desc: 'Unlock contact details of 1 PG listing.' },
    { id: 'pack-2', title: 'Starter Pack', credits: 5, price: 149, desc: 'Unlock contact details of 5 PG listings. Save 40%.', popular: true },
    { id: 'pack-3', title: 'Unlimited Value', credits: 12, price: 299, desc: 'Unlock contact details of 12 PG listings. Save 50%.' }
  ];

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  /**
   * SECURITY FIX #3: Server-verified payment flow.
   * 
   * Firebase Mode:
   *   1. POST /api/create-order → get Razorpay order_id (server creates order)
   *   2. Open Razorpay checkout with order_id
   *   3. On success, POST /api/verify-payment → server verifies HMAC signature
   *      and grants credits via Admin SDK
   *   4. Show success UI
   * 
   * Local Mode (dev/demo only):
   *   Falls back to client-side addCredits via onPurchaseSuccess callback.
   */
  const handleBuy = async (pack) => {
    setIsProcessing(true);
    setSuccessPack(null);
    setErrorMessage(null);

    // CRITICAL SECURITY GATE: Block any payment attempt if user is not authenticated!
    if (!currentUser) {
      setIsProcessing(false);
      setErrorMessage('Sign in required. Please sign in or create an account before purchasing credits.');
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      }
      return;
    }

    const isSdkLoaded = await loadRazorpayScript();
    if (!isSdkLoaded) {
      // SECURITY FIX #3: Removed mock payment simulator.
      // If Razorpay fails to load, show an error instead of granting free credits.
      setIsProcessing(false);
      setErrorMessage(
        'Could not load payment gateway. Please disable ad-blockers and check your internet connection, then try again.'
      );
      return;
    }

    // ── Firebase Mode: Server-verified payment ─────────────────────────
    if (isFirebaseActive) {
      try {
        // Step 1: Get Firebase ID token for server authentication
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
          setIsProcessing(false);
          setErrorMessage('Please sign in to purchase credits.');
          if (onOpenAuth) {
            onClose();
            onOpenAuth();
          }
          return;
        }

        // Step 2: Create a Razorpay order on the server
        const orderRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId: pack.id, idToken }),
        });

        if (!orderRes.ok) {
          let errorText = `Server Error (${orderRes.status})`;
          try {
            const errData = await orderRes.json();
            if (errData && errData.error) errorText = errData.error;
          } catch {
            const rawText = await orderRes.text().catch(() => '');
            if (rawText) errorText = `Server Error (${orderRes.status}): ${rawText.substring(0, 100)}`;
          }
          throw new Error(errorText);
        }

        const orderData = await orderRes.json();

        // Step 3: Open Razorpay checkout with server-generated order_id
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T3r6EQF4wFA4xx';

        const options = {
          key: razorpayKey,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          name: 'PGhive',
          description: `${pack.title} — ${pack.credits} Credits`,
          theme: { color: '#000000' },
          prefill: {
            name: currentUser?.displayName || 'PG Tenant User',
            email: currentUser?.email || '',
            contact: currentUser?.phoneNumber || ''
          },
          handler: async function (response) {
            // Step 4: Verify payment on server
            try {
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  packId: pack.id,
                  idToken: await getFirebaseIdToken(),
                }),
              });

              if (!verifyRes.ok) {
                const errData = await verifyRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Payment verification failed.');
              }

              setIsProcessing(false);
              setSuccessPack(pack);
              // Notify parent to refresh credits (server already added them)
              onPurchaseSuccess(0);
            } catch (verifyErr) {
              console.error('Payment verification failed:', verifyErr);
              setIsProcessing(false);
              setErrorMessage(
                'Payment was received but verification failed. Your credits will be added shortly. ' +
                'If not, contact support with your payment ID: ' + response.razorpay_payment_id
              );
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

      } catch (err) {
        console.error('Payment flow error:', err);
        setIsProcessing(false);
        setErrorMessage(err.message || 'Could not process payment. Please try again.');
      }
      return;
    }

    // ── Local Mode: Client-side flow (dev/demo only) ───────────────────
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T3r6EQF4wFA4xx';

    const options = {
      key: razorpayKey,
      amount: pack.price * 100,
      currency: 'INR',
      name: 'PGhive',
      description: `${pack.title} — ${pack.credits} Credits`,
      theme: { color: '#000000' },
      prefill: {
        name: currentUser?.displayName || 'PG Tenant User',
        email: currentUser?.email || 'tenant.pghive@example.com',
        contact: currentUser?.phoneNumber || '9999999999'
      },
      handler: function (response) {
        console.log("Razorpay transaction successful:", response.razorpay_payment_id);
        setIsProcessing(false);
        setSuccessPack(pack);
        onPurchaseSuccess(pack.credits);
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Failed to initialize Razorpay checkout window:", err);
      setIsProcessing(false);
      setErrorMessage("Could not open payment portal. Please check if your Key ID is correct.");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} style={{ maxWidth: '520px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close purchase modal">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          
          {/* Error Message Banner */}
          {errorMessage && !isProcessing && !successPack && (
            <div style={{ 
              display: 'flex', alignItems: 'flex-start', gap: '10px', 
              padding: '12px 16px', marginBottom: '20px', 
              borderRadius: 'var(--rounded-sm)',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              color: 'var(--colors-ink)'
            }}>
              <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ width: '100%' }}>
                <p className="body-sm" style={{ margin: 0, lineHeight: 1.5 }}>{errorMessage}</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                  {errorMessage.toLowerCase().includes('sign in') && onOpenAuth && (
                    <button 
                      className="body-sm" 
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--colors-primary)', fontWeight: 700, padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      Sign In / Register
                    </button>
                  )}
                  <button 
                    className="body-sm" 
                    onClick={() => setErrorMessage(null)}
                    style={{ 
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#dc2626', fontWeight: 600, padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View 1: Processing Loader */}
          {isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center', width: '100%', minHeight: '300px' }}>
              <Loader2 className="animate-spin" size={48} style={{ color: 'var(--colors-primary)', marginBottom: '24px' }} />
              <h3 className="title-md" style={{ fontSize: '20px', marginBottom: '8px' }}>Processing Secure Payment</h3>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', maxWidth: '280px', marginBottom: '20px' }}>
                Connecting to UPI / card gateway...
              </p>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setIsProcessing(false)}
                style={{ width: 'auto', padding: '8px 20px', minHeight: '34px', borderRadius: 'var(--rounded-pill)', fontWeight: 600 }}
              >
                Cancel & Go Back
              </button>
            </div>
          )}

          {/* View 2: Purchase Success screen */}
          {!isProcessing && successPack && (
            <div ref={successRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center', width: '100%', minHeight: '300px' }}>
              <CheckCircle2 size={56} style={{ color: 'var(--colors-success)', marginBottom: '20px' }} />
              <h3 className="title-md" style={{ fontSize: '22px', marginBottom: '8px' }}>Payment Successful!</h3>
              <p className="body-md" style={{ fontWeight: 600, color: 'var(--colors-ink)', marginBottom: '4px' }}>
                Added {successPack.credits} Contact Credits
              </p>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
                Receipt sent to registered email. You can now unlock PG listings.
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ maxWidth: '180px', borderRadius: 'var(--rounded-pill)', minHeight: '38px', padding: '8px 24px' }}>
                Continue
              </button>
            </div>
          )}

          {/* View 3: Package Selector */}
          {!isProcessing && !successPack && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CreditCard size={22} style={{ color: 'var(--colors-primary)' }} />
                <h3 className="title-md" style={{ fontSize: '20px' }}>Unlock Owner Contacts</h3>
              </div>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
                Pay directly to property owners. No Brokerage. Select a contact pack below to get started.
              </p>

              {!currentUser && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: 'var(--rounded-sm)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--colors-ink)' }}>
                    <strong>Sign in required:</strong> Please log in before purchasing so credits can be added to your profile.
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => { onClose(); if (onOpenAuth) onOpenAuth(); }}
                    style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '6px 14px' }}
                  >
                    Sign In Now
                  </button>
                </div>
              )}

              {/* Package cards list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', width: '100%' }}>
                {packages.map((pack) => (
                  <div 
                    key={pack.id} 
                    style={{ 
                      border: pack.popular ? '2px solid var(--colors-primary)' : '1px solid var(--colors-hairline)',
                      borderRadius: 'var(--rounded-sm)',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      position: 'relative',
                      backgroundColor: pack.popular ? 'var(--colors-surface-soft)' : 'var(--colors-canvas)',
                      width: '100%'
                    }}
                  >
                    {pack.popular && (
                      <span className="badge" style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: 'var(--colors-primary)', color: 'white', padding: '2px 8px', borderRadius: 'var(--rounded-full)', fontSize: '9px', fontWeight: 800 }}>
                        MOST POPULAR
                      </span>
                    )}

                    <div style={{ textAlign: 'left', paddingRight: '12px' }}>
                      <div className="body-strong" style={{ fontSize: '15px' }}>{pack.title}</div>
                      <div className="caption-sm" style={{ marginTop: '2px', color: 'var(--colors-muted)' }}>{pack.desc}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                      <span className="body-strong" style={{ fontSize: '16px' }}>{formatPrice(pack.price)}</span>
                      <button 
                        className={`btn ${pack.popular ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
                        onClick={() => handleBuy(pack)}
                        style={{ width: 'auto', padding: '6px 14px', minHeight: '32px' }}
                      >
                        Buy Pack
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Secure checkout disclaimer */}
              <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--colors-muted)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--colors-success)' }} />
                <span className="caption-sm">Secure checkout. Encrypted with bank-level protocol.</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
