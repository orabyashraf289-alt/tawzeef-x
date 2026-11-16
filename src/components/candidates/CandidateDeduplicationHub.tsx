import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  Trash2,
  FileText,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  detectCandidateDuplicates,
  buildMergedCandidatePayload,
  type CandidateDeduplicationItem,
  type DuplicateGroup,
} from "@/lib/candidateDeduplication";

interface CandidateDeduplicationHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: CandidateDeduplicationItem[];
}

export default function CandidateDeduplicationHub({
  open,
  onOpenChange,
  candidates,
}: CandidateDeduplicationHubProps) {
  const queryClient = useQueryClient();
  const [dismissedGroupIds, setDismissedGroupIds] = useState<string[]>([]);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [batchMerging, setBatchMerging] = useState(false);

  // Detect duplicate groups
  const allGroups = useMemo(() => {
    return detectCandidateDuplicates(candidates);
  }, [candidates]);

  const activeGroups = useMemo(() => {
    return allGroups.filter((g) => !dismissedGroupIds.includes(g.id));
  }, [allGroups, dismissedGroupIds]);

  const hygieneScore = useMemo(() => {
    if (candidates.length === 0) return 100;
    const duplicatedCount = allGroups.reduce((acc, g) => acc + g.duplicates.length, 0);
    const score = Math.max(0, Math.round(((candidates.length - duplicatedCount) / candidates.length) * 100));
    return score;
  }, [candidates, allGroups]);

  const handleMergeGroup = async (group: DuplicateGroup) => {
    setMergingId(group.id);
    try {
      const primary = group.primaryCandidate;
      // Merge all duplicates into primary sequentially
      let currentPrimary = { ...primary };

      for (const dup of group.duplicates) {
        const mergedPayload = buildMergedCandidatePayload(currentPrimary, dup);

        // Update primary candidate in database
        const { error: updateErr } = await supabase
          .from("candidates")
          .update(mergedPayload as any)
          .eq("id", currentPrimary.id);

        if (updateErr) throw updateErr;

        // Reassign applications pointing to secondary candidate
        await supabase
          .from("applications")
          .update({ name: primary.name, email: primary.email } as any)
          .eq("email", dup.email || "");

        // Delete or archive the duplicate candidate
        await supabase.from("candidates").delete().eq("id", dup.id);

        currentPrimary = { ...currentPrimary, ...mergedPayload };
      }

      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setDismissedGroupIds((prev) => [...prev, group.id]);

      toast({
        title: "تم دمج الملفات المكررة بنجاح ✅",
        description: `تم توحيد بيانات ${primary.name} وحفظ السجل المدمج.`,
      });
    } catch (err: any) {
      toast({
        title: "خطأ أثناء الدمج",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setMergingId(null);
    }
  };

  const handleBatchMerge100 = async () => {
    const highConfidenceGroups = activeGroups.filter((g) => g.confidence >= 95);
    if (highConfidenceGroups.length === 0) {
      toast({ title: "لا توجد ملفات متطابقة بنسبة 95%+ حالياً" });
      return;
    }

    setBatchMerging(true);
    let mergedCount = 0;
    try {
      for (const group of highConfidenceGroups) {
        await handleMergeGroup(group);
        mergedCount++;
      }
      toast({
        title: "تم الدمج التلقائي بنجاح ⚡",
        description: `تم دمج ${mergedCount} مجموعة مكررة بنجاح.`,
      });
    } catch (err: any) {
      toast({ title: "حدث خطأ جزئي أثناء الدمج المجمع", description: err.message, variant: "destructive" });
    } finally {
      setBatchMerging(false);
    }
  };

  const handleDismiss = (groupId: string) => {
    setDismissedGroupIds((prev) => [...prev, groupId]);
    toast({ title: "تم تجاهل هذه المجموعة لهذه الجلسة" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">
                مركز كشف ودمج المرشحين المكررين ذكياً
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                فحص تلقائي لتكرار المتقدمين عبر البريد ورقم الجوال والاسم، مع إمكانية الدمج بضغطة واحدة
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
              {candidates.length}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">المرشحون المفحوصون</div>
              <div className="text-[11px] text-muted-foreground">قاعدة بيانات المتقدمين</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${
                activeGroups.length === 0
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {activeGroups.length}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">حالات التكرار المكتشفة</div>
              <div className="text-[11px] text-muted-foreground">تتطلب المراجعة أو الدمج</div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="text-left">
              <div className="text-xs font-bold text-foreground">نظافة البيانات</div>
              <div className="text-[11px] text-muted-foreground font-mono">{hygieneScore}% متطابقة</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            {activeGroups.length > 0 ? (
              <span>يتم اختيار الملف الأكمل والأحدث تلقائياً كملف رئيسي للدمج.</span>
            ) : (
              <span>قاعدة بيانات المرشحين نظيفة تماماً ولا توجد تكرارات متبقية.</span>
            )}
          </div>
          {activeGroups.some((g) => g.confidence >= 95) && (
            <Button
              size="sm"
              disabled={batchMerging}
              onClick={handleBatchMerge100}
              className="gap-1.5 text-xs h-8 font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{batchMerging ? "جاري الدمج..." : "دمج الكل للمتطابقين بنسبة 95%+"}</span>
            </Button>
          )}
        </div>

        {/* Groups List */}
        {activeGroups.length === 0 ? (
          <div className="p-8 text-center bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-2 mt-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
              رائع! لا توجد ملفات مكررة في قاعدة البيانات
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              جميع السجلات فريدة من حيث البريد الإلكتروني وأرقام الاتصال. سيقوم النظام بتنبيهك تلقائياً عند ورود أي تكرارات مستقبلية.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {activeGroups.map((group) => {
              const primary = group.primaryCandidate;
              const secondary = group.duplicates[0];

              return (
                <Card key={group.id} className="border border-border/80 shadow-sm overflow-hidden">
                  <CardHeader className="py-2.5 px-4 bg-muted/40 border-b border-border/50 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-foreground">{group.matchReason}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        group.confidence === 100
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      }`}
                    >
                      نسبة التطابق: {group.confidence}%
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Profile Card */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="default" className="text-[10px] bg-primary">
                            الملف المعتمد (الرئيسي)
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {primary.created_at ? new Date(primary.created_at).toLocaleDateString("ar-SA") : ""}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-foreground">{primary.name}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                            <span>{primary.email || "غير مسجل"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            <span dir="ltr">{primary.phone || "غير مسجل"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="font-semibold text-foreground">الوظيفة:</span>
                            <span>{primary.role || "غير محدد"}</span>
                            <Badge variant="outline" className="text-[10px] mr-1">
                              {primary.stage || "تقديم"}
                            </Badge>
                          </div>
                        </div>
                        {primary.resume_url && (
                          <div className="text-[11px] text-emerald-600 flex items-center gap-1 pt-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>السيرة الذاتية متوفرة</span>
                          </div>
                        )}
                      </div>

                      {/* Secondary / Duplicate Profile Card */}
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px]">
                            الملف المكرر
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {secondary.created_at ? new Date(secondary.created_at).toLocaleDateString("ar-SA") : ""}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-foreground">{secondary.name}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{secondary.email || "غير مسجل"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            <span dir="ltr">{secondary.phone || "غير مسجل"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="font-semibold text-foreground">الوظيفة:</span>
                            <span>{secondary.role || "غير محدد"}</span>
                            <Badge variant="outline" className="text-[10px] mr-1">
                              {secondary.stage || "تقديم"}
                            </Badge>
                          </div>
                        </div>
                        {secondary.resume_url ? (
                          <div className="text-[11px] text-emerald-600 flex items-center gap-1 pt-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>السيرة الذاتية متوفرة</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground pt-1">لا توجد سيرة مرفقة</div>
                        )}
                      </div>
                    </div>

                    {/* Group Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(group.id)}
                        className="text-xs h-8 text-muted-foreground"
                      >
                        تجاهل
                      </Button>
                      <Button
                        size="sm"
                        disabled={mergingId === group.id}
                        onClick={() => handleMergeGroup(group)}
                        className="gap-1.5 text-xs h-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>{mergingId === group.id ? "جاري الدمج..." : "دمج في ملف موحد"}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}