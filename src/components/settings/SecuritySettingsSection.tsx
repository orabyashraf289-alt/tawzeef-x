import { useCallback, useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Shield, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { checkPasswordStrength, type PasswordPolicy } from "@/lib/security";

const DEFAULT_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_special: true,
};

function clampMinLength(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 8;
  return Math.min(20, Math.max(8, parsed));
}

export function SecuritySettingsSection() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [minLength, setMinLength] = useState(8);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireLower, setRequireLower] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // PDPL / GDPR Company Data Retention Policy & Execution State
  const [candidateRetentionDays, setCandidateRetentionDays] = useState(365);
  const [rejectedRetentionDays, setRejectedRetentionDays] = useState(180);
  const [auditRetentionDays, setAuditRetentionDays] = useState(730);
  const [autoAnonymizeEnabled, setAutoAnonymizeEnabled] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);
  const [executingRetention, setExecutingRetention] = useState(false);
  const [confirmRetentionAnonymize, setConfirmRetentionAnonymize] = useState(false);
  const [retentionReport, setRetentionReport] = useState<{
    dry_run: boolean;
    eligible_candidates: number;
    anonymized_candidates: number;
  } | null>(null);

  const loadRetentionPolicy = useCallback(async () => {
    if (!activeCompanyId) return;
    const { data } = await (supabase.from as any)("company_retention_policies")
      .select("candidate_retention_days, rejected_application_days, audit_log_retention_days, auto_anonymize_enabled")
      .eq("company_id", activeCompanyId)
      .maybeSingle();
    if (data) {
      setCandidateRetentionDays(Number(data.candidate_retention_days) || 365);
      setRejectedRetentionDays(Number(data.rejected_application_days) || 180);
      setAuditRetentionDays(Number(data.audit_log_retention_days) || 730);
      setAutoAnonymizeEnabled(Boolean(data.auto_anonymize_enabled));
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void loadRetentionPolicy();
  }, [loadRetentionPolicy]);

  const handleSaveRetentionPolicy = async () => {
    if (!activeCompanyId || !user?.id || savingRetention) return;
    setSavingRetention(true);
    try {
      const payload = {
        company_id: activeCompanyId,
        candidate_retention_days: Math.min(3650, Math.max(30, Number(candidateRetentionDays) || 365)),
        rejected_application_days: Math.min(1825, Math.max(30, Number(rejectedRetentionDays) || 180)),
        audit_log_retention_days: Math.min(3650, Math.max(90, Number(auditRetentionDays) || 730)),
        auto_anonymize_enabled: autoAnonymizeEnabled,
        updated_by: user.id,
      };
      const { error } = await (supabase.from as any)("company_retention_policies")
        .upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
      toast({ title: "تم حفظ سياسة الاحتفاظ بالبيانات وحماية الخصوصية ✅" });
    } catch (e: any) {
      toast({ title: "تعذّر حفظ السياسة", description: e?.message, variant: "destructive" });
    } finally {
      setSavingRetention(false);
    }
  };

  const handleExecuteRetention = async (dryRun: boolean) => {
    if (!activeCompanyId || executingRetention) return;
    if (!dryRun && !confirmRetentionAnonymize) return;
    setExecutingRetention(true);
    try {
      const { data, error } = await (supabase.rpc as any)("execute_company_data_retention", {
        _company_id: activeCompanyId,
        _dry_run: dryRun,
      });
      if (error) throw error;
      setRetentionReport({
        dry_run: Boolean(data?.dry_run),
        eligible_candidates: Number(data?.eligible_candidates) || 0,
        anonymized_candidates: Number(data?.anonymized_candidates) || 0,
      });
      toast({
        title: dryRun
          ? `نتيجة المعاينة: ${Number(data?.eligible_candidates) || 0} ملف مرشح مستحق للإخفاء`
          : `تم إخفاء هوية ${Number(data?.anonymized_candidates) || 0} ملف مرشح بنجاح ✅`,
      });
      if (!dryRun) setConfirmRetentionAnonymize(false);
    } catch (e: any) {
      toast({ title: "تعذّر تنفيذ سياسة الاحتفاظ", description: e?.message, variant: "destructive" });
    } finally {
      setExecutingRetention(false);
    }
  };

  const loadPolicy = useCallback(async () => {
    if (!user) {
      setLoadingPolicy(false);
      return;
    }
    setLoadingPolicy(true);
    setPolicyError(null);
    const { data, error } = await supabase
      .from("password_policies")
      .select("min_length, require_uppercase, require_lowercase, require_numbers, require_special")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setPolicyError(error.message);
    } else if (data) {
      const loadedPolicy: PasswordPolicy = {
        min_length: data.min_length,
        require_uppercase: data.require_uppercase,
        require_lowercase: data.require_lowercase,
        require_numbers: data.require_numbers,
        require_special: data.require_special,
      };
      setPolicy(loadedPolicy);
      setMinLength(data.min_length);
      setRequireUpper(data.require_uppercase);
      setRequireLower(data.require_lowercase);
      setRequireNumbers(data.require_numbers);
      setRequireSpecial(data.require_special);
    }
    setLoadingPolicy(false);
  }, [user]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t("settings.passwordMismatch"), variant: "destructive" });
      return;
    }

    const strength = checkPasswordStrength(newPassword, policy || undefined);
    if (strength.suggestions.length > 0) {
      toast({
        title: "كلمة المرور لا تستوفي الشروط الأمنية ⚠️",
        description: (
          <div className="space-y-1 mt-1 text-right animate-in fade-in-50 duration-200" dir="rtl">
            <p className="font-semibold text-destructive mb-1 text-[11px]">يجب استيفاء الشروط التالية:</p>
            <ul className="list-disc list-inside space-y-1 text-[10px] text-muted-foreground">
              {strength.suggestions.map((suggestion, idx) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${t("settings.passwordChanged")} ✅` });
      setNewPassword("");
      setConfirmPassword("");
      e.currentTarget.reset();
    }
    setLoading(false);
  };

  const handleSavePolicy = async () => {
    if (!user) return;
    setSavingPolicy(true);
    const nextPolicy: PasswordPolicy = {
      min_length: minLength,
      require_uppercase: requireUpper,
      require_lowercase: requireLower,
      require_numbers: requireNumbers,
      require_special: requireSpecial,
    };

    const { error } = await supabase
      .from("password_policies")
      .upsert(
        {
          user_id: user.id,
          ...nextPolicy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      toast({
        title: "خطأ في حفظ سياسة كلمة المرور",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "تم حفظ سياسة كلمة المرور بنجاح ✅" });
      setPolicy(nextPolicy);
    }
    setSavingPolicy(false);
  };

  const activePolicy = policy || DEFAULT_POLICY;
  const currentStrength = newPassword ? checkPasswordStrength(newPassword, activePolicy) : null;

  return (
    <div className="space-y-6">
      {/* Top 2-Column Bento Row: Password Update + Strength Policy */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div className="rounded-xl border border-border/60 bg-muted/15 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              {t("settings.securityTitle")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{t("settings.securityDesc")}</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.newPassword")}</Label>
              <Input
                name="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.confirmPassword")}</Label>
              <Input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-background"
              />
            </div>

            {newPassword && currentStrength && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-all duration-300"
                      style={{
                        background:
                          i < currentStrength.score ? currentStrength.color : "hsl(var(--muted))",
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold" style={{ color: currentStrength.color }}>
                    قوة كلمة المرور: {currentStrength.label}
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto gap-2">
              {loading ? (
                t("settings.updating")
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {t("settings.changePassword")}
                </>
              )}
            </Button>
          </form>
        </div>

        {isAdmin && (
          <div className="rounded-xl border border-border/60 bg-muted/15 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                قواعد تغيير كلمة مروري
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                تُطبق هذه القواعد عند تغيير كلمة مرور حسابك من هذه الصفحة فقط.
              </p>
            </div>

            {loadingPolicy ? (
              <div className="flex justify-center py-6" role="status">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : policyError ? (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  {locale === "en" ? "Could not load password rules." : "تعذّر تحميل قواعد كلمة المرور."}
                </p>
                <p className="text-xs text-muted-foreground">{policyError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadPolicy()}>
                  {locale === "en" ? "Retry" : "إعادة المحاولة"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">الحد الأدنى لطول كلمة المرور</Label>
                    <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {minLength} أحرف
                    </span>
                  </div>
                  <Input
                    type="range"
                    min={8}
                    max={20}
                    value={minLength}
                    onChange={(e) => setMinLength(clampMinLength(e.target.value))}
                    className="h-1.5 bg-secondary accent-primary transition-colors cursor-pointer"
                  />
                </div>

                <Separator className="opacity-40" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background p-2.5 border border-border/50">
                    <div>
                      <p className="text-xs font-medium text-foreground">أحرف كبيرة (A-Z)</p>
                    </div>
                    <Switch checked={requireUpper} onCheckedChange={setRequireUpper} />
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background p-2.5 border border-border/50">
                    <div>
                      <p className="text-xs font-medium text-foreground">أحرف صغيرة (a-z)</p>
                    </div>
                    <Switch checked={requireLower} onCheckedChange={setRequireLower} />
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background p-2.5 border border-border/50">
                    <div>
                      <p className="text-xs font-medium text-foreground">أرقام (0-9)</p>
                    </div>
                    <Switch checked={requireNumbers} onCheckedChange={setRequireNumbers} />
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg bg-background p-2.5 border border-border/50">
                    <div>
                      <p className="text-xs font-medium text-foreground">رموز خاصة (@#$)</p>
                    </div>
                    <Switch checked={requireSpecial} onCheckedChange={setRequireSpecial} />
                  </div>
                </div>

                <Button onClick={handleSavePolicy} disabled={savingPolicy} className="w-full gap-2">
                  {savingPolicy ? (
                    "جاري الحفظ..."
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      حفظ سياسة كلمة المرور
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Width PDPL / GDPR Data Retention Bento Panel */}
      {isAdmin && activeCompanyId && (
        <div className="rounded-xl border border-border/60 bg-muted/15 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              الاحتفاظ بالبيانات والامتثال (GDPR / PDPL السعودية)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              تحديد مدد الاحتفاظ ببيانات المرشحين المرفوضين وغير النشطين وسجلات التدقيق، ومعاينة وتنفيذ إخفاء الهوية التلقائي للامتثال.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="retention-candidate-days" className="text-xs font-semibold">احتفاظ المرشحين (يوم)</Label>
                  <Input
                    id="retention-candidate-days"
                    type="number"
                    min={30}
                    max={3650}
                    value={candidateRetentionDays}
                    onChange={(e) => setCandidateRetentionDays(Number(e.target.value))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retention-rejected-days" className="text-xs font-semibold">الطلبات المرفوضة (يوم)</Label>
                  <Input
                    id="retention-rejected-days"
                    type="number"
                    min={30}
                    max={1825}
                    value={rejectedRetentionDays}
                    onChange={(e) => setRejectedRetentionDays(Number(e.target.value))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="retention-audit-days" className="text-xs font-semibold">سجلات التدقيق (يوم)</Label>
                  <Input
                    id="retention-audit-days"
                    type="number"
                    min={90}
                    max={3650}
                    value={auditRetentionDays}
                    onChange={(e) => setAuditRetentionDays(Number(e.target.value))}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-background p-3 border border-border/50">
                <div>
                  <p className="text-xs font-semibold text-foreground">تفعيل التجهيل الدوري التلقائي للبيانات المنتهية</p>
                  <p className="text-[11px] text-muted-foreground">يُسجّل السياسة المعتمدة لتنفيذ إخفاء هوية المرشحين بعد انقضاء المدة.</p>
                </div>
                <Switch checked={autoAnonymizeEnabled} onCheckedChange={setAutoAnonymizeEnabled} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSaveRetentionPolicy()} disabled={savingRetention} className="gap-1.5">
                  <Check className="w-4 h-4" />
                  {savingRetention ? "جارٍ الحفظ..." : "حفظ سياسة الاحتفاظ بالبيانات"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleExecuteRetention(true)} disabled={executingRetention} className="bg-background">
                  معاينة السجلات المستحقة (Dry Run)
                </Button>
              </div>
            </div>

            <div className="xl:col-span-5 space-y-3">
              {retentionReport && (
                <div role="status" className="rounded-lg border bg-background p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    {retentionReport.dry_run
                      ? `عدد ملفات المرشحين المستحقة لإخفاء الهوية: ${retentionReport.eligible_candidates}`
                      : `تم تنفيذ إخفاء الهوية لـ ${retentionReport.anonymized_candidates} ملف مرشح بنجاح.`}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer leading-relaxed">
                  <input
                    type="checkbox"
                    checked={confirmRetentionAnonymize}
                    onChange={(e) => setConfirmRetentionAnonymize(e.target.checked)}
                    className="mt-1 shrink-0"
                  />
                  <span>أؤكد تنفيذ إخفاء البيانات الشخصية للمرشحين المنتهية مدتهم ولا يمكن التراجع عن التجهيل بعد التنفيذ.</span>
                </label>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!confirmRetentionAnonymize || executingRetention}
                  onClick={() => void handleExecuteRetention(false)}
                  className="w-full gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  تنفيذ إخفاء الهوية الآن (PDPL/GDPR)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
