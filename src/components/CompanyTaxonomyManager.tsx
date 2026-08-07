import { useState, useMemo, useEffect } from "react";
import { ALL_AL_ANDALUS_BRANCHES } from "@/data/alAndalusBranches";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Building2, MapPin, Award, Plus, Trash2, Pencil, Check, X,
  Layers, Briefcase, Users, Search, Save, Sparkles, RefreshCw,
  Globe, Shield, ChevronRight, HelpCircle
} from "lucide-react";

// Default Initial Data
const DEFAULT_DEPARTMENTS = [
  { id: "dept-1", name: "التقنية والبرمجة", code: "TECH", color: "#6366f1", head: "مدير تقني" },
  { id: "dept-2", name: "الموارد البشرية", code: "HR", color: "#ec4899", head: "مدير HR" },
  { id: "dept-3", name: "التسويق والمبيعات", code: "MKT", color: "#f59e0b", head: "مدير التسويق" },
  { id: "dept-4", name: "المالية والمحاسبة", code: "FIN", color: "#10b981", head: "المدير المالي" },
  { id: "dept-5", name: "التشغيل واللوجستيات", code: "OPS", color: "#0ea5e9", head: "مدير التشغيل" },
  { id: "dept-6", name: "التصميم وتجربة المستخدم", code: "DES", color: "#8b5cf6", head: "قائد التصميم" },
  { id: "dept-7", name: "خدمة وتجربة العملاء", code: "CS", color: "#14b8a6", head: "مدير الدعم" },
];

const DEFAULT_LOCATIONS = [
  ...ALL_AL_ANDALUS_BRANCHES.map((b) => ({
    id: b.id,
    name: `${b.city} - ${b.name}`,
    city: b.city,
    country: "السعودية",
    type: b.schoolTypes.join(" / "),
    address: b.address,
  })),
  { id: "loc-1", name: "الرياض - المقر الرئيسي", city: "الرياض", country: "السعودية", type: "مكتبي", address: "طريق الملك فهد" },
  { id: "loc-2", name: "جدة - الفرع الغربي", city: "جدة", country: "السعودية", type: "مكتبي", address: "طريق الكورنيش" },
  { id: "loc-3", name: "المنطقة الشرقية - الخبر", city: "الخبر", country: "السعودية", type: "مكتبي", address: "شارع الأمير تركي" },
  { id: "loc-6", name: "عمل عن بُعد (Remote)", city: "عن بُعد", country: "عالمي", type: "عن_بعد", address: "أونلاين" },
];

const DEFAULT_EXPERIENCE_LEVELS = [
  { id: "exp-1", name: "حديث تخرج (Fresh Graduate)", minYears: 0, maxYears: 1, color: "#84cc16", badge: "مبتدئ جداً" },
  { id: "exp-2", name: "مبتدئ (Junior Level)", minYears: 1, maxYears: 3, color: "#22c55e", badge: "1-3 سنوات" },
  { id: "exp-3", name: "متوسط (Mid Level)", minYears: 3, maxYears: 5, color: "#0ea5e9", badge: "3-5 سنوات" },
  { id: "exp-4", name: "خبير (Senior Level)", minYears: 5, maxYears: 8, color: "#a855f7", badge: "5-8 سنوات" },
  { id: "exp-5", name: "قائد فريق / مدير (Lead / Manager)", minYears: 8, maxYears: 12, color: "#f59e0b", badge: "+8 سنوات" },
  { id: "exp-6", name: "تنفيذي / مدير قطاع (Executive / Director)", minYears: 12, maxYears: 20, color: "#ef4444", badge: "+12 سنة" },
];

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#2563eb", "#6d28d9", "#059669",
];

