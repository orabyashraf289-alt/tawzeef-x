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
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Check, Search, Download, FileSpreadsheet, Save, RefreshCw,
  Monitor, Briefcase, Users, Kanban, Calendar, FileText, BarChart3, Target,
  Star, Bot, Building2, UserPlus, Lock, Settings2, Video, HelpCircle, Layers,
  ChevronDown, ChevronUp, Sparkles, CheckCircle2, Eye, Plus, Edit3, Trash2
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

const MODULE_CATEGORIES: SystemModuleCategory[] = [
  {
    id: "recruitment",
    title_ar: "موديول التوظيف والشواغر",
    title_en: "Recruitment & Jobs Module",
    description_ar: "التحكم في شاشات نشر الوظائف ومسار التوظيف وقاعدة المواهب والمرشحين",
    icon: Briefcase,
    color: "from-blue-600/20 via-indigo-600/10 to-transparent border-blue-500/30 text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    pages: [
      { key: "jobs", name_ar: "إدارة الوظائف والشواغر", name_en: "Jobs Directory", desc_ar: "نشر وتعديل وحذف إعلانات التوظيف للشواغر", icon: Briefcase },
      { key: "candidates", name_ar: "إدارة المرشحين والمتقدمين", name_en: "Candidates Directory", desc_ar: "استعراض وتعديل ومعالجة ملفات المرشحين", icon: Users },
      { key: "pipeline", name_ar: "مسار التوظيف والفرز", name_en: "Recruitment Pipeline", desc_ar: "تحريك المرشحين وتخصيص ساعات المرحلة SLA", icon: Kanban },
      { key: "talent_pool", name_ar: "قاعدة المواهب والسير الذاتية", name_en: "Talent Pool", desc_ar: "البحث في الأرشيف وتصنيف السير الكبيرة", icon: Star },
    ],
  },
  {
    id: "interviews_offers",
    title_ar: "موديول المقابلات والعروض الوظيفية",
    title_en: "Interviews & Offers Module",
    description_ar: "صلاحيات جدولة المقابلات وغرف الفيديوهات وإنشاء وتوقيع العقود والعروض",
    icon: Calendar,
    color: "from-purple-600/20 via-pink-600/10 to-transparent border-purple-500/30 text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    pages: [
      { key: "interviews", name_ar: "جدول المقابلات والمواعيد", name_en: "Interviews Calendar", desc_ar: "جدولة وتأكيد وتأجيل جلسات التقييم والمقابلات", icon: Calendar },
      { key: "video_room", name_ar: "غرفة المقابلات المرئية Direct Call", name_en: "Video Interview Room", desc_ar: "إجراء وتدوين ملاحظات المقابلات الصوتية والمرئية", icon: Video },
      { key: "offers", name_ar: "العروض الوظيفية والعقود", name_en: "Offers & Contracts", desc_ar: "صياغة واستعراض وإرسال عروض التوظيف", icon: FileText },
    ],
  },
  {
    id: "analytics_planning",
    title_ar: "موديول التقارير والتخطيط المالي",
    title_en: "Analytics & Planning Module",
    description_ar: "إحصائيات الأداء وميزانيات التوظيف وسجل الأمان وتتبع الأنشطة",
    icon: BarChart3,
    color: "from-emerald-600/20 via-teal-600/10 to-transparent border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    pages: [
      { key: "reports", name_ar: "تقارير الأداء والإحصائيات", name_en: "Reports & Analytics", desc_ar: "استعراض وتصدير رسوم الأداء ومعدل القبول", icon: BarChart3 },
      { key: "hiring_plan", name_ar: "خطة التوظيف والميزانيات", name_en: "Hiring Plan & Budget", desc_ar: "متابعة الميزانيات السنوية وخطة التعيينات", icon: Target },
      { key: "audit_log", name_ar: "سجل الأمان والتتبع Audit Log", name_en: "Security Audit Log", desc_ar: "مراقبة سجل الأحداث والدخول والعمليات الحساسة", icon: Lock },
    ],
  },
  {
    id: "ai_tools",
    title_ar: "موديول الذكاء الاصطناعي والاختبارات",
    title_en: "AI & Assessments Module",
    description_ar: "أدوات التقييم الآلي وبنك الأسئلة وتحليل السير بالذكاء الاصطناعي",
    icon: Bot,
    color: "from-amber-600/20 via-orange-600/10 to-transparent border-amber-500/30 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    pages: [
      { key: "ai_assistant", name_ar: "مساعد التقييم والفرز الذكي", name_en: "AI Screening Assistant", desc_ar: "استعراض تحليلات المطابقة الآلية للمرشحين", icon: Bot },
      { key: "question_bank", name_ar: "بنك الأسئلة والاختبارات", name_en: "Question Bank & Tests", desc_ar: "إنشاء وتعديل أسئلة التقييم الفني والنفسي", icon: HelpCircle },
    ],
  },
  {
    id: "system_admin",
    title_ar: "موديول إدارة النظام والشركات والمكاتب",
    title_en: "System, Agencies & Team Module",
    description_ar: "إدارة الموظفين والشركات ومكاتب التوظيف وإعدادات النظام بالكامل",
    icon: Settings2,
    color: "from-cyan-600/20 via-sky-600/10 to-transparent border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    pages: [
      { key: "team", name_ar: "إدارة الفريق والأعضاء", name_en: "Team Management", desc_ar: "دعوة الموظفين وتعيين الأدوار والمسميات", icon: UserPlus },
      { key: "agencies", name_ar: "إدارة مكاتب التوظيف والعمل", name_en: "Labor & Recruitment Agencies", desc_ar: "إضافة المكاتب الخارجية ومتابعة مرشحيها", icon: Building2 },
      { key: "settings", name_ar: "إعدادات المنصة والهوية", name_en: "Company & Platform Settings", desc_ar: "تخصيص ألوان الهوية والشعار واشتراك المنصة", icon: Settings2 },
    ],
  },
];

