import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";

interface PageHeaderProps {
  badgeText?: string;
  badgeIcon?: React.ElementType;
  title: string;
  description?: string;
  icon?: React.ElementType;
  accentColor?: "primary" | "emerald" | "amber" | "purple" | "indigo";
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Reusable, Modern, Light & Dark Theme-Adaptive Page Header Banner
 * Replaces old dark slate boxes with an ultra-clean, elegant enterprise header
 */
export function PageHeader({
  badgeText,
  badgeIcon: BadgeIcon = Sparkles,
  title,
  description,
  icon: Icon,
  accentColor = "primary",
  actions,
  children,
}: PageHeaderProps) {
  const borderAccents = {
    primary: "border-r-primary",
    emerald: "border-r-emerald-500",
    amber: "border-r-amber-500",
    purple: "border-r-purple-500",
    indigo: "border-r-indigo-500",
  };

  const badgeStyles = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-3xl bg-card border border-border/80 shadow-xs relative overflow-hidden border-r-4 ${borderAccents[accentColor]} space-y-4`}
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 via-accent/3 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          {Icon && <FlaticonCategoryIconCard icon={Icon} />}
          <div className="space-y-1.5">
            {badgeText && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${badgeStyles[accentColor]}`}>
                <BadgeIcon className="w-3.5 h-3.5" />
                <span>{badgeText}</span>
              </div>
            )}
            <h1 className="text-2xl font-black text-foreground tracking-tight">{title}</h1>
            {description && <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">{description}</p>}
          </div>
        </div>

        {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap relative z-10">{actions}</div>}
      </div>

      {children && <div className="relative z-10 pt-2">{children}</div>}
    </motion.div>
  );
}
