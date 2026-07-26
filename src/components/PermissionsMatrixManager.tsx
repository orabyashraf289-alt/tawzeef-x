import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomRoles } from "@/hooks/useUserRole";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { PageHeader } from "@/components/ui/page-header";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Check, Search, Download, FileSpreadsheet, Save, RefreshCw,
  Monitor, Briefcase, Users, Kanban, Calendar, FileText, BarChart3, Target,
  Star, Bot, Building2, UserPlus, Lock, Settings2, Video, HelpCircle, Layers,
  ChevronDown, ChevronUp, Sparkles, CheckCircle2, Eye, Plus, Edit3, Trash2,
  UserCheck, User, ShieldAlert, SlidersHorizontal, BookOpen, GitBranch, Award,
  CheckSquare, Code, ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";

export interface SystemModuleCategory {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  icon: any;
  color: string;
  badgeBg: string;
  pages: {
    key: string;
    name_ar: string;
    name_en: string;
    desc_ar: string;
    icon: any;
  }[];
}

// Complete 100% Comprehensive Inventory of ALL System Modules & Sub-pages
const MODULE_CATEGORIES: SystemModuleCategory[] = [
  {
    id: "recruitment",
    title_ar: "موديول إدارة التوظيف والشواغر",
    title_en: "Recruitment & Job Management",
    description_ar: "دليل الوظائف، تفاصيل الشواغر، قائمة المرشحين، الملفات الشخصية، مسار الفرز، وقاعدة المواهب",
    icon: Briefcase,
    color: "from-blue-600/20 via-indigo-600/10 to-transparent border-blue-500/30 text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    pages: [
      { key: "jobs", name_ar: "إدارة الوظائف والشواغر", name_en: "Jobs Directory", desc_ar: "عرض ونشر الشواغر الوظيفية بالشركة", icon: Briefcase },
      { key: "job_details", name_ar: "تفاصيل وإدارة الشاغر الوظيفي", name_en: "Job Details & Specs", desc_ar: "تعديل بنود ومتطلبات الإعلان الوظيفي", icon: FileText },
      { key: "candidates", name_ar: "دليل المرشحين والمتقدمين", name_en: "Candidates Portal", desc_ar: "استعراض وتعديل ومعالجة طلبات المتقدمين", icon: Users },
      { key: "candidate_profile", name_ar: "الملف الشخصي الشامل للمرشح", name_en: "Full Candidate Profile", desc_ar: "اطلاع على السيرة، التقويم، والملاحظات", icon: User },
      { key: "pipeline", name_ar: "مسار التوظيف والفرز التفاعلي", name_en: "Interactive Pipeline", desc_ar: "تحريك المرشحين بين مراحل الفرز وتخصيص الساعات SLA", icon: Kanban },
      { key: "talent_pool", name_ar: "قاعدة المواهب والسير الذاتية", name_en: "Talent Pool", desc_ar: "البحث والأرشفة في قاعدة بيانات المرشحين الكبرى", icon: Star },
      { key: "resume_archive", name_ar: "أرشيف السير الذاتية المستوردة", name_en: "Resume Archive", desc_ar: "معالجة واستيراد ملفات السير الذاتية الضخمة", icon: Layers },
    ],
  },
  {
    id: "interviews_offers",
    title_ar: "موديول المقابلات والعروض الوظيفية",
    title_en: "Interviews & Offers Module",
    description_ar: "جدول المواعيد، التنسيق، غرف الفيديوهات المباشرة، وبوابة العروض والعقود",
    icon: Calendar,
    color: "from-purple-600/20 via-pink-600/10 to-transparent border-purple-500/30 text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    pages: [
      { key: "interviews", name_ar: "جدول المقابلات والمواعيد", name_en: "Interviews Calendar", desc_ar: "إدارة وتأجيل وتأكيد المواعيد للمتقدمين", icon: Calendar },
      { key: "book_interview", name_ar: "حجز وتنسيق المقابلات", name_en: "Book Interview Scheduler", desc_ar: "توليد وروابط مواعيد المقابلات التفاعلية", icon: Calendar },
      { key: "video_room", name_ar: "غرفة المقابلات المرئية المباشرة Direct Call", name_en: "Live Video Interview Room", desc_ar: "إجراء وتدوين ملاحظات المقابلات الصوتية والفيديو", icon: Video },
      { key: "offers", name_ar: "العروض الوظيفية والعقود", name_en: "Offers & Contracts Directory", desc_ar: "صياغة وإنشاء وإرسال العروض الوظيفية", icon: FileText },
      { key: "offer_portal", name_ar: "بوابة توقيع واطلاع العروض", name_en: "Offer Acceptance Portal", desc_ar: "متابعة توقيع وقبول العروض من المرشحين", icon: CheckCircle2 },
    ],
  },
  {
    id: "ai_assessments",
    title_ar: "موديول الذكاء الاصطناعي والاختبارات والأتمتة",
    title_en: "AI, Assessments & Automation",
    description_ar: "التقييم الآلي، بنك الأسئلة، الاختبارات الفنية، ومصمم أتمتة مسارات العمل",
    icon: Bot,
    color: "from-amber-600/20 via-orange-600/10 to-transparent border-amber-500/30 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    pages: [
      { key: "ai_assistant", name_ar: "مساعد الذكاء الاصطناعي للفرز", name_en: "AI Screening Assistant", desc_ar: "استعراض نتيجـة التحليل الذكي وتطابق الخبرات", icon: Bot },
      { key: "question_bank", name_ar: "بنك الأسئلة والاختبارات", name_en: "Question Bank Directory", desc_ar: "بناء وتصنيف بنك الأسئلة والمقابلات", icon: HelpCircle },
      { key: "take_assessment", name_ar: "شاشة تقديم الاختبارات", name_en: "Assessment Exam Interface", desc_ar: "رابط تقديم الاختبارات التقييمية للمرشح", icon: CheckSquare },
      { key: "assessment_responses", name_ar: "نتائج واستجابات الاختبارات", name_en: "Assessment Results", desc_ar: "استعراض درجات وإجابات المرشحين التفصيلية", icon: Award },
      { key: "workflow_editor", name_ar: "محرر مسارات العمل والأتمتة Workflows", name_en: "Workflow Automation Editor", desc_ar: "تصميم قواعد الأتمتة والإشعارات التلقائية", icon: SlidersHorizontal },
    ],
  },
  {
    id: "analytics_performance",
    title_ar: "موديول التقارير والأداء والتخطيط المالي",
    title_en: "Analytics, KPIs & Hiring Plan",
    description_ar: "تقارير الأداء، مؤشرات KPI، خطة التوظيف، الميزانيات، وخارطة التطوير",
    icon: BarChart3,
    color: "from-emerald-600/20 via-teal-600/10 to-transparent border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    pages: [
      { key: "reports", name_ar: "تقارير الأداء والإحصائيات الشاملة", name_en: "Reports & Analytics", desc_ar: "استعراض وتصدير الرسوم البيانية ومعدل القبول", icon: BarChart3 },
      { key: "performance_evaluation", name_ar: "تقييم أداء التوظيف ومؤشرات KPI", name_en: "Recruiter Performance KPIs", desc_ar: "قياس كفاءة مسؤولي التوظيف والسرعة", icon: Award },
      { key: "hiring_plan", name_ar: "خطة التوظيف والميزانيات", name_en: "Hiring Plan & Budget", desc_ar: "متابعة ميزانيات التوظيف والاحتياجات السنوية", icon: Target },
      { key: "roadmap", name_ar: "خارطة الطريق وتطوير المنصة", name_en: "Platform Development Roadmap", desc_ar: "متابعة المميزات والتحديثات المستقبلية للنظام", icon: GitBranch },
    ],
  },
  {
    id: "security_audit",
    title_ar: "موديول الحماية وسجل الأمان والأرشيف",
    title_en: "Security & Audit Trail Module",
    description_ar: "مراقبة سجل الأحداث والدخول، أمان الحسابات، وتقارير جودة البيانات",
    icon: Lock,
    color: "from-rose-600/20 via-red-600/10 to-transparent border-rose-500/30 text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    pages: [
      { key: "audit_log", name_ar: "سجل الأمان والأحداث Audit Log", name_en: "Security Audit Log", desc_ar: "مراقبة عمليات تسجيل الدخول والتعديلات الحساسة", icon: Lock },
      { key: "quality_report", name_ar: "تقرير جودة البيانات والنظام", name_en: "Data Quality Report", desc_ar: "فحص وتدقيق سلامة البيانات والتكرارات", icon: Code },
    ],
  },
  {
    id: "system_management",
    title_ar: "موديول إدارة النظام والمكاتب والفريق",
    title_en: "System, Agencies & Team Module",
    description_ar: "إدارة الموظفين والشركات، مكاتب العمل الخارجية، الإعدادات، والشروحات",
    icon: Settings2,
    color: "from-cyan-600/20 via-sky-600/10 to-transparent border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    pages: [
      { key: "team", name_ar: "إدارة الفريق وأعضاء الشركة", name_en: "Team Management", desc_ar: "دعوة الموظفين وتعيين المسميات والأدوار", icon: UserPlus },
      { key: "agencies", name_ar: "إدارة مكاتب التوظيف والعمل الخارجية", name_en: "Labor & Recruitment Agencies", desc_ar: "ربط المكاتب الخارجية وتفويض الصلاحيات", icon: Building2 },
      { key: "admin_agencies", name_ar: "لوحة إشراف مكاتب العمل Super Admin", name_en: "Agencies Admin Oversight", desc_ar: "إشراف المنصة المركزية على كافة المكاتب", icon: ShieldAlert },
      { key: "admin_companies", name_ar: "لوحة إشراف الشركات Super Admin", name_en: "Companies Admin Oversight", desc_ar: "إشراف ومتابعة شركات التوظيف المسجلة", icon: Building2 },
      { key: "settings", name_ar: "إعدادات المنصة والهوية والتخصصات", name_en: "Company & Platform Settings", desc_ar: "تعديل ألوان الهوية والشعار والاشتراك", icon: Settings2 },
      { key: "tutorial", name_ar: "الدليل التعليمي وشروحات الاستخدام", name_en: "System Tutorial & Guides", desc_ar: "استعراض الفيديوهات والشروحات التوضيحية", icon: BookOpen },
    ],
  },
];

