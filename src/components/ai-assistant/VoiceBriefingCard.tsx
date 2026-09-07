import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Volume2, Play, Pause, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechService } from "@/hooks/useSpeechService";

export interface VoiceBriefingData {
  briefingText: string;
  briefingType: "daily" | "weekly";
  stats: {
    activeJobs: number;
    activeCandidates: number;
    upcomingInterviews: number;
    pendingOffers: number;
  };
}

export default function VoiceBriefingCard({ data }: { data: VoiceBriefingData }) {
  const svc = useSpeechService();
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const id = useMemo(
    () => `briefing-${data.briefingText.slice(0, 40).replace(/\s+/g, "-")}`,
    [data.briefingText]
  );

  const isActive = svc.isActive(id);
  const isLoading = isActive && svc.status === "loading";
  const isPlaying = isActive && svc.status === "speaking";

  const wordCount = data.briefingText.split(/\s+/).length;
  const estimatedSeconds = Math.max(5, Math.ceil(wordCount / 2.2)); // Roughly 2.2 words per second

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgressSeconds((prev) => {
        if (prev >= estimatedSeconds) {
          clearInterval(interval);
          return estimatedSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, estimatedSeconds]);

  useEffect(() => {
    if (!isActive) {
      setProgressSeconds(0);
    }
  }, [isActive]);

  const handlePlayPause = () => {
    if (isActive) {
      svc.cancelIfActive(id);
    } else {
      void svc.speak({ id, text: data.briefingText }, { overrideLatest: true });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercentage = (progressSeconds / estimatedSeconds) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              التقرير الصوتي لمدير التوظيف
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {data.briefingType === "weekly" ? "الملخص الصوتي الأسبوعي" : "الملخص الصوتي اليومي"}
            </p>
          </div>
        </div>
        <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
          تفاعلي ومسموع
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
          <span className="text-sm font-black text-primary">{data.stats.activeJobs}</span>
          <span className="text-[8px] text-muted-foreground block">وظائف نشطة</span>
        </div>
        <div className="bg-blue-500/5 p-2 rounded-xl border border-blue-500/10">
          <span className="text-sm font-black text-blue-600">{data.stats.activeCandidates}</span>
          <span className="text-[8px] text-muted-foreground block">مرشحين نشطين</span>
        </div>
        <div className="bg-purple-500/5 p-2 rounded-xl border border-purple-500/10">
          <span className="text-sm font-black text-purple-600">{data.stats.upcomingInterviews}</span>
          <span className="text-[8px] text-muted-foreground block">مقابلات قادمة</span>
        </div>
        <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
          <span className="text-sm font-black text-emerald-600">{data.stats.pendingOffers}</span>
          <span className="text-[8px] text-muted-foreground block">عروض معلقة</span>
        </div>
      </div>

      <div className="bg-muted/10 border border-border/40 rounded-2xl p-4 space-y-4">
        <div className="flex items-end justify-center gap-1 h-10 w-full max-w-[160px] mx-auto">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary rounded-full"
              animate={isPlaying ? {
                height: [6, Math.random() * 28 + 6, 6],
              } : {
                height: 6
              }}
              transition={isPlaying ? {
                duration: 0.6 + i * 0.05,
                repeat: Infinity,
                ease: "easeInOut"
              } : undefined}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>{formatTime(progressSeconds)}</span>
            <span>{formatTime(estimatedSeconds)}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handlePlayPause}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md",
              isPlaying 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-white transform translate-x-[-1px]" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
        >
          {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showTranscript ? "إخفاء النص المقروء" : "عرض النص المقروء (قراءة ملخص التقرير)"}
        </button>
        {showTranscript && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }}
            className="p-3 bg-muted/30 border border-border/30 rounded-xl text-[10px] text-foreground/80 leading-relaxed"
          >
            {data.briefingText}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
