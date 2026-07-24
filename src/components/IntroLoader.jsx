import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export default function IntroLoader({ onComplete }) {
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const spinnerRef = useRef(null);

  useEffect(() => {
    // Wait for the DOM and layout to settle before calculating coordinates
    const timer = setTimeout(() => {
      const headerLogoImg = document.getElementById('header-logo-img');
      if (!headerLogoImg || !logoRef.current) {
        // Fallback: simple fade out if the header logo is missing
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete
        });
        return;
      }

      // 1. Hide the real header logo initially so the morph is visible
      gsap.set(headerLogoImg, { opacity: 0 });

      // 2. Measure "First" state (centered loader logo)
      const firstRect = logoRef.current.getBoundingClientRect();

      // 3. Measure "Last" state (header logo target position)
      const lastRect = headerLogoImg.getBoundingClientRect();

      // 4. Fade out the spinner elements
      gsap.to(spinnerRef.current, {
        opacity: 0,
        scale: 0.7,
        duration: 0.35,
        ease: 'power2.out'
      });

      // 5. Calculate position and scale deltas
      const deltaX = (lastRect.left + lastRect.width / 2) - (firstRect.left + firstRect.width / 2);
      const deltaY = (lastRect.top + lastRect.height / 2) - (firstRect.top + firstRect.height / 2);
      
      const scaleX = lastRect.width / firstRect.width;
      const scaleY = lastRect.height / firstRect.height;
      const avgScale = (scaleX + scaleY) / 2;

      // 6. Animate logo morph
      gsap.to(logoRef.current, {
        x: deltaX,
        y: deltaY,
        scale: avgScale,
        duration: 0.75,
        ease: 'power3.inOut',
        onComplete: () => {
          // Instantly reveal the real header logo
          gsap.set(headerLogoImg, { opacity: 1 });
          
          // Fade out the overlay background
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
            onComplete: () => {
              onComplete();
            }
          });
        }
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="initial-loader-wrapper"
      style={{
        zIndex: 999999, // Ensure it sits on top of everything
        backgroundColor: '#ffffff',
        pointerEvents: 'none' // Prevent interactions during transition
      }}
    >
      <div
        ref={logoRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          willChange: 'transform'
        }}
      >
        <img
          src="/logo-cropped.png"
          alt="PGhive Logo"
          style={{ height: '64px', display: 'block' }}
        />
      </div>
      <div
        ref={spinnerRef}
        className="initial-loader-spinner-container"
      >
        <div className="initial-loader-circle"></div>
        <div className="initial-loader-pulse"></div>
      </div>
    </div>
  );
}
