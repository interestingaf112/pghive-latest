import React from 'react';
import { X, HelpCircle, BookOpen, MessageSquare, Phone } from 'lucide-react';

export default function HelpCenterModal({ onClose }) {
  const faqs = [
    {
      question: "How do I unlock contact details of a PG?",
      answer: "Each listing has a locked contact panel. You can spend 1 Contact Credit to unlock the verified phone number, email address, and direct WhatsApp chat links of the PG host. This ensures direct contact and zero brokerage.",
      icon: BookOpen
    },
    {
      question: "How do I purchase more credits?",
      answer: "Click on the 'Credits' badge in the top navigation bar. Select a package (Starter Pack, Unlimited Value, etc.) and complete the payment securely using UPI, Card, or Netbanking in our test payment portal.",
      icon: HelpCircle
    },
    {
      question: "Are these properties verified?",
      answer: "Yes, our team reviews each host listing's address, amenities checklist, and room description. However, we highly recommend visiting the PG in person before paying any security deposit.",
      icon: MessageSquare
    },
    {
      question: "What is your refund policy?",
      answer: "Since unlocked contacts are revealed instantly, all credit purchases are final and non-refundable. If you experience technical payment issues, our support team will manually credit your account.",
      icon: Phone
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Help Center">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <HelpCircle size={22} style={{ color: 'var(--colors-primary)' }} />
            <h3 className="title-md" style={{ fontSize: '20px' }}>Help Center</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
            Find answers to frequently asked questions or contact our support team.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginBottom: '24px' }}>
            {faqs.map((faq, index) => {
              const Icon = faq.icon;
              return (
                <div key={index} style={{ borderBottom: '1px solid var(--colors-hairline-soft)', paddingBottom: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Icon size={16} style={{ color: 'var(--colors-primary)', flexShrink: 0 }} />
                    <h4 className="body-strong" style={{ fontSize: '15px', margin: 0 }}>{faq.question}</h4>
                  </div>
                  <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, paddingLeft: '24px', lineHeight: 1.5 }}>
                    {faq.answer}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Contact Support */}
          <div style={{ backgroundColor: 'var(--colors-surface-soft)', padding: '20px', borderRadius: 'var(--rounded-sm)', border: '1px solid var(--colors-hairline)', textAlign: 'left' }}>
            <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '12px' }}>Still need help?</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✉️</span>
                <span>Email Support: <strong>support@pgwala.com</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📞</span>
                <span>Phone Support: <strong>+91 62826 39323, +91 80788 51117</strong></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
