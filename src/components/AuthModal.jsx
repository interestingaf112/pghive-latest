import { useState, useEffect, useRef } from 'react';
import { registerTenantUser, loginTenantUser, signInWithGoogle } from '../firebase';
import { X, Mail, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef(null);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    firstElement?.focus();

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await registerTenantUser(email, password);
        setInfoMsg("Account created! A verification link has been sent to your email. Please verify it before logging in.");
        setEmail('');
        setPassword('');
        setIsSignUp(false); // Toggle to login view
      } else {
        const user = await loginTenantUser(email, password);
        onAuthSuccess(user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setIsSubmitting(true);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Google authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} style={{ maxWidth: '400px', borderRadius: 'var(--rounded-md)' }} role="dialog" aria-modal="true">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close authentication modal">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          <h3 className="title-md" style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={20} style={{ color: 'var(--colors-accent-blue)' }} />
            <span>{isSignUp ? "Create Account" : "Sign In"}</span>
          </h3>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '20px' }}>
            {isSignUp ? "Register to save favorites and unlock PG contacts." : "Sign in to access your saved listings and credits."}
          </p>

          {errorMsg && (
            <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: 'var(--rounded-sm)', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', fontSize: '13px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}
          
          {infoMsg && (
            <div className="success-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: 'var(--rounded-sm)', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7', fontSize: '13px' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tenant-auth-email">Email Address *</label>
              <input 
                type="email" 
                id="tenant-auth-email"
                className="form-input" 
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tenant-auth-pass">Password *</label>
              <input 
                type="password" 
                id="tenant-auth-pass"
                className="form-input" 
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 24px', width: '100%', marginTop: '8px' }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <span>{isSignUp ? "Register Account" : "Sign In"}</span>
              )}
            </button>
          </form>

          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--colors-hairline)' }} />
              <span style={{ fontSize: '11px', color: 'var(--colors-muted)', fontWeight: 600, textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--colors-hairline)' }} />
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              className="btn btn-secondary" 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px 24px', 
                width: '100%', 
                border: '1.5px solid var(--colors-hairline)',
                fontWeight: 700,
                fontSize: '13px'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block' }}>
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.37 3.65 1.43 7.5l3.89 3.01C6.27 7.55 8.92 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.44-1.09 2.66-2.31 3.48l3.6 2.79c2.1-1.94 3.76-4.78 3.76-8.37z" />
                <path fill="#FBBC05" d="M5.32 14.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.43 6.9C.52 8.71 0 10.74 0 12.9s.52 4.19 1.43 6l3.89-3.01z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.6-2.79c-1 .67-2.28 1.07-3.73 1.07-3.08 0-5.73-2.51-6.66-5.47L1.05 15.9C2.99 19.75 6.97 22.4 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>

          <div style={{ marginTop: '24px', fontSize: '13px', textAlign: 'center', borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px' }}>
            <span style={{ color: 'var(--colors-muted)' }}>
              {isSignUp ? "Already have an account? " : "New to PGhive? "}
            </span>
            <button 
              type="button" 
              className="text-link" 
              onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); setInfoMsg(''); }} 
              style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, textDecoration: 'underline', color: 'var(--colors-accent-blue)', cursor: 'pointer' }}
            >
              {isSignUp ? "Sign In" : "Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
