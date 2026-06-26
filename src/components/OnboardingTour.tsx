import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  placement: "top" | "bottom" | "left" | "right";
  navigateTo?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="sidebar"]',
    titleKey: "tour.step1.title",
    descriptionKey: "tour.step1.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-jobs"]',
    titleKey: "tour.step2.title",
    descriptionKey: "tour.step2.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-candidates"]',
    titleKey: "tour.step3.title",
    descriptionKey: "tour.step3.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-pipeline"]',
    titleKey: "tour.step4.title",
    descriptionKey: "tour.step4.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-interviews"]',
    titleKey: "tour.step5.title",
    descriptionKey: "tour.step5.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-offers"]',
    titleKey: "tour.step6.title",
    descriptionKey: "tour.step6.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-ai-assistant"]',
    titleKey: "tour.step7.title",
    descriptionKey: "tour.step7.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-reports"]',
    titleKey: "tour.step8.title",
    descriptionKey: "tour.step8.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="nav-settings"]',
    titleKey: "tour.step9.title",
    descriptionKey: "tour.step9.desc",
    placement: "right",
  },
  {
    targetSelector: '[data-tour="quick-actions"]',
    titleKey: "tour.step10.title",
    descriptionKey: "tour.step10.desc",
    placement: "top",
  },
  {
    targetSelector: '[data-tour="add-job-btn"]',
    titleKey: "tour.step11.title",
    descriptionKey: "tour.step11.desc",
    placement: "bottom",
    navigateTo: "/jobs",
  },
  {
    targetSelector: '[data-tour="smart-screening-btn"]',
    titleKey: "tour.step12.title",
    descriptionKey: "tour.step12.desc",
    placement: "bottom",
    navigateTo: "/candidates",
  },
  {
    targetSelector: '[data-tour="share-job-btn"]',
    titleKey: "tour.step13.title",
    descriptionKey: "tour.step13.desc",
    placement: "bottom",
    navigateTo: "/jobs",
  },
  {
    targetSelector: '[data-tour="main-content"]',
    titleKey: "tour.step14.title",
    descriptionKey: "tour.step14.desc",
    placement: "top",
  },
];

const STORAGE_KEY = "tawzeef-x-tour-completed";

export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => setShowTour(true), []);
  const endTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  return { showTour, startTour, endTour };
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTooltipPosition(rect: SpotlightRect, placement: string, dir: string) {
  const padding = 16;
  const tooltipWidth = 320;
  const margin = 12;
  const effectivePlacement = dir === "rtl" && placement === "right" ? "left" : dir === "rtl" && placement === "left" ? "right" : placement;

  let top: number, left: number;

  switch (effectivePlacement) {
    case "right":
      top = rect.top + rect.height / 2;
      left = rect.left + rect.width + padding;
      // Clamp to viewport
      if (left + tooltipWidth > window.innerWidth - margin) {
        left = window.innerWidth - tooltipWidth - margin;
      }
      return { top, left, transform: "translateY(-50%)" };
    case "left":
      top = rect.top + rect.height / 2;
      left = rect.left - padding - tooltipWidth;
      if (left < margin) {
        left = margin;
      }
      return { top, left, transform: "translateY(-50%)" };
    case "bottom":
      top = rect.top + rect.height + padding;
      left = Math.max(margin, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - margin));
      return { top, left, transform: "none" };
    case "top":
    default:
      top = rect.top - padding;
      left = Math.max(margin, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - margin));
      return { top, left, transform: "translateY(-100%)" };
  }
}

export default function OnboardingTour({
  active,
  onEnd,
}: {
  active: boolean;
  onEnd: () => void;
}) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const { t, dir } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentStep = TOUR_STEPS[step];

  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!active) return;
    setStep(0);
  }, [active]);

  // Navigate to the correct page if needed
  useEffect(() => {
    if (!active || !currentStep?.navigateTo) return;
    if (location.pathname !== currentStep.navigateTo) {
      navigate(currentStep.navigateTo);
    }
  }, [active, step, currentStep, navigate, location.pathname]);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    const retryTimer = setTimeout(measureTarget, 300);
    const retryTimer2 = setTimeout(measureTarget, 800);
    const retryTimer3 = setTimeout(measureTarget, 1500);
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      clearTimeout(retryTimer);
      clearTimeout(retryTimer2);
      clearTimeout(retryTimer3);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [active, step, measureTarget]);

  const goToStep = (newStep: number) => {
    const targetStep = TOUR_STEPS[newStep];
    if (targetStep?.navigateTo && location.pathname !== targetStep.navigateTo) {
      navigate(targetStep.navigateTo);
    } else if (!targetStep?.navigateTo && location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
    setStep(newStep);
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) goToStep(step + 1);
    else onEnd();
  };
  const prev = () => {
    if (step > 0) goToStep(step - 1);
  };

  if (!active || !targetRect) return null;

  const tooltipPos = getTooltipPosition(targetRect, currentStep.placement, dir);
  const spotlightPadding = 6;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[9999]" onClick={onEnd}>
        {/* SVG overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-spotlight-mask)"
            style={{ pointerEvents: "auto" }}
          />
        </svg>

        {/* Spotlight border glow */}
        <motion.div
          key={`spotlight-${step}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute rounded-xl border-2 border-primary/60 shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.3)]"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            pointerEvents: "none",
          }}
        />

        {/* Tooltip */}
        <motion.div
          key={`tooltip-${step}`}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute z-[10000] w-[320px] max-w-[90vw]"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: tooltipPos.transform,
            pointerEvents: "auto",
          }}
          onClick={e => e.stopPropagation()}
          dir={dir}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 relative">
            {/* Close button */}
            <button
              onClick={onEnd}
              className={cn(
                "absolute top-3 text-muted-foreground hover:text-foreground transition-colors",
                dir === "rtl" ? "left-3" : "right-3"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary">
                {step + 1} / {TOUR_STEPS.length}
              </span>
            </div>

            {/* Content */}
            <h3 className="text-base font-bold text-foreground mb-1.5 leading-tight">
              {t(currentStep.titleKey)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {t(currentStep.descriptionKey)}
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-1 mb-4">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-2 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                disabled={step === 0}
                className="text-xs gap-1"
              >
                {dir === "rtl" ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                {t("tour.prev")}
              </Button>

              <Button
                size="sm"
                onClick={next}
                className="text-xs gap-1 px-4"
              >
                {step === TOUR_STEPS.length - 1 ? t("tour.finish") : t("tour.next")}
                {step < TOUR_STEPS.length - 1 && (
                  dir === "rtl" ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
    </div>
  );
}

/** Small button to re-trigger the tour from settings or sidebar */
export function TourTriggerButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:bg-primary/8 hover:text-primary w-full transition-colors text-[13px] font-medium"
    >
      <RotateCcw className="w-[18px] h-[18px]" />
      <span>{t("tour.restartTour")}</span>
    </button>
  );
}
