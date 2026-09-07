import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Linkedin, Trash2, Settings2, ChevronUp, ChevronDown, Info, Zap,
  ExternalLink, Image, Calendar, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LinkedInSection() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  // Direct OAuth Integration States
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [linkedinUrn, setLinkedinUrn] = useState<string | null>(null);
  const [linkedinName, setLinkedinName] = useState<string | null>(null);
  const [linkedinAvatar, setLinkedinAvatar] = useState<string | null>(null);
  const [customClientId, setCustomClientId] = useState("");
  const [customClientSecret, setCustomClientSecret] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Load and refresh state
  const loadSettings = () => {
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
          setAccessToken(data.access_token || null);
          setLinkedinUrn(data.linkedin_urn || null);
          setLinkedinName(data.linkedin_name || null);
          setLinkedinAvatar(data.linkedin_avatar || null);
          setCustomClientId(data.custom_client_id || "");
          setCustomClientSecret(data.custom_client_secret || "");
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
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  // Handle OAuth callback parameters in URL
  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    const oauthReason = searchParams.get("reason");

    if (oauthStatus === "success") {
      toast({
        title: "🎉 تم ربط حساب LinkedIn بنجاح!",
        description: "يمكنك الآن نشر الوظائف مباشرة على صفحتك الشخصية أو المهنية."
      });
      loadSettings();
      // Clean query params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("oauth");
      newParams.delete("reason");
      setSearchParams(newParams);
    } else if (oauthStatus === "error") {
      toast({
        title: "❌ فشل ربط حساب LinkedIn",
        description: oauthReason || "حدث خطأ أثناء الاتصال بالخادم الشريك، يرجى المحاولة لاحقاً.",
        variant: "destructive"
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("oauth");
      newParams.delete("reason");
      setSearchParams(newParams);
    }
  }, [searchParams]);

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

  // Direct OAuth connection trigger
  const handleConnectDirect = async () => {
    if (!user) return;

    // If client credentials are typed but not saved, save them first
    if (customClientId || customClientSecret) {
      setLoading(true);
      const { error } = await supabase
        .from("linkedin_settings" as any)
        .upsert({
          user_id: user.id,
          custom_client_id: customClientId,
          custom_client_secret: customClientSecret
        } as any, { onConflict: "user_id" });
      setLoading(false);
      if (error) {
        toast({ title: "خطأ في حفظ إعدادات التطبيق الخاص", description: error.message, variant: "destructive" });
        return;
      }
    }

    // Redirect to LinkedIn OAuth flow
    // Default platform app client ID as fallback
    const clientId = customClientId || "863i5e87aexdqp";
    const redirectUri = `https://rlfewneisuezsamhosct.supabase.co/functions/v1/linkedin-oauth`;
    const state = `${user.id}___${btoa(window.location.origin)}`;
    const scope = encodeURIComponent("openid profile w_member_social");

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
    
    // Redirect browser
    window.location.href = authUrl;
  };

  // Disconnect / Revoke direct connection
  const handleDisconnect = async () => {
    if (!user) return;
    setIsDisconnecting(true);
    const { error } = await supabase
      .from("linkedin_settings" as any)
      .update({
        access_token: null,
        expires_at: null,
        linkedin_urn: null,
        linkedin_name: null,
        linkedin_avatar: null,
      } as any)
      .eq("user_id", user.id);

    setIsDisconnecting(false);

    if (error) {
      toast({ title: "فشل قطع الاتصال", description: error.message, variant: "destructive" });
    } else {
      setAccessToken(null);
      setLinkedinUrn(null);
      setLinkedinName(null);
      setLinkedinAvatar(null);
      toast({ title: "تم إلغاء ربط حساب LinkedIn بنجاح" });

      // Log delivery connection removal
      await supabase.from("linkedin_deliveries").insert({
        user_id: user.id,
        event_type: "account.disconnected",
        payload: { message: "Account disconnected by user" },
        status: "success",
        status_code: 200
      });
    }
  };

  // Save only advanced custom app keys
  const handleSaveCustomSettings = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("linkedin_settings" as any)
      .upsert({
        user_id: user.id,
        custom_client_id: customClientId,
        custom_client_secret: customClientSecret
      } as any, { onConflict: "user_id" });

    setLoading(false);
    if (error) {
      toast({ title: "خطأ في حفظ الإعدادات", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ إعدادات التطبيق المخصص بنجاح ✅" });
    }
  };

  const urlInvalid = webhookUrl.length > 0 && !isValidZapierUrl(webhookUrl);
  const isConnected = !!accessToken && !!linkedinUrn;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-[#0A66C2]" />
          {t("settings.linkedinTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.linkedinDesc")}</p>
      </div>

      {/* Direct LinkedIn connection */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center shrink-0">
              <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">ربط حساب LinkedIn المباشر</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                اربط حسابك المهني لنشر الوظائف بلمسة واحدة مباشرة من داخل لوحة التحكم بدون إعدادات خارجية.
              </p>
            </div>
          </div>
          {isConnected && (
            <Badge className="bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/10 hover:text-green-600">
              متصل
            </Badge>
          )}
        </div>

        {isConnected ? (
          <div className="rounded-lg border border-border/30 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-border bg-[#0A66C2]/5 overflow-hidden flex items-center justify-center shrink-0">
                {linkedinAvatar ? (
                  <img src={linkedinAvatar} alt={linkedinName || ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-base text-[#0A66C2]">{linkedinName?.charAt(0) || "L"}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{linkedinName}</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5" dir="ltr">
                  {linkedinUrn}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={isDisconnecting}
              onClick={handleDisconnect}
              className="text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive border-border/50 text-xs gap-1.5 h-8 font-bold self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              إلغاء ربط الحساب
            </Button>
          </div>
        ) : (
          <div className="pt-2">
            <Button
              onClick={handleConnectDirect}
              disabled={loading}
              className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white gap-2 text-xs font-bold shadow-md"
            >
              <Linkedin className="w-4 h-4 text-white" />
              {loading ? "جاري الاتصال..." : "ربط حسابك الآن"}
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Custom App configuration (Collapsible) */}
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-right"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">تكوين تطبيق LinkedIn مخصص (متقدم)</h3>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4 pt-2 border-t border-border/40"
          >
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <Info className="w-4 h-4 shrink-0" />
                <h4 className="font-bold text-xs">تعليمات ربط تطبيق LinkedIn مخصص:</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                إذا كنت ترغب في نشر الوظائف عبر حساب مطور مخصص باسم شركتك الخاص، قم بإنشاء تطبيق في
                {" "}<a href="https://developer.linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">LinkedIn Developer Portal</a>{" "}
                ثم أضف رابط الـ Callback المعتمد التالي في إعدادات التطبيق قبل إدخال المفاتيح:
              </p>
              <div className="p-2 rounded bg-muted/40 font-mono text-[10px] text-foreground border border-border/40 select-all" dir="ltr">
                https://rlfewneisuezsamhosct.supabase.co/functions/v1/linkedin-oauth
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">معرف عميل التطبيق (Client ID)</Label>
                <Input
                  value={customClientId}
                  onChange={e => setCustomClientId(e.target.value)}
                  placeholder="مثال: 863i5e87aexdqp"
                  dir="ltr"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">مفتاح التطبيق السري (Client Secret)</Label>
                <Input
                  type="password"
                  value={customClientSecret}
                  onChange={e => setCustomClientSecret(e.target.value)}
                  placeholder="••••••••••••••••"
                  dir="ltr"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveCustomSettings}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs font-bold gap-1 border-border/50"
              >
                <Check className="w-3.5 h-3.5" />
                حفظ بيانات التطبيق
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Zapier Webhook - Alternative CTA */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-5 shadow-sm">
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

      {/* Manual Sharing / Preview */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3 shadow-sm">
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
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3 shadow-sm">
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

      {/* Delivery Log */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
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
                      {d.event_type === "account.connected" ? "تم ربط الحساب بنجاح" : (d.payload as any)?.job_title || d.event_type}
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
