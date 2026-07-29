import DashboardLayout from "@/components/DashboardLayout";
import { useAllUserRoles, useUpdateUserRole, useDeleteTeamMember, useInvitations, useSendInvitation, useActivityLog, type AppRole, useCustomRoles, useCreateCustomRole, useDeleteCustomRole } from "@/hooks/useUserRole";
import { useAllPermissions, type PermissionRow } from "@/hooks/useScreenPermissions";
import { useQueryClient } from "@tanstack/react-query";
import { useCandidates, useJobs, useInterviews } from "@/hooks/useJobs";
import { useMyCompanies, useCompanyBranches } from "@/hooks/useCompanies";
import { useCreateCompanyInvitation } from "@/hooks/useCompanyInvitations";
import { motion } from "framer-motion";
import {
  UserCog, Search, Mail, Copy, Clock, CheckCircle2, XCircle, Activity, UserPlus, Send,
  Shield, Eye, Briefcase, Users, Calendar, Bot, BarChart3, Kanban, Bell, Settings,
  Trash2, Filter, Download, MoreVertical, Info, Lock, Unlock, FileText, AlertTriangle, Package,
  RefreshCw, Ban, Monitor, Target, Star, GraduationCap, Zap, Loader2, MapPin
} from "lucide-react";
import AdminSubscriptionManager from "@/components/AdminSubscriptionManager";
import PermissionsMatrixManager from "@/components/PermissionsMatrixManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

function getTimeAgo(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "الآن";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `منذ ${diffInDays} يوم`;
}

// Permission key icons & labels
const PERMISSION_ICONS: Record<string, any> = {
  "screen.dashboard": Monitor, "screen.jobs": Briefcase, "screen.candidates": Users,
  "screen.pipeline": Kanban, "screen.interviews": Calendar, "screen.offers": FileText,
  "screen.reports": BarChart3, "screen.hiring_plan": Target, "screen.notifications": Bell,
  "screen.ai_assistant": Bot, "screen.talent_pool": Star, "screen.team": UserCog,
  "screen.audit_log": Shield, "screen.tutorial": GraduationCap, "screen.settings": Settings,
  "action.create_jobs": Briefcase, "action.delete_data": Trash2, "action.move_candidates": Kanban,
  "action.evaluate_candidates": Eye, "action.export_data": Download, "action.invite_users": UserPlus,
  "action.manage_offers": FileText,
  "action.edit_jobs": Briefcase, "action.delete_jobs": Trash2,
  "action.edit_candidates": Users, "action.delete_candidates": Trash2,
  "action.edit_interviews": Calendar, "action.delete_interviews": Trash2,
  "action.edit_offers": FileText, "action.delete_offers": Trash2,
  "action.manage_settings": Settings, "action.view_audit_log": Shield,
  "action.manage_subscriptions": Package,
};

const PERMISSION_LABELS_AR: Record<string, string> = {
  "screen.dashboard": "لوحة التحكم", "screen.jobs": "الوظائف", "screen.candidates": "المرشحون",
  "screen.pipeline": "مسار التوظيف", "screen.interviews": "المقابلات", "screen.offers": "العروض الوظيفية",
  "screen.reports": "التقارير", "screen.hiring_plan": "خطة التوظيف", "screen.notifications": "الإشعارات",
  "screen.ai_assistant": "مساعد AI", "screen.talent_pool": "قاعدة المواهب", "screen.team": "إدارة الفريق",
  "screen.audit_log": "سجل الأمان", "screen.tutorial": "الشروحات", "screen.settings": "الإعدادات",
  "action.create_jobs": "إنشاء الوظائف", "action.delete_data": "حذف البيانات", "action.move_candidates": "نقل المرشحين",
  "action.evaluate_candidates": "تقييم المرشحين", "action.export_data": "تصدير البيانات",
  "action.invite_users": "دعوة المستخدمين", "action.manage_offers": "إدارة العروض",
  "action.edit_jobs": "تعديل الوظائف", "action.delete_jobs": "حذف الوظائف",
  "action.edit_candidates": "تعديل بيانات المرشحين", "action.delete_candidates": "حذف المرشحين",
  "action.edit_interviews": "تعديل المقابلات", "action.delete_interviews": "حذف المقابلات",
  "action.edit_offers": "تعديل العروض الوظيفية", "action.delete_offers": "حذف العروض الوظيفية",
  "action.manage_settings": "إدارة الإعدادات", "action.view_audit_log": "عرض سجل الأمان",
  "action.manage_subscriptions": "إدارة الاشتراكات",
};