export default function PermissionsMatrixManager() {
  const { user } = useAuth();
  const { locale, dir } = useI18n();
  const { data: customRoles = [] } = useCustomRoles();

  // Mode Selection State: 'role' (by group/role) OR 'user' (by individual employee)
  const [permissionMode, setPermissionMode] = useState<"role" | "user">("role");

  // Selected Role OR Selected User ID
  const [selectedRole, setSelectedRole] = useState<string>("recruiter");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Team Members List for Individual User Mode
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, { can_read: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    recruitment: true,
    interviews_offers: true,
    ai_assessments: true,
    analytics_performance: true,
    security_audit: true,
    system_management: true,
  });

  // Fetch Team Members for Individual User Selection
  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url");
      if (profs && profs.length > 0) {
        setTeamMembers(profs);
        if (!selectedUserId) setSelectedUserId(profs[0].user_id);
      }
    })();
  }, []);

  // Target Key for Database Queries (either role_key or user:USER_ID)
  const activeTargetKey = useMemo(() => {
    if (permissionMode === "user") {
      return `user:${selectedUserId}`;
    }
    return selectedRole;
  }, [permissionMode, selectedRole, selectedUserId]);

  // Load Permissions from Database
  const loadPermissions = async () => {
    try {
      let query = supabase.from("granular_permissions" as any).select("*");

      if (permissionMode === "user" && selectedUserId) {
        query = query.eq("user_id", selectedUserId);
      } else {
        query = query.eq("role_key", selectedRole).is("user_id", null);
      }

      const { data } = await query;
      const permMap: Record<string, { can_read: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};

      MODULE_CATEGORIES.forEach((cat) => {
        cat.pages.forEach((page) => {
          const existing = (data as any[])?.find((d) => d.module_key === page.key);
          if (existing) {
            permMap[page.key] = {
              can_read: existing.can_read ?? true,
              can_create: existing.can_create ?? true,
              can_edit: existing.can_edit ?? true,
              can_delete: existing.can_delete ?? false,
            };
          } else {
            const isAdmin = selectedRole === "admin" && permissionMode === "role";
            const isReviewer = selectedRole === "reviewer" && permissionMode === "role";
            permMap[page.key] = {
              can_read: true,
              can_create: !isReviewer,
              can_edit: !isReviewer,
              can_delete: isAdmin,
            };
          }
        });
      });

      setPermissions(permMap);
    } catch (e) {
      console.warn("Error loading permissions:", e);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [permissionMode, selectedRole, selectedUserId]);

  // Toggle Category Expand/Collapse
  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Toggle Single Action Permission
  const togglePermission = (pageKey: string, action: "can_read" | "can_create" | "can_edit" | "can_delete") => {
    if (permissionMode === "role" && selectedRole === "admin") {
      toast({ title: "صلاحيات المالك / Admin كاملة ولا يمكن تقييدها 👑", variant: "destructive" });
      return;
    }
    setPermissions((prev) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        [action]: !prev[pageKey]?.[action],
      },
    }));
  };

  // Toggle Whole Page (All 4 Actions)
  const togglePageAll = (pageKey: string) => {
    if (permissionMode === "role" && selectedRole === "admin") return;
    const curr = permissions[pageKey];
    const allChecked = curr?.can_read && curr?.can_create && curr?.can_edit && curr?.can_delete;
    setPermissions((prev) => ({
      ...prev,
      [pageKey]: {
        can_read: !allChecked,
        can_create: !allChecked,
        can_edit: !allChecked,
        can_delete: !allChecked,
      },
    }));
  };

  // Toggle Whole Category Module
  const toggleCategoryAll = (category: SystemModuleCategory) => {
    if (permissionMode === "role" && selectedRole === "admin") return;
    const categoryPages = category.pages;
    const allCategoryChecked = categoryPages.every((p) => {
      const perm = permissions[p.key];
      return perm?.can_read && perm?.can_create && perm?.can_edit && perm?.can_delete;
    });

    setPermissions((prev) => {
      const next = { ...prev };
      categoryPages.forEach((p) => {
        next[p.key] = {
          can_read: !allCategoryChecked,
          can_create: !allCategoryChecked,
          can_edit: !allCategoryChecked,
          can_delete: !allCategoryChecked,
        };
      });
      return next;
    });
  };

  // Save Permissions to DB
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allPages = MODULE_CATEGORIES.flatMap((c) => c.pages);
      const recordsToUpsert = allPages.map((page) => ({
        role_key: permissionMode === "role" ? selectedRole : `user:${selectedUserId}`,
        user_id: permissionMode === "user" ? selectedUserId : null,
        module_key: page.key,
        can_read: permissions[page.key]?.can_read ?? true,
        can_create: permissions[page.key]?.can_create ?? false,
        can_edit: permissions[page.key]?.can_edit ?? false,
        can_delete: permissions[page.key]?.can_delete ?? false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("granular_permissions" as any)
        .upsert(recordsToUpsert as any, { onConflict: "company_id,role_key,user_id,module_key" });

      if (error) throw error;

      const targetText = permissionMode === "user" 
        ? `للموظف المحدد (${teamMembers.find(m => m.user_id === selectedUserId)?.full_name || selectedUserId})` 
        : `للدور المحدد (${selectedRole})`;

      toast({ title: "تم حفظ مصفوفة الصلاحيات بنجاح 💾✨", description: `تم تخصيص وتأمين الصلاحيات ${targetText}` });
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Export Matrix to Excel
  const exportToExcel = () => {
    const rows: any[] = [];
    MODULE_CATEGORIES.forEach((cat) => {
      cat.pages.forEach((page) => {
        if (!searchQuery || page.name_ar.includes(searchQuery) || page.name_en.toLowerCase().includes(searchQuery.toLowerCase())) {
          rows.push({
            "الموديول الرئيسي": cat.title_ar,
            "اسم الصفحة / الخدمة": locale === "en" ? page.name_en : page.name_ar,
            "عرض (Read)": permissions[page.key]?.can_read ? "مفعل ✓" : "معطل ✕",
            "إضافة (Create)": permissions[page.key]?.can_create ? "مفعل ✓" : "معطل ✕",
            "تعديل (Edit)": permissions[page.key]?.can_edit ? "مفعل ✓" : "معطل ✕",
            "حذف (Delete)": permissions[page.key]?.can_delete ? "مفعل ✓" : "معطل ✕",
          });
        }
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Permissions");
    XLSX.writeFile(workbook, `TawzeefX_Permissions_${activeTargetKey}.xlsx`);
    toast({ title: "تم تصدير ملف إكسيل مصفوفة الصلاحيات 📊" });
  };

  // Filter Categories by Search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return MODULE_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return MODULE_CATEGORIES.map((cat) => ({
      ...cat,
      pages: cat.pages.filter((p) => p.name_ar.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q) || p.desc_ar.includes(q)),
    })).filter((cat) => cat.pages.length > 0);
  }, [searchQuery]);

  return (
    <div className="space-y-6 text-right" dir={dir}>
      {/* Clean Theme-Adaptive Page Header */}
      <PageHeader
        badgeText="نظام مصفوفة الصلاحيات المتقدم المخصص"
        badgeIcon={ShieldCheck}
        title="التحكم الفردي والمجموعاتي في جميع شاشات وموديولات النظام"
        description="يمكنك تخصيص الصلاحيات لمجموعة معينة (Roles) أو إعطاء صلاحيات استثنائية لموظف محدد بالاسم (Individual User Override)."
        icon={ShieldCheck}
        accentColor="primary"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={exportToExcel} variant="outline" className="rounded-xl h-11 px-4 text-xs font-bold gap-2 bg-card hover:bg-muted shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              تصدير Excel 📊
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl h-11 px-6 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "جاري الحفظ..." : "حفظ مصفوفة الصلاحيات 💾"}
            </Button>
          </div>
        }
      >
        {/* Dual Mode Switcher Tabs (Group Roles VS Individual User) */}
        <div className="p-1.5 bg-muted/50 rounded-2xl border border-border/70 flex flex-col sm:flex-row gap-2 mt-4">
          <button
            onClick={() => setPermissionMode("role")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
              permissionMode === "role"
                ? "bg-card text-foreground shadow-sm font-black border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Users className="w-4 h-4 text-primary" />
            <span>1️⃣ صلاحيات المجموعات والأدوار العامة (Roles & Groups)</span>
          </button>

          <button
            onClick={() => setPermissionMode("user")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
              permissionMode === "user"
                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-black border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>2️⃣ صلاحيات موظف ومستخدم مخصص بالاسم (Individual User Override)</span>
          </button>
        </div>

        {/* Dynamic Selector based on Mode (Role Select OR User Select) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {permissionMode === "role" ? (
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-muted-foreground shrink-0">اختيار الدور / المجموعة:</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full h-11 rounded-xl font-bold text-xs bg-card border-border">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent dir={dir} className="bg-card border-border">
                  <SelectItem value="admin">👑 المالك / مدير النظام الكامل (Admin)</SelectItem>
                  <SelectItem value="recruiter">💼 مسؤول توظيف HR (Recruiter)</SelectItem>
                  <SelectItem value="reviewer">👁️ مشاهد ومقيم (Reviewer)</SelectItem>
                  {customRoles.map((cr) => (
                    <SelectItem key={cr.id} value={`custom:${cr.name}`}>
                      ✨ دور مخصص: {cr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">اختر الموظف / المستخدم المحدد:</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-11 rounded-xl font-bold text-xs bg-card border-emerald-500/40">
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent dir={dir} className="bg-card border-border">
                  {teamMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      👤 {m.full_name || "مستخدم"} ({m.user_id.slice(0, 8)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الصفحة أو الموديول..."
              className="pr-9 h-11 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </PageHeader>

      {/* ── Hierarchical Module Cards & Sub-pages Inventory Grid ── */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const CatIcon = cat.icon;
          const isExpanded = expandedCategories[cat.id] ?? true;

          const allCategoryChecked = cat.pages.every((p) => {
            const perm = permissions[p.key];
            return perm?.can_read && perm?.can_create && perm?.can_edit && perm?.can_delete;
          });

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm space-y-0"
            >
              {/* Category Header */}
              <div
                className={`p-5 bg-gradient-to-r ${cat.color} border-b border-border/60 flex items-center justify-between gap-3 cursor-pointer select-none`}
                onClick={() => toggleCategoryExpand(cat.id)}
              >
                <div className="flex items-center gap-3">
                  <FlaticonCategoryIconCard icon={CatIcon} gradient={cat.color} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground">{locale === "en" ? cat.title_en : cat.title_ar}</h3>
                      <Badge className={`${cat.badgeBg} text-[10px] font-bold border`}>
                        {cat.pages.length} شاشات وخدمات
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.description_ar}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCategoryAll(cat)}
                    disabled={permissionMode === "role" && selectedRole === "admin"}
                    className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-card/80 border-border/80"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${allCategoryChecked ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <span>تفعيل الموديول بالكامل</span>
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => toggleCategoryExpand(cat.id)} className="h-9 w-9 rounded-xl">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Sub-pages Actions Matrix Grid */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="divide-y divide-border/50"
                  >
                    {cat.pages.map((page) => {
                      const PageIcon = page.icon;
                      const perm = permissions[page.key] || { can_read: false, can_create: false, can_edit: false, can_delete: false };
                      const isPageAllChecked = perm.can_read && perm.can_create && perm.can_edit && perm.can_delete;

                      return (
                        <div key={page.key} className="p-4 sm:px-6 hover:bg-muted/20 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Page Title & Description */}
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <FlaticonAnimatedIcon icon={PageIcon} animation="bounce" className="w-4.5 h-4.5" colorClass="text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-foreground">{locale === "en" ? page.name_en : page.name_ar}</p>
                                <button
                                  onClick={() => togglePageAll(page.key)}
                                  disabled={permissionMode === "role" && selectedRole === "admin"}
                                  className="text-[11px] text-primary hover:underline font-semibold"
                                >
                                  {isPageAllChecked ? "(تعطيل الكل)" : "(تحديد الكل)"}
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{page.desc_ar}</p>
                            </div>
                          </div>

                          {/* 4 Action Toggles (Read, Add, Edit, Delete) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                            {/* Read 👁️ */}
                            <div
                              onClick={() => togglePermission(page.key, "can_read")}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                perm.can_read
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold"
                                  : "bg-muted/30 border-border/60 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                <span>عرض 👁️</span>
                              </div>
                              <Switch checked={perm.can_read} onCheckedChange={() => togglePermission(page.key, "can_read")} disabled={permissionMode === "role" && selectedRole === "admin"} className="scale-75" />
                            </div>

                            {/* Create ➕ */}
                            <div
                              onClick={() => togglePermission(page.key, "can_create")}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                perm.can_create
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 font-bold"
                                  : "bg-muted/30 border-border/60 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة ➕</span>
                              </div>
                              <Switch checked={perm.can_create} onCheckedChange={() => togglePermission(page.key, "can_create")} disabled={permissionMode === "role" && selectedRole === "admin"} className="scale-75" />
                            </div>

                            {/* Edit ✏️ */}
                            <div
                              onClick={() => togglePermission(page.key, "can_edit")}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                perm.can_edit
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold"
                                  : "bg-muted/30 border-border/60 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل ✏️</span>
                              </div>
                              <Switch checked={perm.can_edit} onCheckedChange={() => togglePermission(page.key, "can_edit")} disabled={permissionMode === "role" && selectedRole === "admin"} className="scale-75" />
                            </div>

                            {/* Delete 🗑️ */}
                            <div
                              onClick={() => togglePermission(page.key, "can_delete")}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                perm.can_delete
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold"
                                  : "bg-muted/30 border-border/60 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف 🗑️</span>
                              </div>
                              <Switch checked={perm.can_delete} onCheckedChange={() => togglePermission(page.key, "can_delete")} disabled={permissionMode === "role" && selectedRole === "admin"} className="scale-75" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
