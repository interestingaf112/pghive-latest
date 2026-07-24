import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import './VisionNav.css';

const VisionNav = ({
  logoText = 'PGhive',
  onLogoClick,
  items = []
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Shrink slightly on scroll
  useEffect(() => {
    let currentScrolled = false;
    const handleScroll = () => {
      const isOver = window.scrollY > 30;
      if (isOver !== currentScrolled) {
        currentScrolled = isOver;
        setScrolled(isOver);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scroll when mobile drawer is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className={`vision-nav-wrap ${mounted ? 'mounted' : ''}`} aria-label="Main navigation">
      <nav
        ref={navRef}
        className={`vision-nav ${scrolled ? 'scrolled' : ''}`}
        role="menubar"
      >
        {/* Logo */}
        <button
          className="vision-nav-logo"
          onClick={onLogoClick}
          aria-label="PGhive — home"
          role="menuitem"
        >
          {logoText}
        </button>

        {/* Divider */}
        <div className="vision-nav-sep" aria-hidden="true" />

        {/* Desktop Nav Items */}
        <div className="vision-nav-items">
          {items.map((item, i) => (
            <button
              key={`vn-${i}`}
              className="vision-nav-item"
              onClick={item.onClick}
              aria-label={item.label}
              role="menuitem"
            >
              {item.icon && (
                <span className="vision-nav-item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="vision-nav-item-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          className="mobile-menu-trigger"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      </nav>

      {/* Mobile Slide-Out Sidebar Drawer */}
      {isMobileMenuOpen && createPortal(
        <div className="mobile-sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-sidebar-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sidebar-header">
              <span className="mobile-sidebar-title">Menu</span>
              <button 
                className="mobile-sidebar-close" 
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mobile-sidebar-items">
              {items.map((item, i) => (
                <button
                  key={`mob-vn-${i}`}
                  className="mobile-sidebar-item"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    item.onClick();
                  }}
                  aria-label={item.label}
                >
                  {item.icon && (
                    <span className="mobile-sidebar-item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="mobile-sidebar-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default VisionNav;
