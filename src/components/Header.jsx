import React, { useState, useRef } from 'react';
import { UserCheck, Globe, LogOut, Compass, Sun, Moon } from 'lucide-react';

export default function Header({ 
  isAdminMode, 
  setIsAdminMode, 
  adminUser, 
  onLogout, 
  userCredits, 
  onOpenPurchaseModal,
  theme,
  toggleTheme
}) {
  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimer = useRef(null);

  const handleLogoClick = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      return;
    }

    const newClicks = logoClicks + 1;
    if (newClicks >= 5) {
      setIsAdminMode(true);
      setLogoClicks(0);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    } else {
      setLogoClicks(newClicks);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        setLogoClicks(0);
      }, 2000);
    }
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Logo (5-click secret trigger) */}
        <div 
          className="logo" 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} 
          onClick={handleLogoClick}
        >
          <span style={{ fontSize: '21px', fontWeight: 900, color: 'var(--colors-ink)', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.8px' }}>
            pg.wala
          </span>
          <span className="live-indicator-dot"></span>
        </div>


        
        <div className="nav-actions">
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!isAdminMode && (
            <button 
              onClick={onOpenPurchaseModal}
              className="btn btn-secondary btn-sm credit-badge-pulse"
              style={{ borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--colors-ink)', borderWidth: '1.5px', padding: '6px 10px', minHeight: '34px', fontWeight: 700, width: 'auto' }}
            >
              <span>💳</span>
              <span style={{ fontSize: '13px', color: 'var(--colors-accent-blue)' }}>
                {userCredits} <span className="desktop-only">Credits</span>
              </span>
            </button>
          )}
          {isAdminMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                <UserCheck size={14} style={{ color: 'var(--colors-accent-blue)' }} />
                <span>Hi, {adminUser?.username || 'Admin'}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAdminMode(false)}
                style={{ borderRadius: '4px', padding: '6px 14px', minHeight: '34px' }}
              >
                Catalog View
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={onLogout}
                title="Logout"
                style={{ borderRadius: '4px', padding: '6px 12px', minHeight: '34px', width: 'auto' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Globe size={18} className="desktop-only" style={{ color: 'var(--colors-ink)', cursor: 'pointer' }} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
