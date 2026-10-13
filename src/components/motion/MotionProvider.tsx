import { useLayoutEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
    return () => { delete document.documentElement.dataset.motion; };
  }, [reduced]);
  return <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>;
}
