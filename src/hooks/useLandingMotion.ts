import type { RefObject } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Opt-in nodes only: Framer Motion retains ownership of the other widgets. */
export function useLandingMotion(scope: RefObject<HTMLElement>) {
  const reduced = useReducedMotion();

  useGSAP(() => {
    if (reduced || !scope.current) return;
    const select = gsap.utils.selector(scope);
    const intro = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });
    intro.from(select("[data-hero-reveal]"), { opacity: 0, y: 24, stagger: 0.09, clearProps: "opacity,transform" })
      .from(select("[data-hero-visual]"), { opacity: 0, y: 28, scale: 0.97, clearProps: "opacity,transform" }, 0.18)
      .from(select("[data-hero-score]"), { scaleX: 0, transformOrigin: "right center", duration: 1.3 }, 0.45);

    select("[data-scroll-reveal]").forEach((element: HTMLElement) => {
      gsap.from(element, {
        opacity: 0, y: 24, duration: 0.75, ease: "power3.out", clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 90%", once: true },
      });
    });

    const floats = gsap.to(select("[data-hero-float]"), {
      y: (index) => index % 2 ? 7 : -7, duration: 2.8,
      repeat: -1, yoyo: true, ease: "sine.inOut", paused: true,
    });
    let heroVisible = false;
    const syncPlayback = () => { floats.paused(!heroVisible || document.hidden); };
    ScrollTrigger.create({
      trigger: select("[data-hero]")[0], start: "top bottom", end: "bottom top",
      onToggle: (trigger) => { heroVisible = trigger.isActive; syncPlayback(); },
    });
    document.addEventListener("visibilitychange", syncPlayback);

    const media = gsap.matchMedia();
    media.add("(min-width: 1024px) and (hover: hover) and (pointer: fine)", () => {
      const cleanups = select("[data-magnetic]").map((button: HTMLElement) => {
        const xTo = gsap.quickTo(button, "x", { duration: 0.35, ease: "power3.out" });
        const yTo = gsap.quickTo(button, "y", { duration: 0.35, ease: "power3.out" });
        const move = (event: PointerEvent) => {
          const rect = button.getBoundingClientRect();
          xTo(gsap.utils.clamp(-5, 5, (event.clientX - rect.left - rect.width / 2) * 0.05));
          yTo(gsap.utils.clamp(-3, 3, (event.clientY - rect.top - rect.height / 2) * 0.08));
        };
        const reset = () => { xTo(0); yTo(0); };
        button.addEventListener("pointermove", move);
        button.addEventListener("pointerleave", reset);
        button.addEventListener("blur", reset);
        return () => {
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerleave", reset);
          button.removeEventListener("blur", reset);
        };
      });
      return () => cleanups.forEach((cleanup: () => void) => cleanup());
    });

    let active = true;
    document.fonts?.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    // Showcase tabs and asynchronously loaded pricing can change section positions.
    let refreshFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    resizeObserver.observe(scope.current);
    return () => {
      active = false;
      resizeObserver.disconnect();
      cancelAnimationFrame(refreshFrame);
      media.revert();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, { scope, dependencies: [reduced], revertOnUpdate: true });
}