const PERMISSION_LABELS_EN: Record<string, string> = {
  "screen.dashboard": "Dashboard", "screen.jobs": "Jobs", "screen.candidates": "Candidates",
  "screen.pipeline": "Pipeline", "screen.interviews": "Interviews", "screen.offers": "Offers",
  "screen.reports": "Reports", "screen.hiring_plan": "Hiring Plan", "screen.notifications": "Notifications",
  "screen.ai_assistant": "AI Assistant", "screen.talent_pool": "Talent Pool", "screen.team": "Team Management",
  "screen.audit_log": "Audit Log", "screen.tutorial": "Tutorial", "screen.settings": "Settings",
  "action.create_jobs": "Create Jobs", "action.delete_data": "Delete Data", "action.move_candidates": "Move Candidates",
  "action.evaluate_candidates": "Evaluate Candidates", "action.export_data": "Export Data",
  "action.invite_users": "Invite Users", "action.manage_offers": "Manage Offers",
  "action.edit_jobs": "Edit Jobs", "action.delete_jobs": "Delete Jobs",
  "action.edit_candidates": "Edit Candidates", "action.delete_candidates": "Delete Candidates",
  "action.edit_interviews": "Edit Interviews", "action.delete_interviews": "Delete Interviews",
  "action.edit_offers": "Edit Offers", "action.delete_offers": "Delete Offers",
  "action.manage_settings": "Manage Settings", "action.view_audit_log": "View Audit Log",
  "action.manage_subscriptions": "Manage Subscriptions",
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { t, locale, dir } = useI18n();
  const { data: userRoles } = useAllUserRoles();
  const updateRole = useUpdateUserRole();
  const deleteMember = useDeleteTeamMember();
  const { data: invitations } = useInvitations();
  const sendInvitation = useSendInvitation();
  const createCompanyInvitation = useCreateCompanyInvitation();
  const { data: activityLog } = useActivityLog();
  const { data: candidates } = useCandidates();
  const { data: jobs } = useJobs();
  const { data: interviews } = useInterviews();
  const { data: myCompanies } = useMyCompanies();

  const activeCompany = useMemo(() => {
    if (!myCompanies || myCompanies.length === 0) return null;
    return myCompanies.find(c => !c.parent_company_id) || myCompanies[0];
  }, [myCompanies]);

  const { data: companyBranches = [] } = useCompanyBranches(activeCompany?.id);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberDetailOpen, setMemberDetailOpen] = useState<string | null>(null);
  const [editMemberOpen, setEditMemberOpen] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("recruiter");
  const { data: dbPermissions, isLoading: permissionsLoading } = useAllPermissions();
  const { data: customRoles = [] } = useCustomRoles();
  const createCustomRole = useCreateCustomRole();
  const deleteCustomRole = useDeleteCustomRole();

  const [openAddCustomRole, setOpenAddCustomRole] = useState(false);
  const [customRoleForm, setCustomRoleForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[]
  });

  const [createdEmpCredentials, setCreatedEmpCredentials] = useState<{ email: string; pass: string; name: string; role: string } | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "recruiter" as string,
    branchId: "none"
  });

  const permQueryClient = useQueryClient();
  const [localPermissions, setLocalPermissions] = useState<PermissionRow[]>([]);
  const [permissionsChanged, setPermissionsChanged] = useState(false);

  // Sync DB permissions to local state
  useEffect(() => {
    if (dbPermissions) {
      setLocalPermissions(dbPermissions);
      setPermissionsChanged(false);
    }
  }, [dbPermissions]);

  const togglePermission = (key: string, role: "admin" | "recruiter" | "reviewer") => {
    if (role === "admin") {
      toast({ title: t("team.cannotDisableAdmin"), variant: "destructive" });
      return;
    }
    setLocalPermissions(prev => prev.map(p => p.permission_key === key ? { ...p, [role]: !p[role] } : p));
    setPermissionsChanged(true);
  };

  const savePermissions = async () => {
    try {
      for (const p of localPermissions) {
        const updateData: any = { admin: p.admin, recruiter: p.recruiter, reviewer: p.reviewer, updated_at: new Date().toISOString(), updated_by: user?.id };
        await supabase
          .from("role_permissions" as any)
          .update(updateData)
          .eq("permission_key", p.permission_key);
      }
      setPermissionsChanged(false);
      permQueryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast({ title: t("team.permissionsSaved") });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  const resetPermissions = () => {
    if (dbPermissions) {
      setLocalPermissions(dbPermissions);
      setPermissionsChanged(false);
      toast({ title: t("team.permissionsReset") });
    }
  };

  const screenPermissions = localPermissions.filter(p => p.permission_key.startsWith("screen."));
  const actionPermissions = localPermissions.filter(p => p.permission_key.startsWith("action."));
  const permLabels = locale === "en" ? PERMISSION_LABELS_EN : PERMISSION_LABELS_AR;

  const roleLabels: Record<string, string> = { admin: t("team.roleAdmin"), recruiter: t("team.roleRecruiter"), reviewer: t("team.roleReviewer"), branch_manager: "مدير فرع" };
  const roleColors: Record<string, string> = { admin: "bg-destructive/10 text-destructive", recruiter: "bg-primary/10 text-primary", reviewer: "bg-warning/10 text-warning", branch_manager: "bg-emerald-500/10 text-emerald-600 font-bold" };

  const roles = userRoles || [];
  const allInvitations = invitations || [];
  const allActivity = activityLog || [];
  const allCandidates = candidates || [];
  const allJobs = jobs || [];
  const allInterviews = interviews || [];

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*");
      if (data) setProfiles(data);
    };
    if (roles.length > 0) fetchProfiles();
  }, [roles]);

  const teamStats = useMemo(() => ({
    totalUsers: roles.length,
    admins: roles.filter((r: any) => r.role === "admin").length,
    recruiters: roles.filter((r: any) => r.role === "recruiter").length,
    reviewers: roles.filter((r: any) => r.role === "reviewer").length,
    pendingInvites: allInvitations.filter((i: any) => i.status === "pending").length,
    recentActivity: allActivity.length,
  }), [roles, allInvitations, allActivity]);

  const getUserProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const getMemberStats = useCallback((userId: string) => {
    const memberCandidates = allCandidates.filter(c => c.user_id === userId);
    const memberInterviews = allInterviews.filter(i => i.user_id === userId);
    const memberJobs = allJobs.filter(j => j.user_id === userId);
    const hired = memberCandidates.filter(c => c.status === "مقبول").length;
    const avgAi = memberCandidates.filter(c => c.ai_score).length > 0
      ? Math.round(memberCandidates.filter(c => c.ai_score).reduce((s, c) => s + (c.ai_score || 0), 0) / memberCandidates.filter(c => c.ai_score).length)
      : 0;
    return {
      candidates: memberCandidates.length,
      interviews: memberInterviews.length,
      jobs: memberJobs.length,
      hired,
      avgAiScore: avgAi,
      conversionRate: memberCandidates.length > 0 ? Math.round((hired / memberCandidates.length) * 100) : 0,
    };
  }, [allCandidates, allInterviews, allJobs]);

  const getLastActivity = useCallback((userId: string) => {
    const userActivity = allActivity.find((a: any) => a.user_id === userId);
    return userActivity?.created_at || null;
  }, [allActivity]);

  const getUserEmail = useCallback((userId: string) => {
    const activity = allActivity.find((a: any) => a.user_id === userId && a.user_name?.includes("@"));
    return activity?.user_name || null;
  }, [allActivity]);

  const filteredRoles = roles.filter((r: any) => {
    const profile = getUserProfile(r.user_id);
    const email = getUserEmail(r.user_id);
    const matchesSearch = !search || 
      (profile?.full_name || "").toLowerCase().includes(search.toLowerCase()) || 
      roleLabels[r.role]?.toLowerCase().includes(search.toLowerCase()) ||
      (email || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || r.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSendInvite = async () => {
    if (!inviteForm.email) return;
    setIsSubmittingInvite(true);
    try {
      const targetBranch = companyBranches.find((b: any) => b.id === inviteForm.branchId);

      // If branch specified, send invitation with branchId
      if (activeCompany?.id) {
        await createCompanyInvitation.mutateAsync({
          companyId: activeCompany.id,
          branchId: inviteForm.branchId === "none" ? null : inviteForm.branchId,
          branchName: targetBranch ? targetBranch.name : null,
          email: inviteForm.email.trim().toLowerCase(),
          role: inviteForm.role === "admin" ? "owner" : "hr",
        });
      } else {
        await sendInvitation.mutateAsync({
          email: inviteForm.email.trim().toLowerCase(),
          role: (inviteForm.role as AppRole) || "recruiter",
          inviterName: user?.user_metadata?.full_name || user?.email || (locale === "en" ? "Admin" : "مدير"),
        });
      }

      setInviteOpen(false);
      setInviteForm({ email: "", fullName: "", password: "", role: "recruiter", branchId: "none" });
    } catch (err: any) {
      toast({ title: "خطأ في إرسال الدعوة", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: t("team.linkCopied") });
  };

  const handleOpenEdit = (userId: string) => {
    const profile = getUserProfile(userId);
    const role = roles.find((r: any) => r.user_id === userId);
    setEditName(profile?.full_name || "");
    setEditRole(role?.role || "recruiter");
    setEditMemberOpen(userId);
  };

  const handleSaveEdit = async () => {
    if (!editMemberOpen) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName, updated_at: new Date().toISOString() })
        .eq("user_id", editMemberOpen);
      if (error) throw error;
      
      const currentRole = roles.find((r: any) => r.user_id === editMemberOpen);
      if (currentRole && currentRole.role !== editRole) {
        await updateRole.mutateAsync({ userId: editMemberOpen, role: editRole });
      }
      
      const { data } = await supabase.from("profiles").select("*");
      if (data) setProfiles(data);
      
      toast({ title: t("team.memberUpdated") });
      setEditMemberOpen(null);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  const handleExportTeam = useCallback(() => {
    const exportData = filteredRoles.map((r: any) => {
      const profile = getUserProfile(r.user_id);
      const stats = getMemberStats(r.user_id);
      const lastAct = getLastActivity(r.user_id);
      return {
        [t("team.memberName")]: profile?.full_name || "-",
        [t("team.email")]: getUserEmail(r.user_id) || "-",
        [t("team.memberRole")]: roleLabels[r.role] || r.role,
        [t("team.joinDate")]: profile?.created_at ? new Date(profile.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA") : "-",
        [t("team.candidatesCount")]: stats.candidates,
        [t("team.interviewsCount")]: stats.interviews,
        [t("team.jobsCount")]: stats.jobs,
        [t("team.hiredCount")]: stats.hired,
        [t("team.conversionRate")]: `${stats.conversionRate}%`,
        [t("team.lastActive")]: lastAct ? new Date(lastAct).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA") : "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, locale === "en" ? "Team" : "الفريق");
    XLSX.writeFile(wb, `team-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: t("team.exportSuccess") });
  }, [filteredRoles, profiles, allActivity, allCandidates, allInterviews, allJobs, locale, t]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("team.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("team.subtitle")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={handleExportTeam}>
              <Download className="w-4 h-4" /><span className="hidden sm:inline">{t("team.exportMembers")}</span>
            </Button>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <UserPlus className="w-4 h-4" />دعوة موظف / مدير فرع
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir={dir}>
                <DialogHeader>
                  <DialogTitle>{t("team.inviteTitle")}</DialogTitle>
                  <DialogDescription>أرسل دعوة رسمية بالبريد الإلكتروني وتخصيص الفرع المستهدف للموظف.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>الاسم الكامل للموظف / مدير الفرع</Label>
                    <Input placeholder="أحمد علي" value={inviteForm.fullName} onChange={e => setInviteForm({ ...inviteForm, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("team.emailLabel")} *</Label>
                    <Input type="email" placeholder="user@example.com" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required />
                  </div>

                  {/* Branch Assignment Select */}
                  {companyBranches.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        تخصيص وإسناد الفرع (اختياري)
                      </Label>
                      <Select value={inviteForm.branchId} onValueChange={(v) => setInviteForm({ ...inviteForm, branchId: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">الشركة الرئيسية (عام)</SelectItem>
                          {companyBranches.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>
                              📍 فرع: {b.name} ({b.city || "بدون مدينة"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t("team.roleLabel")}</Label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t("team.adminRole")} (مالك / مدير كامل)</SelectItem>
                        <SelectItem value="recruiter">{t("team.recruiterRole")} (مسؤول توظيف HR)</SelectItem>
                        <SelectItem value="reviewer">{t("team.reviewerRole")} (مشاهد ومقيم)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSendInvite} disabled={isSubmittingInvite || !inviteForm.email} className="w-full gap-2 bg-primary text-primary-foreground font-bold h-11 rounded-xl">
                    {isSubmittingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSubmittingInvite ? "جاري الإرسال..." : "إرسال الدعوة بالبريد الإلكتروني 🚀"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t("team.totalMembers"), value: teamStats.totalUsers, icon: Users, color: "bg-primary/10 text-primary" },
            { label: t("team.admins"), value: teamStats.admins, icon: Shield, color: "bg-destructive/10 text-destructive" },
            { label: t("team.recruiters"), value: teamStats.recruiters, icon: Briefcase, color: "bg-primary/10 text-primary" },
            { label: t("team.reviewers"), value: teamStats.reviewers, icon: Eye, color: "bg-warning/10 text-warning" },
            { label: t("team.pendingInvites"), value: teamStats.pendingInvites, icon: Mail, color: "bg-accent text-accent-foreground" },
            { label: t("team.activities"), value: teamStats.recentActivity, icon: Activity, color: "bg-muted text-foreground" },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${s.color}`}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-4 h-4 opacity-70" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[11px] mt-1 opacity-70">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members" dir={dir}>
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="members" className="gap-1.5"><UserCog className="w-3.5 h-3.5" />{t("team.membersTab")}</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5"><Package className="w-3.5 h-3.5" />{t("team.subscriptionsTab")}</TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5"><Shield className="w-3.5 h-3.5" />{t("team.permissionsTab")}</TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1.5"><Mail className="w-3.5 h-3.5" />{t("team.invitationsTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions">
            <AdminSubscriptionManager />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input placeholder={t("team.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className={dir === "rtl" ? "pr-10" : "pl-10"} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t("team.membersTab")} ({filteredRoles.length})</span>
              </div>
              {filteredRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">{t("common.noData")}</p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredRoles.map((r: any) => {
                    const profile = getUserProfile(r.user_id);
                    const stats = getMemberStats(r.user_id);
                    const isCurrentUser = r.user_id === user?.id;
                    const email = getUserEmail(r.user_id);

                    // Check if member is a manager of any branch
                    const managedBranch = companyBranches.find((b: any) => b.manager_user_id === r.user_id);

                    return (
                      <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-muted/20 transition-colors group">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary relative shrink-0">
                            {(profile?.full_name || "U").charAt(0)}
                            {isCurrentUser && <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{profile?.full_name || (locale === "en" ? "User" : "مستخدم")}</p>
                              {managedBranch && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                                  👑 مدير فرع: {managedBranch.name}
                                </Badge>
                              )}
                            </div>
                            {email && (
                              <p className="text-xs text-muted-foreground truncate">{email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                          <Badge className={`${roleColors[r.role] || ""} text-xs border-0`}>{roleLabels[r.role]}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <PermissionsMatrixManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
