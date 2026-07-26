import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Briefcase, Users, Kanban, Calendar, FileText,
  BarChart3, Target, Star, Bot, Building2, UserPlus, Lock,
  Settings2, Video, HelpCircle, Layers, Eye, Plus, Edit3, Trash2,
  CheckCircle2, Sparkles, SlidersHorizontal, BookOpen, GitBranch, Award,
  CheckSquare, Code, UserCheck, ShieldAlert
} from "lucide-react";

export type AnimationType = "bounce" | "pulse" | "wiggle" | "float" | "glow" | "rotate";

interface AnimatedIconProps {
  icon: React.ElementType;
  className?: string;
  badgeBg?: string;
  animation?: AnimationType;
  colorClass?: string;
}

/**
 * Flaticon-Style Micro-Animated Icon Wrapper
 * Emulates Flaticon Animated Icons with smooth CSS & Framer Motion interactions
 */
export function FlaticonAnimatedIcon({
  icon: Icon,
  className = "w-5 h-5",
  animation = "bounce",
  colorClass = "text-primary",
}: AnimatedIconProps) {
  const getAnimationVariants = () => {
    switch (animation) {
      case "bounce":
        return {
          rest: { y: 0, scale: 1 },
          hover: { y: [-2, -6, 0], scale: 1.12, transition: { duration: 0.4, repeat: Infinity, repeatType: "reverse" as const } },
        };
      case "pulse":
        return {
          rest: { scale: 1 },
          hover: { scale: [1, 1.18, 1], transition: { duration: 0.5, repeat: Infinity } },
        };
      case "wiggle":
        return {
          rest: { rotate: 0 },
          hover: { rotate: [-10, 10, -10, 10, 0], transition: { duration: 0.5 } },
        };
      case "float":
        return {
          rest: { y: 0 },
          hover: { y: -4, transition: { duration: 0.3 } },
        };
      case "glow":
        return {
          rest: { filter: "drop-shadow(0 0 0px rgba(0,0,0,0))" },
          hover: { filter: "drop-shadow(0 0 8px currentColor)", scale: 1.1, transition: { duration: 0.3 } },
        };
      case "rotate":
        return {
          rest: { rotate: 0 },
          hover: { rotate: 180, transition: { duration: 0.6 } },
        };
      default:
        return {
          rest: { scale: 1 },
          hover: { scale: 1.1 },
        };
    }
  };

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={getAnimationVariants()}
      className={`inline-flex items-center justify-center cursor-pointer transition-colors ${colorClass}`}
    >
      <Icon className={className} />
    </motion.div>
  );
}

/**
 * Animated Category Container (Flaticon Style Animated Card Icon)
 */
export function FlaticonCategoryIconCard({
  icon: Icon,
  gradient = "from-blue-500/20 to-indigo-500/10",
  borderColor = "border-blue-500/30",
  iconColor = "text-blue-500",
}: {
  icon: React.ElementType;
  gradient?: string;
  borderColor?: string;
  iconColor?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
      transition={{ duration: 0.3 }}
      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} border ${borderColor} shadow-md flex items-center justify-center shrink-0 relative overflow-hidden`}
    >
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </motion.div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/10 rounded-full blur-xs pointer-events-none" />
    </motion.div>
  );
}
