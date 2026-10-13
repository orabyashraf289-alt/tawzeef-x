import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useGSAP(() => {
    if (reduced) return;
    // Opacity only: transforms change the containing block of fixed dialogs.
    gsap.from(scope.current, { opacity: 0, duration: 0.32, ease: "power2.out", clearProps: "opacity" });
  }, { scope, dependencies: [reduced], revertOnUpdate: true });

  return <div ref={scope} className={className}>{children}</div>;
}
