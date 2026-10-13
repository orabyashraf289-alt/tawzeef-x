import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { TalentOrbitController } from "./talentOrbitScene";

type ResourceNavigator = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

/** The text and static illustration render immediately; Three.js is a progressive enhancement. */
export default function TalentOrbit() {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<"fallback" | "loading" | "ready">("fallback");
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    const element = host.current;
    const device = navigator as ResourceNavigator;
    setStatus("fallback");
    if (!element || reduced || device.connection?.saveData || (device.deviceMemory && device.deviceMemory <= 2) || !window.WebGL2RenderingContext) return;

    let cancelled = false;
    let inView = false;
    let loading = false;
    let controller: TalentOrbitController | undefined;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      controller?.dispose();
      controller = undefined;
      if (!cancelled) setStatus("fallback");
    };
    const load = async () => {
      if (cancelled || loading || !inView || document.hidden) return;
      loading = true;
      setStatus("loading");
      try {
        const { createTalentOrbit } = await import("./talentOrbitScene");
        if (cancelled) return;
        controller = createTalentOrbit(element, fail);
        controller.setVisible(inView && !document.hidden);
        setStatus("ready");
      } catch { fail(); }
    };
    const syncVisibility = () => {
      controller?.setVisible(inView && !document.hidden);
      if (!loading && inView && !document.hidden) {
        if ("requestIdleCallback" in window) {
          if (idleId !== undefined) window.cancelIdleCallback(idleId);
          idleId = window.requestIdleCallback(() => { void load(); }, { timeout: 1500 });
        } else {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => { void load(); }, 150);
        }
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncVisibility();
    }, { threshold: 0.05 });
    observer.observe(element);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      clearTimeout(timeoutId);
      controller?.dispose();
    };
  }, [reduced]);

  return (
    <div ref={host} className="talent-orbit" data-scene-status={status} aria-hidden="true">
      <svg viewBox="0 0 460 230" className="talent-orbit-fallback" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#34d399" /><stop offset="1" stopColor="#00695c" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <ellipse cx="230" cy="115" rx="151" ry="63" transform="rotate(-18 230 115)" opacity=".35" />
          <ellipse cx="230" cy="115" rx="123" ry="76" transform="rotate(24 230 115)" opacity=".5" />
          <path d="M105 80 230 115 354 151M165 170 230 115 288 58" opacity=".2" />
        </g>
        <g fill={`url(#${gradientId})`}>
          <circle cx="105" cy="80" r="8" /><circle cx="354" cy="151" r="10" />
          <circle cx="165" cy="170" r="5" /><circle cx="288" cy="58" r="6" />
          <rect x="219" y="76" width="22" height="78" rx="11" transform="rotate(40 230 115)" />
          <rect x="219" y="76" width="22" height="78" rx="11" transform="rotate(-40 230 115)" />
        </g>
        <circle cx="327" cy="77" r="4" fill="#d9ae72" />
      </svg>
    </div>
  );
}
