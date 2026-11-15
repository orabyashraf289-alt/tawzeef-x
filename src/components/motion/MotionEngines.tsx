import {
  Component,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { LottieSvgProps } from "lottie-react";
import type { RiveProps } from "@rive-app/react-canvas";
import type { SplineProps } from "@splinetool/react-spline";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Unified Tawzeef-X MD3 Emerald-Teal + Gold visual tokens for motion engines
 * so all vector, Lottie, Rive, Three.js, and Spline compositions stay within brand identity.
 */
export const MOTION_BRAND_PALETTE = {
  primaryHsl: "hsl(var(--md-primary))",
  primaryContainerHsl: "hsl(var(--md-primary-container))",
  secondaryHsl: "hsl(var(--md-secondary))",
  tertiaryHsl: "hsl(var(--md-tertiary))",
  surfaceHsl: "hsl(var(--md-surface-container-lowest))",
  emeraldHex: "#008c76",
  deepTealHex: "#096864",
  mintHex: "#65d4bd",
  goldAccentHex: "#d9ae72",
} as const;

export class MotionErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export function canSupport2DCanvas(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return false;
  try {
    return Boolean(document.createElement("canvas").getContext?.("2d"));
  } catch {
    return false;
  }
}

export function canSupportWebGL2(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return false;
  return Boolean(window.WebGL2RenderingContext);
}

/**
 * Progressive, code-split Lottie SVG adapter (`lottie-react`).
 * Loads zero runtime weight in headless tests or unsupported environments.
 */
export function ProgressiveLottie({
  src,
  loop = true,
  autoplay = true,
  className,
  fallback,
}: {
  src: object | string;
  loop?: boolean | number;
  autoplay?: boolean;
  className?: string;
  fallback: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [SvgPlayer, setSvgPlayer] = useState<ComponentType<LottieSvgProps> | null>(null);

  useEffect(() => {
    if (!canSupport2DCanvas()) return;
    let cancelled = false;
    import("lottie-react")
      .then((mod) => {
        if (!cancelled) setSvgPlayer(() => mod.LottieSvg);
      })
      .catch(() => {
        /* Fallback SVG remains visible cleanly. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!SvgPlayer) return <>{fallback}</>;
  return (
    <MotionErrorBoundary fallback={fallback}>
      <SvgPlayer
        src={src}
        loop={reduced ? false : loop}
        autoplay={reduced ? false : autoplay}
        className={className}
        aria-hidden="true"
      />
    </MotionErrorBoundary>
  );
}

/**
 * Progressive, code-split Rive Interactive Canvas adapter (`@rive-app/react-canvas`).
 * Accepts local/brand `.riv` artboards and state machines on demand.
 */
export function ProgressiveRive({
  src,
  artboard,
  stateMachines,
  className,
  fallback,
}: {
  src?: string;
  artboard?: string;
  stateMachines?: string | string[];
  className?: string;
  fallback: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [RiveComponent, setRiveComponent] = useState<ComponentType<RiveProps> | null>(null);

  useEffect(() => {
    if (!src || reduced || !canSupport2DCanvas()) return;
    let cancelled = false;
    import("@rive-app/react-canvas")
      .then((mod) => {
        if (!cancelled) setRiveComponent(() => mod.default);
      })
      .catch(() => {
        /* Graceful degradation when WASM/Rive asset is unavailable. */
      });
    return () => {
      cancelled = true;
    };
  }, [src, reduced]);

  if (!src || reduced || !RiveComponent) return <>{fallback}</>;
  return (
    <MotionErrorBoundary fallback={fallback}>
      <RiveComponent
        src={src}
        artboard={artboard}
        stateMachines={stateMachines}
        className={className}
        aria-hidden="true"
      />
    </MotionErrorBoundary>
  );
}

/**
 * Progressive, code-split Spline 3D WebGL adapter (`@splinetool/react-spline`).
 * Defaults `htmlContentMode="none"` and respects reduced-motion / WebGL2 availability.
 */
export function ProgressiveSpline({
  scene,
  className,
  fallback,
}: {
  scene?: string;
  className?: string;
  fallback: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [SplineComponent, setSplineComponent] = useState<ComponentType<SplineProps> | null>(null);

  useEffect(() => {
    if (!scene || reduced || !canSupportWebGL2()) return;
    let cancelled = false;
    import("@splinetool/react-spline")
      .then((mod) => {
        if (!cancelled) setSplineComponent(() => mod.default);
      })
      .catch(() => {
        /* Graceful fallback back to light Three.js / SVG composition. */
      });
    return () => {
      cancelled = true;
    };
  }, [scene, reduced]);

  if (!scene || reduced || !SplineComponent) return <>{fallback}</>;
  return (
    <MotionErrorBoundary fallback={fallback}>
      <SplineComponent
        scene={scene}
        htmlContentMode="none"
        renderOnDemand
        className={className}
      />
    </MotionErrorBoundary>
  );
}