export default function CompanyTaxonomyManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"departments" | "locations" | "experience">("departments");

  // Departments State
  const [departments, setDepartments] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("company_departments");
      return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
    } catch { return DEFAULT_DEPARTMENTS; }
  });

  // Locations State
  const [locations, setLocations] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("company_locations");
      if (!saved) return DEFAULT_LOCATIONS;
      const parsed: any[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(l => l.id));
      const missingDefault = DEFAULT_LOCATIONS.filter(l => !existingIds.has(l.id));
      if (missingDefault.length > 0) {
        const merged = [...parsed, ...missingDefault];
        try { localStorage.setItem("company_locations", JSON.stringify(merged)); } catch {}
        return merged;
      }
      return parsed;
    } catch { return DEFAULT_LOCATIONS; }
  });

  // Experience Levels State
  const [experienceLevels, setExperienceLevels] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("company_experience_levels");
      return saved ? JSON.parse(saved) : DEFAULT_EXPERIENCE_LEVELS;
    } catch { return DEFAULT_EXPERIENCE_LEVELS; }
  });

  // Modal Dialog States
  const [editModalTarget, setEditModalTarget] = useState<any | null>(null);
  const [editModalType, setEditModalType] = useState<"department" | "location" | "experience" | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState<any>({});

  // Sync to local storage
  useEffect(() => {
    try { localStorage.setItem("company_departments", JSON.stringify(departments)); } catch {}
  }, [departments]);

  useEffect(() => {
    try { localStorage.setItem("company_locations", JSON.stringify(locations)); } catch {}
  }, [locations]);

  useEffect(() => {
    try { localStorage.setItem("company_experience_levels", JSON.stringify(experienceLevels)); } catch {}
  }, [experienceLevels]);

  // Handlers for Departments
  const handleOpenAddDepartment = () => {
    setFormData({ name: "", code: "", color: COLORS[departments.length % COLORS.length], head: "" });
    setEditModalType("department");
    setIsNewModal(true);
  };

  const handleOpenEditDepartment = (dept: any) => {
    setFormData({ ...dept });
    setEditModalTarget(dept);
    setEditModalType("department");
    setIsNewModal(false);
  };

  const handleSaveDepartment = () => {
    if (!formData.name?.trim()) return;
    if (isNewModal) {
      const newDept = {
        id: `dept-${Date.now()}`,
        name: formData.name.trim(),
        code: formData.code?.trim().toUpperCase() || "GEN",
        color: formData.color || COLORS[0],
        head: formData.head?.trim() || "مدير القسم",
      };
      setDepartments([...departments, newDept]);
      toast({ title: `تمت إضافة قسم "${newDept.name}" بنجاح ✅` });
    } else {
      setDepartments(departments.map(d => d.id === editModalTarget.id ? { ...d, ...formData } : d));
      toast({ title: `تم تحديث بيانات القسم بنجاح ✅` });
    }
    setEditModalType(null);
  };

  const handleDeleteDepartment = (id: string, name: string) => {
    if (departments.length <= 1) {
      toast({ title: "لا يمكن حذف جميع الأقسام", variant: "destructive" });
      return;
    }
    setDepartments(departments.filter(d => d.id !== id));
    toast({ title: `تم حذف قسم "${name}"` });
  };

  // Handlers for Locations
  const handleOpenAddLocation = () => {
    setFormData({ name: "", city: "الرياض", country: "السعودية", type: "مكتبي", address: "" });
    setEditModalType("location");
    setIsNewModal(true);
  };

  const handleOpenEditLocation = (loc: any) => {
    setFormData({ ...loc });
    setEditModalTarget(loc);
    setEditModalType("location");
    setIsNewModal(false);
  };

  const handleSaveLocation = () => {
    if (!formData.name?.trim()) return;
    if (isNewModal) {
      const newLoc = {
        id: `loc-${Date.now()}`,
        name: formData.name.trim(),
        city: formData.city?.trim() || "الرياض",
        country: formData.country?.trim() || "السعودية",
        type: formData.type || "مكتبي",
        address: formData.address?.trim() || "مقر العمل",
      };
      setLocations([...locations, newLoc]);
      toast({ title: `تمت إضافة موقع العمل "${newLoc.name}" بنجاح ✅` });
    } else {
      setLocations(locations.map(l => l.id === editModalTarget.id ? { ...l, ...formData } : l));
      toast({ title: `تم تحديث بيانات موقع العمل بنجاح ✅` });
    }
    setEditModalType(null);
  };

  const handleDeleteLocation = (id: string, name: string) => {
    if (locations.length <= 1) {
      toast({ title: "لا يمكن حذف جميع المواقع", variant: "destructive" });
      return;
    }
    setLocations(locations.filter(l => l.id !== id));
    toast({ title: `تم حذف الموقع "${name}"` });
  };

  // Handlers for Experience Levels
  const handleOpenAddExperience = () => {
    setFormData({ name: "", minYears: 0, maxYears: 3, color: COLORS[experienceLevels.length % COLORS.length], badge: "خبرة جديدة" });
    setEditModalType("experience");
    setIsNewModal(true);
  };

  const handleOpenEditExperience = (exp: any) => {
    setFormData({ ...exp });
    setEditModalTarget(exp);
    setEditModalType("experience");
    setIsNewModal(false);
  };

  const handleSaveExperience = () => {
    if (!formData.name?.trim()) return;
    if (isNewModal) {
      const newExp = {
        id: `exp-${Date.now()}`,
        name: formData.name.trim(),
        minYears: Number(formData.minYears) || 0,
        maxYears: Number(formData.maxYears) || 3,
        color: formData.color || COLORS[0],
        badge: formData.badge?.trim() || `${formData.minYears}-${formData.maxYears} سنوات`,
      };
      setExperienceLevels([...experienceLevels, newExp]);
      toast({ title: `تمت إضافة مستوى الخبرة "${newExp.name}" بنجاح ✅` });
    } else {
      setExperienceLevels(experienceLevels.map(e => e.id === editModalTarget.id ? { ...e, ...formData } : e));
      toast({ title: `تم تحديث مستوى الخبرة بنجاح ✅` });
    }
    setEditModalType(null);
  };

  const handleDeleteExperience = (id: string, name: string) => {
    if (experienceLevels.length <= 1) {
      toast({ title: "لا يمكن حذف جميع مستويات الخبرة", variant: "destructive" });
      return;
    }
    setExperienceLevels(experienceLevels.filter(e => e.id !== id));
    toast({ title: `تم حذف المستوى "${name}"` });
  };

  const handleImportAlAndalusBranches = () => {
    const existingIds = new Set(locations.map(l => l.id));
    const newItems = ALL_AL_ANDALUS_BRANCHES.filter(b => !existingIds.has(b.id)).map(b => ({
      id: b.id,
      name: `${b.city} - ${b.name}`,
      city: b.city,
      country: "السعودية",
      type: b.schoolTypes.join(" / "),
      address: b.address,
    }));

    if (newItems.length === 0) {
      toast({ title: "جميع فروع مدارس الأندلس الـ 13 مضافة بالفعل في تصنيف الفروع ✅" });
      return;
    }

    const updated = [...locations, ...newItems];
    setLocations(updated);
    try { localStorage.setItem("company_locations", JSON.stringify(updated)); } catch {}
    toast({ title: `تم استيراد وفهرسة ${newItems.length} فرع جديد لمدارس الأندلس بنجاح 🏫` });
  };

  const handleResetToDefaults = () => {
    setDepartments(DEFAULT_DEPARTMENTS);
    setLocations(DEFAULT_LOCATIONS);
    setExperienceLevels(DEFAULT_EXPERIENCE_LEVELS);
    toast({ title: "تم إعادة ضبط التصنيفات إلى الإعدادات الافتراضية ✅" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> تهيئة وتصنيف الأقسام والمواقع ومستويات الخبرة
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            خصص هيكلية الشركة، مواقع العمل، ومستويات الخبرة المطلوبة لتسهيل نشر الوظائف وتصفية المرشحين
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefaults}
            className="h-9 text-xs gap-1.5 text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" /> إعادة الضبط
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/60">
        <button
          onClick={() => setActiveSubTab("departments")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "departments"
              ? "bg-card text-primary shadow-xs border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4 text-primary" />
          <span>الأقسام الإدارية ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("locations")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "locations"
              ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPin className="w-4 h-4 text-emerald-500" />
          <span>مواقع العمل والمدن ({locations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("experience")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "experience"
              ? "bg-card text-purple-600 dark:text-purple-400 shadow-xs border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Award className="w-4 h-4 text-purple-500" />
          <span>مستويات الخبرة والدرجات ({experienceLevels.length})</span>
        </button>
      </div>

      {/* ─── Tab 1: Departments Setup ─── */}
      {activeSubTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">قائمة الأقسام الإدارية والتشغيلية</h3>
              <p className="text-xs text-muted-foreground">تُستخدم هذه الأقسام عند إنشاء منشورات التوظيف وعروض العمل وتصنيف المرشحين.</p>
            </div>
            <Button size="sm" onClick={handleOpenAddDepartment} className="h-8 text-xs gap-1.5 font-bold">
              <Plus className="w-3.5 h-3.5" /> إضافة قسم جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <Card key={dept.id} className="border-border/60 hover:border-primary/40 transition-all shadow-2xs group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs" style={{ backgroundColor: dept.color }}>
                        {dept.code || "DP"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{dept.name}</h4>
                        <p className="text-[10px] text-muted-foreground">المسؤول: {dept.head || "غير محدد"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDepartment(dept)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDepartment(dept.id, dept.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab 2: Locations Setup ─── */}
      {activeSubTab === "locations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">قائمة مواقع الفروع وأماكن العمل</h3>
              <p className="text-xs text-muted-foreground">حدد المدن والفروع ونمط العمل (مكتبي، عن بُعد، هجين) لشركتك.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleImportAlAndalusBranches} className="h-8 text-xs gap-1.5 font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> استيراد فروع مدارس الأندلس الـ 13 🏫
              </Button>
              <Button size="sm" onClick={handleOpenAddLocation} className="h-8 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-3.5 h-3.5" /> إضافة موقع عمل جديد
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="border-border/60 hover:border-emerald-500/40 transition-all shadow-2xs group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">{loc.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{loc.city} • {loc.country}</p>
                        <Badge variant="secondary" className="text-[9px] mt-1.5">
                          {loc.type === "عن_بعد" ? "🌐 عن بُعد" : loc.type === "هجين" ? "🔄 هجين" : "🏢 مكتبي"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditLocation(loc)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLocation(loc.id, loc.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab 3: Experience Levels Setup ─── */}
      {activeSubTab === "experience" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">تصنيف مستويات الخبرة والسنوات</h3>
              <p className="text-xs text-muted-foreground">حدد الدرجات الوظيفية ونطاق سنوات الخبرة المطلوبة في منصة التوظيف.</p>
            </div>
            <Button size="sm" onClick={handleOpenAddExperience} className="h-8 text-xs gap-1.5 font-bold bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-3.5 h-3.5" /> إضافة مستوى خبرة
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {experienceLevels.map((exp) => (
              <Card key={exp.id} className="border-border/60 hover:border-purple-500/40 transition-all shadow-2xs group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ backgroundColor: exp.color }}>
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-purple-600 transition-colors">{exp.name}</h4>
                        <p className="text-[11px] text-muted-foreground">نطاق الخبرة: {exp.minYears} - {exp.maxYears} سنوات</p>
                        <Badge variant="secondary" className="text-[9px] mt-1.5">
                          {exp.badge}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditExperience(exp)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExperience(exp.id, exp.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Edit / Add Item Dialog ─── */}
      <Dialog open={!!editModalType} onOpenChange={(open) => !open && setEditModalType(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          <DialogHeader className="border-b border-border/50 pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              {isNewModal ? "إضافة عنصر جديد" : "تعديل البيانات"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              أدخل التفاصيل المطلوبة ثم انقر حفظ للتأكيد.
            </DialogDescription>
          </DialogHeader>

          {/* Department Form */}
          {editModalType === "department" && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">اسم القسم</label>
                <Input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: الهندسة والبحث" className="h-9 text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">رمز القسم (الكود)</label>
                <Input value={formData.code || ""} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="ENG" className="h-9 text-xs font-mono" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">المسؤول عن القسم</label>
                <Input value={formData.head || ""} onChange={e => setFormData({ ...formData, head: e.target.value })} placeholder="مثال: مدير الهندسة" className="h-9 text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">اللون المميز</label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFormData({ ...formData, color: c })}
                      className={cn("w-5 h-5 rounded-md transition-all", formData.color === c && "ring-2 ring-offset-1 ring-primary")}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={formData.color || COLORS[0]} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-6 h-6 rounded border cursor-pointer p-0.5 ms-1" />
                </div>
              </div>
              <DialogFooter className="pt-3 border-t border-border/40">
                <Button variant="ghost" size="sm" onClick={() => setEditModalType(null)}>إلغاء</Button>
                <Button size="sm" onClick={handleSaveDepartment} className="font-bold gap-1">
                  <Check className="w-3.5 h-3.5" /> حفظ القسم
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Location Form */}
          {editModalType === "location" && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">اسم الفرع / الموقع</label>
                <Input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: فرع الرياض الرئيسي" className="h-9 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">المدينة</label>
                  <Input value={formData.city || ""} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="الرياض" className="h-9 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">الدولة</label>
                  <Input value={formData.country || ""} onChange={e => setFormData({ ...formData, country: e.target.value })} placeholder="السعودية" className="h-9 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">نمط العمل</label>
                <Select value={formData.type || "مكتبي"} onValueChange={v => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مكتبي">🏢 مكتبي بالكامل</SelectItem>
                    <SelectItem value="عن_بعد">🌐 عن بُعد بالكامل</SelectItem>
                    <SelectItem value="هجين">🔄 نظام هجين (مكتبي + عن بعد)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">العنوان والتفاصيل</label>
                <Input value={formData.address || ""} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="طريق الملك فهد، البرج الشمالي" className="h-9 text-xs" />
              </div>
              <DialogFooter className="pt-3 border-t border-border/40">
                <Button variant="ghost" size="sm" onClick={() => setEditModalType(null)}>إلغاء</Button>
                <Button size="sm" onClick={handleSaveLocation} className="font-bold gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                  <Check className="w-3.5 h-3.5" /> حفظ الموقع
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Experience Form */}
          {editModalType === "experience" && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">اسم المسمى التقييمي / المستوى</label>
                <Input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: خبير أول (Senior Lead)" className="h-9 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">الحد الأدنى للسنوات</label>
                  <Input type="number" value={formData.minYears ?? 0} onChange={e => setFormData({ ...formData, minYears: e.target.value })} className="h-9 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">الحد الأقصى للسنوات</label>
                  <Input type="number" value={formData.maxYears ?? 3} onChange={e => setFormData({ ...formData, maxYears: e.target.value })} className="h-9 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">الشارة التوضيحية (Badge)</label>
                <Input value={formData.badge || ""} onChange={e => setFormData({ ...formData, badge: e.target.value })} placeholder="مثال: 5-8 سنوات" className="h-9 text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">اللون المميز</label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFormData({ ...formData, color: c })}
                      className={cn("w-5 h-5 rounded-md transition-all", formData.color === c && "ring-2 ring-offset-1 ring-primary")}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={formData.color || COLORS[0]} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-6 h-6 rounded border cursor-pointer p-0.5 ms-1" />
                </div>
              </div>
              <DialogFooter className="pt-3 border-t border-border/40">
                <Button variant="ghost" size="sm" onClick={() => setEditModalType(null)}>إلغاء</Button>
                <Button size="sm" onClick={handleSaveExperience} className="font-bold gap-1 bg-purple-600 text-white hover:bg-purple-700">
                  <Check className="w-3.5 h-3.5" /> حفظ مستوى الخبرة
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
