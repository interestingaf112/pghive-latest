import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowUpRight } from 'lucide-react';
import './CardNav.css';

const CardNav = ({
  logoElement,
  onLogoClick,
  items = [],
  desktopItems = [],
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  buttonBgColor,
  buttonTextColor,
  buttonLabel = 'Get Started',
  buttonIcon,
  onButtonClick
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const contentEl = navEl.querySelector('.card-nav-content');
    if (contentEl) {
      const wasVisible = contentEl.style.visibility;
      const wasPointerEvents = contentEl.style.pointerEvents;
      const wasPosition = contentEl.style.position;
      const wasHeight = contentEl.style.height;

      contentEl.style.visibility = 'visible';
      contentEl.style.pointerEvents = 'auto';
      contentEl.style.position = 'static';
      contentEl.style.height = 'auto';

      // Trigger reflow
      void contentEl.offsetHeight;

      const topBar = 60;
      const padding = 16;
      const contentHeight = contentEl.scrollHeight;

      contentEl.style.visibility = wasVisible;
      contentEl.style.pointerEvents = wasPointerEvents;
      contentEl.style.position = wasPosition;
      contentEl.style.height = wasHeight;

      return topBar + contentHeight + padding;
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    });

    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.invalidate(); // Re-evaluate dynamic properties like calculateHeight
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const closeMenu = () => {
    const tl = tlRef.current;
    if (!tl || !isExpanded) return;
    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
  };

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor }}>
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
              }
            }}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            aria-expanded={isExpanded}
            tabIndex={0}
            style={{ color: menuColor || '#0f172a' }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="card-nav-logo-container" onClick={onLogoClick}>
            {logoElement}
          </div>

          {/* Desktop inline nav items */}
          {desktopItems.length > 0 && (
            <div className="card-nav-desktop-items">
              {desktopItems.map((item, i) => (
                <button
                  key={`desk-${i}`}
                  className="card-nav-desktop-item"
                  onClick={item.onClick}
                  aria-label={item.label}
                >
                  {item.icon && <span aria-hidden="true">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="card-nav-cta-button"
            style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
            onClick={onButtonClick}
          >
            {buttonIcon && <span aria-hidden="true">{buttonIcon}</span>}
            {buttonLabel}
          </button>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <a
                    key={`${lnk.label}-${i}`}
                    className="nav-card-link"
                    href={lnk.href || '#'}
                    aria-label={lnk.ariaLabel}
                    onClick={(e) => {
                      e.preventDefault();
                      closeMenu();
                      if (lnk.onClick) lnk.onClick();
                    }}
                  >
                    <ArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
