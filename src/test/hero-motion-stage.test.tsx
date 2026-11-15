import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import HeroMotionStage from "@/components/motion/HeroMotionStage";
import MotionProvider from "@/components/motion/MotionProvider";
import {
  MOTION_BRAND_PALETTE,
  ProgressiveLottie,
  ProgressiveRive,
  ProgressiveSpline,
} from "@/components/motion/MotionEngines";
import { setAnimationsEnabled } from "@/lib/motionPreferences";
import {
  gsap,
  ScrollTrigger,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  CustomEase,
  ScrollToPlugin,
} from "@/lib/gsap";
import { aiRadarLottie, verifiedCheckLottie } from "@/data/heroMotionLottie";

describe("HeroMotionStage & motion-graphics stack", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnimationsEnabled(true);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("registers the complete GSAP studio plugin suite cleanly", () => {
    expect(gsap).toBeDefined();
    expect(ScrollTrigger).toBeDefined();
    expect(DrawSVGPlugin).toBeDefined();
    expect(MorphSVGPlugin).toBeDefined();
    expect(MotionPathPlugin).toBeDefined();
    expect(CustomEase).toBeDefined();
    expect(ScrollToPlugin).toBeDefined();
  });

  it("exposes progressive adapters for Lottie, Rive, and Spline aligned to brand MD3 tokens", () => {
    expect(ProgressiveLottie).toBeDefined();
    expect(ProgressiveRive).toBeDefined();
    expect(ProgressiveSpline).toBeDefined();
    expect(MOTION_BRAND_PALETTE.primaryHsl).toBe("hsl(var(--md-primary))");
    expect(MOTION_BRAND_PALETTE.emeraldHex).toBe("#008c76");
    expect(MOTION_BRAND_PALETTE.goldAccentHex).toBe("#d9ae72");
  });

  it("renders Rive and Spline adapters safely with fallback when no external scene is passed", () => {
    render(
      <MotionProvider>
        <ProgressiveSpline scene={undefined} fallback={<span>spline-fallback-ok</span>} />
        <ProgressiveRive src={undefined} fallback={<span>rive-fallback-ok</span>} />
      </MotionProvider>,
    );
    expect(screen.getByText("spline-fallback-ok")).toBeInTheDocument();
    expect(screen.getByText("rive-fallback-ok")).toBeInTheDocument();
  });

  it("exports valid Lottie vector compositions for the hero stage", () => {
    expect(aiRadarLottie.layers.length).toBeGreaterThanOrEqual(4);
    expect(verifiedCheckLottie.layers.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the interactive 4-scene stage inside MD3 brand tokens and switches chapters", async () => {
    const { container } = render(
      <MotionProvider>
        <HeroMotionStage />
      </MotionProvider>,
    );

    expect(container.innerHTML).not.toContain("bg-slate-950");
    expect(container.innerHTML).not.toContain("indigo-");
    expect(screen.getByText("استوديو توظيف إكس الحركي")).toBeInTheDocument();
    expect(screen.getByText(/تحليل السير الذاتية آلياً/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /02.*الفرز الذكي/ }));
    expect(screen.getByText(/مؤشر التطابق والترتيب 96%/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /03.*المقابلة 360°/ }));
    expect(screen.getByText(/غرفة المقابلة والتقييم الجماعي/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /04.*العقد الرقمي/ }));
    expect(screen.getByText(/إصدار وتوقيع عرض العمل/)).toBeInTheDocument();
    expect(await screen.findByText("تم التوظيف بنجاح", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("toggles playback cleanly and respects disabled motion preferences", () => {
    render(
      <MotionProvider>
        <HeroMotionStage />
      </MotionProvider>,
    );

    const toggleBtn = screen.getByRole("button", { name: "إيقاف العرض الحركي مؤقتاً" });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: "تشغيل العرض الحركي" })).toBeInTheDocument();

    act(() => setAnimationsEnabled(false));
    expect(screen.getByRole("button", { name: "تشغيل العرض الحركي" })).toBeInTheDocument();
  });
});
