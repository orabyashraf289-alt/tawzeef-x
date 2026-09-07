import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Calendar, Camera, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import InfoRow from "./InfoRow";

export default function AccountSection() {
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
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
    toast({ title: t("settings.avatarUpdated") });
    setUploading(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploading(true);
    await supabase.from("profiles").update({ avatar_url: null } as any).eq("user_id", user.id);
    setAvatarUrl(null);
    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
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
      queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
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
