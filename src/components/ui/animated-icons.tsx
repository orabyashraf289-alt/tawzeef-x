import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Briefcase, Users, Kanban, Calendar, FileText,
  BarChart3, Target, Star, Bot, Building2, UserPlus, Lock,
  Settings2, Video, HelpCircle, Layers, Eye, Plus, Edit3, Trash2,
  CheckCircle2, Sparkles, SlidersHorizontal, BookOpen, GitBranch, Award,
  CheckSquare, Code, UserCheck, ShieldAlert, Cpu, Zap, Compass, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimationType = "bounce" | "pulse" | "wiggle" | "float" | "glow" | "rotate" | "3d-pop";

interface AnimatedIconProps {
  icon: React.ElementType;
  className?: string;
  badgeBg?: string;
  animation?: AnimationType;
  colorClass?: string;
}

/**
 * Flaticon & Icons8 Style Micro-Animated Icon Wrapper
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
          hover: { y: [-2, -6, 0], scale: 1.14, transition: { duration: 0.4, repeat: Infinity, repeatType: "reverse" as const } },
        };
      case "pulse":
        return {
          rest: { scale: 1 },
          hover: { scale: [1, 1.18, 1], transition: { duration: 0.5, repeat: Infinity } },
        };
      case "wiggle":
        return {
          rest: { rotate: 0 },
          hover: { rotate: [-12, 12, -12, 12, 0], transition: { duration: 0.5 } },
        };
      case "float":
        return {
          rest: { y: 0 },
          hover: { y: -5, transition: { duration: 0.3 } },
        };
      case "glow":
        return {
          rest: { filter: "drop-shadow(0 0 0px rgba(0,0,0,0))" },
          hover: { filter: "drop-shadow(0 0 10px currentColor)", scale: 1.12, transition: { duration: 0.3 } },
        };
      case "rotate":
        return {
          rest: { rotate: 0 },
          hover: { rotate: 180, transition: { duration: 0.6 } },
        };
      case "3d-pop":
        return {
          rest: { scale: 1, rotateX: 0, rotateY: 0 },
          hover: { scale: 1.2, rotateX: -15, rotateY: 15, transition: { type: "spring", stiffness: 400 } },
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
 * Icons8 3D Fluency Style Animated Container Badge
 */
export function Icons8StyleIcon({
  icon: Icon,
  gradient = "from-emerald-500/20 via-blue-500/15 to-indigo-500/10",
  iconColor = "text-emerald-500",
  shadowColor = "shadow-emerald-500/20",
  size = "md",
}: {
  icon: React.ElementType;
  gradient?: string;
  iconColor?: string;
  shadowColor?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-11 h-11 rounded-2xl",
    lg: "w-14 h-14 rounded-3xl",
    xl: "w-18 h-18 rounded-3xl",
  }[size];

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
    xl: "w-9 h-9",
  }[size];

  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
      transition={{ type: "spring", stiffness: 350, damping: 18 }}
      className={cn(
        "relative flex items-center justify-center bg-gradient-to-br border border-white/20 dark:border-white/10 shadow-lg backdrop-blur-md cursor-pointer overflow-hidden group/icons8",
        sizeClasses,
        gradient,
        shadowColor
      )}
    >
      {/* Background ambient shine */}
      <div className="absolute inset-0 bg-white/15 dark:bg-white/5 opacity-0 group-hover/icons8:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute -top-6 -right-6 w-12 h-12 bg-white/20 rounded-full blur-sm pointer-events-none" />

      {/* Modern Icon */}
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className={cn(iconSizes, iconColor, "filter drop-shadow-xs")} />
      </motion.div>
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
      transition={{ type: "spring", stiffness: 350, damping: 18 }}
      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} border ${borderColor} shadow-md flex items-center justify-center shrink-0 relative overflow-hidden`}
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </motion.div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/10 rounded-full blur-xs pointer-events-none" />
    </motion.div>
  );
}
