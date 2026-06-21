import React from 'react';
import { X, TrendingUp, Sparkles, Heart, Accessibility, ShieldCheck } from 'lucide-react';

export default function InfoModal({ type, onClose }) {
  const pageData = {
    investors: {
      title: "Investor Relations",
      subtitle: "Zero Brokerage Co-living Growth & Market Metrics",
      icon: TrendingUp,
      sections: [
        {
          heading: "Market Opportunity",
          text: "Bangalore has over 1.5 million students and migrating tech professionals. The unstructured PG market is ripe for digital transformation. PG wala fills this gap with direct-from-owner listings, eliminating brokerage fees."
        },
        {
          heading: "Financial Growth",
          text: "Our pay-per-contact credit model keeps acquisition costs low while driving high transaction volumes. We have seen a 40% month-on-month increase in contact unlocks since launching our test payment integration."
        },
        {
          heading: "Future Expansion",
          text: "We plan to scale our verified listing model to other key tech hubs in India, including Pune, Hyderabad, and NCR, in Q4 2026."
        }
      ]
    },
    features: {
      title: "What's New in PG wala",
      subtitle: "Explore our latest security and feature updates",
      icon: Sparkles,
      sections: [
        {
          heading: "💳 Razorpay Test Checkout",
          text: "You can now purchase unlock packs using simulated UPI, Card, and Netbanking gateways directly in our test sandbox."
        },
        {
          heading: "🔒 HMAC Signed Credit Store",
          text: "Enhanced client-side credit validation using HMAC-SHA256 signatures to prevent credit balance manipulation and tampering."
        },
        {
          heading: "🛡️ Strict Input Sanitization",
          text: "All property listings undergo rigorous XSS injection checks, rejecting any HTML script tags, oversized payloads, or invalid uploads."
        },
        {
          heading: "📱 Fully Responsive Layout",
          text: "Optimized mobile grid stacking and aligned headers for a premium viewing experience on any screen size."
        }
      ]
    },
    discrimination: {
      title: "Anti-Discrimination Policy",
      subtitle: "Our commitment to a diverse and inclusive community",
      icon: Heart,
      sections: [
        {
          heading: "Our Policy",
          text: "PG wala is built on community and respect. We strictly prohibit hosts or residents from discriminating against anyone based on race, religion, caste, national origin, language, gender, or marital status."
        },
        {
          heading: "Listing Guidelines",
          text: "Hosts must not include discriminatory criteria in their PG descriptions or house guidelines. Any listing violating this policy will be flagged and removed immediately."
        },
        {
          heading: "Reporting Violations",
          text: "If you experience discrimination during your PG search or stay, please report it immediately to our support team at support@pgwala.com."
        }
      ]
    },
    disability: {
      title: "Disability Support",
      subtitle: "Accessibility resources for hosts and residents",
      icon: Accessibility,
      sections: [
        {
          heading: "Accessible Housing",
          text: "We encourage hosts to describe their spaces accurately regarding wheelchair access, lift facilities, ground-floor options, and step-free entryways."
        },
        {
          heading: "Service Animals",
          text: "Hosts are required to accommodate residents with service animals, even if the property has a general 'no pets' policy, unless there is a certified safety hazard."
        },
        {
          heading: "Assistance & Help",
          text: "If you need help navigating our website or finding a PG that accommodates specific physical requirements, please contact our support desk."
        }
      ]
    }
  };

  const current = pageData[type];
  if (!current) return null;
  const Icon = current.icon;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: 'var(--rounded-md)' }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Info Page">
          <X size={18} />
        </button>

        <div className="modal-body" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Icon size={22} style={{ color: 'var(--colors-primary)' }} />
            <h3 className="title-md" style={{ fontSize: '20px' }}>{current.title}</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--colors-muted)', marginBottom: '24px' }}>
            {current.subtitle}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', marginBottom: '24px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
            {current.sections.map((sec, index) => (
              <div key={index} style={{ textAlign: 'left' }}>
                <h4 className="body-strong" style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--colors-ink)' }}>{sec.heading}</h4>
                <p className="body-sm" style={{ color: 'var(--colors-muted)', margin: 0, lineHeight: 1.5 }}>
                  {sec.text}
                </p>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--colors-hairline-soft)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--colors-muted)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--colors-success)' }} />
            <span className="caption-sm">Verified PG wala Community Guild guidelines.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
