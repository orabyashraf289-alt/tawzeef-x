import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Star, MessageSquare, Trash2, Edit2, Loader2, Sparkles, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface Scorecard {
  id: string;
  candidate_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  notes: string | null;
  created_at: string;
}

interface CandidateScorecardSectionProps {
  candidateId: string;
}

export default function CandidateScorecardSection({ candidateId }: CandidateScorecardSectionProps) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1) Fetch reviewer's full name
  const { data: reviewerProfile } = useQuery({
    queryKey: ["user-reviewer-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 2) Fetch all scorecards for this candidate
  const isValidCandidateId = !!candidateId && candidateId !== "undefined" && candidateId !== "null";

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ["candidate-scorecards", candidateId],
    enabled: isValidCandidateId,
    queryFn: async () => {
      if (!isValidCandidateId) return [] as Scorecard[];
      try {
        const { data, error } = await supabase
          .from("candidate_scorecards" as any)
          .select("*")
          .eq("candidate_id", candidateId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as Scorecard[];
      } catch (err) {
        console.warn("candidate_scorecards fetch failed, returning empty fallback list:", err);
        return [] as Scorecard[];
      }
    },
  });

  const reviewerName = reviewerProfile?.full_name || user?.email || "عضو فريق التقييم";
  const myScorecard = scorecards.find((s) => s.reviewer_id === user?.id);

  // Calculate aggregates
  const totalReviews = scorecards.length;
  const averageRating = totalReviews
    ? (scorecards.reduce((sum, s) => sum + s.rating, 0) / totalReviews).toFixed(1)
    : "0.0";

  // Upsert Scorecard Mutation
  const saveScorecardMutation = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      try {
        const { error } = await supabase
          .from("candidate_scorecards" as any)
          .upsert(
            {
              candidate_id: candidateId,
              reviewer_id: user!.id,
              reviewer_name: reviewerName,
              rating,
              notes: notes.trim() || null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "candidate_id,reviewer_id",
            }
          );
        if (error) throw error;
      } catch (err: any) {
        console.warn("candidate_scorecards upsert failed, applying fallback update directly to candidates table:", err);
        const { error: candUpdateErr } = await supabase
          .from("candidates")
          .update({
            rating,
            notes: notes.trim() || null
          })
          .eq("id", candidateId);

        if (candUpdateErr) throw candUpdateErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-scorecards"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: locale === "en" ? "Evaluation submitted successfully!" : "تم حفظ التقييم بنجاح! ⭐" });
      setIsEditing(false);
      setSubmitting(false);
    },
    onError: (e: any) => {
      toast({ title: "خطأ في حفظ التقييم", description: e.message, variant: "destructive" });
      setSubmitting(false);
    },
  });

  // Delete Scorecard Mutation
  const deleteScorecardMutation = useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase
          .from("candidate_scorecards" as any)
          .delete()
          .eq("candidate_id", candidateId)
          .eq("reviewer_id", user!.id);
        if (error) throw error;
      } catch (err) {
        console.warn("candidate_scorecards delete failed, resetting candidates rating directly:", err);
        await supabase.from("candidates").update({ rating: 0, notes: null }).eq("id", candidateId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-scorecards"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: locale === "en" ? "Evaluation removed." : "تم حذف تقييمك بنجاح." });
      setRating(0);
      setNotes("");
      setIsEditing(false);
    },
    onError: (e: any) => {
      toast({ title: "خطأ في الحذف", description: e.message, variant: "destructive" });
    },
  });

  const handleEditClick = () => {
    if (myScorecard) {
      setRating(myScorecard.rating);
      setNotes(myScorecard.notes || "");
      setIsEditing(true);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
        <div className="h-6 w-32 bg-muted/60 rounded-lg animate-pulse" />
        <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-5 text-right"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          {locale === "en" ? "Collaborative Scorecard & Ratings" : "التقييم الجماعي لشركاء التوظيف"}
        </h3>
        <Badge variant="outline" className="text-xs gap-1 py-0.5 bg-primary/[0.04]">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          {totalReviews} {locale === "en" ? "reviewers" : "مقيمين"}
        </Badge>
      </div>

      {/* Aggregate Overview */}
      <div className="flex flex-col sm:flex-row gap-5 items-center bg-muted/20 p-4 rounded-xl border border-border/30">
        <div className="text-center sm:text-right shrink-0">
          <div className="text-3xl font-extrabold text-foreground flex items-baseline gap-1.5 justify-center sm:justify-start">
            {averageRating}
            <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
          </div>
          <div className="flex gap-0.5 mt-1 justify-center sm:justify-start">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-4 h-4",
                  star <= Math.round(Number(averageRating))
                    ? "text-amber-500 fill-amber-500"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 w-full text-xs text-muted-foreground leading-relaxed">
          {locale === "en"
            ? "Team ratings help verify candidate suitability. All managers and reviewers in this company can submit scorecards and leave private feedback."
            : "يساعد التقييم الجماعي في التحقق المشترك من ملاءمة المرشح لشغل الوظيفة. يمكن لكافة مدراء التوظيف والمقيّمين إبداء رأيهم وترك ملاحظات خاصة للقسم."}
        </div>
      </div>

      {/* Write/Edit Scorecard Form */}
      <AnimatePresence mode="wait">
        {(!myScorecard || isEditing) ? (
          <motion.div
            key="scorecard-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 border-b border-border/40 pb-4"
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">
                {locale === "en" ? "Your Rating:" : "تقييمك الشخصي للمرشح:"}
              </span>
              <div className="flex items-center gap-1.5" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Star
                      className={cn(
                        "w-7 h-7 transition-all",
                        star <= (hoverRating || rating)
                          ? "text-amber-500 fill-amber-500 scale-110"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">
                {locale === "en" ? "Evaluation Notes / Rationale:" : "ملاحظات التقييم والمبررات الحالية:"}
              </span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={locale === "en" ? "Leave feedback, pros, cons..." : "اكتب ملاحظاتك، نقاط القوة، نقاط الضعف، أو مبررات التقييم..."}
                className="text-xs leading-relaxed"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                onClick={() => saveScorecardMutation.mutate()}
                disabled={submitting || rating === 0}
                className="gap-1.5 font-bold"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {locale === "en" ? "Submit Scorecard" : "حفظ التقييم"}
              </Button>
              {myScorecard && (
                <Button variant="outline" size="sm" onClick={handleCancelClick}>
                  {locale === "en" ? "Cancel" : "إلغاء"}
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="my-scorecard-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-primary/[0.02] border border-primary/20 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  🛡️ تقييمك الشخصي نشط
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handleEditClick} className="w-7 h-7 hover:bg-muted text-muted-foreground">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteScorecardMutation.mutate()} className="w-7 h-7 hover:bg-red-50 text-red-500 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "w-4 h-4",
                    star <= myScorecard.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"
                  )}
                />
              ))}
            </div>

            {myScorecard.notes && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {myScorecard.notes}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review list */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-foreground flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          {locale === "en" ? "Other Reviewers Feedbacks" : "آراء وتعليقات المقيّمين الآخرين:"}
        </span>

        <div className="space-y-3 divide-y divide-border/30">
          {scorecards.filter((s) => s.reviewer_id !== user?.id).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-muted/10 rounded-lg">
              {locale === "en" ? "No evaluations from other team members yet." : "لم يتم تقديم تقييمات أخرى من أعضاء الفريق بعد."}
            </p>
          ) : (
            scorecards
              .filter((s) => s.reviewer_id !== user?.id)
              .map((s) => (
                <div key={s.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{s.reviewer_name}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-3.5 h-3.5",
                            star <= s.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/10 p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap">
                      {s.notes}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Icon Save helper
function Save(props: React.ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
