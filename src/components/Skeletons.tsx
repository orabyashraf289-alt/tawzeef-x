/**
 * Tawzeef-X — Reusable Skeleton Loading Components
 * Replaces spinners with content-aware skeleton screens.
 */
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function Bone({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className={cn("rounded-lg bg-muted", className)}
    />
  );
}

/** Dashboard stat cards skeleton */
export function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bone className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-32" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-xl p-5 space-y-4"
          >
            <Bone className="w-11 h-11 rounded-xl" />
            <div className="space-y-2">
              <Bone className="h-8 w-16" />
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-20" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <Bone className="w-5 h-5 rounded" />
            <Bone className="h-3 w-14" />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-4">
          <Bone className="h-5 w-36" />
          <Bone className="h-[280px] w-full rounded-xl" />
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <Bone className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Bone className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Bone className="h-4 w-20" />
                  <Bone className="h-3 w-14" />
                </div>
                <Bone className="h-6 w-10" />
              </div>
              <Bone className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Jobs page skeleton */
export function JobsSkeleton() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-32" />
          <Bone className="h-4 w-48" />
        </div>
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
      <div className="flex gap-3">
        <Bone className="h-10 w-64 rounded-xl" />
        <Bone className="h-10 w-32 rounded-xl" />
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-xl p-5 space-y-3"
          >
            <div className="flex justify-between">
              <Bone className="h-5 w-36" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-32" />
            <div className="flex gap-2 pt-2">
              <Bone className="h-6 w-16 rounded-full" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Candidates page skeleton */
export function CandidatesSkeleton() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-32" />
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      <Bone className="h-10 w-full max-w-md rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
          >
            <Bone className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-24" />
            </div>
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-6 w-16 rounded-full" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Interviews page skeleton */
export function InterviewsSkeleton() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-28" />
        <div className="flex gap-2">
          <Bone className="h-10 w-24 rounded-xl" />
          <Bone className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Bone className="h-6 w-10" />
              <Bone className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Timeline items */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <Bone className="w-10 h-10 rounded-full" />
              {i < 4 && <Bone className="w-0.5 h-12 rounded-full mt-1" />}
            </div>
            <div className="flex-1 bg-card border border-border rounded-xl p-4 space-y-2">
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-48" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Generic table skeleton */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 p-3 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
          className="flex gap-4 p-3"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Bone key={j} className="h-4 flex-1" />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

/** Full page skeleton used in ProtectedRoute and lazy loading */
export function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-4"
      >
        <div className="relative mx-auto w-12 h-12">
          <motion.div
            className="absolute inset-0 rounded-full border-[3px] border-primary/20"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm font-medium"
        >
          جاري التحميل...
        </motion.p>
      </motion.div>
    </div>
  );
}
