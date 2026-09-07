import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function HiringGoalsSection() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState({
    hire_target: 10,
    candidates_target: 50,
    interviews_target: 20,
    offers_target: 8,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("hiring_goals" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .maybeSingle();
      if (data) {
        setGoals({
          hire_target: (data as any).hire_target,
          candidates_target: (data as any).candidates_target,
          interviews_target: (data as any).interviews_target,
          offers_target: (data as any).offers_target,
        });
      }
    })();
  }, [user, currentMonth]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("hiring_goals" as any)
      .upsert({ user_id: user.id, month: currentMonth, ...goals } as any, { onConflict: "user_id,month" });
    if (error) toast({ title: t("settings.goalsSaveError"), description: error.message, variant: "destructive" });
    else toast({ title: t("settings.goalsSaved") });
    setLoading(false);
  };

  const fields = [
    { key: "hire_target" as const, label: t("settings.hireTarget"), desc: t("settings.hireTargetDesc"), icon: "👤" },
    { key: "candidates_target" as const, label: t("settings.candidatesTarget"), desc: t("settings.candidatesTargetDesc"), icon: "📋" },
    { key: "interviews_target" as const, label: t("settings.interviewsTarget"), desc: t("settings.interviewsTargetDesc"), icon: "🎙️" },
    { key: "offers_target" as const, label: t("settings.offersTarget"), desc: t("settings.offersTargetDesc"), icon: "📄" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.goalsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("settings.goalsDesc")} {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { month: "long", year: "numeric" })}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key} className="group relative bg-muted/30 hover:bg-muted/50 rounded-xl p-4 border border-border/40 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{f.icon}</span>
              <Label className="text-sm font-semibold text-foreground">{f.label}</Label>
            </div>
            <Input
              type="number"
              min={1}
              value={goals[f.key]}
              onChange={e => setGoals({ ...goals, [f.key]: parseInt(e.target.value) || 1 })}
              className="text-center text-lg font-bold bg-card border-border/60"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">{f.desc}</p>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={loading} className="gap-2">
        {loading ? t("common.saving") : <><Check className="w-4 h-4" />{t("settings.saveGoals")}</>}
      </Button>
    </div>
  );
}
