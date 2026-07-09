import { useState, useEffect, useRef } from 'react';
import './VisionNav.css';

const VisionNav = ({
  logoText = 'pg.wala',
  onLogoClick,
  items = []
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Shrink slightly on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          aria-label="pg.wala — home"
          role="menuitem"
        >
          {logoText}
        </button>

        {/* Divider */}
        <div className="vision-nav-sep" aria-hidden="true" />

        {/* Nav Items */}
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
      </nav>
    </header>
  );
};

export default VisionNav;
