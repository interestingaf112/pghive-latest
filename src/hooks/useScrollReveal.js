import { useEffect, useRef } from 'react';

/**
 * Custom hook that uses IntersectionObserver to add a 'visible' class
 * to elements with the 'scroll-reveal' class when they enter the viewport.
 * 
 * It queries and observes elements whenever the specified dependencies change,
 * avoiding expensive global DOM mutation observers that cause layout thrashing.
 */
export function useScrollReveal(containerRef = null, deps = []) {
  const observerRef = useRef(null);

  useEffect(() => {
    // Create the IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    const root = containerRef?.current || document;

    // Query and observe unrevealed elements
    const elements = root.querySelectorAll('.scroll-reveal:not(.visible)');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [containerRef, ...deps]); // Rerun only when dependencies change
}
