import { useState, useEffect, useRef } from 'react';
import { 
  X, User, Heart, Key, CreditCard, ShieldCheck, 
  Loader2, LogOut, Phone, MessageCircle, CheckCircle, MapPin
} from 'lucide-react';
import { getUserPayments, getUserUsageLog, getAllUnlockedContacts } from '../firebase';
import DecryptedText from './DecryptedText';
import gsap from 'gsap';

export default function AccountCentreModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  userCredits, 
  onOpenPurchaseModal,
  onLogout,
  pgs,
  unlockedPGIds
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'favorites' | 'unlocked' | 'payments'
  const [payments, setPayments] = useState([]);
  const [usageLog, setUsageLog] = useState([]);
  const [unlockedContacts, setUnlockedContacts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const modalRef = useRef(null);
  const creditBadgeRef = useRef(null);

  useEffect(() => {
    if (creditBadgeRef.current) {
      gsap.fromTo(creditBadgeRef.current,
        { scale: 1.3, color: '#22c55e' },
        { scale: 1, color: 'var(--colors-ink)', duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [userCredits]);

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

  // Load transaction & contact logs on mount/open
  useEffect(() => {
    if (!isOpen) return;
    async function loadData() {
      setIsLoading(true);
      try {
        const [payData, logData, contactsMap] = await Promise.all([
          getUserPayments(),
          getUserUsageLog(),
          getAllUnlockedContacts(unlockedPGIds)
        ]);
        setPayments(payData.sort((a, b) => b.timestamp - a.timestamp));
        setUsageLog(logData.sort((a, b) => b.timestamp - a.timestamp));
        setUnlockedContacts(contactsMap);
      } catch (err) {
        console.error("Error loading account center logs:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isOpen, unlockedPGIds]);

  if (!isOpen) return null;

  // Filter favorite PGs from localStorage wishlist
  const savedIds = JSON.parse(localStorage.getItem('wishlist_pgs') || '[]');
  const favoritePGs = pgs.filter(pg => savedIds.includes(pg.id));

  // Match unlocked details with actual PG info
  const unlockedPGs = pgs.filter(pg => unlockedPGIds.includes(pg.id));

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content account-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        ref={modalRef} 
        role="dialog" 
        aria-modal="true"
        style={{ 
          maxWidth: '860px', 
          width: '95%',
          borderRadius: 'var(--rounded-md)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--colors-surface-card)',
          color: 'var(--colors-ink)'
        }}
      >
        {/* Modal Header */}
        <div className="account-modal-header" style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--colors-hairline)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'var(--colors-surface-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--colors-surface-soft)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--colors-ink)'
            }}>
              <User size={18} />
            </div>
            <div>
              <h3 className="title-md" style={{ fontSize: '18px', margin: 0, color: 'var(--colors-ink)' }}>Account Centre</h3>
              <span className="caption-sm" style={{ color: 'var(--colors-muted)' }}>Manage your co-living dashboard</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentUser && (
              <button 
                className="btn btn-secondary btn-sm desktop-only"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '6px 12px', 
                  minHeight: '30px', 
                  fontSize: '11px',
                  fontWeight: 700,
                  border: '1.5px solid var(--colors-hairline)',
                  borderRadius: 'var(--rounded-sm)',
                  backgroundColor: 'var(--colors-surface-soft)',
                  color: 'var(--colors-ink)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={12} style={{ flexShrink: 0 }} />
                <span>Log Out</span>
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close Account Centre" style={{ position: 'static', color: 'var(--colors-ink)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dashboard Frame */}
        <div className="account-dashboard-frame" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          {/* Sidebar Navigation */}
          <div className="account-sidebar" style={{ 
            width: '200px', 
            borderRight: '1px solid var(--colors-hairline)',
            backgroundColor: 'var(--colors-surface-soft)',
            padding: '16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            flexShrink: 0
          }}>
            {[
              { id: 'profile', label: 'Profile', icon: <User size={16} /> },
              { id: 'favorites', label: 'Wishlist', icon: <Heart size={16} /> },
              { id: 'unlocked', label: 'Unlocked', icon: <Key size={16} /> },
              { id: 'payments', label: 'Billing', icon: <CreditCard size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`dashboard-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 'var(--rounded-sm)',
                  backgroundColor: activeTab === tab.id ? 'var(--colors-surface-card)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--colors-ink)' : 'var(--colors-muted)',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
            

          </div>

          {/* Main Content Pane */}
          <div className="account-content-pane" style={{ 
            flexGrow: 1, 
            padding: '28px', 
            overflowY: 'auto',
            backgroundColor: 'var(--colors-surface-card)',
            color: 'var(--colors-ink)'
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--colors-primary)', marginBottom: '12px' }} />
                <span className="body-sm" style={{ color: 'var(--colors-muted)' }}>Synchronizing profile...</span>
              </div>
            ) : (
              <>
                {/* 1. Tab Panel: Profile & Stats */}
                {activeTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--colors-primary)',
                        color: 'var(--colors-on-primary)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 700
                      }}>
                        {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)' }}>{currentUser?.email || 'User Account'}</h4>
                          {currentUser?.emailVerified !== false && (
                            <span 
                              className="verification-badge"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '3px',
                                fontSize: '10px', 
                                fontWeight: 800, 
                                color: '#15803d',
                                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                                padding: '2px 8px',
                                borderRadius: 'var(--rounded-full)',
                                border: '1.5px solid #15803d'
                              }}
                            >
                              <CheckCircle size={10} style={{ color: '#15803d' }} /> Verified Tenant
                            </span>
                          )}
                        </div>
                        <span className="caption" style={{ color: 'var(--colors-muted)' }}>Active session profile</span>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                      gap: '16px', 
                      marginTop: '8px' 
                    }}>
                      <div style={{ border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '16px', backgroundColor: 'var(--colors-surface-soft)' }}>
                        <span className="caption-sm" style={{ color: 'var(--colors-muted)', display: 'block', marginBottom: '4px' }}>Credits Available</span>
                        <strong ref={creditBadgeRef} style={{ fontSize: '24px', color: 'var(--colors-ink)', display: 'block', transformOrigin: 'left center' }}>{userCredits}</strong>
                        <button 
                          className="text-link" 
                          onClick={onOpenPurchaseModal}
                          style={{ fontSize: '12px', fontWeight: 700, border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--colors-primary)', textDecoration: 'underline', marginTop: '6px' }}
                        >
                          Buy Credits →
                        </button>
                      </div>
                      <div style={{ border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '16px', backgroundColor: 'var(--colors-surface-soft)' }}>
                        <span className="caption-sm" style={{ color: 'var(--colors-muted)', display: 'block', marginBottom: '4px' }}>Unlocked Contacts</span>
                        <strong style={{ fontSize: '24px', display: 'block', color: 'var(--colors-ink)' }}>{unlockedPGIds.length}</strong>
                        <span className="caption-sm" style={{ color: 'var(--colors-muted)' }}>PG Listings</span>
                      </div>
                      <div style={{ border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '16px', backgroundColor: 'var(--colors-surface-soft)' }}>
                        <span className="caption-sm" style={{ color: 'var(--colors-muted)', display: 'block', marginBottom: '4px' }}>Brokerage Saved</span>
                        <strong style={{ fontSize: '24px', color: '#15803d', display: 'block' }}>
                          {formatPrice(unlockedPGIds.length * 12000)}
                        </strong>
                        <span className="caption-sm" style={{ color: 'var(--colors-muted)' }}>Based on average ₹12k rent</span>
                      </div>
                    </div>

                    <div style={{ border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-sm)', padding: '16px', marginTop: '12px', backgroundColor: 'var(--colors-surface-soft)' }}>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--colors-ink)' }}>Security & Trust</h5>
                      <p className="caption" style={{ color: 'var(--colors-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Your session is secured using bank-level tokens. To access the portal from another device, simply log in using your verified email credentials.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--colors-muted)' }}>
                        <ShieldCheck size={14} style={{ color: 'var(--colors-success)' }} />
                        <span className="caption-sm" style={{ fontWeight: 600, color: 'var(--colors-muted)' }}>Active Security: AES-256 Auth State</span>
                      </div>
                    </div>

                    {/* Log Out Action on Mobile */}
                    <div className="mobile-logout-container">
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          onLogout();
                          onClose();
                        }}
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '8px', 
                          minHeight: '44px',
                          border: '1.5px solid #fca5a5',
                          fontWeight: 700,
                          borderRadius: 'var(--rounded-md)',
                          color: '#dc2626',
                          backgroundColor: '#fef2f2'
                        }}
                      >
                        <LogOut size={16} />
                        <span>Log Out from PGhive</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Tab Panel: Favorite PGs (Wishlist) */}
                {activeTab === 'favorites' && (
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: 'var(--colors-ink)' }}>Wishlist ({favoritePGs.length})</h4>
                    {favoritePGs.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', border: '1px dashed var(--colors-hairline)', borderRadius: '8px', backgroundColor: 'var(--colors-surface-soft)' }}>
                        <Heart size={32} style={{ color: 'var(--colors-muted)', marginBottom: '8px' }} />
                        <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--colors-ink)' }}>Your Wishlist is empty</h5>
                        <p className="caption" style={{ color: 'var(--colors-muted)', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
                          Save PG listings by clicking the heart button on listing cards in the catalog.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                        {favoritePGs.map(pg => (
                          <div 
                            key={pg.id} 
                            style={{ 
                              border: '1px solid var(--colors-hairline)', 
                              borderRadius: 'var(--rounded-sm)',
                              overflow: 'hidden',
                              backgroundColor: 'var(--colors-surface-soft)',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              onClose();
                              // Select parent page element trigger
                              const viewBtn = document.querySelector(`[aria-label="View details for ${pg.name}"]`) || document.getElementById(`pg-card-${pg.id}`);
                              if (viewBtn) {
                                viewBtn.click();
                              } else {
                                alert("Close the account panel to explore this PG in the catalog grid.");
                              }
                            }}
                          >
                            <img 
                              src={pg.images?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=300&q=80'} 
                              alt={pg.name}
                              style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                            />
                            <div style={{ padding: '12px' }}>
                              <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--colors-ink)' }}>{pg.name}</h5>
                              <span className="caption-sm" style={{ color: 'var(--colors-muted)', display: 'block' }}>{pg.locality}</span>
                              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: 'var(--colors-ink)', fontSize: '13px' }}>₹{Number(pg.price || 0).toLocaleString('en-IN')}/mo</strong>
                                <span className="caption-sm" style={{ textDecoration: 'underline', color: 'var(--colors-primary)' }}>View Details</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tab Panel: Unlocked Host Contacts */}
                {activeTab === 'unlocked' && (
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: 'var(--colors-ink)' }}>Unlocked Host Directories ({unlockedPGs.length})</h4>
                    {unlockedPGs.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', border: '1px dashed var(--colors-hairline)', borderRadius: '8px', backgroundColor: 'var(--colors-surface-soft)' }}>
                        <Key size={32} style={{ color: 'var(--colors-muted)', marginBottom: '8px' }} />
                        <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--colors-ink)' }}>No contacts unlocked yet</h5>
                        <p className="caption" style={{ color: 'var(--colors-muted)', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
                          Unlock details directly on the PG detail sheets using contact credits.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {unlockedPGs.map(pg => {
                          const contact = unlockedContacts[pg.id] || {};
                          return (
                            <div 
                              key={pg.id}
                              className="unlocked-card"
                            >
                              <div className="unlocked-card-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'var(--colors-surface-soft)', border: '1px solid var(--colors-hairline)', padding: '2px 8px', borderRadius: '4px', color: 'var(--colors-muted)', textTransform: 'uppercase' }}>
                                    {pg.locality}
                                  </span>
                                  {contact.googleMapsUrl && (
                                    <a 
                                      href={contact.googleMapsUrl} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '4px', 
                                        fontSize: '11px', 
                                        fontWeight: 600, 
                                        color: 'var(--colors-primary)', 
                                        textDecoration: 'none' 
                                      }}
                                    >
                                      <MapPin size={11} />
                                      <span>Maps ↗</span>
                                    </a>
                                  )}
                                </div>
                                <h5 style={{ margin: '8px 0 3px 0', fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)' }}>{pg.name}</h5>
                                <span className="caption-sm" style={{ color: 'var(--colors-muted)', display: 'block', marginBottom: '4px' }}>Host: {contact.name || 'PG Host Owner'}</span>
                              </div>

                              <div className="unlocked-card-details">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--colors-body)' }}>
                                  <Phone size={13} style={{ color: 'var(--colors-muted)' }} />
                                  <a href={`tel:${contact.phone}`} style={{ color: 'var(--colors-body)', fontWeight: 600, textDecoration: 'none' }}>
                                    <DecryptedText
                                      text={contact.phone || '9999999999'}
                                      animateOn="view"
                                      speed={35}
                                      maxIterations={12}
                                      sequential={true}
                                      characters="0123456789*#+!?$"
                                    />
                                  </a>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--colors-body)' }}>
                                  <span style={{ fontSize: '13px', color: 'var(--colors-muted)' }}>✉</span>
                                  <a href={`mailto:${contact.email}`} style={{ color: 'var(--colors-body)', textDecoration: 'none' }}>
                                    <DecryptedText
                                      text={contact.email || 'host@pghive.com'}
                                      animateOn="view"
                                      speed={25}
                                      maxIterations={10}
                                      sequential={true}
                                    />
                                  </a>
                                </div>
                              </div>

                              <div className="unlocked-card-actions">
                                {contact.phone && (
                                  <a 
                                    href={`tel:${contact.phone}`} 
                                    className="btn btn-secondary btn-sm"
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      gap: '6px', 
                                      padding: '6px 12px',
                                      minHeight: '36px',
                                      fontSize: '12px',
                                      backgroundColor: 'var(--colors-surface-card)',
                                      color: 'var(--colors-ink)',
                                      border: '1.5px solid var(--colors-hairline)'
                                    }}
                                  >
                                    <Phone size={12} style={{ color: 'var(--colors-ink)' }} /> Call Owner
                                  </a>
                                )}
                                {contact.whatsapp && (
                                  <a 
                                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=Hi,%20I'm%20interested%20in%20your%20listing%20"${encodeURIComponent(pg.name)}"%20on%20PGhive.`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn btn-primary btn-sm"
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      gap: '6px', 
                                      padding: '6px 12px',
                                      minHeight: '36px',
                                      backgroundColor: 'var(--colors-whatsapp)',
                                      borderColor: 'var(--colors-whatsapp)',
                                      color: 'white',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <MessageCircle size={12} /> WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Tab Panel: Billing Log & Ledger */}
                {activeTab === 'payments' && (
                  <div style={{ textAlign: 'left' }}>
                    {/* Razorpay Purchase Log */}
                    <div style={{ marginBottom: '28px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--colors-ink)' }}>Razorpay Invoice History</h4>
                      {payments.length === 0 ? (
                        <p className="caption" style={{ color: 'var(--colors-muted)', margin: 0, padding: '16px', border: '1px dashed var(--colors-hairline)', borderRadius: '6px', textAlign: 'center', backgroundColor: 'var(--colors-surface-soft)' }}>
                          No credit purchase payments recorded yet.
                        </p>
                      ) : (
                        <div style={{ overflowX: 'auto', border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-sm)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--colors-ink)' }}>Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--colors-ink)' }}>Description</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>Credits</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>Amount Paid</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--colors-ink)' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.map(pay => (
                                <tr key={pay.id} style={{ borderBottom: '1px solid var(--colors-hairline)' }}>
                                  <td style={{ padding: '10px 12px', color: 'var(--colors-muted)' }}>{formatDate(pay.timestamp)}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--colors-ink)' }}>{pay.packageTitle}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--colors-ink)' }}>+{pay.credits}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>{formatPrice(pay.price)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ 
                                      fontSize: '10px', 
                                      fontWeight: 700, 
                                      backgroundColor: 'var(--colors-success-soft)', 
                                      color: 'var(--colors-success)', 
                                      padding: '2px 8px', 
                                      borderRadius: '4px',
                                      border: '1px solid var(--colors-success-soft)' 
                                    }}>
                                      {pay.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Credit usage log ledger */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--colors-ink)' }}>Credit Usage Logs</h4>
                      {usageLog.length === 0 ? (
                        <p className="caption" style={{ color: 'var(--colors-muted)', margin: 0, padding: '16px', border: '1px dashed var(--colors-hairline)', borderRadius: '6px', textAlign: 'center', backgroundColor: 'var(--colors-surface-soft)' }}>
                          No credit deductions logged. Unlocks will display here.
                        </p>
                      ) : (
                        <div style={{ overflowX: 'auto', border: '1px solid var(--colors-hairline)', borderRadius: 'var(--rounded-sm)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--colors-ink)' }}>Date</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--colors-ink)' }}>PG Property</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--colors-ink)' }}>Action Description</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--colors-ink)' }}>Deduction</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usageLog.map(log => {
                                const pg = pgs.find(p => p.id === log.pgId);
                                return (
                                  <tr key={log.id} style={{ borderBottom: '1px solid var(--colors-hairline)' }}>
                                    <td style={{ padding: '10px 12px', color: 'var(--colors-muted)' }}>{formatDate(log.timestamp)}</td>
                                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--colors-ink)' }}>{pg ? pg.name : 'Unknown Listing'}</td>
                                    <td style={{ padding: '10px 12px', color: 'var(--colors-muted)' }}>{log.description}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>-{log.creditsSpent} Credit</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
