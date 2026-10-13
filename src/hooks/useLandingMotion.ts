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
    intro.from(select("[data-hero-reveal]"), { opacity: 0, y: 24, stagger: 0.12, clearProps: "opacity,transform" })
      .from(select("[data-hero-visual]"), { opacity: 0, y: 28, scale: 0.97, clearProps: "opacity,transform" }, 0.28)
      .from(select("[data-hero-detail]"), { opacity: 0, x: -18, clearProps: "opacity,transform" }, 0.55)
      .from(select("[data-hero-stages] > *"), { opacity: 0, y: 14, stagger: 0.12, clearProps: "opacity,transform" }, 0.8)
      .from(select("[data-hero-score]"), { scaleX: 0, transformOrigin: "right center", duration: 1.3 }, 0.85);

    select("[data-scroll-reveal]").forEach((element: HTMLElement) => {
      gsap.from(element, {
        opacity: 0, y: 24, duration: 0.75, ease: "power3.out", clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 90%", once: true },
      });
    });

    // Separate reveal wrappers keep pointer tilt independent of scroll transforms.
    select("[data-feature-reveal]").forEach((element: HTMLElement, index: number) => {
      gsap.from(element, {
        opacity: 0, y: 36, scale: 0.98, duration: 0.8, ease: "power3.out",
        delay: (index % (window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1)) * 0.09,
        clearProps: "opacity,transform",
        scrollTrigger: { trigger: element, start: "top 92%", once: true },
      });
    });
    gsap.fromTo(select("[data-page-progress]"), { scaleX: 0 }, {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom bottom", scrub: 0.2 },
    });

    const floats = gsap.to(select("[data-hero-float]"), {
      y: (index) => index % 2 ? 7 : -7, duration: 2.8,
      repeat: -1, yoyo: true, ease: "sine.inOut", paused: true,
    });
    let heroVisible = false;
    const syncPlayback = () => { floats.paused(!heroVisible || document.hidden); };
    const heroTrigger = ScrollTrigger.create({
      trigger: select("[data-hero]")[0], start: "top bottom", end: "bottom top",
      onToggle: (trigger) => { heroVisible = trigger.isActive; syncPlayback(); },
    });
    heroVisible = heroTrigger.isActive;
    syncPlayback();
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
      const cardCleanups = select("[data-card-tilt]").map((card: HTMLElement) => {
        const surface = card.parentElement!;
        const rotateX = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
        const rotateY = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
        const lift = gsap.quickTo(card, "y", { duration: 0.5, ease: "power3.out" });
        const move = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const rect = surface.getBoundingClientRect();
          const x = gsap.utils.clamp(0, 1, (event.clientX - rect.left) / rect.width);
          const y = gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height);
          rotateX((0.5 - y) * 6);
          rotateY((x - 0.5) * 6);
          lift(-4);
          card.style.setProperty("--spot-x", `${x * 100}%`);
          card.style.setProperty("--spot-y", `${y * 100}%`);
        };
        const reset = () => { rotateX(0); rotateY(0); lift(0); };
        surface.addEventListener("pointermove", move);
        surface.addEventListener("pointerleave", reset);
        window.addEventListener("blur", reset);
        return () => {
          surface.removeEventListener("pointermove", move);
          surface.removeEventListener("pointerleave", reset);
          window.removeEventListener("blur", reset);
          card.style.removeProperty("--spot-x");
          card.style.removeProperty("--spot-y");
        };
      });
      return () => [...cleanups, ...cardCleanups].forEach((cleanup: () => void) => cleanup());
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
