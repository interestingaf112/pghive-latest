import { useEffect, useRef } from 'react';
import './SideNav.css';

const SideNav = ({
  logoText = 'pg.wala',
  onLogoClick,
  items,
  className = ''
}) => {
  const logoRef = useRef(null);
  const navRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.style.transform = 'translateX(-100%)';
    nav.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nav.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease';
        nav.style.transform = 'translateX(0)';
        nav.style.opacity = '1';
      });
    });
  }, []);

  return (
    <nav
      className={`side-nav ${className}`}
      ref={navRef}
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div
        className="side-nav-logo"
        onClick={onLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onLogoClick?.()}
        ref={logoRef}
        aria-label="pg.wala home"
      >
        <span className="side-nav-logo-text">{logoText}</span>
      </div>

      {/* Divider */}
      <div className="side-nav-divider" />

      {/* Nav Items */}
      <ul className="side-nav-list" role="menubar">
        {items.map((item, i) => (
          <li key={`nav-item-${i}`} role="none">
            {item.onClick ? (
              <button
                role="menuitem"
                onClick={item.onClick}
                className="side-nav-item"
                aria-label={item.ariaLabel || item.label}
              >
                {item.icon && <span className="side-nav-icon" aria-hidden="true">{item.icon}</span>}
                <span className="side-nav-label">{item.label}</span>
                <span className="side-nav-hover-bar" aria-hidden="true" />
              </button>
            ) : (
              <a
                role="menuitem"
                href={item.href || '#'}
                className="side-nav-item"
                aria-label={item.ariaLabel || item.label}
              >
                {item.icon && <span className="side-nav-icon" aria-hidden="true">{item.icon}</span>}
                <span className="side-nav-label">{item.label}</span>
                <span className="side-nav-hover-bar" aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SideNav;
