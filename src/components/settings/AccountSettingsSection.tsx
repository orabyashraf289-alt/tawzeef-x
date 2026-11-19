import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Calendar, Camera, Check, Loader2, Mail, Shield, Trash2, User } from "lucide-react";
import AccountEmailSettings from "@/components/AccountEmailSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function InfoRow({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
      <div className="p-2 rounded-lg bg-primary/8">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {badge ? (
          <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 mt-0.5">
            <Check className="w-3 h-3 ml-1" />
            {value}
          </Badge>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export function AccountSettingsSection() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    setProfileError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, job_title")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
    } else if (data) {
      setFullName(data.full_name || "");
      setAvatarUrl(data.avatar_url || null);
      setJobTitle(data.job_title || "");
    }
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("settings.avatarTooLarge"), variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Error", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    setAvatarUrl(newUrl);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
    toast({ title: t("settings.avatarUpdated") });
    setUploading(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    setAvatarUrl(null);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
    toast({ title: t("settings.avatarRemoved") });
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, job_title: jobTitle })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
      toast({ title: t("settings.profileSaved") });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.profileTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t("settings.profileDesc")}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Primary Profile Column */}
        <div className="xl:col-span-7 rounded-xl border border-border/60 bg-muted/15 p-5 space-y-5">
          {loadingProfile ? (
            <div className="flex justify-center py-8" role="status">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : profileError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
              <p className="text-sm font-medium text-destructive">
                {locale === "en" ? "Could not load profile details." : "تعذّر تحميل بيانات الملف الشخصي."}
              </p>
              <p className="text-xs text-muted-foreground">{profileError}</p>
              <Button variant="outline" size="sm" onClick={() => void loadProfile()}>
                {locale === "en" ? "Retry" : "إعادة المحاولة"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="relative group shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-border/50 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-border/50 flex items-center justify-center shadow-sm">
                      <User className="w-8 h-8 text-primary/70" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
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

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("settings.fullName")}</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("settings.fullNamePlaceholder")}
                      className="mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("settings.jobTitleLabel")}</Label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={t("settings.jobTitlePlaceholder")}
                      className="mt-1 bg-background"
                    />
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoRow icon={Mail} label={t("settings.emailLabel")} value={user?.email || "—"} />
                <InfoRow
                  icon={Calendar}
                  label={t("settings.joinDate")}
                  value={
                    user?.created_at
                      ? new Date(user.created_at).toLocaleDateString(
                          locale === "en" ? "en-US" : "ar-SA",
                          { year: "numeric", month: "long", day: "numeric" },
                        )
                      : "—"
                  }
                />
                <InfoRow icon={Shield} label={t("settings.accountStatus")} value={t("settings.active")} badge />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading} className="gap-2">
                  {loading ? (
                    t("common.saving")
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {t("settings.saveChanges")}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Secondary Email Change Column */}
        <div className="xl:col-span-5 [&>form]:bg-muted/15 [&>form]:border-border/60">
          <AccountEmailSettings />
        </div>
      </div>
    </div>
  );
}
