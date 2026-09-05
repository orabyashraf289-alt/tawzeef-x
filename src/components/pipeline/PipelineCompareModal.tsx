import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Star,
  Award,
  Crown,
  CheckCircle2,
  XCircle,
  Briefcase,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Zap,
  Clock
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface PipelineCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: any[];
  onPromoteCandidate?: (candidateId: string) => void;
}

export default function PipelineCompareModal({
  isOpen,
  onClose,
  candidates,
  onPromoteCandidate,
}: PipelineCompareModalProps) {
  const { locale, dir } = useI18n();

  // Find candidate with the highest AI score
  const highestScoreCandidateId = useMemo(() => {
    if (candidates.length === 0) return null;
    let maxScore = -1;
    let maxId = null;
    candidates.forEach((c) => {
      const score = c.ai_score ?? 0;
      if (score > maxScore) {
        maxScore = score;
        maxId = c.id;
      }
    });
    return maxScore > 0 ? maxId : null;
  }, [candidates]);

  if (!isOpen || candidates.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden rounded-3xl" dir={dir}>
        <DialogHeader className="p-6 pb-3 border-b border-border/60 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                {locale === "en" ? "Side-by-Side Candidate Comparison" : "مقارنة المرشحين الذكية جنباً إلى جنب"}
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-bold">
                  {candidates.length} {locale === "en" ? "Candidates" : "مرشحين"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {locale === "en"
                  ? "Compare competencies, AI evaluation scores, skills overlap, and stage progression."
                  : "مقارنة دقيقة للكفاءات، نسب المطابقة بالذكاء الاصطناعي، والمهارات لاختيار الأنسب للمرحلة التالية."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-x-auto max-h-[75vh]">
          <div
            className="grid gap-4 min-w-[680px]"
            style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))` }}
          >
            {candidates.map((c) => {
              const isTop = c.id === highestScoreCandidateId;
              const initials = c.name
                ? c.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                : "?";

              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-2xl border p-4 space-y-4 flex flex-col justify-between transition-all",
                    isTop
                      ? "bg-primary/5 border-primary/40 shadow-sm relative"
                      : "bg-card border-border/70"
                  )}
                >
                  {isTop && (
                    <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Crown className="w-3 h-3" />
                      <span>{locale === "en" ? "Top AI Match" : "الأعلى تقييماً 🏆"}</span>
                    </div>
                  )}

                  {/* Candidate Header */}
                  <div className="flex items-center gap-3 pt-1">
                    <Avatar className="w-11 h-11 border-2 border-border shadow-xs">
                      <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.role || "مرشح"}</p>
                      <Badge variant="outline" className="text-[9px] mt-1 border-border">
                        {c.stage || "تقديم الطلب"}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* AI Score Comparison */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                      {locale === "en" ? "AI Match Score" : "درجة التطابق بالـ AI"}
                    </span>
                    <p
                      className={cn(
                        "text-2xl font-black font-mono",
                        (c.ai_score ?? 0) >= 70
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {c.ai_score != null ? `${c.ai_score}%` : "—"}
                    </p>
                  </div>

                  {/* Rating / Scorecard */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">
                      {locale === "en" ? "Team Rating" : "تقييم الفريق"}
                    </span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-3.5 h-3.5",
                            i < (c.rating || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted/40"
                          )}
                        />
                      ))}
                      <span className="text-xs font-bold text-foreground mr-1">
                        {c.rating ? `${c.rating}/5` : (locale === "en" ? "Unrated" : "بدون تقييم")}
                      </span>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">
                      {locale === "en" ? "Experience" : "الخبرة والملخص"}
                    </span>
                    <p className="text-muted-foreground line-clamp-3 text-[11px] leading-relaxed">
                      {c.experience || c.summary || (locale === "en" ? "No summary provided" : "لا يوجد ملخص مسجل")}
                    </p>
                  </div>

                  {/* Skills List */}
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">
                      {locale === "en" ? "Skills" : "المهارات"}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {c.skills && c.skills.length > 0 ? (
                        c.skills.slice(0, 5).map((skill: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-lg bg-secondary/80 text-secondary-foreground text-[10px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="pt-2">
                    {onPromoteCandidate && (
                      <Button
                        size="sm"
                        onClick={() => {
                          onPromoteCandidate(c.id);
                          onClose();
                        }}
                        className={cn(
                          "w-full h-8 text-xs font-bold gap-1.5 rounded-xl shadow-xs",
                          isTop
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        {locale === "en" ? "Promote Candidate" : "ترقية هذا المرشح"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
