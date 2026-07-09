import { useEffect, useRef } from 'react';
import { X, Shield, Lock } from 'lucide-react';

export default function PrivacyModal({ onClose }) {
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

  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us when listing a property or creating a user profile. This includes accommodation titles, phone numbers, WhatsApp details, email addresses, pricing info, and uploaded room images."
    },
    {
      title: "2. How We Use Information",
      content: "We use the collected information to populate property listings on the website directory, facilitate direct peer-to-peer contact between room seekers and hosts, and track user credit usage. We do not sell or share contact details with third-party advertising companies."
    },
    {
      title: "3. Local Data Storage & Security",
      content: "We use local storage (localStorage) and device-specific cookies to persist user sessions, theme preferences, and credit allocations. In Local Mode, credits are signed on the device with a SHA-256 HMAC signature to verify data integrity and prevent modification."
    },
    {
      title: "4. User Rights (GDPR & Privacy Compliance)",
      content: "Users listing properties have the right to request deletion or modification of their listings at any time. For questions regarding your personal details or to request account deletion, please email support@pgwala.com."
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)' }} role="dialog" aria-modal="true">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Privacy Policy">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Shield size={22} style={{ color: 'var(--colors-primary)' }} />
            <h3 className="title-md" style={{ fontSize: '20px', margin: 0 }}>Privacy Policy</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
            Learn how we collect, store, and secure your personal details and property data.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {sections.map((section, index) => (
              <div key={index} style={{ borderBottom: '1px solid var(--colors-hairline-soft)', paddingBottom: '16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={16} style={{ color: 'var(--colors-primary)', flexShrink: 0 }} />
                  <h4 className="body-strong" style={{ fontSize: '15px', margin: 0 }}>{section.title}</h4>
                </div>
                <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, paddingLeft: '24px', lineHeight: 1.5 }}>
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
