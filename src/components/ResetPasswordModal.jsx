import { useState, useEffect, useRef } from 'react';
import { X, KeyRound, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { verifyResetTokenAndChangePassword } from '../firebase';

export default function ResetPasswordModal({ token, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
  }, [onClose, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyResetTokenAndChangePassword(token, password);
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'The password reset link is invalid or has expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} style={{ maxWidth: '440px', borderRadius: 'var(--rounded-md)' }} role="dialog" aria-modal="true">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close form">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', textAlign: 'center' }}>
              <CheckCircle2 size={56} style={{ color: 'var(--colors-accent-blue)', marginBottom: '20px' }} />
              <h3 className="title-md" style={{ fontSize: '20px', marginBottom: '8px' }}>Password Reset Successful</h3>
              <p className="body-md" style={{ color: 'var(--colors-body)', marginBottom: '24px' }}>
                Your admin password has been updated. You can now log in using your new credentials.
              </p>
              <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', padding: '10px 24px' }}>
                Dismiss
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <KeyRound size={22} style={{ color: 'var(--colors-accent-blue)' }} />
                <h3 className="title-md" style={{ fontSize: '20px', margin: 0 }}>Reset Admin Password</h3>
              </div>
              <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
                Please choose a secure new password for your administration dashboard session.
              </p>

              {errorMsg && (
                <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: 'var(--rounded-sm)', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', fontSize: '13px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="reset-new-password">New Password *</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    id="reset-new-password"
                    placeholder="Enter at least 6 characters" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="reset-confirm-password">Confirm New Password *</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    id="reset-confirm-password"
                    placeholder="Repeat your new password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 24px', width: '100%', marginTop: '8px' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
