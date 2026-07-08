import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User, Mail, Shield, Calendar, Bell, Target, Settings2, Webhook, ChevronLeft,
  Palette, KeyRound, Building2, Globe, Camera, Check, Linkedin, ExternalLink, Zap, Image, Trash2, GitBranch, Bookmark, Users, Clock, Loader2, Info
} from "lucide-react";
import SavedFiltersManager from "@/components/SavedFiltersManager";
import EmailSettings from "@/components/EmailSettings";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import WebhookSettings from "@/components/WebhookSettings";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PipelineStagesManager from "@/components/PipelineStagesManager";
import { useUserRole } from "@/hooks/useUserRole";
import { checkPasswordStrength } from "@/lib/security";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCompanyMembers, useRemoveCompanyMember } from "@/hooks/useCompanies";
import { useCompanyInvitations, useCreateCompanyInvitation, useCancelInvitation } from "@/hooks/useCompanyInvitations";

/* ─── Hiring Goals ─── */
function HiringGoalsSection() {
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

/* ─── Account Section ─── */
function AccountSection() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url, job_title").eq("user_id", user.id).single().then(({ data }: any) => {
      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || null);
        setJobTitle(data.job_title || "");
      }
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("settings.avatarTooLarge"), variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Error", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: newUrl } as any).eq("user_id", user.id);
    setAvatarUrl(newUrl);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast({ title: t("settings.avatarUpdated") });
    setUploading(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploading(true);
    await supabase.from("profiles").update({ avatar_url: null } as any).eq("user_id", user.id);
    setAvatarUrl(null);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast({ title: t("settings.avatarRemoved") });
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, job_title: jobTitle } as any).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
      toast({ title: t("settings.profileSaved") });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.profileTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.profileDesc")}</p>
      </div>

      <div className="flex items-start gap-5">
        <div className="relative group">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-border/50 shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-border/50 flex items-center justify-center shadow-sm">
              <User className="w-8 h-8 text-primary/70" />
            </div>
          )}
          <label className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
          {avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive/10"
              title={t("settings.removeAvatar")}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-background/60 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t("settings.fullName")}</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={t("settings.fullNamePlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("settings.jobTitleLabel")}</Label>
            <Input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder={t("settings.jobTitlePlaceholder")}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      <div className="space-y-3">
        <InfoRow icon={Mail} label={t("settings.emailLabel")} value={user?.email || "—"} />
        <InfoRow icon={Calendar} label={t("settings.joinDate")} value={user?.created_at ? new Date(user.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
        <InfoRow icon={Shield} label={t("settings.accountStatus")} value={t("settings.active")} badge />
      </div>

      <Button onClick={handleSaveProfile} disabled={loading} className="gap-2">
        {loading ? t("common.saving") : <><Check className="w-4 h-4" />{t("settings.saveChanges")}</>}
      </Button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
      <div className="p-2 rounded-lg bg-primary/8">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {badge ? (
          <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 mt-0.5">
            <Check className="w-3 h-3 ml-1" />{value}
          </Badge>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Security Section ─── */
function SecuritySection() {
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

/* ─── Notifications Section ─── */
function NotificationsSection() {
  const { t } = useI18n();
  const prefs = [
    { label: t("settings.notifNewApplications"), desc: t("settings.notifNewApplicationsDesc"), icon: "📩" },
    { label: t("settings.notifInterviewReminders"), desc: t("settings.notifInterviewRemindersDesc"), icon: "⏰" },
    { label: t("settings.notifCandidateUpdates"), desc: t("settings.notifCandidateUpdatesDesc"), icon: "👤" },
    { label: t("settings.notifBrowserPush"), desc: t("settings.notifBrowserPushDesc"), icon: "🔔" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.notificationsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.notificationsDesc")}</p>
      </div>
      <div className="space-y-2">
        {prefs.map((pref, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">{pref.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{pref.label}</p>
                <p className="text-[11px] text-muted-foreground">{pref.desc}</p>
              </div>
            </div>
            <Switch defaultChecked onClick={() => {
              if (i === 3 && "Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission();
              }
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── LinkedIn Integration Section ─── */
function LinkedInSection() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("linkedin_settings" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setWebhookUrl(data.zapier_webhook_url || "");
          setIsActive(data.is_active ?? true);
        }
        setLoaded(true);
      });

    // Load delivery log
    supabase
      .from("linkedin_deliveries" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        if (data) setDeliveries(data);
      });
  }, [user]);

  const isValidZapierUrl = (url: string) =>
    !url || url.startsWith("https://hooks.zapier.com/");

  const handleSave = async () => {
    if (!user) return;
    if (webhookUrl && !isValidZapierUrl(webhookUrl)) {
      toast({ title: t("settings.linkedinInvalidUrl"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("linkedin_settings" as any)
      .upsert({ user_id: user.id, zapier_webhook_url: webhookUrl, is_active: isActive } as any, { onConflict: "user_id" });
    if (error) toast({ title: t("settings.linkedinWebhookSaveError"), description: error.message, variant: "destructive" });
    else toast({ title: t("settings.linkedinWebhookSaved") });
    setLoading(false);
  };

  const handleTest = async () => {
    if (!webhookUrl) return;
    if (!isValidZapierUrl(webhookUrl)) {
      toast({ title: t("settings.linkedinInvalidUrl"), variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          event: "job.created",
          timestamp: new Date().toISOString(),
          data: {
            job_title: "وظيفة تجريبية - Test Job",
            department: "الهندسة",
            location: "الرياض",
            type: "دوام كامل",
            apply_url: "https://example.com/apply/test",
            description: "هذا اختبار للنشر التلقائي على LinkedIn",
          },
        }),
      });
      toast({ title: t("settings.linkedinTestSent") });
    } catch {
      toast({ title: t("settings.linkedinTestError"), variant: "destructive" });
    }
    setTesting(false);
  };

  const urlInvalid = webhookUrl.length > 0 && !isValidZapierUrl(webhookUrl);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-[#0A66C2]" />
          {t("settings.linkedinTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.linkedinDesc")}</p>
      </div>

      {/* Manual Sharing */}
      <div className="rounded-xl border border-border/50 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center shrink-0">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{t("settings.linkedinManualTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("settings.linkedinManualDesc")}</p>
          </div>
        </div>
      </div>

      {/* OG Preview */}
      <div className="rounded-xl border border-border/50 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Image className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{t("settings.linkedinOgTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("settings.linkedinOgDesc")}</p>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border border-border/30 bg-muted/20">
          <div className="h-28 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0d9488]/40 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/90 font-bold text-sm">مطور واجهات أمامية</p>
              <p className="text-white/50 text-xs mt-1">الهندسة · الرياض · دوام كامل</p>
            </div>
          </div>
          <div className="p-3">
            <p className="text-[11px] text-muted-foreground">ai-hire-buddy-22.lovable.app</p>
            <p className="text-xs font-medium text-foreground mt-0.5">Tawzeef-X - فرصة وظيفية</p>
          </div>
        </div>
      </div>

      {/* Zapier Webhook - Main CTA */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">{t("settings.linkedinAutoTitle")}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {isActive ? t("settings.linkedinWebhookActive") : t("settings.linkedinWebhookInactive")}
                </span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("settings.linkedinAutoDesc")}</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2.5">
          {[
            t("settings.linkedinAutoStep1"),
            t("settings.linkedinAutoStep2"),
            t("settings.linkedinAutoStep3"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Webhook URL Input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("settings.linkedinWebhookUrl")}</Label>
          <Input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder={t("settings.linkedinWebhookPlaceholder")}
            dir="ltr"
            className={cn("font-mono text-sm", urlInvalid && "border-destructive focus-visible:ring-destructive")}
          />
          {urlInvalid && (
            <p className="text-xs text-destructive">{t("settings.linkedinInvalidUrl")}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={loading || urlInvalid} className="gap-2">
            {loading ? t("common.saving") : <><Check className="w-4 h-4" />{t("settings.linkedinSaveWebhook")}</>}
          </Button>
          {webhookUrl && !urlInvalid && (
            <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              {testing ? "..." : t("settings.linkedinTestWebhook")}
            </Button>
          )}
        </div>
      </div>

      {/* Delivery Log */}
      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{t("settings.linkedinDeliveryLog")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("settings.linkedinDeliveryLogDesc")}</p>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">{t("settings.linkedinNoDeliveries")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    d.status === "success" ? "bg-green-500" : "bg-destructive"
                  )} />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {(d.payload as any)?.job_title || d.event_type}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.error_message || (d.status === "success" ? t("settings.linkedinDeliverySuccess") : t("settings.linkedinDeliveryFailed"))}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    d.status === "success" ? "border-green-500/30 text-green-600" : "border-destructive/30 text-destructive"
                  )}>
                    {d.status === "success" ? t("settings.linkedinDeliverySuccess") : t("settings.linkedinDeliveryFailed")}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(d.created_at).toLocaleString(locale === "en" ? "en-US" : "ar-SA", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Company Settings Section ─── */
function CompanySection() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const { role: globalRole, isAdmin } = useUserRole();
  const [e2eEnabled, setE2eEnabled] = useState(false);

  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("SA");
  const [notes, setNotes] = useState("");
  const [companySize, setCompanySize] = useState("");

  const { primaryColor, setPrimaryColor } = useTheme();

  const [brandPrimary, setBrandPrimary] = useState("#0d9488");
  const [brandAccent, setBrandAccent] = useState("#14b8a6");
  const [brandFont, setBrandFont] = useState("Cairo, sans-serif");
  const [brandQrForeground, setBrandQrForeground] = useState("#0f172a");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("company_name, company_logo").eq("user_id", user.id).single().then(({ data }: any) => {
      if (data) {
        setCompanyName(data.company_name || "");
        setCompanyLogo(data.company_logo || null);
      }
    });

    supabase.from("company_members")
      .select("company_id, member_role")
      .eq("user_id", user.id)
      .then(({ data }: any) => {
        const memberData = data && data.length > 0 ? data[0] : null;
        if (memberData?.company_id) {
          setCompanyId(memberData.company_id);
          setMemberRole(memberData.member_role || null);
          supabase.from("companies")
            .select("name, logo_url, website, industry, country, city, notes, e2e_encryption, brand_settings")
            .eq("id", memberData.company_id)
            .maybeSingle()
            .then(({ data: compData }: any) => {
              if (compData) {
                setCompanyName(compData.name || "");
                setCompanyLogo(compData.logo_url || null);
                setWebsite(compData.website || "");
                setIndustry(compData.industry || "");
                setCity(compData.city || "");
                setCountry(compData.country || "SA");
                setE2eEnabled(!!compData.e2e_encryption);

                if (compData.brand_settings) {
                  const bs = compData.brand_settings;
                  setBrandPrimary(bs.primaryColor || "#0d9488");
                  setBrandAccent(bs.accentColor || "#14b8a6");
                  setBrandFont(bs.fontFamily || "Cairo, sans-serif");
                  setBrandQrForeground(bs.qrForeground || "#0f172a");
                }

                // Parse structured size and description from notes
                const rawNotes = compData.notes;
                if (rawNotes && rawNotes.startsWith("{")) {
                  try {
                    const parsed = JSON.parse(rawNotes);
                    setCompanySize(parsed.size || "");
                    setNotes(parsed.description || "");
                  } catch (e) {
                    setNotes(rawNotes);
                  }
                } else {
                  setNotes(rawNotes || "");
                }
              }
            });
        }
      });
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: locale === "en" ? "Logo too large (max 2MB)" : "حجم الشعار كبير (الحد 2 ميجا)", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/company-logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Error", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ company_logo: newUrl } as any).eq("user_id", user.id);
    if (companyId) {
      await supabase.from("companies").update({ logo_url: newUrl } as any).eq("id", companyId);
    }
    setCompanyLogo(newUrl);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast({ title: locale === "en" ? "Logo updated ✅" : "تم تحديث الشعار ✅" });
    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    setUploading(true);
    await supabase.from("profiles").update({ company_logo: null } as any).eq("user_id", user.id);
    if (companyId) {
      await supabase.from("companies").update({ logo_url: null } as any).eq("id", companyId);
    }
    setCompanyLogo(null);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast({ title: locale === "en" ? "Logo removed" : "تم إزالة الشعار" });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ company_name: companyName } as any).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rawNotesString = JSON.stringify({ size: companySize, description: notes });

    if (companyId) {
      const { error: compErr } = await supabase.from("companies").update({
        name: companyName,
        logo_url: companyLogo,
        website: website,
        industry: industry,
        city: city,
        country: country,
        notes: rawNotesString,
        e2e_encryption: e2eEnabled,
        brand_settings: {
          primaryColor: brandPrimary,
          accentColor: brandAccent,
          fontFamily: brandFont,
          qrForeground: brandQrForeground
        }
      } as any).eq("id", companyId);

      if (compErr) {
        toast({ title: "Error updating company settings", description: compErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      // Create new company
      const { data: newComp, error: compErr } = await supabase.from("companies").insert({
        name: companyName,
        logo_url: companyLogo,
        website: website,
        industry: industry,
        city: city,
        country: country,
        notes: rawNotesString,
        e2e_encryption: e2eEnabled,
        owner_user_id: user.id,
        status: "active",
        brand_settings: {
          primaryColor: brandPrimary,
          accentColor: brandAccent,
          fontFamily: brandFont,
          qrForeground: brandQrForeground
        }
      } as any).select().single();

      if (compErr) {
        toast({ title: "Error creating company settings", description: compErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (newComp) {
        setCompanyId(newComp.id);
        // Link recruiter as owner
        const { error: memberErr } = await supabase.from("company_members").insert({
          company_id: newComp.id,
          user_id: user.id,
          member_role: "owner"
        } as any);

        if (memberErr) {
          console.error("Error creating company member entry:", memberErr);
        }

        // Backfill company_id for all existing recruiter items
        await supabase.from("jobs").update({ company_id: newComp.id } as any).eq("user_id", user.id).is("company_id", null);
        await supabase.from("candidates").update({ company_id: newComp.id } as any).eq("user_id", user.id).is("company_id", null);
        await supabase.from("interviews").update({ company_id: newComp.id } as any).eq("user_id", user.id).is("company_id", null);
        await supabase.from("job_offers").update({ company_id: newComp.id } as any).eq("user_id", user.id).is("company_id", null);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast({ title: locale === "en" ? "Company info saved ✅" : "تم حفظ بيانات الشركة ✅" });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{locale === "en" ? "Company Settings" : "إعدادات الشركة"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{locale === "en" ? "Update your company name, logo, and branding" : "تعديل اسم الشركة والشعار والهوية البصرية"}</p>
      </div>

      <div className="flex items-start gap-5">
        <div className="relative group">
          {companyLogo ? (
            <img src={companyLogo} alt="company logo" className="w-20 h-20 rounded-2xl object-contain border-2 border-border/50 shadow-sm bg-card p-1" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-border/50 flex items-center justify-center shadow-sm">
              <Building2 className="w-8 h-8 text-primary/70" />
            </div>
          )}
          <label className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          </label>
          {companyLogo && (
            <button
              onClick={handleRemoveLogo}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-background/60 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{locale === "en" ? "Company Name" : "اسم الشركة"}</Label>
              <Input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder={locale === "en" ? "Enter company name" : "أدخل اسم الشركة"}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{locale === "en" ? "Website" : "الموقع الإلكتروني"}</Label>
              <Input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{locale === "en" ? "Industry / Activity" : "مجال العمل / النشاط"}</Label>
              <Input
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder={locale === "en" ? "e.g. Technology, Healthcare" : "مثال: تقنية معلومات، الرعاية الصحية"}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{locale === "en" ? "Company Size" : "حجم الشركة (عدد الموظفين)"}</Label>
              <select
                value={companySize}
                onChange={e => setCompanySize(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
              >
                <option value="">{locale === "en" ? "Select size..." : "اختر الحجم..."}</option>
                <option value="1-10">١ - ١٠ موظفين</option>
                <option value="11-50">١١ - ٥٠ موظفاً</option>
                <option value="51-200">٥١ - ٢٠٠ موظف</option>
                <option value="201-500">٢٠١ - ٥٠٠ موظف</option>
                <option value="501-1000">٥٠١ - ١٠٠٠ موظف</option>
                <option value="1000+">أكثر من ١٠٠٠ موظف</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{locale === "en" ? "City" : "المدينة"}</Label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder={locale === "en" ? "e.g. Riyadh" : "مثال: الرياض"}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{locale === "en" ? "Country" : "الدولة"}</Label>
              <Input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder={locale === "en" ? "e.g. Saudi Arabia" : "مثال: المملكة العربية السعودية"}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{locale === "en" ? "Company Description" : "نبذة عن نشاط الشركة"}</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={locale === "en" ? "Describe your company..." : "اكتب نبذة تعريفية قصيرة عن الشركة..."}
              className="mt-1 min-h-[80px]"
            />
          </div>

          {companyId && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 mt-4">
              <div className="space-y-0.5 text-right">
                <Label className="text-sm font-bold text-foreground">
                  {locale === "en" ? "End-to-End Encryption" : "التشفيـر الشامـل (E2E)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {locale === "en" 
                    ? "Encrypt candidate notes and expected salaries locally before saving" 
                    : "تشفير ملاحظات المرشحين وتوقعات الرواتب محلياً قبل حفظها لقاعدة البيانات"}
                </p>
              </div>
              <Switch checked={e2eEnabled} onCheckedChange={setE2eEnabled} className="ms-4" />
            </div>
          )}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Theme selection section */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-sm text-foreground">{locale === "en" ? "Platform Branding Theme" : "هوية ثيم المنصة (الألوان)"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {locale === "en" 
              ? "Choose the primary accent color for your recruitment workspace" 
              : "اختر اللون الرئيسي الذي يتناسب مع هوية شركتك ليتم تطبيقه على كامل المنصة"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1.5">
          {[
            { name: "أخضر سعودي (الافتراضي)", value: "160 84% 25%", colorClass: "bg-[#0b5f43]" },
            { name: "أزرق ملكي", value: "221 83% 45%", colorClass: "bg-[#0f52ba]" },
            { name: "بنفسجي إمبراطوري", value: "262 83% 48%", colorClass: "bg-[#6c3082]" },
            { name: "أحمر قرمزي", value: "347 77% 42%", colorClass: "bg-[#9b111e]" },
            { name: "ذهبي ناري", value: "24 95% 45%", colorClass: "bg-[#d4af37]" }
          ].map((color) => {
            const isSelected = primaryColor === color.value;
            return (
              <button
                key={color.value}
                onClick={() => setPrimaryColor(color.value)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-right",
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-border hover:bg-muted/30"
                )}
              >
                <div className={cn("w-6 h-6 rounded-full shrink-0 flex items-center justify-center shadow-sm", color.colorClass)}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[11px] text-foreground truncate">{color.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* QR Poster Branding */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-sm text-foreground">
            {locale === "en" ? "Branded QR Job Posters" : "الهوية البصرية لملصقات الـ QR للوظائف"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {locale === "en"
              ? "Customize the visual theme, colors, and typography used for printing and sharing job QR codes"
              : "تخصيص الهوية البصرية، الألوان، والخطوط المستخدمة في طباعة ومشاركة باركودات وملصقات التوظيف"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">{locale === "en" ? "Primary Brand Color" : "اللون الرئيسي للعلامة"}</Label>
            <div className="flex gap-2 mt-1.5">
              <Input type="color" value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} className="w-10 h-10 p-1.5 rounded-lg cursor-pointer shrink-0" />
              <Input value={brandPrimary} onChange={e => setBrandPrimary(e.target.value)} placeholder="#0d9488" className="font-mono text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{locale === "en" ? "Accent Color" : "اللون المساعد (Accent)"}</Label>
            <div className="flex gap-2 mt-1.5">
              <Input type="color" value={brandAccent} onChange={e => setBrandAccent(e.target.value)} className="w-10 h-10 p-1.5 rounded-lg cursor-pointer shrink-0" />
              <Input value={brandAccent} onChange={e => setBrandAccent(e.target.value)} placeholder="#14b8a6" className="font-mono text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{locale === "en" ? "QR Code Color" : "لون الباركود (QR Modules)"}</Label>
            <div className="flex gap-2 mt-1.5">
              <Input type="color" value={brandQrForeground} onChange={e => setBrandQrForeground(e.target.value)} className="w-10 h-10 p-1.5 rounded-lg cursor-pointer shrink-0" />
              <Input value={brandQrForeground} onChange={e => setBrandQrForeground(e.target.value)} placeholder="#0f172a" className="font-mono text-xs" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{locale === "en" ? "Poster Font Family" : "نوع الخط للملصقات"}</Label>
            <select
              value={brandFont}
              onChange={e => setBrandFont(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
            >
              <option value="Cairo, sans-serif">Cairo (الافتراضي)</option>
              <option value="Tajawal, sans-serif">Tajawal</option>
              <option value="Inter, sans-serif">Inter</option>
              <option value="Outfit, sans-serif">Outfit</option>
              <option value="Roboto, sans-serif">Roboto</option>
            </select>
          </div>
        </div>
      </div>

      {companyId && (
        <CompanyMembersSection companyId={companyId} memberRole={memberRole} isAdmin={isAdmin} />
      )}

      <Separator className="opacity-50" />

      <Button onClick={handleSave} disabled={loading} className="gap-2">
        {loading ? (locale === "en" ? "Saving..." : "جاري الحفظ...") : <><Check className="w-4 h-4" />{locale === "en" ? "Save Changes" : "حفظ التغييرات"}</>}
      </Button>
    </div>
  );
}

function CompanyMembersSection({ companyId, memberRole, isAdmin }: { companyId: string; memberRole: string | null; isAdmin: boolean }) {
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const canManage = memberRole === "owner" || isAdmin;

  // 1) Fetch current company members
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["settings-company-members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members" as any)
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      
      const enriched = await Promise.all(data.map(async (m: any) => {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, job_title")
          .eq("user_id", m.user_id)
          .maybeSingle();
        return {
          ...m,
          name: prof?.full_name || "مستخدم غير معرف",
          avatar_url: prof?.avatar_url || null,
          job_title: prof?.job_title || ""
        };
      }));
      return enriched;
    },
    enabled: !!companyId
  });

  // 2) Fetch invitations
  const { data: invitations = [], refetch: refetchInvites } = useCompanyInvitations(companyId);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "hr" | "viewer">("hr");
  const [inviting, setInviting] = useState(false);

  const createInvite = useCreateCompanyInvitation();
  const cancelInvite = useCancelInvitation();
  const removeMember = useRemoveCompanyMember();

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await createInvite.mutateAsync({
        company_id: companyId,
        email: inviteEmail.trim(),
        member_role: inviteRole
      });
      setInviteEmail("");
      refetchInvites();
    } catch (err: any) {
      // Error handled by hook
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("company_members" as any)
        .update({ member_role: newRole })
        .eq("id", memberId);
      if (error) throw error;
      toast({ title: locale === "en" ? "Role updated successfully" : "تم تحديث دور العضو بنجاح ✅" });
      refetchMembers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({ title: locale === "en" ? "You cannot remove yourself" : "لا يمكنك إزالة نفسك من الشركة", variant: "destructive" });
      return;
    }
    // Check if they are the last owner
    const owners = members.filter((m: any) => m.member_role === "owner");
    const removingMember = members.find((m: any) => m.id === memberId);
    if (removingMember?.member_role === "owner" && owners.length <= 1) {
      toast({ title: locale === "en" ? "Cannot remove the only company owner" : "لا يمكن إزالة المالك الوحيد للشركة", variant: "destructive" });
      return;
    }

    try {
      await removeMember.mutateAsync(memberId);
      toast({ title: locale === "en" ? "Member removed" : "تم إزالة العضو بنجاح" });
      refetchMembers();
    } catch (err: any) {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-border/40 text-right" dir="rtl">
      <div>
        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" />
          {locale === "en" ? "Company Members & Team Management" : "إدارة أعضاء الفريق وموظفي الشركة"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {locale === "en" 
            ? "Invite team members, manage permissions, and assign roles within the company" 
            : "دعوة موظفي الشركة الجدد، وإدارة صلاحياتهم وأدوارهم الوظيفية"}
        </p>
      </div>

      {/* Invite Member Form */}
      {canManage ? (
        <Card className="p-4 bg-muted/10 border-border/30 space-y-4">
          <h4 className="text-xs font-bold text-foreground">{locale === "en" ? "Invite a New Member" : "دعوة عضو جديد للفريق"}</h4>
          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="inviteEmail" className="text-[10px] text-muted-foreground">{locale === "en" ? "Email Address" : "البريد الإلكتروني"}</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="h-9 text-xs text-right"
                required
              />
            </div>
            
            <div className="w-full sm:w-36 space-y-1">
              <Label htmlFor="inviteRole" className="text-[10px] text-muted-foreground">{locale === "en" ? "Role" : "الدور الوظيفي"}</Label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="hr">{locale === "en" ? "HR Manager" : "مدير توظيف (HR)"}</option>
                <option value="viewer">{locale === "en" ? "Viewer" : "مشاهد فقط"}</option>
                <option value="owner">{locale === "en" ? "Owner" : "مالك الشركة"}</option>
              </select>
            </div>

            <Button type="submit" disabled={inviting || createInvite.isPending} className="self-end h-9 text-xs">
              {inviting || createInvite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (locale === "en" ? "Send Invitation" : "إرسال الدعوة")}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-3 bg-muted/5 border-border/20 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>{locale === "en" ? "Only company owners can invite new members." : "إرسال الدعوات وإضافة الأعضاء متاح لمالك الشركة فقط."}</span>
        </Card>
      )}

      {/* Pending Invitations list */}
      {canManage && invitations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-warning" />
            {locale === "en" ? "Pending Invitations" : "الدعوات المعلقة بانتظار القبول"} ({invitations.length})
          </h4>
          <div className="space-y-1.5">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="p-2.5 bg-background border border-border/50 rounded-xl flex items-center justify-between text-xs">
                <div className="min-w-0 text-right">
                  <p className="font-semibold truncate">{inv.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {locale === "en" ? "Role: " : "دور: "}{inv.member_role === "owner" ? "مالك" : inv.member_role === "hr" ? "HR" : "مشاهد"} • {locale === "en" ? "Invited by " : "بواسطة "}{inv.invited_by === user?.id ? "أنت" : "مسؤول آخر"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive text-[11px] h-7 hover:bg-destructive/5"
                  onClick={async () => {
                    await cancelInvite.mutateAsync(inv.id);
                    refetchInvites();
                  }}
                  disabled={cancelInvite.isPending}
                >
                  {cancelInvite.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (locale === "en" ? "Cancel" : "إلغاء الدعوة")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Team Members list */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-foreground">{locale === "en" ? "Current Members" : "أعضاء الفريق الحاليين"} ({members.length})</h4>
        <div className="grid grid-cols-1 gap-2">
          {members.map((m: any) => {
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.id} className="p-3 bg-background border border-border/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-border/30">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-xs truncate">{m.name}</p>
                      {isMe && <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-primary/10 text-primary">{locale === "en" ? "You" : "أنت"}</Badge>}
                    </div>
                    {m.job_title && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.job_title}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Role selection dropdown */}
                  <select
                    value={m.member_role}
                    onChange={e => handleUpdateRole(m.id, e.target.value)}
                    disabled={isMe || !canManage}
                    className="h-8 rounded-md border border-input bg-background px-2 py-0 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="hr">{locale === "en" ? "HR Manager" : "مدير توظيف (HR)"}</option>
                    <option value="viewer">{locale === "en" ? "Viewer" : "مشاهد فقط"}</option>
                    <option value="owner">{locale === "en" ? "Owner" : "مالك"}</option>
                  </select>

                  {/* Remove Member button */}
                  {!isMe && canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-destructive hover:bg-destructive/5"
                      onClick={() => handleRemoveMember(m.id, m.user_id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreferencesSection() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    return localStorage.getItem("workspace-animations") !== "false";
  });
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    return localStorage.getItem("workspace-shortcuts") !== "false";
  });

  const handleAnimationsChange = (checked: boolean) => {
    setAnimationsEnabled(checked);
    localStorage.setItem("workspace-animations", String(checked));
    toast({
      title: locale === "en" ? "Animations Updated" : "تم تحديث المؤثرات الحركية",
      description: locale === "en" ? "Page transitions have been updated." : "تم حفظ تفضيلات حركة الصفحات بنجاح."
    });
  };

  const handleShortcutsChange = (checked: boolean) => {
    setShortcutsEnabled(checked);
    localStorage.setItem("workspace-shortcuts", String(checked));
    toast({
      title: locale === "en" ? "Shortcuts Updated" : "تم تحديث الاختصارات",
      description: locale === "en" ? "Keyboard shortcuts preference saved." : "تم حفظ تفضيلات اختصارات لوحة المفاتيح."
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          {locale === "en" ? "Platform Preferences" : "تفضيلات ومظهر المنصة"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === "en" 
            ? "Customize your personal interface theme, language, and accessibility preferences" 
            : "تخصيص المظهر الشخصي، لغة واجهة المستخدم، وخيارات سهولة الاستخدام للمنصة"}
        </p>
      </div>

      {/* Language Selector */}
      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">{locale === "en" ? "Interface Language" : "لغة واجهة المستخدم"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en" ? "Select the primary display language of the system" : "اختر لغة العرض الرئيسية للنظام والواجهات"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setLocale("ar")}
            className={cn(
              "p-3 rounded-xl border-2 text-center transition-all",
              locale === "ar" ? "border-primary bg-primary/5 font-bold text-primary" : "border-border/50 hover:bg-muted/30 text-muted-foreground"
            )}
          >
            العربية (AR)
          </button>
          <button
            onClick={() => setLocale("en")}
            className={cn(
              "p-3 rounded-xl border-2 text-center transition-all",
              locale === "en" ? "border-primary bg-primary/5 font-bold text-primary" : "border-border/50 hover:bg-muted/30 text-muted-foreground"
            )}
          >
            English (EN)
          </button>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">{locale === "en" ? "Display Mode" : "مظهر شاشة المنصة"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en" ? "Toggle between Light and Dark color schemes" : "التبديل بين المظهر الفاتح والمظلم للمنصة"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg">
          {[
            { id: "light", label: locale === "en" ? "Light Mode" : "مظهر فاتح", icon: "☀️" },
            { id: "dark", label: locale === "en" ? "Dark Mode" : "مظهر مظلم", icon: "🌙" },
            { id: "system", label: locale === "en" ? "System" : "تلقائي", icon: "💻" }
          ].map((mode) => {
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setTheme(mode.id as any)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all",
                  isSelected ? "border-primary bg-primary/5 font-bold text-primary" : "border-border/50 hover:bg-muted/30 text-muted-foreground"
                )}
              >
                <span className="text-lg">{mode.icon}</span>
                <span className="text-xs">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accessibility & Interface Options */}
      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">{locale === "en" ? "Accessibility & System Settings" : "خيارات واجهة الاستخدام والنظام"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en" ? "Optimize screen experience and efficiency options" : "خيارات مخصصة لتحسين كفاءة وتجربة شاشات العمل"}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Page Transitions Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {locale === "en" ? "Enable Page Transitions & Animations" : "تفعيل الحركات والمؤثرات الانتقالية"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {locale === "en" ? "Render fluid animations when navigating between pages" : "عرض مؤثرات بصرية مريحة عند الانتقال بين صفحات النظام"}
              </p>
            </div>
            <Switch checked={animationsEnabled} onCheckedChange={handleAnimationsChange} />
          </div>

          <Separator className="opacity-45" />

          {/* Keyboard Shortcuts Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {locale === "en" ? "Enable Keyboard Shortcuts HUD" : "تفعيل اختصارات لوحة المفاتيح الذكية"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {locale === "en" ? "Access navigation actions using hotkeys (e.g. Cmd+K)" : "استخدام لوحة المفاتيح للانتقال السريع والبحث الذكي (Cmd+K)"}
              </p>
            </div>
            <Switch checked={shortcutsEnabled} onCheckedChange={handleShortcutsChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SettingsPage() {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState("account");

  const settingsTabs = [
    { id: "account", label: t("settings.profile"), icon: User },
    { id: "company", label: "الشركة", icon: Building2 },
    { id: "preferences", label: locale === "en" ? "Preferences" : "تفضيلات المنصة", icon: Palette },
    { id: "pipeline", label: "مراحل التوظيف", icon: GitBranch },
    { id: "filters", label: "الفلاتر المحفوظة", icon: Bookmark },
    { id: "security", label: t("settings.security"), icon: Shield },
    { id: "goals", label: t("settings.hiringGoals"), icon: Target },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "linkedin", label: t("settings.linkedin"), icon: Linkedin },
    { id: "email", label: t("settings.email"), icon: Mail },
    { id: "webhooks", label: t("settings.webhooks"), icon: Webhook },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/8">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
            </div>
          </div>
        </motion.div>
 
        <div className="flex flex-col lg:flex-row gap-6">
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:w-56 shrink-0"
          >
            <div className="lg:sticky lg:top-24 bg-card rounded-2xl border border-border/50 p-2 space-y-0.5">
              {settingsTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-right",
                      isActive
                        ? "bg-primary/8 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-tab-indicator"
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.nav>
 
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            <div className="bg-card rounded-2xl border border-border/50 p-5 sm:p-7 max-w-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "account" && <AccountSection />}
                  {activeTab === "company" && <CompanySection />}
                  {activeTab === "preferences" && <PreferencesSection />}
                  {activeTab === "pipeline" && <PipelineStagesManager />}
                  {activeTab === "filters" && <SavedFiltersManager />}
                  {activeTab === "security" && <SecuritySection />}
                  {activeTab === "goals" && <HiringGoalsSection />}
                  {activeTab === "notifications" && <NotificationsSection />}
                  {activeTab === "email" && <EmailSettings />}
                  {activeTab === "linkedin" && <LinkedInSection />}
                  {activeTab === "webhooks" && <WebhookSettings />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
