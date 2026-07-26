import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomRoles } from "@/hooks/useUserRole";
import {
  Shield, Check, Search, Download, FileSpreadsheet, Printer, Save, RefreshCw,
  Monitor, Briefcase, Users, Kanban, Calendar, FileText, BarChart3, Target,
  Star, Bot, Building2, UserPlus, Lock, Settings2
} from "lucide-react";
import * as XLSX from "xlsx";

export interface ModulePermission {
  module_key: string;
  name_ar: string;
  name_en: string;
  category: string;
  icon: any;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const SYSTEM_MODULES = [
  { key: "dashboard", name_ar: "لوحة التحكم الرئيسية", name_en: "Dashboard", category: "الشاشات الأساسية", icon: Monitor },
  { key: "jobs", name_ar: "إدارة الوظائف والشواغر", name_en: "Jobs Management", category: "التوظيف", icon: Briefcase },
  { key: "candidates", name_ar: "إدارة المرشحين والمتقدمين", name_en: "Candidates Management", category: "التوظيف", icon: Users },
  { key: "pipeline", name_ar: "مسار التوظيف والفرز", name_en: "Recruitment Pipeline", category: "التوظيف", icon: Kanban },
  { key: "interviews", name_ar: "المقابلات والمواعيد", name_en: "Interviews", category: "التوظيف", icon: Calendar },
  { key: "offers", name_ar: "العروض الوظيفية والعقود", name_en: "Offers & Contracts", category: "التوظيف", icon: FileText },
  { key: "reports", name_ar: "التقارير والإحصائيات", name_en: "Reports & Analytics", category: "التقارير", icon: BarChart3 },
  { key: "hiring_plan", name_ar: "خطة التوظيف والميزانيات", name_en: "Hiring Plan", category: "التقارير", icon: Target },
  { key: "talent_pool", name_ar: "قاعدة المواهب والسير الذاتية", name_en: "Talent Pool", category: "التوظيف", icon: Star },
  { key: "ai_assistant", name_ar: "مساعد التقييم والذكاء الاصطناعي", name_en: "AI Assistant", category: "أدوات متقدمة", icon: Bot },
  { key: "agencies", name_ar: "إدارة مكاتب التوظيف والعمل", name_en: "Labor & Recruitment Offices", category: "إدارة النظام", icon: Building2 },
  { key: "team", name_ar: "إدارة الفريق والأعضاء", name_en: "Team Management", category: "إدارة النظام", icon: UserPlus },
  { key: "audit_log", name_ar: "سجل الأمان والأحداث", name_en: "Security & Audit Log", category: "إدارة النظام", icon: Lock },
  { key: "settings", name_ar: "إعدادات المنصة والشركة", name_en: "Settings", category: "إدارة النظام", icon: Settings2 },
];

export default function PermissionsMatrixManager() {
  const { user } = useAuth();
  const { t, locale, dir } = useI18n();
  const { data: customRoles = [] } = useCustomRoles();

  const [selectedRole, setSelectedRole] = useState<string>("recruiter");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, { can_read: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});

  // Default initial matrix permissions per role
  const loadPermissionsForRole = async (roleKey: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("granular_permissions" as any)
        .select("*")
        .eq("role_key", roleKey);

      const permMap: Record<string, { can_read: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};

      // Seed defaults if no custom row exists
      SYSTEM_MODULES.forEach((mod) => {
        const existing = (data as any[])?.find((d) => d.module_key === mod.key);
        if (existing) {
          permMap[mod.key] = {
            can_read: existing.can_read ?? true,
            can_create: existing.can_create ?? true,
            can_edit: existing.can_edit ?? true,
            can_delete: existing.can_delete ?? false,
          };
        } else {
          // Fallback defaults based on role
          const isAdmin = roleKey === "admin";
          const isReviewer = roleKey === "reviewer";
          permMap[mod.key] = {
            can_read: true,
            can_create: !isReviewer,
            can_edit: !isReviewer,
            can_delete: isAdmin,
          };
        }
      });

      setPermissions(permMap);
    } catch (e: any) {
      console.warn("Failed to load granular permissions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPermissionsForRole(selectedRole);
  }, [selectedRole]);

  // Toggle single cell permission
  const togglePermission = (modKey: string, action: "can_read" | "can_create" | "can_edit" | "can_delete") => {
    if (selectedRole === "admin") {
      toast({ title: "صلاحيات المالك ثابتة ولا يمكن إغلاقها 👑", variant: "destructive" });
      return;
    }
    setPermissions((prev) => ({
      ...prev,
      [modKey]: {
        ...prev[modKey],
        [action]: !prev[modKey]?.[action],
      },
    }));
  };

