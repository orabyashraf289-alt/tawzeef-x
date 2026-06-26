import { useEffect, useState } from "react";

/**
 * Detect user's `prefers-reduced-motion` preference.
 * Use to conditionally disable framer-motion animations:
 *
 *   const reduce = useReducedMotion();
 *   <motion.div animate={reduce ? {} : { y: 0 }} />
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