export default function PermissionsMatrixManager() {
  const { user } = useAuth();
  const { locale, dir } = useI18n();
  const { data: customRoles = [] } = useCustomRoles();

  const [selectedRole, setSelectedRole] = useState<string>("recruiter");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, { can_read: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    recruitment: true,
    interviews_offers: true,
    analytics_planning: true,
    ai_tools: true,
    system_admin: true,
  });

  // Load Permissions for selected role
  const loadPermissionsForRole = async (roleKey: string) => {
    try {
      const { data } = await supabase
        .from("granular_permissions" as any)
        .select("*")
        .eq("role_key", roleKey);

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
            const isAdmin = roleKey === "admin";
            const isReviewer = roleKey === "reviewer";
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
    loadPermissionsForRole(selectedRole);
  }, [selectedRole]);

  // Toggle category collapse
  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Toggle single action
  const togglePermission = (pageKey: string, action: "can_read" | "can_create" | "can_edit" | "can_delete") => {
    if (selectedRole === "admin") {
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

  // Toggle whole page (all 4 actions for a page)
  const togglePageAll = (pageKey: string) => {
    if (selectedRole === "admin") return;
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

  // Toggle whole module category
  const toggleCategoryAll = (category: SystemModuleCategory) => {
    if (selectedRole === "admin") return;
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
        role_key: selectedRole,
        module_key: page.key,
        can_read: permissions[page.key]?.can_read ?? true,
        can_create: permissions[page.key]?.can_create ?? false,
        can_edit: permissions[page.key]?.can_edit ?? false,
        can_delete: permissions[page.key]?.can_delete ?? false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("granular_permissions" as any)
        .upsert(recordsToUpsert as any, { onConflict: "company_id,role_key,module_key" });

      if (error) throw error;
      toast({ title: "تم حفظ مصفوفة الصلاحيات بنجاح 💾✨", description: `تم تحديث وإعطاء الصلاحيات المخصصة لـ (${selectedRole})` });
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Export matrix to Excel
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
    XLSX.writeFile(workbook, `TawzeefX_Permissions_${selectedRole}.xlsx`);
    toast({ title: "تم تصدير ملف إكسيل للصلاحيات 📊" });
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
      {/* ── Glassmorphism Header Bar ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 space-y-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-xs font-bold border border-primary/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>مصفوفة التحكم في موديولات وصفحات النظام</span>
            </div>
            <h2 className="text-2xl font-black text-white">إدارة صلاحيات الصفحات والإجراءات التفصيلية</h2>
            <p className="text-xs text-slate-300">حدد الدور المطلوب، ثم فعّل أو عطل صلاحيات العرض، الإضافة، التعديل، والحذف لكل صفحة وموديول.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap relative z-10">
            <Button onClick={exportToExcel} variant="outline" className="rounded-xl h-11 px-4 text-xs font-bold gap-2 bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              تصدير Excel 📊
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl h-11 px-6 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "جاري الحفظ..." : "حفظ مصفوفة الصلاحيات 💾"}
            </Button>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-bold text-slate-300 shrink-0">اختيار الدور / المسمى الوظيفي:</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full h-10 rounded-xl font-bold text-xs bg-slate-800/90 border-slate-700 text-white">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent dir={dir} className="bg-slate-900 border-slate-800 text-white">
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

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الصفحة أو الموديول..."
              className="pr-9 h-10 text-xs rounded-xl bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* ── Hierarchical Module Cards & Sub-pages Grid ── */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const CatIcon = cat.icon;
          const isExpanded = expandedCategories[cat.id] ?? true;

          // Check if all pages in category are enabled
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
                  <div className="w-11 h-11 rounded-2xl bg-card border border-border/60 shadow-sm flex items-center justify-center shrink-0">
                    <CatIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground">{locale === "en" ? cat.title_en : cat.title_ar}</h3>
                      <Badge className={`${cat.badgeBg} text-[10px] font-bold border`}>
                        {cat.pages.length} صفحات تابعة
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
                    disabled={selectedRole === "admin"}
                    className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-card/80 border-border/80"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${allCategoryChecked ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <span>تفعيل كل الموديول</span>
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
                          {/* Page Title & Info */}
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <PageIcon className="w-4.5 h-4.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-foreground">{locale === "en" ? page.name_en : page.name_ar}</p>
                                <button
                                  onClick={() => togglePageAll(page.key)}
                                  disabled={selectedRole === "admin"}
                                  className="text-[11px] text-primary hover:underline font-semibold"
                                >
                                  {isPageAllChecked ? "(تعطيل الكل)" : "(تحديد الكل)"}
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{page.desc_ar}</p>
                            </div>
                          </div>

                          {/* 4 Action Toggles Pills (Read, Add, Edit, Delete) */}
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
                              <Switch checked={perm.can_read} onCheckedChange={() => togglePermission(page.key, "can_read")} disabled={selectedRole === "admin"} className="scale-75" />
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
                              <Switch checked={perm.can_create} onCheckedChange={() => togglePermission(page.key, "can_create")} disabled={selectedRole === "admin"} className="scale-75" />
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
                              <Switch checked={perm.can_edit} onCheckedChange={() => togglePermission(page.key, "can_edit")} disabled={selectedRole === "admin"} className="scale-75" />
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
                              <Switch checked={perm.can_delete} onCheckedChange={() => togglePermission(page.key, "can_delete")} disabled={selectedRole === "admin"} className="scale-75" />
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
