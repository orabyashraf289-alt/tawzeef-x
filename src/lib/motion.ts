/**
 * Tawzeef-X — Centralized Motion System
 * All animation variants, transitions, and utilities in one place.
 * Uses Framer Motion v11.18.2 (pinned for React 18 compatibility).
 */
import type { Variants, Transition } from "framer-motion";

/* ─── Easing Curves ─── */
export const ease = {
  smooth: [0.16, 1, 0.3, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  sharp: [0.4, 0, 0.2, 1] as const,
  gentle: [0.25, 0.46, 0.45, 0.94] as const,
};

/* ─── Standard Transitions ─── */
export const transitions = {
  fast: { duration: 0.2, ease: ease.smooth } as Transition,
  normal: { duration: 0.4, ease: ease.smooth } as Transition,
  slow: { duration: 0.6, ease: ease.smooth } as Transition,
  spring: { type: "spring", stiffness: 300, damping: 24 } as Transition,
  springBouncy: { type: "spring", stiffness: 400, damping: 17 } as Transition,
  springGentle: { type: "spring", stiffness: 200, damping: 20 } as Transition,
};

/* ─── Container / Stagger ─── */
export const stagger = (staggerDelay = 0.05): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: staggerDelay },
  },
});

/* ─── Item Variants ─── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.smooth } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.smooth } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: ease.smooth } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: ease.smooth } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: ease.smooth } },
};

/* ─── Page Transition ─── */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.smooth } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

/* ─── Card Hover (for whileHover) ─── */
export const cardHover = {
  y: -4,
  boxShadow: "0 12px 28px -8px hsl(222 20% 14% / 0.1)",
  transition: { duration: 0.25, ease: ease.smooth },
};

export const cardTap = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

/* ─── Stat Counter Animation (for number counting) ─── */
export const counterVariant: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 15 },
  },
};

/* ─── Sidebar Active Indicator ─── */
export const sidebarIndicator: Variants = {
  inactive: { width: 0, opacity: 0 },
  active: {
    width: 3,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

/* ─── Modal / Dialog ─── */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transitions.spring },
  exit: { opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15 } },
};

/* ─── Tooltip / Popover ─── */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: ease.smooth } },
};

/* ─── Skeleton Pulse ─── */
export const skeletonPulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
};

/* ─── List Item (for AnimatePresence lists) ─── */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -12, height: 0 },
  show: {
    opacity: 1, x: 0, height: "auto",
    transition: { duration: 0.3, ease: ease.smooth },
  },
  exit: {
    opacity: 0, x: 12, height: 0,
    transition: { duration: 0.2 },
  },
};

/* ─── Badge / Chip Pop ─── */
export const chipPop: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: {
    opacity: 1, scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 25 },
  },
};

/* ─── Shared Recharts Tooltip Style ─── */
export const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "var(--shadow-lg)",
  fontFamily: "'Cairo', sans-serif",
};
