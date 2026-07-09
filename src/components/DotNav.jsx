import { useState, useRef, useEffect } from 'react';
import './DotNav.css';

const DotNav = ({
  logoText = 'pg.wala',
  onLogoClick,
  items = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Fan arc angles: spread from ~200° to ~340° (bottom-left semicircle)
  // We want items to arc to the left + down from top-right trigger
  const getArcStyle = (index, total) => {
    // Arc from 180deg (left) to 270deg (down), centered around 225deg
    const startAngle = 195;
    const endAngle = 315;
    const angle = total === 1
      ? 255
      : startAngle + (index / (total - 1)) * (endAngle - startAngle);
    const rad = (angle * Math.PI) / 180;
    const radius = 90; // px from trigger center
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    return {
      '--x': `${x}px`,
      '--y': `${y}px`,
      '--delay': `${index * 40}ms`
    };
  };

  return (
    <>
      {/* Logo — top left */}
      <div className="dot-nav-logo-wrap">
        <button
          className="dot-nav-logo"
          onClick={onLogoClick}
          aria-label="pg.wala home"
        >
          {logoText}
        </button>
      </div>

      {/* Dot trigger + fan menu — top right */}
      <div className="dot-nav-trigger-wrap" ref={menuRef}>
        {/* Fan items */}
        {items.map((item, i) => (
          <button
            key={`arc-${i}`}
            className={`dot-nav-arc-item ${isOpen ? 'open' : ''}`}
            style={getArcStyle(i, items.length)}
            onClick={() => {
              item.onClick?.();
              setIsOpen(false);
            }}
            aria-label={item.label}
          >
            <span className="dot-nav-arc-icon">{item.icon}</span>
            <span className="dot-nav-arc-label">{item.label}</span>
          </button>
        ))}

        {/* The 3-dot trigger button */}
        <button
          className={`dot-nav-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(v => !v)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          ref={triggerRef}
        >
          <span className="dot-nav-dot" />
          <span className="dot-nav-dot" />
          <span className="dot-nav-dot" />
        </button>
      </div>
    </>
  );
};

export default DotNav;
