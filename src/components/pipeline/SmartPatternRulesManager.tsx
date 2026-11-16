import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Sparkles,
  Timer,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCandidates } from "@/hooks/useJobs";
import {
  DEFAULT_SMART_PATTERN_RULES,
  evaluateCandidatePatterns,
  type SmartPatternRule,
  type PatternMatchResult,
} from "@/lib/smartPatternRules";

export default function SmartPatternRulesManager() {
  const queryClient = useQueryClient();
  const { data: rawCandidates = [] } = useCandidates();

  const [rules, setRules] = useState<SmartPatternRule[]>(DEFAULT_SMART_PATTERN_RULES);
  const [applyingActions, setApplyingActions] = useState(false);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast({ title: "تم تحديث حالة القاعدة الذكية" });
  };

  const updateThreshold = (id: string, key: string, value: any) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, thresholds: { ...r.thresholds, [key]: value } }
          : r
      )
    );
  };

  // Convert raw candidates to pattern profiles
  const patternCandidates = useMemo(() => {
    return rawCandidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      stage: c.stage,
      status: c.status,
      ai_score: c.ai_score,
      skills: c.skills,
      created_at: c.created_at,
      last_activity_at: c.updated_at || c.created_at,
      applications_count: 1,
      license_status: c.license_status || (c.license_number ? "valid" : null),
      role: c.role || c.jobs?.title,
    }));
  }, [rawCandidates]);

  // Evaluate matches
  const matchResults: PatternMatchResult[] = useMemo(() => {
    return evaluateCandidatePatterns(patternCandidates, rules);
  }, [patternCandidates, rules]);

  const handleApplyAllActions = async () => {
    if (matchResults.length === 0) {
      toast({ title: "لا توجد إجراءات معلقة للتطبيق" });
      return;
    }

    setApplyingActions(true);
    let updated = 0;
    try {
      for (const m of matchResults) {
        if (m.ruleId === "pattern-top-talent") {
          await supabase
            .from("candidates")
            .update({ stage: "مقابلة تقنية", status: "قيد المراجعة" })
            .eq("id", m.candidateId);
          updated++;
        } else if (m.ruleId === "pattern-license-compliance") {
          await supabase
            .from("candidates")
            .update({ status: "مقبول" })
            .eq("id", m.candidateId);
          updated++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast({
        title: "تم تطبيق الإجراءات الذكية بنجاح ⚡",
        description: `تم تحديث ${updated} مرشح طبقاً لأنماط البيانات.`,
      });
    } catch (err: any) {
      toast({ title: "حدث خطأ أثناء التطبيق", description: err.message, variant: "destructive" });
    } finally {
      setApplyingActions(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-2xl border border-border/70">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>محرك القواعد الذكية المبنية على أنماط البيانات (p4-smart-rules)</span>
          </div>
          <h2 className="text-lg font-black text-foreground">
            توجيه وأتمتة مسار التوظيف تلقائياً
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تحليل أنماط درجات المرشحين، مهل التوقف (SLA)، التراخيص، والتقديمات المتعددة لتنفيذ إجراءات فورية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApplyAllActions}
            disabled={applyingActions || matchResults.length === 0}
            className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{applyingActions ? "جاري التطبيق..." : `تطبيق الإجراءات المقترحة (${matchResults.length})`}</span>
          </Button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="border border-border/80 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      rule.category === "quality"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : rule.category === "stagnation"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-indigo-500/10 text-indigo-600"
                    }`}
                  >
                    {rule.category === "quality" ? (
                      <Sparkles className="w-4 h-4" />
                    ) : rule.category === "stagnation" ? (
                      <Timer className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">{rule.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {rule.category === "quality"
                        ? "جودة المواهب"
                        : rule.category === "stagnation"
                        ? "مراقبة الـ SLA"
                        : rule.category === "compliance"
                        ? "الامتثال والتراخيص"
                        : "أنماط التقديم"}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule.id)}
                />
              </div>
              <CardDescription className="text-xs mt-2 leading-relaxed">
                {rule.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* Threshold controls */}
              {rule.thresholds.minAiScore !== undefined && (
                <div className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded-lg">
                  <span className="font-semibold text-foreground">حد درجة التقييم الأدنى:</span>
                  <div className="flex items-center gap-1.5 w-24">
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={rule.thresholds.minAiScore}
                      onChange={(e) =>
                        updateThreshold(rule.id, "minAiScore", parseInt(e.target.value) || 80)
                      }
                      className="text-xs h-7 text-center font-bold"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {rule.thresholds.stagnationDays !== undefined && (
                <div className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded-lg">
                  <span className="font-semibold text-foreground">حد أيام الركود المسموح:</span>
                  <div className="flex items-center gap-1.5 w-24">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={rule.thresholds.stagnationDays}
                      onChange={(e) =>
                        updateThreshold(rule.id, "stagnationDays", parseInt(e.target.value) || 5)
                      }
                      className="text-xs h-7 text-center font-bold"
                    />
                    <span className="text-muted-foreground">أيام</span>
                  </div>
                </div>
              )}

              {/* Actions Preview */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground block">الإجراءات المبرمجة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {rule.actions.map((act, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">
                      {act.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Matches Insight Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span>نتائج المطابقة اللحظية مع مرشحي المنصة ({matchResults.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              الحالات المكتشفة تلقائياً في قاعدة البيانات بناءً على القواعد الذكية الفعالة
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              matchResults.length > 0
                ? "bg-amber-50 text-amber-700 border-amber-300"
                : "bg-emerald-50 text-emerald-700 border-emerald-300"
            }
          >
            {matchResults.length} مرشح تنطبق عليه الأنماط
          </Badge>
        </CardHeader>
        <CardContent>
          {matchResults.length === 0 ? (
            <div className="p-6 text-center bg-muted/30 rounded-xl border border-dashed border-border/80 space-y-1.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
              <div className="text-xs font-bold text-foreground">جميع المرشحين في المسار الطبيعي</div>
              <p className="text-[11px] text-muted-foreground">
                لا توجد حالات تجاوز SLA أو مواهب استثنائية لم يتم تصعيدها حالياً.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {matchResults.map((m, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span>{m.candidateName}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          m.severity === "success"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                            : m.severity === "warning"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                            : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40"
                        }`}
                      >
                        {m.ruleName}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {m.matchedReason}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <Badge variant="outline" className="text-[10px] bg-background">
                      {m.suggestedAction}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}