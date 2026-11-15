import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Calendar,
  CheckCircle2,
  FileText,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
} from "lucide-react";
import { gsap, useGSAP, DrawSVGPlugin, MorphSVGPlugin } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import TalentOrbit from "@/components/three/TalentOrbit";
import AnimatedCount from "@/components/motion/AnimatedCount";
import {
  MOTION_BRAND_PALETTE,
  ProgressiveLottie,
  ProgressiveRive,
  ProgressiveSpline,
} from "@/components/motion/MotionEngines";
import { aiRadarLottie, verifiedCheckLottie } from "@/data/heroMotionLottie";

interface SceneMeta {
  id: string;
  step: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  morphPath: string;
}

export interface HeroMotionStageProps {
  /** Optional local/brand Rive artboard URL (.riv) when connecting interactive state-machine graphics. */
  riveSrc?: string;
  riveStateMachine?: string;
  /** Optional Spline 3D scene URL (.splinecode) to layer over or replace the Three.js backdrop. */
  splineScene?: string;
}

const STORYBOARD_SCENES: SceneMeta[] = [
  {
    id: "ingest",
    step: "01",
    shortTitle: "الاستقطاب",
    title: "تحليل السير الذاتية آلياً",
    subtitle: "استخلاص فوري للمهارات والخبرات بالذكاء الاصطناعي",
    morphPath: "M24 6 H44 L54 16 V54 H24 Z",
  },
  {
    id: "match",
    step: "02",
    shortTitle: "الفرز الذكي",
    title: "مؤشر التطابق والترتيب 96%",
    subtitle: "مطابقة دقيقة بين متطلبات الشاغر وجدارات المرشح",
    morphPath: "M39 5 L58 20 L51 49 L27 49 L20 20 Z",
  },
  {
    id: "interview",
    step: "03",
    shortTitle: "المقابلة 360°",
    title: "غرفة المقابلة والتقييم الجماعي",
    subtitle: "تحليل صوتي وبطاقات تقييم موحدة للجنة التوظيف",
    morphPath: "M16 14 H56 A6 6 0 0 1 62 20 V44 A6 6 0 0 1 56 50 H16 A6 6 0 0 1 10 44 V20 A6 6 0 0 1 16 14 Z",
  },
  {
    id: "offer",
    step: "04",
    shortTitle: "العقد الرقمي",
    title: "إصدار وتوقيع عرض العمل",
    subtitle: "اعتماد إلكتروني موثق وإغلاق الشاغر بنجاح",
    morphPath: "M39 6 L59 14 V30 C59 44 49 52 39 56 C29 52 19 44 19 30 V14 Z",
  },
];

const SCENE_DURATION_MS = 4400;

