import { useEffect, useLayoutEffect, useState } from "react";
import { prefersReducedMotion } from "./use-reveal";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Shows `target` until `active` is true, then eases from 0. First paint therefore
 * shows the real figure. Reduced motion, and any time the animation is not
 * running, keeps `target`.
 */
export function useCountUp(target: number, active: boolean, durationMs = 1400): number {
  const [value, setValue] = useState(target);

  useIsomorphicLayoutEffect(() => {
    if (!active || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    setValue(0);
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);

  return value;
}