  // Toggle full row select all
  const toggleRowAll = (modKey: string) => {
    if (selectedRole === "admin") return;
    const current = permissions[modKey];
    const allChecked = current?.can_read && current?.can_create && current?.can_edit && current?.can_delete;
    setPermissions((prev) => ({
      ...prev,
      [modKey]: {
        can_read: !allChecked,
        can_create: !allChecked,
        can_edit: !allChecked,
        can_delete: !allChecked,
      },
    }));
  };

  // Toggle column select all
  const toggleColumnAll = (action: "can_read" | "can_create" | "can_edit" | "can_delete") => {
    if (selectedRole === "admin") return;
    const allChecked = SYSTEM_MODULES.every((mod) => permissions[mod.key]?.[action]);
    setPermissions((prev) => {
      const next = { ...prev };
      SYSTEM_MODULES.forEach((mod) => {
        next[mod.key] = {
          ...next[mod.key],
          [action]: !allChecked,
        };
      });
      return next;
    });
  };

  // Save Permissions Matrix to DB
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const recordsToUpsert = SYSTEM_MODULES.map((mod) => ({
        role_key: selectedRole,
        module_key: mod.key,
        can_read: permissions[mod.key]?.can_read ?? true,
        can_create: permissions[mod.key]?.can_create ?? false,
        can_edit: permissions[mod.key]?.can_edit ?? false,
        can_delete: permissions[mod.key]?.can_delete ?? false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("granular_permissions" as any)
        .upsert(recordsToUpsert as any, { onConflict: "company_id,role_key,module_key" });

      if (error) throw error;
      toast({ title: "تم حفظ مصفوفة الصلاحيات بنجاح 💾✅", description: `تم تحديث صلاحيات الدور المحدد (${selectedRole})` });
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Export matrix to Excel
  const exportToExcel = () => {
    const data = filteredModules.map((mod) => ({
      "الموديول / الصفحة": locale === "en" ? mod.name_en : mod.name_ar,
      "قراءة (Read)": permissions[mod.key]?.can_read ? "نعم" : "لا",
      "إدخال (Create)": permissions[mod.key]?.can_create ? "نعم" : "لا",
      "تعديل (Edit)": permissions[mod.key]?.can_edit ? "نعم" : "لا",
      "حذف (Delete)": permissions[mod.key]?.can_delete ? "نعم" : "لا",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Permissions Matrix");
    XLSX.writeFile(workbook, `Permissions_Matrix_${selectedRole}.xlsx`);
    toast({ title: "تم تصدير مصفوفة الصلاحيات إلى ملف Excel 📊" });
  };

  const filteredModules = useMemo(() => {
    if (!searchQuery) return SYSTEM_MODULES;
    const q = searchQuery.toLowerCase();
    return SYSTEM_MODULES.filter(
      (m) => m.name_ar.toLowerCase().includes(q) || m.name_en.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 text-right" dir={dir}>
      {/* ── Top Bar Controls Matching Reference Screenshot ── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>مصفوفة الصلاحيات العامة والتفصيلية</span>
            </div>
            <h2 className="text-xl font-black text-foreground">جدول تحديد صلاحيات القراءة والإدخال والتعديل والحذف</h2>
            <p className="text-xs text-muted-foreground">حدد الدور المطلوبة للتحكم التام في إمكانيات المستخدمين عبر كافة موديولات النظام.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={exportToExcel} variant="outline" className="rounded-xl h-10 text-xs font-bold gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              تصدير Excel 📊
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl h-10 px-6 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "جاري الحفظ..." : "حفظ الصلاحيات 💾"}
            </Button>
          </div>
        </div>

        {/* Role Selection & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Label className="text-xs font-bold text-muted-foreground shrink-0">اختيار الدور / المستوى:</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-64 h-10 rounded-xl font-bold text-xs bg-muted/30">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="admin">👑 المالك / مدير النظام الكامل (Admin)</SelectItem>
                <SelectItem value="recruiter">💼 مسؤول توظيف (HR Recruiter)</SelectItem>
                <SelectItem value="reviewer">👁️ مشاهد ومقيم (Reviewer)</SelectItem>
                {customRoles.map((cr) => (
                  <SelectItem key={cr.id} value={`custom:${cr.id}`}>
                    ✨ دور مخصص: {cr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الصفحة أو الموديول..."
              className="pr-9 h-10 text-xs rounded-xl bg-muted/20"
            />
          </div>
        </div>
      </div>

      {/* ── Enterprise Permissions Table Grid (Exact Layout as Reference) ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-right">
            <thead>
              <tr className="bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800">
                <th className="p-3.5 font-black text-right min-w-[220px]">
                  اسم الصفحة / الموديول
                </th>

                {/* Read Column Header */}
                <th className="p-3.5 font-bold text-center border-r border-slate-800 w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>قراءة 👁️</span>
                    <button
                      onClick={() => toggleColumnAll("can_read")}
                      className="text-[10px] text-emerald-400 hover:underline font-normal"
                    >
                      (تحديد الكل)
                    </button>
                  </div>
                </th>

                {/* Create Column Header */}
                <th className="p-3.5 font-bold text-center border-r border-slate-800 w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>إدخال ➕</span>
                    <button
                      onClick={() => toggleColumnAll("can_create")}
                      className="text-[10px] text-emerald-400 hover:underline font-normal"
                    >
                      (تحديد الكل)
                    </button>
                  </div>
                </th>

                {/* Edit Column Header */}
                <th className="p-3.5 font-bold text-center border-r border-slate-800 w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>تعديل ✏️</span>
                    <button
                      onClick={() => toggleColumnAll("can_edit")}
                      className="text-[10px] text-emerald-400 hover:underline font-normal"
                    >
                      (تحديد الكل)
                    </button>
                  </div>
                </th>

                {/* Delete Column Header */}
                <th className="p-3.5 font-bold text-center border-r border-slate-800 w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>حذف 🗑️</span>
                    <button
                      onClick={() => toggleColumnAll("can_delete")}
                      className="text-[10px] text-emerald-400 hover:underline font-normal"
                    >
                      (تحديد الكل)
                    </button>
                  </div>
                </th>

                {/* Select All Row Column Header */}
                <th className="p-3.5 font-bold text-center border-r border-slate-800 w-24">
                  الكل ✓
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredModules.map((mod, idx) => {
                const Icon = mod.icon;
                const perm = permissions[mod.key] || { can_read: false, can_create: false, can_edit: false, can_delete: false };
                const isRowAllChecked = perm.can_read && perm.can_create && perm.can_edit && perm.can_delete;

                return (
                  <tr
                    key={mod.key}
                    className={`transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/15"} hover:bg-primary/5`}
                  >
                    {/* Module Info */}
                    <td className="p-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{locale === "en" ? mod.name_en : mod.name_ar}</p>
                          <span className="text-[10px] text-muted-foreground font-normal">{mod.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Read Checkbox */}
                    <td className="p-3.5 text-center border-r border-border/40">
                      <input
                        type="checkbox"
                        checked={perm.can_read}
                        onChange={() => togglePermission(mod.key, "can_read")}
                        disabled={selectedRole === "admin"}
                        className="w-4 h-4 text-emerald-600 rounded border-border focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    {/* Create Checkbox */}
                    <td className="p-3.5 text-center border-r border-border/40">
                      <input
                        type="checkbox"
                        checked={perm.can_create}
                        onChange={() => togglePermission(mod.key, "can_create")}
                        disabled={selectedRole === "admin"}
                        className="w-4 h-4 text-emerald-600 rounded border-border focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    {/* Edit Checkbox */}
                    <td className="p-3.5 text-center border-r border-border/40">
                      <input
                        type="checkbox"
                        checked={perm.can_edit}
                        onChange={() => togglePermission(mod.key, "can_edit")}
                        disabled={selectedRole === "admin"}
                        className="w-4 h-4 text-emerald-600 rounded border-border focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    {/* Delete Checkbox */}
                    <td className="p-3.5 text-center border-r border-border/40">
                      <input
                        type="checkbox"
                        checked={perm.can_delete}
                        onChange={() => togglePermission(mod.key, "can_delete")}
                        disabled={selectedRole === "admin"}
                        className="w-4 h-4 text-emerald-600 rounded border-border focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    {/* Row Select All Checkbox */}
                    <td className="p-3.5 text-center border-r border-border/40">
                      <input
                        type="checkbox"
                        checked={isRowAllChecked}
                        onChange={() => toggleRowAll(mod.key)}
                        disabled={selectedRole === "admin"}
                        className="w-4 h-4 text-indigo-600 rounded border-border focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Matching Enterprise Grid */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>إجمالي الشاشات والموديولات المسجلة: <strong>{filteredModules.length} موديول</strong></span>
          <span>الدور الحالي المحرر: <Badge variant="outline" className="text-xs font-bold text-primary">{selectedRole}</Badge></span>
        </div>
      </div>
    </div>
  );
}
