import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";
import { Muted, Small } from "@/components/typography";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  index?: number;
  sparklineData?: number[];
  sparklineColor?: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const duration = 800;
    const start = ref.current ?? 0;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    };
    requestAnimationFrame(tick);
    ref.current = value;
  }, [value]);

  return <>{display}</>;
}

function MiniSparkline({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  
  const width = 80;
  const height = 28;
  const padding = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  
  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${width - padding},${height} L${padding},${height} Z`;

  return (
    <motion.svg 
      width={width} 
      height={height} 
      className="overflow-visible"
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
      style={{ transformOrigin: "left center" }}
    >
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="2.5" fill={color} />
    </motion.svg>
  );
}

function StatCardImpl({ title, value, change, changeType = "neutral", icon: Icon, iconColor, index = 0, sparklineData, sparklineColor }: StatCardProps) {
  const numericValue = typeof value === "number" ? value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative glass-card-premium rounded-xl p-5 overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated corner glow */}
      <motion.div
        className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-primary/8 blur-2xl pointer-events-none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Muted as="p" className="font-medium text-sm text-muted-foreground/80">{title}</Muted>
          <div className="flex items-end gap-3 mt-1.5">
            <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums [line-height:1.4]">
              {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
            </p>
            {sparklineData && sparklineData.length > 1 && (
              <div className="pb-1">
                <MiniSparkline data={sparklineData} color={sparklineColor || "hsl(var(--primary))"} />
              </div>
            )}
          </div>
          {change && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 + 0.4 }}
            >
              <Small as="p" className={cn(
                "mt-1.5 font-semibold flex items-center gap-1 text-xs",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}>
                {change}
              </Small>
            </motion.div>
          )}
        </div>
        <motion.div 
          className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-all duration-300 group-hover:shadow-md", iconColor || "bg-primary/10")}
          whileHover={{ rotate: 12, scale: 1.15 }}
          transition={{ type: "spring", stiffness: 300, damping: 12 }}
        >
          <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", iconColor ? "text-primary-foreground" : "text-primary")} />
        </motion.div>
      </div>
    </motion.div>
  );
}

const StatCard = memo(StatCardImpl);
export default StatCard;
export { MiniSparkline };