export default function HeroMotionStage({
  riveSrc,
  riveStateMachine,
  splineScene,
}: HeroMotionStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const morphShapeRef = useRef<SVGPathElement>(null);
  const circuitTraceARef = useRef<SVGPathElement>(null);
  const circuitTraceBRef = useRef<SVGPathElement>(null);
  const packetARef = useRef<SVGCircleElement>(null);
  const packetBRef = useRef<SVGCircleElement>(null);
  const matchRingRef = useRef<SVGCircleElement>(null);
  const signatureRef = useRef<SVGPathElement>(null);

  const reduced = useReducedMotion();
  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const effectivePlaying = isPlaying && !reduced;

  useEffect(() => {
    if (!effectivePlaying || isHovered) return;
    const timer = window.setInterval(() => {
      setActiveScene((prev) => (prev + 1) % STORYBOARD_SCENES.length);
    }, SCENE_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [effectivePlaying, isHovered]);

  // Ambient GSAP Studio Vector Circuits + MotionPath Telemetry Packets
  useGSAP(
    () => {
      const stage = stageRef.current;
      const canMeasureSvg =
        typeof SVGPathElement !== "undefined" &&
        typeof SVGPathElement.prototype.getTotalLength === "function";

      if (reduced || !stage || !canMeasureSvg) return;

      if (circuitTraceARef.current && circuitTraceBRef.current) {
        gsap.fromTo(
          [circuitTraceARef.current, circuitTraceBRef.current],
          { drawSVG: "0% 18%" },
          {
            drawSVG: "82% 100%",
            duration: 2.6,
            ease: "studioWhip",
            repeat: -1,
            yoyo: true,
            stagger: 0.6,
          },
        );
      }

      if (packetARef.current && circuitTraceARef.current) {
        gsap.to(packetARef.current, {
          duration: 3.4,
          repeat: -1,
          ease: "none",
          motionPath: {
            path: circuitTraceARef.current,
            align: circuitTraceARef.current,
            alignOrigin: [0.5, 0.5],
          },
        });
      }

      if (packetBRef.current && circuitTraceBRef.current) {
        gsap.to(packetBRef.current, {
          duration: 4.1,
          repeat: -1,
          ease: "none",
          motionPath: {
            path: circuitTraceBRef.current,
            align: circuitTraceBRef.current,
            alignOrigin: [0.5, 0.5],
          },
        });
      }

      const finePointer = window.matchMedia?.("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
      if (finePointer?.matches) {
        const rotX = gsap.quickTo(stage, "rotationX", { duration: 0.6, ease: "studioEase" });
        const rotY = gsap.quickTo(stage, "rotationY", { duration: 0.6, ease: "studioEase" });
        const onMove = (event: PointerEvent) => {
          const rect = stage.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          rotX(-py * 5);
          rotY(px * 6);
        };
        const onLeave = () => {
          rotX(0);
          rotY(0);
        };
        stage.addEventListener("pointermove", onMove);
        stage.addEventListener("pointerleave", onLeave);
        return () => {
          stage.removeEventListener("pointermove", onMove);
          stage.removeEventListener("pointerleave", onLeave);
        };
      }
    },
    { scope: stageRef, dependencies: [reduced], revertOnUpdate: true },
  );

  // Scene-Synchronized MorphSVG + DrawSVG Transitions
  useGSAP(
    () => {
      const canMeasureSvg =
        typeof SVGPathElement !== "undefined" &&
        typeof SVGPathElement.prototype.getTotalLength === "function";

      if (!canMeasureSvg) return;

      const scene = STORYBOARD_SCENES[activeScene];

      if (morphShapeRef.current && typeof MorphSVGPlugin !== "undefined") {
        if (reduced) {
          morphShapeRef.current.setAttribute("d", scene.morphPath);
        } else {
          gsap.to(morphShapeRef.current, {
            duration: 0.75,
            ease: "studioEase",
            morphSVG: scene.morphPath,
          });
        }
      }

      if (activeScene === 1 && matchRingRef.current && typeof DrawSVGPlugin !== "undefined") {
        if (reduced) {
          gsap.set(matchRingRef.current, { drawSVG: "0% 96%" });
        } else {
          gsap.fromTo(
            matchRingRef.current,
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 96%", duration: 1.25, ease: "studioEase" },
          );
        }
      }

      if (activeScene === 3 && signatureRef.current && typeof DrawSVGPlugin !== "undefined") {
        if (reduced) {
          gsap.set(signatureRef.current, { drawSVG: "0% 100%" });
        } else {
          gsap.fromTo(
            signatureRef.current,
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 100%", duration: 1.3, delay: 0.15, ease: "studioEase" },
          );
        }
      }
    },
    { scope: stageRef, dependencies: [activeScene, reduced] },
  );

  const currentScene = STORYBOARD_SCENES[activeScene];

  return (
    <div
      ref={stageRef}
      style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative rounded-md3-2xl bg-md-surface-container-low text-md-on-surface border border-md-outline-variant shadow-md3-4 overflow-hidden"
      aria-label="عرض موشن جرافيك تفاعلي لمنصة توظيف إكس"
    >
      {/* Ambient Brand-Aligned MD3 Tonal Glows + Spline/Three.js 3D Backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-md-primary-container/50 blur-[90px]" />
        <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-md-secondary-container/45 blur-[95px]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,hsl(var(--md-outline-variant)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--md-outline-variant)/0.35)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-0 opacity-45 scale-105">
          <ProgressiveSpline
            scene={splineScene}
            className="w-full h-full"
            fallback={<TalentOrbit />}
          />
        </div>
      </div>

      {/* Continuous Vector Circuit & MotionPath Layer (GSAP DrawSVG + MotionPath + MorphSVG) */}
      <svg
        viewBox="0 0 600 320"
        className="pointer-events-none absolute inset-0 w-full h-full opacity-80"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="stageBeamPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={MOTION_BRAND_PALETTE.primaryHsl} stopOpacity="0" />
            <stop offset="50%" stopColor={MOTION_BRAND_PALETTE.primaryHsl} stopOpacity="0.85" />
            <stop offset="100%" stopColor={MOTION_BRAND_PALETTE.goldAccentHex} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="packetBrandGlow">
            <stop offset="0%" stopColor={MOTION_BRAND_PALETTE.primaryHsl} stopOpacity="1" />
            <stop offset="65%" stopColor={MOTION_BRAND_PALETTE.emeraldHex} stopOpacity="0.45" />
            <stop offset="100%" stopColor={MOTION_BRAND_PALETTE.emeraldHex} stopOpacity="0" />
          </radialGradient>
        </defs>

        <path
          d="M 28 70 C 180 25, 420 120, 572 64"
          fill="none"
          stroke="hsl(var(--md-outline-variant))"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeDasharray="4 6"
        />
        <path
          d="M 572 256 C 410 300, 190 210, 28 262"
          fill="none"
          stroke="hsl(var(--md-outline-variant))"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeDasharray="4 6"
        />

        <path
          ref={circuitTraceARef}
          d="M 28 70 C 180 25, 420 120, 572 64"
          fill="none"
          stroke="url(#stageBeamPrimary)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          ref={circuitTraceBRef}
          d="M 572 256 C 410 300, 190 210, 28 262"
          fill="none"
          stroke="url(#stageBeamPrimary)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        <circle ref={packetARef} cx="28" cy="70" r="6" fill="url(#packetBrandGlow)" />
        <circle ref={packetBRef} cx="572" cy="256" r="5" fill={MOTION_BRAND_PALETTE.goldAccentHex} opacity="0.85" />
      </svg>

      {/* Top Motion Studio Header */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-md-surface-container/90 backdrop-blur-md border-b border-md-outline-variant">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md3-md bg-md-primary-container border border-md-primary/30 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 78 64" className="w-5 h-5" aria-hidden="true">
              <path
                ref={morphShapeRef}
                d={STORYBOARD_SCENES[0].morphPath}
                fill="hsl(var(--md-primary) / 0.16)"
                stroke={MOTION_BRAND_PALETTE.primaryHsl}
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-md-on-surface truncate">استوديو توظيف إكس الحركي</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-md-primary-container border border-md-primary/25 text-[10px] font-bold text-md-on-primary-container">
                <span className="w-1.5 h-1.5 rounded-full bg-md-primary animate-pulse" />
                مباشر
              </span>
            </div>
            <div className="text-[10px] text-md-on-surface-variant font-mono truncate" dir="ltr">
              GSAP Pro • Lottie • Rive • Spline • Three.js
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPlaying((prev) => !prev)}
          aria-label={effectivePlaying ? "إيقاف العرض الحركي مؤقتاً" : "تشغيل العرض الحركي"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-md-surface hover:bg-md-primary-container border border-md-outline-variant text-[11px] font-bold text-md-on-surface hover:text-md-on-primary-container transition-colors cursor-pointer shrink-0"
        >
          {effectivePlaying ? <Pause className="w-3.5 h-3.5 text-md-primary" /> : <Play className="w-3.5 h-3.5 text-md-primary" />}
          <span>{effectivePlaying ? "إيقاف" : "تشغيل"}</span>
        </button>
      </div>

      {/* Main Synchronized 4-Scene Viewport */}
      <div className="relative z-10 p-4 sm:p-6 min-h-[300px] sm:min-h-[325px] flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-[11px] font-black text-md-primary mb-0.5">
              مشهد {currentScene.step} • {currentScene.title}
            </div>
            <p className="text-xs text-md-on-surface-variant font-medium">{currentScene.subtitle}</p>
          </div>
          <span className="text-[11px] font-mono text-md-on-surface-variant bg-md-surface px-2.5 py-1 rounded-md border border-md-outline-variant shrink-0" dir="ltr">
            {activeScene + 1} / {STORYBOARD_SCENES.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {activeScene === 0 && (
            <motion.div
              key="scene-ingest"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-12 gap-3.5 items-center my-auto bg-md-surface-container-lowest/95 backdrop-blur-md border border-md-outline-variant rounded-md3-xl p-4 shadow-md3-1"
            >
              {/* Left: Scanning CV Document with Brand Sweeping Laser Beam */}
              <div className="col-span-7 relative bg-md-surface-container-low border border-md-outline-variant rounded-md3-lg p-3.5 overflow-hidden">
                {!reduced && (
                  <motion.div
                    aria-hidden="true"
                    animate={{ y: ["-10%", "115%", "-10%"] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-md-primary/25 via-md-primary/5 to-transparent border-t-2 border-md-primary"
                  />
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-md-on-surface">CV_Senior_Architect.pdf</div>
                      <div className="text-[10px] text-md-primary font-mono font-bold">تحليل دلالي فوري</div>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-md-primary" />
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="h-1.5 w-4/5 rounded-full bg-md-outline-variant/60" />
                  <div className="h-1.5 w-3/5 rounded-full bg-md-outline-variant/45" />
                  <div className="h-1.5 w-2/3 rounded-full bg-md-outline-variant/55" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {["React • TypeScript", "قيادة هندسية", "حوكمة سحابية"].map((skill, idx) => (
                    <motion.span
                      key={skill}
                      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: reduced ? 0 : 0.14 + idx * 0.14, duration: 0.25 }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-md-primary-container text-md-on-primary-container border border-md-primary/20"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Right: Live Rive / Lottie AI Scanner Vector Composition */}
              <div className="col-span-5 flex flex-col items-center justify-center text-center bg-md-surface-container rounded-md3-lg p-3 border border-md-outline-variant">
                <div className="w-24 h-24 relative flex items-center justify-center">
                  <ProgressiveRive
                    src={riveSrc}
                    stateMachines={riveStateMachine}
                    className="w-24 h-24"
                    fallback={
                      <ProgressiveLottie
                        src={aiRadarLottie}
                        loop={!reduced}
                        autoplay={!reduced}
                        className="w-24 h-24"
                        fallback={<Bot className="w-10 h-10 text-md-primary" />}
                      />
                    }
                  />
                  {!riveSrc && <Bot className="w-5 h-5 text-md-on-primary-container absolute" aria-hidden="true" />}
                </div>
                <div className="text-[11px] font-black text-md-on-surface mt-1">محرك الفرز الآلي</div>
                <div className="text-[10px] text-md-primary font-mono font-bold">0.8s Parsing</div>
              </div>
            </motion.div>
          )}

          {activeScene === 1 && (
            <motion.div
              key="scene-match"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-12 gap-4 items-center my-auto bg-md-surface-container-lowest/95 backdrop-blur-md border border-md-outline-variant rounded-md3-xl p-4 shadow-md3-1"
            >
              {/* DrawSVG Circular Radial Score Gauge */}
              <div className="col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--md-outline-variant) / 0.55)"
                      strokeWidth="8"
                    />
                    <circle
                      ref={matchRingRef}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={MOTION_BRAND_PALETTE.primaryHsl}
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-md-primary font-mono">
                      <AnimatedCount value={96} suffix="%" />
                    </span>
                    <span className="text-[9px] text-md-on-surface-variant font-bold">نسبة التوافق</span>
                  </div>
                </div>
              </div>

              {/* Ranked Candidate Card & Brand Competency Bars */}
              <div className="col-span-7 space-y-3">
                <div className="flex items-center justify-between bg-md-surface-container-low border border-md-outline-variant rounded-md3-lg p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-md-primary-container border border-md-primary/30 text-md-on-primary-container font-black text-xs flex items-center justify-center">
                      س
                    </div>
                    <div>
                      <div className="text-xs font-black text-md-on-surface">سارة العتيبي</div>
                      <div className="text-[10px] text-md-on-surface-variant">مهندسة نظم أولى</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-md-on-primary-container bg-md-primary-container px-2 py-0.5 rounded-full">
                    الترتيب #1
                  </span>
                </div>

                <div className="space-y-2 bg-md-surface-container-low rounded-md3-lg p-3 border border-md-outline-variant">
                  {[
                    { label: "المهارات التقنية", pct: 98, color: "bg-md-primary" },
                    { label: "الخبرة القيادية", pct: 93, color: "bg-md-secondary" },
                    { label: "التطابق الثقافي", pct: 95, color: "bg-md-tertiary" },
                  ].map((metric, idx) => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-md-on-surface-variant">{metric.label}</span>
                        <span className="text-md-on-surface font-mono">{metric.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-md-surface-container-high overflow-hidden">
                        <motion.div
                          initial={reduced ? { width: `${metric.pct}%` } : { width: 0 }}
                          animate={{ width: `${metric.pct}%` }}
                          transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : idx * 0.12 }}
                          className={`h-full rounded-full ${metric.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeScene === 2 && (
            <motion.div
              key="scene-interview"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3 my-auto bg-md-surface-container-lowest/95 backdrop-blur-md border border-md-outline-variant rounded-md3-xl p-4 shadow-md3-1"
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: "لجنة التوظيف — مدير الهندسة", tag: "مباشر", accent: "border-md-primary/35", icon: UserCheck },
                  { role: "سارة العتيبي — المرشحة", tag: "متحدث نشط", accent: "border-md-tertiary/40", icon: Video },
                ].map((tile, idx) => (
                  <div
                    key={tile.role}
                    className={`bg-md-surface-container-low border ${tile.accent} rounded-md3-lg p-3 flex flex-col justify-between min-h-[96px]`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-md-on-primary-container bg-md-primary-container px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-md-primary animate-pulse" />
                        {tile.tag}
                      </span>
                      <tile.icon className="w-4 h-4 text-md-primary" />
                    </div>
                    <div className="flex items-end gap-1 h-6 my-2" aria-hidden="true">
                      {[14, 24, 18, 28, 12, 22, 16, 26].map((barH, barIdx) => (
                        <motion.span
                          key={barIdx}
                          animate={
                            reduced
                              ? { height: barH }
                              : { height: [barH * 0.45, barH, barH * 0.55] }
                          }
                          transition={{
                            duration: 0.75 + (barIdx % 3) * 0.2,
                            repeat: reduced ? 0 : Infinity,
                            delay: idx * 0.15 + barIdx * 0.06,
                          }}
                          className="w-1.5 rounded-full bg-gradient-to-t from-md-primary to-md-tertiary"
                        />
                      ))}
                    </div>
                    <div className="text-[10px] font-bold text-md-on-surface truncate">{tile.role}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 bg-md-surface-container-low rounded-md3-lg px-3.5 py-2.5 border border-md-outline-variant">
                <div className="flex items-center gap-2 text-[11px] font-bold text-md-on-surface">
                  <Calendar className="w-3.5 h-3.5 text-md-primary" />
                  <span>بطاقة التقييم الموحدة</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black">
                  <span className="px-2 py-0.5 rounded-full bg-md-tertiary-container text-md-on-tertiary-container border border-md-tertiary/25">
                    الكفاءة 4.9 / 5
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-md-primary-container text-md-on-primary-container border border-md-primary/25">
                    التوافق 5.0 / 5
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeScene === 3 && (
            <motion.div
              key="scene-offer"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-12 gap-4 items-center my-auto bg-md-surface-container-lowest/95 backdrop-blur-md border border-md-primary/35 rounded-md3-xl p-4 shadow-md3-1"
            >
              {/* Cursive Electronic Signature SVG via GSAP DrawSVGPlugin */}
              <div className="col-span-7 bg-md-surface-container-low border border-md-outline-variant rounded-md3-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-md-on-surface">عرض عمل رقمي موثق</span>
                  <span className="text-[10px] font-mono text-md-primary font-bold">#OFFER-2026</span>
                </div>
                <p className="text-[11px] text-md-on-surface-variant font-medium">
                  مهندسة نظم أولى — اعتماد الموارد البشرية والمرشحة إلكترونياً
                </p>

                <div className="bg-md-surface-container-lowest border border-dashed border-md-primary/40 rounded-md p-2">
                  <div className="text-[9px] text-md-on-surface-variant mb-1">التوقيع الإلكتروني المعتمد</div>
                  <svg viewBox="0 0 220 46" className="w-full h-10" aria-hidden="true">
                    <path
                      ref={signatureRef}
                      d="M 14 34 C 24 8, 38 8, 44 30 C 48 16, 62 12, 70 28 C 82 14, 96 34, 114 20 C 132 10, 148 32, 174 22 L 204 22"
                      fill="none"
                      stroke={MOTION_BRAND_PALETTE.primaryHsl}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Right: Lottie Verified Checkmark Burst */}
              <div className="col-span-5 flex flex-col items-center justify-center text-center bg-md-primary-container/50 rounded-md3-lg p-3 border border-md-primary/30">
                <div className="w-20 h-20 flex items-center justify-center">
                  <ProgressiveLottie
                    src={verifiedCheckLottie}
                    loop={!reduced}
                    autoplay={!reduced}
                    className="w-20 h-20"
                    fallback={<CheckCircle2 className="w-12 h-12 text-md-primary" />}
                  />
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-black text-md-on-primary-container mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-md-primary" />
                  <span>تم التوظيف بنجاح</span>
                </div>
                <div className="text-[10px] text-md-on-surface-variant mt-0.5">جاهز للمباشرة</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Interactive Storyboard Scrubber Bar */}
        <div className="mt-4 pt-3 border-t border-md-outline-variant grid grid-cols-4 gap-2">
          {STORYBOARD_SCENES.map((scene, idx) => {
            const isActive = idx === activeScene;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => setActiveScene(idx)}
                aria-pressed={isActive}
                className={`relative text-right rounded-md3-lg px-2.5 py-2 border transition-all cursor-pointer overflow-hidden ${
                  isActive
                    ? "bg-md-primary-container border-md-primary/40 text-md-on-primary-container shadow-sm"
                    : "bg-md-surface border-md-outline-variant text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container-high"
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-black">
                  <span className="font-mono text-md-primary">{scene.step}</span>
                </div>
                <div className="text-[11px] font-bold truncate mt-0.5">{scene.shortTitle}</div>

                {/* Live Active Chapter Progress Line */}
                <div className="mt-1.5 h-1 rounded-full bg-md-outline-variant/40 overflow-hidden">
                  {isActive ? (
                    effectivePlaying && !isHovered ? (
                      <motion.div
                        key={`progress-${activeScene}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: SCENE_DURATION_MS / 1000, ease: "linear" }}
                        style={{ transformOrigin: "right center" }}
                        className="h-full bg-md-primary"
                      />
                    ) : (
                      <div className="h-full w-full bg-md-primary" />
                    )
                  ) : (
                    <div className="h-full w-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
