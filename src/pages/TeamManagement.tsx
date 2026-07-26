import DashboardLayout from "@/components/DashboardLayout";
import { useAllUserRoles, useUpdateUserRole, useDeleteTeamMember, useInvitations, useSendInvitation, useActivityLog, type AppRole } from "@/hooks/useUserRole";
import { useAllPermissions, type PermissionRow } from "@/hooks/useScreenPermissions";
import { useQueryClient } from "@tanstack/react-query";
import { useCandidates, useJobs, useInterviews } from "@/hooks/useJobs";
import { motion } from "framer-motion";
import {
  UserCog, Search, Mail, Copy, Clock, CheckCircle2, XCircle, Activity, UserPlus, Send,
  Shield, Eye, Briefcase, Users, Calendar, Bot, BarChart3, Kanban, Bell, Settings,
  Trash2, Filter, Download, MoreVertical, Info, Lock, Unlock, FileText, AlertTriangle, Package,
  RefreshCw, Ban, Monitor, Target, Star, GraduationCap, Zap,
} from "lucide-react";
import AdminSubscriptionManager from "@/components/AdminSubscriptionManager";
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
  const { data: activityLog } = useActivityLog();
  const { data: candidates } = useCandidates();
  const { data: jobs } = useJobs();
  const { data: interviews } = useInterviews();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberDetailOpen, setMemberDetailOpen] = useState<string | null>(null);
  const [editMemberOpen, setEditMemberOpen] = useState<string | null>(null);
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
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", password: "", role: "recruiter" as string });

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

  const roleLabels: Record<string, string> = { admin: t("team.roleAdmin"), recruiter: t("team.roleRecruiter"), reviewer: t("team.roleReviewer") };
  const roleColors: Record<string, string> = { admin: "bg-destructive/10 text-destructive", recruiter: "bg-primary/10 text-primary", reviewer: "bg-warning/10 text-warning" };
  const statusLabels: Record<string, string> = { pending: t("team.pendingAcceptance"), accepted: t("team.accepted"), expired: t("team.expired") };
  const statusIcons: Record<string, any> = { pending: Clock, accepted: CheckCircle2, expired: XCircle };

  const roleDescriptions: Record<string, { title: string; desc: string; color: string; icon: any }> = {
    admin: { title: t("team.roleAdmin"), desc: t("team.adminDesc"), color: "border-destructive/30 bg-destructive/5", icon: Shield },
    recruiter: { title: t("team.roleRecruiter"), desc: t("team.recruiterDesc"), color: "border-primary/30 bg-primary/5", icon: Briefcase },
    reviewer: { title: t("team.roleReviewer"), desc: t("team.reviewerDesc"), color: "border-warning/30 bg-warning/5", icon: Eye },
  };

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

  // Get last activity for a member
  const getLastActivity = useCallback((userId: string) => {
    const userActivity = allActivity.find((a: any) => a.user_id === userId);
    return userActivity?.created_at || null;
  }, [allActivity]);

  // Get user email from activity log or profiles
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

  const filteredActivity = allActivity.filter((a: any) => {
    if (activityFilter === "all") return true;
    return a.entity_type === activityFilter;
  });

  const handleSendInvite = async () => {
    if (!inviteForm.email) return;
    setIsSubmittingInvite(true);
    try {
      const generatedPassword = inviteForm.password || `Emp@${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Trigger invitation via send-invitation function / email
      const result = await sendInvitation.mutateAsync({
        email: inviteForm.email.trim().toLowerCase(),
        role: (inviteForm.role as AppRole) || "recruiter",
        inviterName: user?.user_metadata?.full_name || user?.email || (locale === "en" ? "Admin" : "مدير"),
      });

      // 2. Create Auth user via non-persisting client so current session stays active
      try {
        const tempAuthClient = (await import("@supabase/supabase-js")).createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          { auth: { persistSession: false } }
        );

        await tempAuthClient.auth.signUp({
          email: inviteForm.email.trim().toLowerCase(),
          password: generatedPassword,
          options: {
            data: {
              full_name: inviteForm.fullName || inviteForm.email.split("@")[0],
              role: inviteForm.role,
              user_type: "employee"
            }
          }
        });
      } catch (authErr) {
        console.warn("Employee auth signup warning:", authErr);
      }

      setCreatedEmpCredentials({
        email: inviteForm.email.trim().toLowerCase(),
        pass: generatedPassword,
        name: inviteForm.fullName || inviteForm.email.split("@")[0],
        role: inviteForm.role
      });

      if (result?.signupUrl) setLastSignupUrl(result.signupUrl);
      setInviteOpen(false);
      setInviteForm({ email: "", fullName: "", password: "", role: "recruiter" });
    } catch (err: any) {
      toast({ title: "خطأ في إرسال الدعوة", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleForm.name) {
      toast({ title: "يرجى كتابة اسم الدور المخصص", variant: "destructive" });
      return;
    }

    await createCustomRole.mutateAsync({
      name: customRoleForm.name,
      description: customRoleForm.description,
      permissions: customRoleForm.permissions
    });

    setOpenAddCustomRole(false);
    setCustomRoleForm({ name: "", description: "", permissions: [] });
  };

  const toggleCustomPermission = (key: string) => {
    setCustomRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(k => k !== key)
        : [...prev.permissions, key]
    }));
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

  const handleDeleteMember = async () => {
    if (!deleteConfirmId) return;
    await deleteMember.mutateAsync(deleteConfirmId);
    setProfiles(prev => prev.filter(p => p.user_id !== deleteConfirmId));
    setDeleteConfirmId(null);
    setMemberDetailOpen(null);
  };

  // Cancel invitation
  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("invitations" as any)
        .update({ status: "cancelled" } as any)
        .eq("id", inviteId);
      if (error) throw error;
      toast({ title: t("team.inviteCancelled") });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  // Resend invitation
  const handleResendInvite = async (inv: any) => {
    try {
      const result = await sendInvitation.mutateAsync({
        email: inv.email,
        role: inv.role,
        inviterName: user?.user_metadata?.full_name || user?.email || (locale === "en" ? "Admin" : "مدير"),
      });
      // Cancel old invitation
      await supabase
        .from("invitations" as any)
        .update({ status: "cancelled" } as any)
        .eq("id", inv.id);
      toast({ title: t("team.inviteResent") });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  // Export team data to Excel
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

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("common.now");
    if (minutes < 60) return `${minutes} ${t("common.minutes")}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t("common.hours")}`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ${t("common.days")}`;
    return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA");
  };

  const selectedMember = memberDetailOpen ? roles.find((r: any) => r.user_id === memberDetailOpen) : null;
  const selectedProfile = memberDetailOpen ? getUserProfile(memberDetailOpen) : null;
  const selectedStats = memberDetailOpen ? getMemberStats(memberDetailOpen) : null;

  const entityTypeLabels: Record<string, string> = {
    invitation: locale === "en" ? "Invitation" : "دعوة",
    candidate: t("common.candidate"),
    job: locale === "en" ? "Job" : "وظيفة",
    interview: locale === "en" ? "Interview" : "مقابلة",
  };

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
                  <UserPlus className="w-4 h-4" />{t("team.inviteUser")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir={dir}>
                <DialogHeader>
                  <DialogTitle>{t("team.inviteTitle")}</DialogTitle>
                  <DialogDescription>{t("team.inviteDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>الاسم الكامل للموظف / المستخدم</Label>
                    <Input placeholder="أحمد علي" value={inviteForm.fullName} onChange={e => setInviteForm({ ...inviteForm, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("team.emailLabel")} *</Label>
                    <Input type="email" placeholder="user@example.com" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور للحساب (Password)</Label>
                    <Input type="text" placeholder="أدخل كلمة مرور الموظف (أو اتركه لتوليده تلقائياً)" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} className="font-mono text-xs dir-ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("team.roleLabel")}</Label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t("team.adminRole")} (مالك / مدير كامل)</SelectItem>
                        <SelectItem value="recruiter">{t("team.recruiterRole")} (مسؤول توظيف HR)</SelectItem>
                        <SelectItem value="reviewer">{t("team.reviewerRole")} (مشاهد ومقيم)</SelectItem>
                        {customRoles.map((cr) => (
                          <SelectItem key={cr.id} value={`custom:${cr.name}`}>
                            ✨ دور مخصص: {cr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSendInvite} disabled={isSubmittingInvite || !inviteForm.email} className="w-full gap-2 bg-primary text-primary-foreground font-bold h-11 rounded-xl">
                    {isSubmittingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSubmittingInvite ? "جاري التجهيز..." : "إرسال الدعوة وتجهيز الحساب المباشر 🚀"}
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
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" />{t("team.activityTab")}</TabsTrigger>
          </TabsList>

          {/* ─── Subscriptions Tab ─── */}
          <TabsContent value="subscriptions">
            <AdminSubscriptionManager />
          </TabsContent>

          {/* ─── Members Tab ─── */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input placeholder={t("team.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className={dir === "rtl" ? "pr-10" : "pl-10"} />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"} text-muted-foreground`} />
                  <SelectValue placeholder={t("team.allRoles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("team.allRoles")}</SelectItem>
                  <SelectItem value="admin">{t("team.admins")}</SelectItem>
                  <SelectItem value="recruiter">{t("team.recruiters")}</SelectItem>
                  <SelectItem value="reviewer">{t("team.reviewers")}</SelectItem>
                </SelectContent>
              </Select>
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
                    const lastAct = getLastActivity(r.user_id);
                    const email = getUserEmail(r.user_id);
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
                              {isCurrentUser && <Badge variant="outline" className="text-[9px] h-4 shrink-0">{locale === "en" ? "You" : "أنت"}</Badge>}
                            </div>
                            {email && (
                              <p className="text-xs text-muted-foreground truncate">{email}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA") : "—"}
                              {" · "}{stats.candidates} {t("common.candidate")} · {stats.interviews} {locale === "en" ? "interviews" : "مقابلة"}
                              {lastAct && (
                                <span className="text-muted-foreground/60">
                                  {" · "}{t("team.lastActive")}: {getTimeAgo(lastAct)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                          <Badge className={`${roleColors[r.role] || ""} text-xs border-0`}>{roleLabels[r.role]}</Badge>

                          <Select defaultValue={r.role} onValueChange={(val) => updateRole.mutate({ userId: r.user_id, role: val as AppRole })}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{t("team.roleAdmin")}</SelectItem>
                              <SelectItem value="recruiter">{t("team.roleRecruiter")}</SelectItem>
                              <SelectItem value="reviewer">{t("team.roleReviewer")}</SelectItem>
                            </SelectContent>
                          </Select>

                          <DropdownMenu dir={dir}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => setMemberDetailOpen(r.user_id)} className="gap-2">
                                <Info className="w-4 h-4" />{t("team.memberDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(r.user_id)} className="gap-2">
                                <FileText className="w-4 h-4" />{t("team.editMember")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => copyLink(`${window.location.origin}/auth?mode=signup`)}>
                                <Copy className="w-4 h-4" />{locale === "en" ? "Copy invite link" : "نسخ رابط الدعوة"}
                              </DropdownMenuItem>
                              {!isCurrentUser && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeleteConfirmId(r.user_id)} className="gap-2 text-destructive focus:text-destructive">
                                    <Trash2 className="w-4 h-4" />{t("team.deleteMember")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Permissions Tab ─── */}
          <TabsContent value="permissions" className="space-y-6">

            {/* Custom Roles Manager Header & Cards */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10 border border-primary/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>إدارة الأدوار والصلاحيات المخصصة</span>
                  </div>
                  <h3 className="text-lg font-black text-foreground">إنشاء وتخصيص صلاحيات الأدوار المحددة للموظفين</h3>
                  <p className="text-xs text-muted-foreground">يمكنك إضافة دور مخصص (مثل: مدير مقابلات، مسؤول عروض، مالي) وتحديد الصلاحيات التفصيلية المسموحة لهذا الدور بالمنصة.</p>
                </div>

                <Button onClick={() => setOpenAddCustomRole(true)} className="rounded-xl font-bold text-xs gap-2 bg-primary shrink-0">
                  <Plus className="w-4 h-4" />
                  إضافة دور مخصص جديد ➕
                </Button>
              </div>

              {/* Custom Roles Cards */}
              {customRoles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {customRoles.map((cr) => (
                    <div key={cr.id} className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-2 relative group text-right">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs font-bold">
                          ✨ {cr.name}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => deleteCustomRole.mutate(cr.id)} className="h-7 w-7 text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {cr.description && <p className="text-xs text-muted-foreground">{cr.description}</p>}
                      <div className="text-[11px] font-semibold text-primary pt-1">
                        {cr.permissions?.length || 0} صلاحيات محددة لهذا الدور
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {(["admin", "recruiter", "reviewer"] as const).map(role => {
                const rd = roleDescriptions[role];
                const RoleIcon = rd.icon;
                const count = roles.filter((r: any) => r.role === role).length;
                return (
                  <motion.div key={role} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-5 ${rd.color}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{rd.title}</p>
                        <p className="text-xs text-muted-foreground">{count} {locale === "en" ? "members" : "عضو"}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rd.desc}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Screen Permissions */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{locale === "en" ? "Screen Access" : "صلاحيات الشاشات"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{locale === "en" ? "Control which screens each role can access" : "تحكم بالشاشات المتاحة لكل دور"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {permissionsChanged && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetPermissions} className="gap-1.5 text-xs">
                        <XCircle className="w-3.5 h-3.5" />{t("team.resetPermissions")}
                      </Button>
                      <Button size="sm" onClick={savePermissions} className="gap-1.5 text-xs bg-primary text-primary-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5" />{t("team.savePermissions")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_repeat(3,minmax(90px,110px))] items-center px-4 sm:px-6 py-3 bg-muted/40 border-b border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {locale === "en" ? "Page" : "الصفحة"}
                  </span>
                  {(["admin", "recruiter", "reviewer"] as const).map(role => (
                    <span key={role} className="text-xs font-semibold text-muted-foreground text-center">
                      {role === "admin" ? t("team.roleAdmin") : role === "recruiter" ? t("team.roleRecruiter") : t("team.roleReviewer")}
                    </span>
                  ))}
                </div>
                {/* Rows */}
                <div className="divide-y divide-border/50">
                  {screenPermissions.map((p) => {
                    const Icon = PERMISSION_ICONS[p.permission_key] || Monitor;
                    return (
                      <div
                        key={p.permission_key}
                        className="grid grid-cols-[1fr_repeat(3,minmax(90px,110px))] items-center px-4 sm:px-6 py-3.5 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{permLabels[p.permission_key] || p.permission_key}</p>
                            {p.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.description}</p>}
                          </div>
                        </div>
                        {(["admin", "recruiter", "reviewer"] as const).map(role => {
                          const isAdmin = role === "admin";
                          return (
                            <div key={role} className="flex justify-center">
                              <Switch
                                checked={p[role]}
                                onCheckedChange={() => togglePermission(p.permission_key, role)}
                                disabled={isAdmin}
                                className={isAdmin ? "opacity-50 cursor-not-allowed" : ""}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Permissions */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{locale === "en" ? "Action Permissions" : "صلاحيات الإجراءات"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{locale === "en" ? "Control which actions each role can perform" : "تحكم بالإجراءات المسموح بها لكل دور"}</p>
                </div>
              </div>

              <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_repeat(3,minmax(90px,110px))] items-center px-4 sm:px-6 py-3 bg-muted/40 border-b border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {locale === "en" ? "Action" : "الإجراء"}
                  </span>
                  {(["admin", "recruiter", "reviewer"] as const).map(role => (
                    <span key={role} className="text-xs font-semibold text-muted-foreground text-center">
                      {role === "admin" ? t("team.roleAdmin") : role === "recruiter" ? t("team.roleRecruiter") : t("team.roleReviewer")}
                    </span>
                  ))}
                </div>
                {/* Rows */}
                <div className="divide-y divide-border/50">
                  {actionPermissions.map((p) => {
                    const Icon = PERMISSION_ICONS[p.permission_key] || Zap;
                    const isDanger = p.permission_key.includes("delete");
                    return (
                      <div
                        key={p.permission_key}
                        className="grid grid-cols-[1fr_repeat(3,minmax(90px,110px))] items-center px-4 sm:px-6 py-3.5 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isDanger ? "bg-destructive/10" : "bg-warning/10"
                          }`}>
                            <Icon className={`w-4 h-4 ${isDanger ? "text-destructive" : "text-warning"}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground text-sm truncate">{permLabels[p.permission_key] || p.permission_key}</p>
                              {isDanger && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-destructive/30 text-destructive shrink-0">
                                  {locale === "en" ? "Danger" : "خطر"}
                                </Badge>
                              )}
                            </div>
                            {p.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.description}</p>}
                          </div>
                        </div>
                        {(["admin", "recruiter", "reviewer"] as const).map(role => {
                          const isAdmin = role === "admin";
                          return (
                            <div key={role} className="flex justify-center">
                              <Switch
                                checked={p[role]}
                                onCheckedChange={() => togglePermission(p.permission_key, role)}
                                disabled={isAdmin}
                                className={isAdmin ? "opacity-50 cursor-not-allowed" : ""}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {permissionsChanged && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl"
                >
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                  <p className="text-sm text-warning flex-1">{locale === "en" ? "You have unsaved changes" : "لديك تغييرات غير محفوظة"}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetPermissions} className="text-xs">{t("team.resetPermissions")}</Button>
                    <Button size="sm" onClick={savePermissions} className="text-xs bg-primary text-primary-foreground">{t("team.savePermissions")}</Button>
                  </div>
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* ─── Invitations Tab ─── */}
          <TabsContent value="invitations">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t("team.invitationsTab")} ({allInvitations.length})</span>
                <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5" />{t("team.inviteUser")}
                </Button>
              </div>
              {allInvitations.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <Mail className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground">{t("team.noInvitations")}</p>
                  <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
                    <UserPlus className="w-4 h-4" />{t("team.sendInvite")}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allInvitations.map((inv: any) => {
                    const StatusIcon = statusIcons[inv.status] || Clock;
                    const isExpired = new Date(inv.expires_at) < new Date() && inv.status === "pending";
                    const displayStatus = isExpired ? "expired" : inv.status;
                    const daysLeft = Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000));
                    const isPending = displayStatus === "pending" && !isExpired;
                    const canResend = isExpired || displayStatus === "expired";
                    return (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${displayStatus === "accepted" ? "bg-green-500/10" : displayStatus === "expired" ? "bg-destructive/10" : "bg-warning/10"}`}>
                            <StatusIcon className={`w-5 h-5 ${displayStatus === "accepted" ? "text-green-500" : displayStatus === "expired" ? "text-destructive" : "text-warning"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {getTimeAgo(inv.created_at)}
                              {isPending && ` · ${locale === "en" ? `expires in ${daysLeft} days` : `تنتهي خلال ${daysLeft} يوم`}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${roleColors[inv.role] || ""} text-xs border-0`}>{roleLabels[inv.role]}</Badge>
                          <Badge variant={displayStatus === "accepted" ? "default" : "outline"} className={`text-xs ${displayStatus === "expired" ? "text-destructive border-destructive/30" : ""}`}>
                            {statusLabels[displayStatus] || displayStatus}
                          </Badge>
                          
                          {/* Action buttons for invitations */}
                          {isPending && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                    const url = `${window.location.origin}/auth?mode=signup&invite=${inv.token}&email=${encodeURIComponent(inv.email)}`;
                                    copyLink(url);
                                  }}>
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{locale === "en" ? "Copy invite link" : "نسخ رابط الدعوة"}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleCancelInvite(inv.id)}>
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("team.cancelInvite")}</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {canResend && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleResendInvite(inv)}>
                                  <RefreshCw className="w-3.5 h-3.5" />{t("team.resendInvite")}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("team.resendInvite")}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Activity Log Tab ─── */}
          <TabsContent value="activity" className="space-y-4">
            <div className="flex gap-2">
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"} text-muted-foreground`} />
                  <SelectValue placeholder={t("team.filterAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("team.filterAll")}</SelectItem>
                  <SelectItem value="invitation">{t("team.invitationsTab")}</SelectItem>
                  <SelectItem value="candidate">{t("team.filterCandidates")}</SelectItem>
                  <SelectItem value="job">{t("team.filterJobs")}</SelectItem>
                  <SelectItem value="interview">{t("team.filterInterviews")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                <span className="text-sm font-medium text-muted-foreground">{t("team.activityLog")} ({filteredActivity.length})</span>
              </div>
              {filteredActivity.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground">{t("team.noActivity")}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredActivity.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-muted/10 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mt-0.5 shrink-0">
                        {(log.user_name || "U").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user_name || (locale === "en" ? "User" : "مستخدم")}</span>
                          {" "}<span className="text-muted-foreground">{log.action}</span>
                        </p>
                        {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                        {log.entity_type && (
                          <Badge variant="outline" className="text-[10px] mt-1 h-4">
                            {entityTypeLabels[log.entity_type] || log.entity_type}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-1">{getTimeAgo(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Member Detail Dialog ─── */}
        <Dialog open={!!memberDetailOpen} onOpenChange={(o) => !o && setMemberDetailOpen(null)}>
          <DialogContent className="sm:max-w-lg" dir={dir}>
            <DialogHeader>
              <DialogTitle>{t("team.memberDetails")}</DialogTitle>
            </DialogHeader>
            {selectedMember && selectedProfile && selectedStats && (
              <div className="space-y-5 mt-2">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {(selectedProfile.full_name || "U").charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selectedProfile.full_name || (locale === "en" ? "User" : "مستخدم")}</p>
                    {getUserEmail(memberDetailOpen!) && (
                      <p className="text-xs text-muted-foreground">{getUserEmail(memberDetailOpen!)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(selectedProfile.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${roleColors[selectedMember.role] || ""} text-xs border-0`}>
                        {roleLabels[selectedMember.role]}
                      </Badge>
                      {getLastActivity(memberDetailOpen!) && (
                        <span className="text-[10px] text-muted-foreground">
                          {t("team.lastActive")}: {getTimeAgo(getLastActivity(memberDetailOpen!)!)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-3">{t("team.performance")}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: t("team.candidatesManaged"), value: selectedStats.candidates, icon: Users },
                      { label: t("team.interviewsConducted"), value: selectedStats.interviews, icon: Calendar },
                      { label: t("team.jobsPosted"), value: selectedStats.jobs, icon: Briefcase },
                      { label: t("team.hiredCount"), value: selectedStats.hired, icon: CheckCircle2 },
                      { label: t("team.conversionRate"), value: `${selectedStats.conversionRate}%`, icon: BarChart3 },
                      { label: t("team.avgAiScore"), value: `${selectedStats.avgAiScore}%`, icon: Bot },
                    ].map(s => (
                      <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
                        <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedStats.candidates > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{t("team.conversionRate")}</span>
                      <span>{selectedStats.conversionRate}%</span>
                    </div>
                    <Progress value={selectedStats.conversionRate} className="h-2 [&>div]:bg-primary" />
                  </div>
                )}

                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-xs font-medium text-foreground mb-2">{t("team.changeRole")}</p>
                  <Select defaultValue={selectedMember.role} onValueChange={(val) => {
                    updateRole.mutate({ userId: selectedMember.user_id, role: val as AppRole });
                    setMemberDetailOpen(null);
                  }}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t("team.roleAdmin")}</SelectItem>
                      <SelectItem value="recruiter">{t("team.roleRecruiter")}</SelectItem>
                      <SelectItem value="reviewer">{t("team.roleReviewer")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Edit Member Dialog ─── */}
        <Dialog open={!!editMemberOpen} onOpenChange={(o) => !o && setEditMemberOpen(null)}>
          <DialogContent className="sm:max-w-md" dir={dir}>
            <DialogHeader>
              <DialogTitle>{t("team.editMember")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{t("team.editName")}</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("team.roleLabel")}</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("team.roleAdmin")}</SelectItem>
                    <SelectItem value="recruiter">{t("team.roleRecruiter")}</SelectItem>
                    <SelectItem value="reviewer">{t("team.roleReviewer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditMemberOpen(null)}>{t("team.cancel")}</Button>
              <Button onClick={handleSaveEdit} className="gap-2 bg-primary text-primary-foreground">
                <CheckCircle2 className="w-4 h-4" />{t("team.saveChanges")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation ─── */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
          <AlertDialogContent dir={dir}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("team.deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("team.deleteConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("team.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Trash2 className="w-4 h-4 me-2" />{t("team.confirmDelete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Custom Role Creation Modal */}
        <Dialog open={openAddCustomRole} onOpenChange={setOpenAddCustomRole}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6 max-h-[85vh] overflow-y-auto" dir={dir}>
            <DialogHeader className="text-right space-y-1">
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                إضافة دور مخصص وتخصيص الصلاحيات
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                اكتب اسم الدور (مثل: مدير مقابلات، مسؤول عروض) وحدد الصلاحيات المسموح بها له بالنظام.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCustomRole} className="space-y-4 text-right pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">اسم الدور المخصص *</Label>
                <Input value={customRoleForm.name} onChange={e => setCustomRoleForm({...customRoleForm, name: e.target.value})} placeholder="مثال: مدير مقابلات وتقييمات" required className="rounded-xl h-10 text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الوصف والتوضيح</Label>
                <Input value={customRoleForm.description} onChange={e => setCustomRoleForm({...customRoleForm, description: e.target.value})} placeholder="يختص بإجراء وتقييم المقابلات دون الوصول للإعدادات..." className="rounded-xl h-10 text-xs" />
              </div>

              {/* Permissions Selection Grid */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-bold text-foreground block">تحديد الصلاحيات المتاحة لهذا الدور ({customRoleForm.permissions.length}):</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-muted/20 rounded-2xl border border-border/40">
                  {localPermissions.map((p) => {
                    const isChecked = customRoleForm.permissions.includes(p.permission_key);
                    return (
                      <label key={p.permission_key} className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${isChecked ? "bg-primary/10 border-primary/30 font-bold text-primary" : "bg-card border-border/40 text-muted-foreground"}`}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleCustomPermission(p.permission_key)} className="rounded text-primary focus:ring-primary" />
                        <span className="truncate">{permLabels[p.permission_key] || p.permission_key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenAddCustomRole(false)} className="rounded-xl h-10 text-xs font-bold">إلغاء</Button>
                <Button type="submit" disabled={createCustomRole.isPending} className="rounded-xl h-10 text-xs font-bold gap-2 bg-primary">
                  {createCustomRole.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {createCustomRole.isPending ? "جاري الحفظ..." : "حفظ وإنشاء الدور المخصص 🚀"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Employee Credentials Modal */}
        {createdEmpCredentials && (
          <Dialog open={!!createdEmpCredentials} onOpenChange={() => setCreatedEmpCredentials(null)}>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 text-right space-y-4" dir={dir}>
              <DialogHeader className="text-right space-y-1">
                <DialogTitle className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  تم تجهيز حساب الموظف وتوليد بيانات الدخول بنجاح! 🎉
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  يمكن للموظف <strong>{createdEmpCredentials.name}</strong> تسجيل الدخول فوراً باستخدام البيانات التالية:
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-2xl bg-card border-2 border-emerald-500/30 space-y-2 font-mono text-xs shadow-sm" dir="ltr">
                <p><strong className="font-sans text-foreground">Email:</strong> {createdEmpCredentials.email}</p>
                <p><strong className="font-sans text-foreground">Password:</strong> {createdEmpCredentials.pass}</p>
                <p><strong className="font-sans text-foreground">Role:</strong> {createdEmpCredentials.role}</p>
                <p className="text-[11px] text-muted-foreground font-sans pt-1">
                  <strong>Login Link:</strong> {window.location.origin}/auth
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => {
                  const text = `بيانات دخول حساب الموظف (${createdEmpCredentials.name}):\nالبريد الإلكتروني: ${createdEmpCredentials.email}\nكلمة المرور: ${createdEmpCredentials.pass}\nالدور: ${createdEmpCredentials.role}\nرابط الدخول: ${window.location.origin}/auth`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "تم نسخ بيانات الدخول للأن حافظة ✅" });
                }} className="w-full rounded-xl h-10 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Copy className="w-4 h-4" />
                  نسخ بيانات الدخول للموظف 📋
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </DashboardLayout>
  );
}
