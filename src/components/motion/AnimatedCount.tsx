import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduced = useReducedMotion();
  const format = (n: number) => Number.isInteger(value) ? Math.round(n).toString() : n.toFixed(1);

  useGSAP(() => {
    const node = element.current;
    if (!node) return;
    node.textContent = `${format(value)}${suffix}`;
    if (reduced) { previous.current = value; return; }
    // Keep the actual value visible until the element enters the viewport.
    const counter = { value: previous.current === value ? 0 : previous.current };
    const tween = gsap.to(counter, {
      value, duration: 1.1, ease: "power3.out", paused: true,
      onUpdate: () => {
        previous.current = counter.value;
        node.textContent = `${format(counter.value)}${suffix}`;
      },
      onComplete: () => { previous.current = value; },
    });
    ScrollTrigger.create({ trigger: node, start: "top 95%", once: true, onEnter: () => tween.play() });
    return () => { node.textContent = `${format(value)}${suffix}`; };
  }, { scope: element, dependencies: [value, suffix, reduced], revertOnUpdate: true });

  return <span className="tabular-nums"><span ref={element} aria-hidden="true">{format(value)}{suffix}</span><span className="sr-only">{format(value)}{suffix}</span></span>;
}
