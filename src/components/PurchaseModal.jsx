import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

export default function PurchaseModal({ onClose, onPurchaseSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successPack, setSuccessPack] = useState(null);

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

  const handleBuy = async (pack) => {
    setIsProcessing(true);
    setSuccessPack(null);

    const isSdkLoaded = await loadRazorpayScript();
    if (!isSdkLoaded) {
      setIsProcessing(false);
      alert('Failed to load the payment gateway SDK. Please check your internet connection and try again.');
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T3r6EQF4wFA4xx';

    const options = {
      key: razorpayKey,
      amount: pack.price * 100, // Amount in paise (₹49 -> 4900 paise)
      currency: 'INR',
      name: 'PG wala',
      description: `${pack.title} — ${pack.credits} Credits`,
      theme: {
        color: '#2563eb' // Electric Cobalt theme
      },
      prefill: {
        name: 'PG Guest User',
        email: 'guest.pgwala@example.com',
        contact: '9999999999'
      },
      handler: function (response) {
        console.log("Razorpay transaction successful:", response.razorpay_payment_id);
        setIsProcessing(false);
        setSuccessPack(pack);
        onPurchaseSuccess(pack.credits);
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay checkout closed by user.");
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
      alert("Could not open payment portal. Please check if your Key ID is correct.");
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close purchase modal">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          
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
                style={{ width: 'auto', padding: '8px 20px', minHeight: '34px', borderRadius: '4px', fontWeight: 600 }}
              >
                Cancel & Go Back
              </button>
            </div>
          )}

          {/* View 2: Purchase Success screen */}
          {!isProcessing && successPack && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center', width: '100%', minHeight: '300px' }}>
              <CheckCircle2 size={56} style={{ color: 'var(--colors-success)', marginBottom: '20px' }} />
              <h3 className="title-md" style={{ fontSize: '22px', marginBottom: '8px' }}>Payment Successful!</h3>
              <p className="body-md" style={{ fontWeight: 600, color: 'var(--colors-ink)', marginBottom: '4px' }}>
                Added {successPack.credits} Contact Credits
              </p>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
                Receipt sent to registered email. You can now unlock PG listings.
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ maxWidth: '180px', borderRadius: 'var(--rounded-full)', minHeight: '38px', padding: '8px 24px' }}>
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
