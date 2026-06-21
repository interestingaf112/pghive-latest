import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

export default function TermsModal({ onClose }) {
  const sections = [
    {
      title: "1. Service Overview",
      content: "PG wala operates as a peer-to-peer directory listing for paying guest (PG) accommodations in Bangalore. We are not a real estate agency and do not broker property deals, verify tenancies, or collect brokerage fees. All negotiations happen directly between owners and residents."
    },
    {
      title: "2. Contact Credit purchases",
      content: "Unlocking property contact details requires Contact Credits. All credit purchases are finalized instantly and are non-refundable. Test mode tokens do not represent actual monetary value and are provided solely for developer integration testing."
    },
    {
      title: "3. Input Verification & Safety",
      content: "Users listing properties are strictly prohibited from uploading malformed payloads, executable files, or HTML/script injection tags (XSS). Any user attempting database tampering or credit manipulation will have their session terminated and IP blocked."
    },
    {
      title: "4. Limitation of Liability",
      content: "PG wala does not guarantee the accuracy of listing descriptions, photos, or owner identities. We advise all users to perform physical property inspections and verification of lease papers before transferring security deposits."
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Terms">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileText size={22} style={{ color: 'var(--colors-primary)' }} />
            <h3 className="title-md" style={{ fontSize: '20px' }}>Terms & Conditions</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
            Please read these terms carefully before using our platform.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginBottom: '24px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
            {sections.map((sec, index) => (
              <div key={index} style={{ textAlign: 'left' }}>
                <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--colors-ink)' }}>{sec.title}</h4>
                <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, lineHeight: 1.5 }}>
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--colors-muted)' }}>
            <Shield size={16} style={{ color: 'var(--colors-success)' }} />
            <span className="caption-sm">Protected by standard secure co-living policies.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
