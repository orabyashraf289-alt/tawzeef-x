import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { KeyRound, Shield, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { checkPasswordStrength } from "@/lib/security";

export default function SecuritySection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { role, isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Password Policy States
  const [policy, setPolicy] = useState<any>(null);
  const [minLength, setMinLength] = useState(8);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireLower, setRequireLower] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);

  // New Password Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load policy
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("password_policies" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPolicy(data);
        setMinLength(data.min_length);
        setRequireUpper(data.require_uppercase);
        setRequireLower(data.require_lowercase);
        setRequireNumbers(data.require_numbers);
        setRequireSpecial(data.require_special);
      }
    })();
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t("settings.passwordMismatch"), variant: "destructive" });
      return;
    }

    // Validate password against active policy
    const strength = checkPasswordStrength(newPassword, policy || undefined);
    if (strength.suggestions.length > 0) {
      toast({
        title: "كلمة المرور لا تستوفي الشروط الأمنية ⚠️",
        description: (
          <div className="space-y-1 mt-1 text-right animate-in fade-in-50 duration-200" dir="rtl">
            <p className="font-semibold text-destructive mb-1 text-[11px]">يجب استيفاء الشروط التالية:</p>
            <ul className="list-disc list-inside space-y-1 text-[10px] text-muted-foreground">
              {strength.suggestions.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.passwordChanged") + " ✅" });
      setNewPassword("");
      setConfirmPassword("");
      const form = e.target as HTMLFormElement;
      form.reset();
    }
    setLoading(false);
  };

  const handleSavePolicy = async () => {
    if (!user) return;
    setSavingPolicy(true);
    const { error } = await supabase
      .from("password_policies" as any)
      .upsert({
        user_id: user.id,
        min_length: minLength,
        require_uppercase: requireUpper,
        require_lowercase: requireLower,
        require_numbers: requireNumbers,
        require_special: requireSpecial,
        updated_at: new Date().toISOString()
      } as any, { onConflict: "user_id" });

    if (error) {
      toast({ title: "خطأ في حفظ سياسة كلمة المرور", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ سياسة كلمة المرور بنجاح ✅" });
      // Update local policy object so validation uses new values immediately
      setPolicy({
        user_id: user.id,
        min_length: minLength,
        require_uppercase: requireUpper,
        require_lowercase: requireLower,
        require_numbers: requireNumbers,
        require_special: requireSpecial
      });
    }
    setSavingPolicy(false);
  };

  const activePolicyObj = policy || {
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special: true
  };

  const currentStrength = newPassword ? checkPasswordStrength(newPassword, activePolicyObj) : null;

  return (
    <div className="space-y-8">
      {/* Change Password Form */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("settings.securityTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.securityDesc")}</p>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("settings.newPassword")}</Label>
            <Input 
              name="newPassword" 
              type="password" 
              placeholder="••••••••" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required 
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
            />
          </div>

          {/* Password Strength Meter */}
          {newPassword && currentStrength && (
            <div className="space-y-2 mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: i < currentStrength.score ? currentStrength.color : "hsl(var(--muted))",
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

          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? t("settings.updating") : <><KeyRound className="w-4 h-4" />{t("settings.changePassword")}</>}
          </Button>
        </form>
      </div>

      {/* Customizable Password Policy Section (Admins Only) */}
      {isAdmin && (
        <div className="space-y-6 pt-6 border-t border-border/60">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              سياسة كلمة المرور المخصصة
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              قم بتهيئة القواعد الأمنية لكلمات المرور المطلوبة من أعضاء الفريق والمسؤولين.
            </p>
          </div>

          <div className="bg-muted/20 border border-border/40 rounded-xl p-5 space-y-5 max-w-xl">
            {/* Minimum Length */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">الحد الأدنى لطول كلمة المرور</Label>
                <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {minLength} أحرف
                </span>
              </div>
              <Input
                type="range"
                min={6}
                max={20}
                value={minLength}
                onChange={(e) => setMinLength(parseInt(e.target.value))}
                className="h-1.5 bg-secondary accent-primary transition-colors cursor-pointer"
              />
            </div>

            <Separator className="opacity-40" />

            {/* Toggle Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">تطلب أحرفاً كبيرة (A-Z)</p>
                  <p className="text-[10px] text-muted-foreground">يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل.</p>
                </div>
                <Switch checked={requireUpper} onCheckedChange={setRequireUpper} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">تطلب أحرفاً صغيرة (a-z)</p>
                  <p className="text-[10px] text-muted-foreground">يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل.</p>
                </div>
                <Switch checked={requireLower} onCheckedChange={setRequireLower} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">تطلب أرقاماً (0-9)</p>
                  <p className="text-[10px] text-muted-foreground">يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.</p>
                </div>
                <Switch checked={requireNumbers} onCheckedChange={setRequireNumbers} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">تطلب رموزاً خاصة (@, #, $ ...)</p>
                  <p className="text-[10px] text-muted-foreground">يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل.</p>
                </div>
                <Switch checked={requireSpecial} onCheckedChange={setRequireSpecial} />
              </div>
            </div>

            <Button onClick={handleSavePolicy} disabled={savingPolicy} className="w-full gap-2 mt-2">
              {savingPolicy ? "جاري الحفظ..." : <><Check className="w-4 h-4" />حفظ سياسة كلمة المرور</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
