import { useState, useEffect } from "react";
import { ALL_AL_ANDALUS_BRANCHES } from "@/data/alAndalusBranches";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2, MapPin, Award, Plus, Trash2, Pencil, Check,
  Layers, GraduationCap, BookOpen, Clock, Heart, RefreshCw,
  Sparkles, ShieldCheck
} from "lucide-react";
import {
  DEFAULT_SCHOOL_TYPES,
  DEFAULT_CURRICULA,
  DEFAULT_GRADE_LEVELS,
  DEFAULT_TEACHING_LOADS,
  DEFAULT_WORKING_HOURS,
  DEFAULT_BENEFITS_OPTIONS,
} from "@/lib/jobSpecsHelper";

// Default Initial Data
const DEFAULT_DEPARTMENTS = [
  { id: "dept-1", name: "التقنية والبرمجة", code: "TECH", color: "#6366f1", head: "مدير تقني" },
  { id: "dept-2", name: "الموارد البشرية", code: "HR", color: "#ec4899", head: "مدير HR" },
  { id: "dept-3", name: "التسويق والمبيعات", code: "MKT", color: "#f59e0b", head: "مدير التسويق" },
  { id: "dept-4", name: "المالية والمحاسبة", code: "FIN", color: "#10b981", head: "المدير المالي" },
  { id: "dept-5", name: "التشغيل واللوجستيات", code: "OPS", color: "#0ea5e9", head: "مدير التشغيل" },
  { id: "dept-6", name: "التصميم وتجربة المستخدم", code: "DES", color: "#8b5cf6", head: "قائد التصميم" },
  { id: "dept-7", name: "خدمة وتجربة العملاء", code: "CS", color: "#14b8a6", head: "مدير الدعم" },
  { id: "dept-8", name: "القسم التعليمي والأكاديمي", code: "EDU", color: "#10b981", head: "المدير الأكاديمي" },
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
  const [activeSubTab, setActiveSubTab] = useState<"departments" | "locations" | "experience" | "educational_specs">("educational_specs");

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

  // Educational Specs Lists State
  const [schoolTypes, setSchoolTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_school_types");
      return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_TYPES;
    } catch { return DEFAULT_SCHOOL_TYPES; }
  });

  const [curricula, setCurricula] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_curricula");
      return saved ? JSON.parse(saved) : DEFAULT_CURRICULA;
    } catch { return DEFAULT_CURRICULA; }
  });

  const [gradeLevels, setGradeLevels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_grade_levels");
      return saved ? JSON.parse(saved) : DEFAULT_GRADE_LEVELS;
    } catch { return DEFAULT_GRADE_LEVELS; }
  });

  const [teachingLoads, setTeachingLoads] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_teaching_loads");
      return saved ? JSON.parse(saved) : DEFAULT_TEACHING_LOADS;
    } catch { return DEFAULT_TEACHING_LOADS; }
  });

  const [workingHoursList, setWorkingHoursList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_working_hours");
      return saved ? JSON.parse(saved) : DEFAULT_WORKING_HOURS;
    } catch { return DEFAULT_WORKING_HOURS; }
  });

  const [benefitsList, setBenefitsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_benefits_list");
      return saved ? JSON.parse(saved) : DEFAULT_BENEFITS_OPTIONS;
    } catch { return DEFAULT_BENEFITS_OPTIONS; }
  });

  // New item inputs for educational specs
  const [newSchoolType, setNewSchoolType] = useState("");
  const [newCurriculum, setNewCurriculum] = useState("");
  const [newGradeLevel, setNewGradeLevel] = useState("");
  const [newTeachingLoad, setNewTeachingLoad] = useState("");
  const [newWorkingHour, setNewWorkingHour] = useState("");
  const [newBenefit, setNewBenefit] = useState("");

  // Modal Dialog States
  const [editModalTarget, setEditModalTarget] = useState<any | null>(null);
  const [editModalType, setEditModalType] = useState<"department" | "location" | "experience" | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
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

  useEffect(() => {
    try { localStorage.setItem("company_school_types", JSON.stringify(schoolTypes)); } catch {}
  }, [schoolTypes]);

  useEffect(() => {
    try { localStorage.setItem("company_curricula", JSON.stringify(curricula)); } catch {}
  }, [curricula]);

  useEffect(() => {
    try { localStorage.setItem("company_grade_levels", JSON.stringify(gradeLevels)); } catch {}
  }, [gradeLevels]);

  useEffect(() => {
    try { localStorage.setItem("company_teaching_loads", JSON.stringify(teachingLoads)); } catch {}
  }, [teachingLoads]);

  useEffect(() => {
    try { localStorage.setItem("company_working_hours", JSON.stringify(workingHoursList)); } catch {}
  }, [workingHoursList]);

  useEffect(() => {
    try { localStorage.setItem("company_benefits_list", JSON.stringify(benefitsList)); } catch {}
  }, [benefitsList]);

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
        address: formData.address?.trim() || "",
      };
      setLocations([...locations, newLoc]);
      toast({ title: `تمت إضافة الموقع "${newLoc.name}" بنجاح ✅` });
    } else {
      setLocations(locations.map(l => l.id === editModalTarget.id ? { ...l, ...formData } : l));
      toast({ title: `تم تحديث بيانات الموقع بنجاح ✅` });
    }
    setEditModalType(null);
  };

  const handleDeleteLocation = (id: string, name: string) => {
    if (locations.length <= 1) {
      toast({ title: "لا يمكن حذف جميع المواقع", variant: "destructive" });
      return;
    }
    setLocations(locations.filter(l => l.id !== id));
    toast({ title: `تم حذف موقع "${name}"` });
  };

  // Handlers for Experience Levels
  const handleOpenAddExperience = () => {
    setFormData({ name: "", minYears: 0, maxYears: 2, badge: "جديد", color: COLORS[experienceLevels.length % COLORS.length] });
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
        minYears: parseInt(formData.minYears) || 0,
        maxYears: parseInt(formData.maxYears) || 1,
        badge: formData.badge?.trim() || "مخصص",
        color: formData.color || COLORS[0],
      };
      setExperienceLevels([...experienceLevels, newExp]);
      toast({ title: `تمت إضافة مستوى "${newExp.name}" بنجاح ✅` });
    } else {
      setExperienceLevels(experienceLevels.map(e => e.id === editModalTarget.id ? { ...e, ...formData, minYears: parseInt(formData.minYears), maxYears: parseInt(formData.maxYears) } : e));
      toast({ title: `تم تحديث بيانات مستوى الخبرة بنجاح ✅` });
    }
    setEditModalType(null);
  };

  const handleDeleteExperience = (id: string, name: string) => {
    if (experienceLevels.length <= 1) {
      toast({ title: "لا يمكن حذف جميع مستويات الخبرة", variant: "destructive" });
      return;
    }
    setExperienceLevels(experienceLevels.filter(e => e.id !== id));
    toast({ title: `تم حذف مستوى الخبرة "${name}"` });
  };

  // Quick Add for Educational Specs
  const handleAddSchoolType = () => {
    if (!newSchoolType.trim()) return;
    if (!schoolTypes.includes(newSchoolType.trim())) {
      setSchoolTypes([...schoolTypes, newSchoolType.trim()]);
      toast({ title: `تمت إضافة نوع المدرسة "${newSchoolType}" بنجاح 🏫` });
    }
    setNewSchoolType("");
  };

  const handleAddCurriculum = () => {
    if (!newCurriculum.trim()) return;
    if (!curricula.includes(newCurriculum.trim())) {
      setCurricula([...curricula, newCurriculum.trim()]);
      toast({ title: `تمت إضافة المنهج "${newCurriculum}" بنجاح 📚` });
    }
    setNewCurriculum("");
  };

  const handleAddGradeLevel = () => {
    if (!newGradeLevel.trim()) return;
    if (!gradeLevels.includes(newGradeLevel.trim())) {
      setGradeLevels([...gradeLevels, newGradeLevel.trim()]);
      toast({ title: `تمت إضافة المرحلة "${newGradeLevel}" بنجاح 🎓` });
    }
    setNewGradeLevel("");
  };

  const handleAddTeachingLoad = () => {
    if (!newTeachingLoad.trim()) return;
    if (!teachingLoads.includes(newTeachingLoad.trim())) {
      setTeachingLoads([...teachingLoads, newTeachingLoad.trim()]);
      toast({ title: `تمت إضافة نصاب الحصص بنجاح ⏱️` });
    }
    setNewTeachingLoad("");
  };

  const handleAddWorkingHour = () => {
    if (!newWorkingHour.trim()) return;
    if (!workingHoursList.includes(newWorkingHour.trim())) {
      setWorkingHoursList([...workingHoursList, newWorkingHour.trim()]);
      toast({ title: `تمت إضافة فترة الدوام بنجاح ⏰` });
    }
    setNewWorkingHour("");
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    if (!benefitsList.includes(newBenefit.trim())) {
      setBenefitsList([...benefitsList, newBenefit.trim()]);
      toast({ title: `تمت إضافة الميزة المعتمدة بنجاح 🎁` });
    }
    setNewBenefit("");
  };

  const handleResetToDefaults = () => {
    setDepartments(DEFAULT_DEPARTMENTS);
    setLocations(DEFAULT_LOCATIONS);
    setExperienceLevels(DEFAULT_EXPERIENCE_LEVELS);
    setSchoolTypes(DEFAULT_SCHOOL_TYPES);
    setCurricula(DEFAULT_CURRICULA);
    setGradeLevels(DEFAULT_GRADE_LEVELS);
    setTeachingLoads(DEFAULT_TEACHING_LOADS);
    setWorkingHoursList(DEFAULT_WORKING_HOURS);
    setBenefitsList(DEFAULT_BENEFITS_OPTIONS);
    toast({ title: "تم إعادة ضبط جميع التصنيفات والمواصفات إلى الإعدادات الافتراضية ✅" });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> تهيئة وتصنيف مواصفات الوظائف والمدارس والأقسام
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            خصص أنواع المدارس، المناهج، المراحل التعليمية، المزايا والبدلات، والأقسام لتظهر فوراً كخيارات جاهزة عند إنشاء الشواغر
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefaults}
            className="h-9 text-xs gap-1.5 text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" /> إعادة الضبط الافتراضي
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/60 flex-wrap">
        <button
          onClick={() => setActiveSubTab("educational_specs")}
          className={cn(
            "flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "educational_specs"
              ? "bg-card text-indigo-600 dark:text-indigo-400 shadow-xs border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          <span>المواصفات التعليمية والمزايا ({schoolTypes.length + curricula.length + benefitsList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("departments")}
          className={cn(
            "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "departments"
              ? "bg-card text-primary shadow-xs border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4 text-primary" />
          <span>الأقسام ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("locations")}
          className={cn(
            "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
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
            "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeSubTab === "experience"
              ? "bg-card text-purple-600 dark:text-purple-400 shadow-xs border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Award className="w-4 h-4 text-purple-500" />
          <span>مستويات الخبرة ({experienceLevels.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: Educational Specifications & Benefits ─── */}
      {activeSubTab === "educational_specs" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">تهيئة المواصفات التعليمية المعتمدة</h3>
                <p className="text-xs text-muted-foreground">تتيح هذه القوائم اختيار المناهج والمراحل والمزايا بسهولة ودقة تامة عند إنشاء أو تعديل أي وظيفة تعليمية، وتلغي الاعتماد على القيم الثابتة.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. School Types */}
            <Card className="p-5 space-y-3 border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <Building2 className="w-4 h-4 text-indigo-500" /> أنواع المدارس والمنشآت ({schoolTypes.length})
                </h4>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSchoolType}
                  onChange={(e) => setNewSchoolType(e.target.value)}
                  placeholder="نوع مدرسة جديد (مثال: مدارس موهبة)..."
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddSchoolType} className="h-8 text-xs font-bold shrink-0">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {schoolTypes.map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-semibold">
                    {item}
                    {schoolTypes.length > 1 && (
                      <button onClick={() => setSchoolTypes(schoolTypes.filter((_, i) => i !== idx))} className="hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* 2. Curricula */}
            <Card className="p-5 space-y-3 border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <BookOpen className="w-4 h-4 text-emerald-500" /> المناهج التعليمية المعتمدة ({curricula.length})
                </h4>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCurriculum}
                  onChange={(e) => setNewCurriculum(e.target.value)}
                  placeholder="منهج تعليمي جديد (مثال: منهج مونتيسوري)..."
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddCurriculum} className="h-8 text-xs font-bold bg-emerald-600 text-white shrink-0">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {curricula.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    {item}
                    {curricula.length > 1 && (
                      <button onClick={() => setCurricula(curricula.filter((_, i) => i !== idx))} className="hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* 3. Grade Levels */}
            <Card className="p-5 space-y-3 border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <GraduationCap className="w-4 h-4 text-blue-500" /> المراحل والصفوف الدراسية ({gradeLevels.length})
                </h4>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(e.target.value)}
                  placeholder="مرحلة دراسية جديدة..."
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddGradeLevel} className="h-8 text-xs font-bold bg-blue-600 text-white shrink-0">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {gradeLevels.map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-semibold">
                    {item}
                    {gradeLevels.length > 1 && (
                      <button onClick={() => setGradeLevels(gradeLevels.filter((_, i) => i !== idx))} className="hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* 4. Benefits Packages */}
            <Card className="p-5 space-y-3 border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <Heart className="w-4 h-4 text-rose-500" /> المزايا والبدلات المعتمدة للمعلمين ({benefitsList.length})
                </h4>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="ميزة جديدة (مثال: تذاكر سفر سنوية)..."
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddBenefit} className="h-8 text-xs font-bold bg-rose-600 text-white shrink-0">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {benefitsList.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-semibold border-rose-500/30 text-rose-700 dark:text-rose-300">
                    {item}
                    {benefitsList.length > 1 && (
                      <button onClick={() => setBenefitsList(benefitsList.filter((_, i) => i !== idx))} className="hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Departments ─── */}
      {activeSubTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">قائمة الأقسام الإدارية والتشغيلية المعتمدة</h3>
            <Button size="sm" onClick={handleOpenAddDepartment} className="h-8 text-xs font-bold gap-1">
              <Plus className="w-3.5 h-3.5" /> إضافة قسم جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {departments.map((dept) => (
              <Card key={dept.id} className="border-border/60 hover:border-primary/40 transition-all shadow-2xs group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ backgroundColor: dept.color }}>
                        {dept.code}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{dept.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{dept.head || "مدير القسم"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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

      {/* ─── TAB 3: Locations ─── */}
      {activeSubTab === "locations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">قائمة فروع العمل والمواقع الجغرافية المعتمدة</h3>
            <Button size="sm" onClick={handleOpenAddLocation} className="h-8 text-xs font-bold gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="w-3.5 h-3.5" /> إضافة موقع جديد
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="border-border/60 hover:border-emerald-500/40 transition-all shadow-2xs group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">{loc.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{loc.city} • {loc.country || "السعودية"}</p>
                        <Badge variant="outline" className="text-[9px] mt-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                          {loc.type || "مكتبي"}
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

      {/* ─── TAB 4: Experience Levels ─── */}
      {activeSubTab === "experience" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">مستويات وسنوات الخبرة المهنية المعتمدة</h3>
            <Button size="sm" onClick={handleOpenAddExperience} className="h-8 text-xs font-bold gap-1 bg-purple-600 text-white hover:bg-purple-700">
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
        <DialogContent className="sm:max-w-md p-6 rounded-2xl" dir="rtl">
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
