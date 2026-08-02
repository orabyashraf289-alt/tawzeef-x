import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Building2, Camera, Trash2, Check, Globe, MapPin, Shield, Lock, Palette,
  Users, Plus, Mail, RefreshCw, Sparkles, QrCode, Layers, FileSpreadsheet,
  Link2, UserPlus, AlertCircle, UserCheck, Crown, Edit2, Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCompanyMembers,
  useRemoveCompanyMember,
  useCompanyBranches,
  useCreateCompanyBranch,
  useUpdateCompany,
  useDeleteCompany,
} from "@/hooks/useCompanies";

import { useCompanyInvitations, useCreateCompanyInvitation, useCancelInvitation } from "@/hooks/useCompanyInvitations";

export default function CompanySettingsManager() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: globalRole, isAdmin } = useUserRole();
  const { primaryColor, setPrimaryColor } = useTheme();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // States
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("SA");
  const [notes, setNotes] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [e2eEnabled, setE2eEnabled] = useState(false);

  // Brand Colors
  const [brandPrimary, setBrandPrimary] = useState("#0d9488");
  const [brandAccent, setBrandAccent] = useState("#14b8a6");
  const [brandFont, setBrandFont] = useState("Cairo, sans-serif");
  const [brandQrForeground, setBrandQrForeground] = useState("#0f172a");

  // Sub Tab Selection
  const [activeSubTab, setActiveSubTab] = useState("profile");

  // Members & Branch Hooks
  const { data: members = [], isLoading: membersLoading } = useCompanyMembers(companyId);
  const { data: invitations = [], refetch: refetchInvites } = useCompanyInvitations(companyId || "");
  const { data: branches = [], isLoading: branchesLoading } = useCompanyBranches(companyId);
  const createBranch = useCreateCompanyBranch();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const createInvite = useCreateCompanyInvitation();
  const cancelInvite = useCancelInvitation();
  const removeMember = useRemoveCompanyMember();

  // Branch Form & Edit Branch Dialog
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchManagerUserId, setBranchManagerUserId] = useState<string>("none");

  const [editingBranchData, setEditingBranchData] = useState<{
    id: string;
    name: string;
    city: string;
    address: string;
    contact_phone: string;
    contact_email: string;
    manager_user_id: string;
  } | null>(null);

  const handleSaveBranchFullDetails = async () => {
    if (!editingBranchData || !editingBranchData.name.trim()) return;
    const managerId = editingBranchData.manager_user_id === "none" ? null : editingBranchData.manager_user_id;

    await updateCompany.mutateAsync({
      id: editingBranchData.id,
      name: editingBranchData.name.trim(),
      city: editingBranchData.city || null,
      address: editingBranchData.address || null,
      notes: editingBranchData.address || null,
      contact_phone: editingBranchData.contact_phone || null,
      contact_email: editingBranchData.contact_email || null,
      manager_user_id: managerId,
    });

    queryClient.invalidateQueries({ queryKey: ["company-branches", companyId] });
    queryClient.invalidateQueries({ queryKey: ["my-companies"] });

    setEditingBranchData(null);
    toast({ title: "تم تحديث كافة بيانات الفرع والمسؤول بنجاح ✅" });
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف هذا الفرع؟")) return;
    await deleteCompany.mutateAsync(branchId);
    queryClient.invalidateQueries({ queryKey: ["company-branches", companyId] });
    queryClient.invalidateQueries({ queryKey: ["my-companies"] });
    setEditingBranchData(null);
  };


  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "hr" | "viewer">("hr");
  const [inviteBranchId, setInviteBranchId] = useState<string>("none");

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
      .order("joined_at", { ascending: true })
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
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
    toast({ title: locale === "en" ? "Logo updated ✅" : "تم تحديث الشعار بنجاح ✅" });
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
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
    toast({ title: locale === "en" ? "Logo removed" : "تم إزالة الشعار" });
    setUploading(false);
  };

  const handleSaveCompanyInfo = async () => {
    if (!user) return;
    setLoading(true);

    await supabase.from("profiles").update({ company_name: companyName } as any).eq("user_id", user.id);

    let activeCompanyId = companyId;
    if (!activeCompanyId) {
      const { data: memberRows } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      const latestMember = memberRows && memberRows.length > 0 ? memberRows[0] : null;
      if (latestMember?.company_id) {
        activeCompanyId = latestMember.company_id;
        setCompanyId(activeCompanyId);
      }
    }

    const rawNotesString = JSON.stringify({ size: companySize, description: notes });

    if (activeCompanyId) {
      const { error: compErr } = await supabase.from("companies").update({
        name: companyName,
        logo_url: companyLogo,
        website,
        industry,
        city,
        country,
        notes: rawNotesString,
        e2e_encryption: e2eEnabled,
        brand_settings: {
          primaryColor: brandPrimary,
          accentColor: brandAccent,
          fontFamily: brandFont,
          qrForeground: brandQrForeground
        }
      } as any).eq("id", activeCompanyId);

      if (compErr) {
        toast({ title: "خطأ في التحديث", description: compErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      // Create new company
      const { data: newComp, error: compErr } = await supabase.from("companies").insert({
        name: companyName,
        logo_url: companyLogo,
        website,
        industry,
        city,
        country,
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
        toast({ title: "خطأ في الإنشاء", description: compErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (newComp) {
        setCompanyId(newComp.id);
        await supabase.from("company_members").insert({
          company_id: newComp.id,
          user_id: user.id,
          member_role: "owner"
        } as any);

        await supabase.from("jobs").update({ company_id: newComp.id } as any).eq("user_id", user.id).is("company_id", null);
        await supabase.from("candidates").update({ company_id: newComp.id } as any).eq("user_id", user.id).is("company_id", null);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["layout-profile", user.id] });
    toast({ title: locale === "en" ? "Company settings saved ✅" : "تم حفظ إعدادات الشركة بنجاح ✅" });
    setLoading(false);
  };

  const handleAddBranch = async () => {
    if (!companyId || !branchName.trim()) return;
    await createBranch.mutateAsync({
      parent_company_id: companyId,
      name: branchName,
      city: branchCity || null,
      address: branchAddress || null,
      manager_user_id: branchManagerUserId === "none" ? null : branchManagerUserId,
    });
    setBranchName("");
    setBranchCity("");
    setBranchAddress("");
    setBranchManagerUserId("none");
  };



  const handleSendInvite = async () => {
    if (!companyId || !inviteEmail.trim()) return;
    const targetBranch = branches.find((b: any) => b.id === inviteBranchId);
    await createInvite.mutateAsync({
      companyId: companyId,
      branchId: inviteBranchId === "none" ? null : inviteBranchId,
      branchName: targetBranch ? targetBranch.name : null,
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteEmail("");
    setInviteBranchId("none");
    refetchInvites();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* ── Modern Page Header ── */}
      <PageHeader
        badgeText="مركز إدارة وبيانات المؤسسة والشركة"
        badgeIcon={Building2}
        title={companyName || "إعدادات الشركة والهوية المؤسسية"}
        description="تعديل اسم الشركة، الشعار، الهوية البصرية، الفروع وتعيين مدراء الفروع، وإدارة أعضاء الفريق."
        icon={Building2}
        accentColor="emerald"
        actions={
          <Button
            onClick={handleSaveCompanyInfo}
            disabled={loading}
            className="rounded-xl h-11 px-6 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {loading ? "جاري الحفظ..." : "حفظ التغييرات 💾"}
          </Button>
        }
      />

      {/* ── Tabs Navigation Bar ── */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-12 p-1 bg-muted/40 rounded-2xl border border-border/60">
          <TabsTrigger value="profile" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span>الملف التعريفي والبيانات</span>
          </TabsTrigger>
          <TabsTrigger value="brand" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
            <Palette className="w-4 h-4 text-indigo-500" />
            <span>الهوية البصرية والألوان</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>الفروع وإسناد المدراء</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span>أعضاء الفريق والدعوات</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>الأمان والتشفير</span>
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Company Profile & Details ── */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="border-border/60 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="relative group shrink-0">
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" className="w-24 h-24 rounded-3xl object-contain border-2 border-border/60 bg-card p-1.5 shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-border/60 flex items-center justify-center shadow-sm">
                    <Building2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <label className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
                {companyLogo && (
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {uploading && (
                  <div className="absolute inset-0 rounded-3xl bg-background/70 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 border-2 border-primary animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">اسم الشركة الرسمية *</Label>
                    <Input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="أدخل اسم الشركة"
                      className="h-11 rounded-xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">الموقع الإلكتروني الرسمي</Label>
                    <Input
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className="h-11 rounded-xl font-mono text-xs"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">مجال العمل / القطاع</Label>
                    <Input
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      placeholder="مثال: تقنية معلومات، الرعاية الصحية، التعليم"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">حجم الشركة (عدد الموظفين)</Label>
                    <select
                      value={companySize}
                      onChange={e => setCompanySize(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-xs font-bold"
                    >
                      <option value="">اختر الحجم...</option>
                      <option value="1-10">١ - ١٠ موظفين</option>
                      <option value="11-50">١١ - ٥٠ موظفاً</option>
                      <option value="51-200">٥١ - ٢٠٠ موظف</option>
                      <option value="201-500">٢٠١ - ٥٠٠ موظف</option>
                      <option value="501-1000">٥٠١ - ١٠٠٠ موظف</option>
                      <option value="1000+">أكثر من ١٠٠٠ موظف</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">المدينة المقر الرئيسي</Label>
                    <Input
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="مثال: الرياض"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1 block">الدولة</Label>
                    <Input
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      placeholder="مثال: المملكة العربية السعودية"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1 block">نبذة وبذة تعريفية عن نشاط الشركة</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="اكتب نبذة قصيرة ومختصرة عن الشركة ورؤيتها وتخصصاتها..."
                    className="min-h-[90px] rounded-xl text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── 2. Branding & Theme Colors ── */}
        <TabsContent value="brand" className="mt-6 space-y-6">
          <Card className="border-border/60 rounded-3xl p-6 space-y-6 shadow-xs">
            <div>
              <h3 className="font-black text-base text-foreground">هوية ثيم المنصة والألوان المميزة</h3>
              <p className="text-xs text-muted-foreground mt-1">اختر اللون المميز الذي يعبر عن هوية شركتك ليتم تطبيقه عبر لوحات التحكم والموديولات.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                      "flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all text-right",
                      isSelected ? "border-primary bg-primary/5 shadow-sm font-black" : "border-border/60 hover:border-border"
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-full shrink-0 flex items-center justify-center shadow-sm", color.colorClass)}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">{color.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Public Career Page Card Preview */}
            <div className="p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-xs">معاينة الهوية البصرية لصفحة الوظائف العامة (Career Portal)</h4>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-emerald-500" />
                  )}
                  <div>
                    <p className="font-black text-sm">{companyName || "اسم الشركة"}</p>
                    <p className="text-[11px] text-muted-foreground">{industry || "قطاع التكنولوجيا"} • {city || "الرياض"}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">فرص وظيفية نشطة</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── 3. Company Branches & Manager Assignment ── */}
        <TabsContent value="branches" className="mt-6 space-y-6">
          <Card className="border-border/60 rounded-3xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-foreground">فروع ومقرات الشركة والمدراء المسؤولين</h3>
                <p className="text-xs text-muted-foreground mt-1">إضافة فروع وتحديد مدير/مسؤول توظيف محدد لكل فرع تابع للشركة الأم.</p>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                {branches.length} فرع مضاف
              </Badge>
            </div>

            {/* Add Branch Form */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-4">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                إضافة فرع جديد وإسناد مسؤول للفرع:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">اسم الفرع *</Label>
                  <Input
                    placeholder="مثال: فرع جدة الرئيسي"
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">المدينة</Label>
                  <Input
                    placeholder="جدة"
                    value={branchCity}
                    onChange={e => setBranchCity(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">العنوان التفصيلي</Label>
                  <Input
                    placeholder="طريق الملك عبد العزيز"
                    value={branchAddress}
                    onChange={e => setBranchAddress(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">مدير / مسؤول الفرع</Label>
                  <Select value={branchManagerUserId} onValueChange={setBranchManagerUserId}>
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue placeholder="اختر مسؤول الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تعيين حالياً</SelectItem>
                      {members.map((m: any) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          👤 {m.profiles?.full_name || "موظف"} ({m.profiles?.job_title || "مسؤول توظيف"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddBranch} disabled={!branchName.trim()} className="gap-1.5 rounded-xl h-10 text-xs font-bold bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" />حفظ وإضافة الفرع
              </Button>
            </div>

            {/* Branches List */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">قائمة الفروع التابعة للشركة الأم:</h4>
              {branches.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-xs bg-muted/20 rounded-3xl border border-border/40 space-y-2">
                  <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="font-bold text-sm text-foreground">لا يوجد فروع مضافة حتى الآن</p>
                  <p className="text-xs text-muted-foreground">استخدم النموذج أعلاه لإضافة فروع ومقرات الشركة الجديدة وتعيين مسؤول لكل فرع.</p>
                </div>
              ) : (
                branches.map((b: any) => (
                  <div
                    key={b.id}
                    className="group p-5 rounded-3xl bg-card border border-border/60 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden"
                  >
                    {/* Top hover accent bar */}
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary/40 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    {/* Left Details Block */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                        <Building2 className="w-6 h-6" />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1 text-right">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-black text-base text-foreground tracking-tight">{b.name}</h4>
                          {b.city && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {b.city}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pr-0.5 font-normal">
                          {b.address || (b as any).notes || "العنوان التفصيلي غير محدد"}
                        </p>

                        {(b.contact_phone || b.contact_email) && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            {b.contact_phone && (
                              <span className="inline-flex items-center gap-1.5 bg-muted/40 text-muted-foreground px-2.5 py-1 rounded-xl border border-border/40 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-primary" />
                                {b.contact_phone}
                              </span>
                            )}
                            {b.contact_email && (
                              <span className="inline-flex items-center gap-1.5 bg-muted/40 text-muted-foreground px-2.5 py-1 rounded-xl border border-border/40 text-[11px]">
                                <Mail className="w-3 h-3 text-primary" />
                                {b.contact_email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Block: Branch Manager & Edit Button */}
                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="flex items-center gap-3 bg-muted/30 px-3.5 py-2.5 rounded-2xl border border-border/50 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                          <UserCheck className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground font-semibold">المسؤول المباشر عن الفرع</p>
                          <p className="text-xs font-bold text-foreground flex items-center gap-1">
                            {b.manager_profile?.full_name ? (
                              <>
                                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{b.manager_profile.full_name}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">({b.manager_profile.job_title || "مسؤول توظيف"})</span>
                              </>
                            ) : (
                              <span className="text-amber-600 font-medium italic text-[11px]">غير معين (انقر للتعديل)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 rounded-2xl font-bold text-xs gap-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                          setEditingBranchData({
                            id: b.id,
                            name: b.name || "",
                            city: b.city || "",
                            address: b.address || b.notes || "",
                            contact_phone: b.contact_phone || "",
                            contact_email: b.contact_email || "",
                            manager_user_id: b.manager_user_id || "none",
                          });
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        تعديل الفرع
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </Card>
        </TabsContent>

        {/* ── 4. Team Members & Branch Manager Invitations ── */}
        <TabsContent value="members" className="mt-6 space-y-6">
          <Card className="border-border/60 rounded-3xl p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-base text-foreground">أعضاء الفريق ودعوات مدراء الفروع</h3>
                <p className="text-xs text-muted-foreground mt-1">دعوة الموظفين كـ "مدراء فروع" أو أعضاء فريق التوظيف عبر البريد مع إرسال التنبيهات.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="البريد الإلكتروني للعضو..."
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="h-10 text-xs rounded-xl min-w-[200px]"
                  dir="ltr"
                />

                <Select value={inviteBranchId} onValueChange={setInviteBranchId}>
                  <SelectTrigger className="h-10 text-xs rounded-xl min-w-[150px]">
                    <SelectValue placeholder="الفرع المستهدف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">الشركة الرئيسية</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        📍 فرع: {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={handleSendInvite} disabled={!inviteEmail.trim()} className="gap-1.5 rounded-xl h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                  <UserPlus className="w-4 h-4" />إرسال دعوة بالبريد 📩
                </Button>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-muted-foreground">أعضاء الشركة الحاليين:</h4>
              {members.map((m: any) => (
                <div key={m.id} className="p-3.5 rounded-2xl bg-card border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                      {m.profiles?.full_name?.slice(0, 2) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">{m.profiles?.full_name || "عضو جديد"}</p>
                      <p className="text-[10px] text-muted-foreground">{m.profiles?.job_title || "مسؤول توظيف"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {m.member_role === "owner" ? "👑 المالك" : m.member_role === "admin" ? "مدير HR" : "مسؤول توظيف"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── 5. Security & E2E Encryption ── */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card className="border-border/60 rounded-3xl p-6 space-y-6 shadow-xs">
            <div>
              <h3 className="font-black text-base text-foreground">الأمان وتشفير البيانات المؤسسية</h3>
              <p className="text-xs text-muted-foreground mt-1">إعدادات الحماية والتشفير لملاحظات وسجلات الشركة.</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-muted/20">
              <div className="space-y-1 text-right">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  التشفير الشامل بين الأطراف (End-to-End Encryption)
                </Label>
                <p className="text-xs text-muted-foreground max-w-xl">
                  عند تفعيل هذا الخيار يتم تشفير جميع ملاحظات وتقييمات المرشحين محلياً قبل حفظها على قواعد البيانات للحفاظ على سرية البيانات.
                </p>
              </div>
              <Switch checked={e2eEnabled} onCheckedChange={setE2eEnabled} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Full Branch Edit Dialog ── */}
      <Dialog open={!!editingBranchData} onOpenChange={() => setEditingBranchData(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-lg text-foreground flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              تعديل بيانات الفرع والمسؤول
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground">
              تعديل كافة بيانات الفرع والمدينة والعنوان التفصيلي وتخصيص مدير الفرع.
            </DialogDescription>
          </DialogHeader>

          {editingBranchData && (
            <div className="space-y-4 py-2 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">اسم الفرع *</Label>
                  <Input
                    value={editingBranchData.name}
                    onChange={(e) => setEditingBranchData({ ...editingBranchData, name: e.target.value })}
                    placeholder="اسم الفرع..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">المدينة</Label>
                  <Input
                    value={editingBranchData.city}
                    onChange={(e) => setEditingBranchData({ ...editingBranchData, city: e.target.value })}
                    placeholder="الرياض، جدة..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">العنوان التفصيلي للفرع</Label>
                <Textarea
                  value={editingBranchData.address}
                  onChange={(e) => setEditingBranchData({ ...editingBranchData, address: e.target.value })}
                  placeholder="أدخل الشارع، الحي، الرمز البريدي والتفاصيل..."
                  rows={2}
                  className="rounded-xl text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">رقم هاتف التواصل للفرع</Label>
                  <Input
                    value={editingBranchData.contact_phone}
                    onChange={(e) => setEditingBranchData({ ...editingBranchData, contact_phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">البريد الإلكتروني للفرع</Label>
                  <Input
                    type="email"
                    value={editingBranchData.contact_email}
                    onChange={(e) => setEditingBranchData({ ...editingBranchData, contact_email: e.target.value })}
                    placeholder="branch@company.com"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t border-border/40 pt-3">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Crown className="w-4 h-4 text-amber-500" />
                  المدير / المسؤول المباشر عن الفرع
                </Label>
                <Select
                  value={editingBranchData.manager_user_id}
                  onValueChange={(val) => setEditingBranchData({ ...editingBranchData, manager_user_id: val })}
                >
                  <SelectTrigger className="w-full rounded-xl h-10 text-xs">
                    <SelectValue placeholder="اختر المسؤول..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تعيين حالياً (تخطي)</SelectItem>
                    {members.map((m: any) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        👤 {m.profiles?.full_name || "عضو بدون اسم"} ({m.profiles?.job_title || "مسؤول توظيف"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 font-bold rounded-xl"
                  onClick={() => handleDeleteBranch(editingBranchData.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الفرع
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingBranchData(null)}
                    className="rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveBranchFullDetails}
                    disabled={!editingBranchData.name.trim() || updateCompany.isPending}
                    className="rounded-xl text-xs font-bold gap-1.5"
                  >
                    {updateCompany.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "حفظ والتحديث ✅"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

