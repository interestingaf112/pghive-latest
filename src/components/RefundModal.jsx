import { useEffect, useRef } from 'react';
import { X, ShieldAlert, CreditCard } from 'lucide-react';

export default function RefundModal({ onClose }) {
  const modalRef = useRef(null);

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
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Refund Policy">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CreditCard size={22} style={{ color: 'var(--colors-primary)' }} />
            <h3 className="title-md" style={{ fontSize: '20px' }}>Cancellation & Refund Policy</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
            Please read our refund terms carefully before completing your purchase.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginBottom: '24px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
            
            <div style={{ textAlign: 'left' }}>
              <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--colors-ink)' }}>1. Non-Refundable Purchases</h4>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, lineHeight: 1.5 }}>
                All purchases of Contact Credits or subscription packs on PGhive are strictly non-refundable once the transaction is completed. By completing the payment, you explicitly agree that credits are added instantly to your account, and therefore, no refunds or cancellations will be accommodated under any circumstances.
              </p>
            </div>

            <div style={{ textAlign: 'left' }}>
              <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--colors-ink)' }}>2. Digital Goods Delivery</h4>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, lineHeight: 1.5 }}>
                Since PGhive delivers digital goods (Contact Credits) instantly upon successful payment, there is no physical delivery, dispatch, or return process. Once credits are credited to your PGhive account, the sale is considered final.
              </p>
            </div>

            <div style={{ textAlign: 'left' }}>
              <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--colors-ink)' }}>3. Failed Transactions</h4>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, lineHeight: 1.5 }}>
                In the event that a transaction fails and money is deducted from your bank account without credits being successfully added to your PGhive wallet, the payment gateway will automatically process a refund back to the original payment source within 5-7 business days. Please contact your bank directly for such cases.
              </p>
            </div>

            <div style={{ textAlign: 'left' }}>
              <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--colors-ink)' }}>4. Account Deletion</h4>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, lineHeight: 1.5 }}>
                If you choose to delete your PGhive account, any unused or remaining Contact Credits will be forfeited immediately. We do not provide prorated refunds or cash equivalents for unused credits.
              </p>
            </div>

          </div>

          <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--colors-muted)' }}>
            <ShieldAlert size={16} style={{ color: '#F59E0B' }} />
            <span className="caption-sm" style={{ color: '#F59E0B' }}>All transactions on PGhive are final.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
