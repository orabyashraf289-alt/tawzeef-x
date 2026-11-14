import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HiringGoalsForm {
  hire_target: number;
  candidates_target: number;
  interviews_target: number;
  offers_target: number;
}

const DEFAULT_GOALS: HiringGoalsForm = {
  hire_target: 10,
  candidates_target: 50,
  interviews_target: 20,
  offers_target: 8,
};

function sanitizeTargetValue(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function HiringGoalsSettingsSection() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [goals, setGoals] = useState<HiringGoalsForm>(DEFAULT_GOALS);

  const loadGoals = useCallback(async () => {
    if (!user) {
      setLoadingInitial(false);
      return;
    }
    setLoadingInitial(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("hiring_goals")
      .select("hire_target, candidates_target, interviews_target, offers_target")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
    } else if (data) {
      setGoals({
        hire_target: data.hire_target,
        candidates_target: data.candidates_target,
        interviews_target: data.interviews_target,
        offers_target: data.offers_target,
      });
    }
    setLoadingInitial(false);
  }, [user, currentMonth]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const sanitized: HiringGoalsForm = {
      hire_target: Math.max(1, Math.floor(goals.hire_target) || 1),
      candidates_target: Math.max(1, Math.floor(goals.candidates_target) || 1),
      interviews_target: Math.max(1, Math.floor(goals.interviews_target) || 1),
      offers_target: Math.max(1, Math.floor(goals.offers_target) || 1),
    };
    const { error } = await supabase
      .from("hiring_goals")
      .upsert(
        { user_id: user.id, month: currentMonth, ...sanitized },
        { onConflict: "user_id,month" },
      );

    if (error) {
      toast({
        title: t("settings.goalsSaveError"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setGoals(sanitized);
      toast({ title: t("settings.goalsSaved") });
    }
    setLoading(false);
  };

  if (loadingInitial) {
    return (
      <div className="flex justify-center py-12" role="status">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <p className="text-sm font-medium text-destructive">
          {locale === "en" ? "Could not load hiring goals." : "تعذّر تحميل أهداف التوظيف."}
        </p>
        <p className="text-xs text-muted-foreground">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void loadGoals()}>
          {locale === "en" ? "Retry" : "إعادة المحاولة"}
        </Button>
      </div>
    );
  }

  const fields: ReadonlyArray<{
    key: keyof HiringGoalsForm;
    label: string;
    desc: string;
    icon: string;
  }> = [
    { key: "hire_target", label: t("settings.hireTarget"), desc: t("settings.hireTargetDesc"), icon: "👤" },
    { key: "candidates_target", label: t("settings.candidatesTarget"), desc: t("settings.candidatesTargetDesc"), icon: "📋" },
    { key: "interviews_target", label: t("settings.interviewsTarget"), desc: t("settings.interviewsTargetDesc"), icon: "🎙️" },
    { key: "offers_target", label: t("settings.offersTarget"), desc: t("settings.offersTargetDesc"), icon: "📄" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.goalsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("settings.goalsDesc")}{" "}
          {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div
            key={field.key}
            className="group relative bg-muted/30 hover:bg-muted/50 rounded-xl p-4 border border-border/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{field.icon}</span>
              <Label className="text-sm font-semibold text-foreground">{field.label}</Label>
            </div>
            <Input
              type="number"
              min={1}
              value={goals[field.key]}
              onChange={(event) =>
                setGoals({ ...goals, [field.key]: sanitizeTargetValue(event.target.value) })
              }
              className="text-center text-lg font-bold bg-card border-border/60"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">{field.desc}</p>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={loading} className="gap-2">
        {loading ? (
          t("common.saving")
        ) : (
          <>
            <Check className="w-4 h-4" />
            {t("settings.saveGoals")}
          </>
        )}
      </Button>
    </div>
  );
}
