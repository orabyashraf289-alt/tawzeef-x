import { useMemo, useSyncExternalStore } from "react";
import type { MotionProps } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const pointerQuery = "(hover: hover) and (pointer: fine)";
function subscribePointer(update: () => void) {
  const media = window.matchMedia(pointerQuery);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const hasFinePointer = () => window.matchMedia(pointerQuery).matches;

/** Short, bounded entrances: long result sets never wait behind a long stagger. */
export function useCollectionMotion() {
  const reduced = useReducedMotion();
  const finePointer = useSyncExternalStore(subscribePointer, hasFinePointer, () => false);
  return useMemo(() => ({
    reduced,
    entry: (index = 0): MotionProps => ({
      initial: reduced ? false : { opacity: 0, y: 8 },
      animate: reduced ? "still" : "show",
      variants: {
        show: { opacity: 1, y: 0 },
        // Explicit keyframes replace an in-flight entrance even when its final values match.
        still: { opacity: [1], y: [0], transition: { duration: 0, delay: 0 } },
      },
      exit: reduced ? undefined : { opacity: 0, y: 0, transition: { duration: 0.12 } },
      transition: {
        duration: reduced ? 0 : 0.38,
        delay: reduced ? 0 : Math.min(Math.max(index, 0), 4) * 0.04,
        ease: [0.22, 1, 0.36, 1],
        layout: { duration: reduced ? 0 : 0.25, delay: 0 },
      },
    }),
    hover: !reduced && finePointer ? { y: -2, transition: { duration: 0.2, delay: 0 } } : undefined,
  }), [reduced, finePointer]);
}
