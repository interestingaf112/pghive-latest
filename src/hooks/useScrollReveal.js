import { useEffect, useRef } from 'react';

/**
 * Custom hook that uses IntersectionObserver to add a 'visible' class
 * to elements with the 'scroll-reveal' class when they enter the viewport.
 * 
 * Call this hook once in a parent component; it will observe all
 * .scroll-reveal elements inside the given ref (or the whole document).
 */
export function useScrollReveal(containerRef = null) {
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Once revealed, stop observing for performance
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const root = containerRef?.current || document;
    const elements = root.querySelectorAll('.scroll-reveal:not(.visible)');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  });
}
