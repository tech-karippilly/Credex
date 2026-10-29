import { useEffect, useRef, useState } from "react";

/**
 * Observes an element for a scroll entrance. Visibility never depends on it:
 * `playEntrance` is set only when a below-the-fold element scrolls in.
 * `animateCount` starts immediately for those off-screen elements.
 * Above-the-fold content, reduced motion, and a missing IntersectionObserver
 * leave both false so the element stays put, readable, and on its real value.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string } = {},
) {
  const { threshold = 0, rootMargin = "0px 0px 64px 0px" } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [playEntrance, setPlayEntrance] = useState(false);
  const [animateCount, setAnimateCount] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      setInView(true);
      return;
    }

    // Start numeric animation while the block is still off-screen so a visible
    // card never sits at zero waiting for the observer.
    setAnimateCount(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setInView(true);
        setPlayEntrance(true);
        observer.disconnect();
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView, playEntrance, animateCount };
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
