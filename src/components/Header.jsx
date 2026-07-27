import { useState } from 'react';
import { Coins, User, LogOut, Info, Menu, X, LayoutGrid, HelpCircle, MapPin, Compass } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import Logo from './Logo';
import './Header.css';

export default function Header({ 
  isAdminMode, 
  setIsAdminMode, 
  onLogout, 
  userCredits, 
  onOpenPurchaseModal,
  theme,
  currentUser,
  onOpenAuthModal,
  onOpenAccountCentre,
  onAuthSuccess
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogoClick = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
      setMobileMenuOpen(false);
    } catch (err) {
      console.error("Google sign in from header failed:", err);
      if (onOpenAuthModal) {
        onOpenAuthModal();
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Left Side: Logo */}
        <div className="header-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          {isAdminMode ? (
            <span className="admin-badge">ADMIN</span>
          ) : (
            <Logo fontSize="22px" />
          )}
        </div>

        {/* Right Side: Desktop Nav */}
        <nav className="desktop-nav">
          {isAdminMode ? (
            <div className="user-nav-actions">
              <button onClick={() => setIsAdminMode(false)} className="nav-btn-account">
                <LayoutGrid size={14} />
                <span>Catalog View</span>
              </button>
              <button onClick={onLogout} className="nav-btn-logout" title="Log Out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <>
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="nav-link">
                <Compass size={14} />
                <span>How it works</span>
              </a>
              <a href="#hubs-section" onClick={(e) => scrollToSection(e, 'hubs-section')} className="nav-link">
                <MapPin size={14} />
                <span>Locations</span>
              </a>
              <a href="#faq-section" onClick={(e) => scrollToSection(e, 'faq-section')} className="nav-link">
                <HelpCircle size={14} />
                <span>FAQ</span>
              </a>
              <a href="#about" onClick={(e) => scrollToSection(e, 'about-section')} className="nav-link">
                <Info size={14} />
                <span>About Us</span>
              </a>
              <button onClick={onOpenPurchaseModal} className="nav-credits-btn">
                <Coins size={14} style={{ color: '#eab308' }} />
                <span>{userCredits} credits</span>
              </button>

              {currentUser ? (
                <div className="user-nav-actions">
                  <button onClick={onOpenAccountCentre} className="nav-btn-account">
                    <User size={14} />
                    <span>Account</span>
                  </button>
                  <button onClick={onLogout} className="nav-btn-logout" title="Log Out">
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <div className="auth-nav-actions">
                  <button onClick={handleGoogleLogin} className="google-signin-btn" disabled={isSigningIn}>
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.37 3.65 1.43 7.5l3.89 3.01C6.27 7.55 8.92 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.44-1.09 2.66-2.31 3.48l3.6 2.79c2.1-1.94 3.76-4.78 3.76-8.37z" />
                      <path fill="#FBBC05" d="M5.32 14.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.43 6.9C.52 8.71 0 10.74 0 12.9s.52 4.19 1.43 6l3.89-3.01z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.6-2.79c-1 .67-2.28 1.07-3.73 1.07-3.08 0-5.73-2.51-6.66-5.47L1.05 15.9C2.99 19.75 6.97 22.4 12 23z" />
                    </svg>
                    <span>Sign In with Google</span>
                  </button>
                  <button onClick={onOpenAuthModal} className="email-signin-btn-link">
                    Email Sign In
                  </button>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Mobile Nav Toggle */}
        <button 
          className="mobile-nav-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav-dropdown">
          {isAdminMode ? (
            <div className="mobile-user-actions">
              <button 
                onClick={() => { setMobileMenuOpen(false); setIsAdminMode(false); }} 
                className="mobile-nav-action-btn"
              >
                <LayoutGrid size={16} />
                <span>Catalog View</span>
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onLogout(); }} 
                className="mobile-nav-action-btn logout"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <>
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="mobile-nav-link">
                <Compass size={16} />
                <span>How it works</span>
              </a>
              <a href="#hubs-section" onClick={(e) => scrollToSection(e, 'hubs-section')} className="mobile-nav-link">
                <MapPin size={16} />
                <span>Locations</span>
              </a>
              <a href="#faq-section" onClick={(e) => scrollToSection(e, 'faq-section')} className="mobile-nav-link">
                <HelpCircle size={16} />
                <span>FAQ</span>
              </a>
              <a href="#about" onClick={(e) => scrollToSection(e, 'about-section')} className="mobile-nav-link">
                <Info size={16} />
                <span>About Us</span>
              </a>
              <button 
                onClick={() => { setMobileMenuOpen(false); onOpenPurchaseModal(); }} 
                className="mobile-nav-link-btn"
              >
                <Coins size={16} style={{ color: '#eab308' }} />
                <span>{userCredits} Credits</span>
              </button>

              {currentUser ? (
                <div className="mobile-user-actions">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); onOpenAccountCentre(); }} 
                    className="mobile-nav-action-btn"
                  >
                    <User size={16} />
                    <span>Account Dashboard</span>
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); onLogout(); }} 
                    className="mobile-nav-action-btn logout"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="mobile-auth-actions">
                  <button onClick={handleGoogleLogin} className="google-signin-btn full-width" disabled={isSigningIn}>
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.37 3.65 1.43 7.5l3.89 3.01C6.27 7.55 8.92 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.44-1.09 2.66-2.31 3.48l3.6 2.79c2.1-1.94 3.76-4.78 3.76-8.37z" />
                      <path fill="#FBBC05" d="M5.32 14.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.43 6.9C.52 8.71 0 10.74 0 12.9s.52 4.19 1.43 6l3.89-3.01z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.6-2.79c-1 .67-2.28 1.07-3.73 1.07-3.08 0-5.73-2.51-6.66-5.47L1.05 15.9C2.99 19.75 6.97 22.4 12 23z" />
                    </svg>
                    <span>Sign In with Google</span>
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); onOpenAuthModal(); }} 
                    className="email-signin-btn-link"
                    style={{ marginTop: '8px', alignSelf: 'center' }}
                  >
                    Sign In with Email
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
