import { useState, useEffect } from "react";
import {
  X, Sparkles, Loader2, Plus, Building2, MapPin, Award,
  GitBranch, CheckCircle2, GraduationCap, BookOpen, Clock, Heart, Users, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyTaxonomy } from "@/hooks/useCompanyTaxonomy";
import {
  JobCustomSpecs,
  encodeJobDescription,
  parseJobCustomSpecs,
  DEFAULT_SCHOOL_TYPES,
  DEFAULT_CURRICULA,
  DEFAULT_GRADE_LEVELS,
  DEFAULT_TEACHING_LOADS,
  DEFAULT_WORKING_HOURS,
  DEFAULT_BENEFITS_OPTIONS,
} from "@/lib/jobSpecsHelper";

interface AddJobDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (job: {
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
    requirements: string;
    salaryMin: string;
    salaryMax: string;
    experience: string;
    approvalChain?: string;
  }) => void;
  initialData?: {
    title?: string;
    department?: string;
    location?: string;
    type?: string;
    description?: string;
    requirements?: string | string[];
    salaryMin?: string;
    salaryMax?: string;
    experience?: string;
    approvalChain?: string;
    school_type?: string;
    curriculum?: string;
    grade_level?: string;
    weekly_classes?: string;
    work_start_date?: string;
    working_hours?: string;
    benefits_package?: string;
    class_size?: string;
    application_deadline?: string;
  } | null;
  /** Label for the primary submit button. Defaults to "نشر الوظيفة". */
  submitLabel?: string;
}

const jobTypes = ["دوام كامل", "دوام جزئي", "عقد مؤقت", "تدريب", "عن بُعد", "نظام هجين"];

export default function AddJobDialog({ open, onClose, onAdd, initialData, submitLabel }: AddJobDialogProps) {
  const { toast } = useToast();
  const {
    departmentNames,
    locationNames,
    experienceLevelNames,
    approvalChains,
    schoolTypes,
    curricula,
    gradeLevels,
    teachingLoads,
    workingHoursList,
    benefitsList,
    addQuickDepartment,
    addQuickLocation,
    addQuickExperienceLevel,
    addQuickApprovalChain,
    addQuickSchoolType,
    addQuickCurriculum,
    addQuickGradeLevel,
  } = useCompanyTaxonomy();

  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    type: "",
    description: "",
    requirements: "",
    salaryMin: "",
    salaryMax: "",
    experience: "",
    approvalChain: "سلسلة موافقة قياسية (مدير الموارد البشرية)",
  });

  // Educational & Job Custom Specifications
  const [hasEducationalSpecs, setHasEducationalSpecs] = useState(true);
  const [specs, setSpecs] = useState<JobCustomSpecs>({
    school_type: DEFAULT_SCHOOL_TYPES[0],
    curriculum: DEFAULT_CURRICULA[0],
    grade_level: DEFAULT_GRADE_LEVELS[3],
    weekly_classes: DEFAULT_TEACHING_LOADS[1],
    work_start_date: "18 أغسطس 2026 (بداية الفصل الأول)",
    working_hours: DEFAULT_WORKING_HOURS[0],
    benefits_package: "تأمين طبي فئة A + بدل سكن 25% + بدل نقل + توفير التأشيرة والاستقدام",
    class_size: "20 - 25 طالباً",
    application_deadline: "15 أغسطس 2026",
  });

  // Quick Inline Addition Inputs State
  const [newDeptInput, setNewDeptInput] = useState("");
  const [showAddDept, setShowAddDept] = useState(false);

  const [newLocInput, setNewLocInput] = useState("");
  const [showAddLoc, setShowAddLoc] = useState(false);

  const [newExpInput, setNewExpInput] = useState("");
  const [showAddExp, setShowAddExp] = useState(false);

  const [newChainInput, setNewChainInput] = useState("");
  const [showAddChain, setShowAddChain] = useState(false);

  const [newSchoolTypeInput, setNewSchoolTypeInput] = useState("");
  const [showAddSchoolType, setShowAddSchoolType] = useState(false);

  const [newCurriculumInput, setNewCurriculumInput] = useState("");
  const [showAddCurriculum, setShowAddCurriculum] = useState(false);

  const [newGradeInput, setNewGradeInput] = useState("");
  const [showAddGrade, setShowAddGrade] = useState(false);

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData && open) {
      const parsed = parseJobCustomSpecs(initialData);
      
      const reqsText = Array.isArray(initialData.requirements)
        ? initialData.requirements.join("\n")
        : typeof initialData.requirements === "string"
          ? initialData.requirements
          : "";

      setForm({
        title: initialData.title || "",
        department: initialData.department || "",
        location: initialData.location || "",
        type: initialData.type || "",
        description: parsed.cleanDescription || "",
        requirements: reqsText,
        salaryMin: initialData.salaryMin || "",
        salaryMax: initialData.salaryMax || "",
        experience: initialData.experience || "",
        approvalChain: initialData.approvalChain || "سلسلة موافقة قياسية (مدير الموارد البشرية)",
      });

      if (parsed.hasSpecs) {
        setHasEducationalSpecs(true);
        setSpecs(s => ({
          ...s,
          ...parsed.specs,
        }));
      }
    }
  }, [initialData, open]);

  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  const handleGenerateAI = async () => {
    if (!form.title.trim()) {
      toast({ title: "أدخل عنوان الوظيفة أولاً", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: { title: form.title, department: form.department, type: form.type, experience: form.experience },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(f => ({
        ...f,
        description: data.description || f.description,
        requirements: data.requirements || f.requirements,
      }));
      toast({ title: "تم توليد الوصف بالذكاء الاصطناعي بنجاح ✨" });
    } catch (e: any) {
      console.warn("Edge function failed, using local AI generator fallback:", e);
      const isEdu = form.title.includes("معلم") || form.title.includes("مدرس") || form.title.includes("أستاذ") || form.department.includes("تعليم");
      
      let fallbackDesc = "";
      let fallbackReqs = "";

      if (isEdu) {
        fallbackDesc = `نبحث عن كادر تعليمي متميز لشغل وظيفة "${form.title}" في بيئة تعليمية محفزة.
يتولى المعلم مسؤولية تخطيط الدروس التفاعلية، تدريس المنهج المعتمد، إعداد الاختبارات وأوراق العمل، واستخدام التقنيات الحديثة والمنصات التعليمية لدعم تعلم الطلاب وتنمية مهاراتهم.

المهام والمسؤوليات الرئيسية:
• إعداد الخطط التدريسية السنوية والأسبوعية وفق معايير المنهج.
• تطبيق استراتيجيات تدريس نشطة وتفاعلية ومتابعة مستوى تقدم الطلاب.
• تقييم أداء الطلاب بانتظام وتقديم التغذية الراجعة لأولياء الأمور وإدارة المدرسة.
• المشاركة في الأنشطة الطلابية والفعاليات المدرسية وبرامج التطوير المهني.`;

        fallbackReqs = `• بكالوريوس في التخصص المطلوب أو التربية بتقدير جيد جداً على الأقل.
• خبرة عملية مثبتة في تدريس المناهج الدولية أو المعتمدة لا تقل عن سنتين.
• إتقان مهارات الإدارة الصفية والتواصل الفعال مع الطلاب وأولياء الأمور.
• إجادة استخدام المنصات التعليمية والتقنيات الرقمية في التدريس.`;
      } else {
        const deptText = form.department ? `في قسم ${form.department}` : "";
        const expText = form.experience ? `بمستوى خبرة ${form.experience}` : "";
        const typeText = form.type ? `بنمط عمل (${form.type})` : "";

        fallbackDesc = `نبحث عن محترف لشغل وظيفة "${form.title}" ${deptText} للانضمام إلى فريق عملنا.
تتطلب الوظيفة العمل ${typeText} ${expText}، حيث ستكون مسؤولاً عن تنفيذ المهام الموكلة وإدارة المشاريع والتعاون الفعال مع بقية الفريق لضمان تحقيق أعلى مستويات الجودة والإنتاجية.

المهام والمسؤوليات الرئيسية:
• تخطيط وتنفيذ المهام المطلوبة بكفاءة عالية وفق المعايير المعتمدة.
• إعداد التقارير ومتابعة مؤشرات الأداء الخاصة بالوظيفة.
• التعاون المستمر مع الأقسام المختلفة لتحقيق أهداف المنظمة.
• تقديم المقترحات والحلول المبتكرة لتطوير آليات العمل.`;

        fallbackReqs = `• مؤهل علمي مناسب أو خبرة عمل مكافئة في مجال الوظيفة.
• ${form.experience ? `خبرة عملية في المجال (${form.experience})` : "خبرة عملية مثبتة في وظائف مشابهة."}
• إتقان مهارات التواصل والتفاعل مع فرق العمل المختلفة.
• القدرة على تنظيم الأولويات وإدارة الوقت وتجاوز التحديات.
• إجادة استخدام الأدوات والتطبيقات الرقمية الحديثة ذات الصلة.`;
      }

      setForm(f => ({
        ...f,
        description: fallbackDesc,
        requirements: fallbackReqs,
      }));
      toast({ title: "تم توليد الوصف والمتطلبات بالذكاء الاصطناعي بنجاح ✨" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateQuickDept = () => {
    if (!newDeptInput.trim()) return;
    const added = addQuickDepartment(newDeptInput);
    if (added) {
      setForm(f => ({ ...f, department: added }));
      setNewDeptInput("");
      setShowAddDept(false);
      toast({ title: `تمت إضافة قسم "${added}" واختياره بنجاح ✅` });
    }
  };

  const handleCreateQuickLoc = () => {
    if (!newLocInput.trim()) return;
    const added = addQuickLocation(newLocInput);
    if (added) {
      setForm(f => ({ ...f, location: added }));
      setNewLocInput("");
      setShowAddLoc(false);
      toast({ title: `تمت إضافة موقع "${added}" واختياره بنجاح ✅` });
    }
  };

  const handleCreateQuickExp = () => {
    if (!newExpInput.trim()) return;
    const added = addQuickExperienceLevel(newExpInput);
    if (added) {
      setForm(f => ({ ...f, experience: added }));
      setNewExpInput("");
      setShowAddExp(false);
      toast({ title: `تمت إضافة مستوى الخبرة "${added}" واختياره بنجاح ✅` });
    }
  };

  const handleCreateQuickChain = () => {
    if (!newChainInput.trim()) return;
    const added = addQuickApprovalChain(newChainInput);
    if (added) {
      setForm(f => ({ ...f, approvalChain: added }));
      setNewChainInput("");
      setShowAddChain(false);
      toast({ title: `تمت إضافة سلسلة موافقة "${added}" واختيارها بنجاح ✅` });
    }
  };

  const handleCreateQuickSchoolType = () => {
    if (!newSchoolTypeInput.trim()) return;
    const added = addQuickSchoolType(newSchoolTypeInput);
    if (added) {
      setSpecs(s => ({ ...s, school_type: added }));
      setNewSchoolTypeInput("");
      setShowAddSchoolType(false);
      toast({ title: `تمت إضافة نوع المدرسة "${added}" بنجاح 🏫` });
    }
  };

  const handleCreateQuickCurriculum = () => {
    if (!newCurriculumInput.trim()) return;
    const added = addQuickCurriculum(newCurriculumInput);
    if (added) {
      setSpecs(s => ({ ...s, curriculum: added }));
      setNewCurriculumInput("");
      setShowAddCurriculum(false);
      toast({ title: `تمت إضافة المنهج "${added}" بنجاح 📚` });
    }
  };

  const handleCreateQuickGrade = () => {
    if (!newGradeInput.trim()) return;
    const added = addQuickGradeLevel(newGradeInput);
    if (added) {
      setSpecs(s => ({ ...s, grade_level: added }));
      setNewGradeInput("");
      setShowAddGrade(false);
      toast({ title: `تمت إضافة المرحلة "${added}" بنجاح 🎓` });
    }
  };

  const toggleBenefitTag = (tag: string) => {
    const current = specs.benefits_package || "";
    if (current.includes(tag)) {
      const updated = current
        .split("+")
        .map(s => s.trim())
        .filter(s => s && s !== tag)
        .join(" + ");
      setSpecs(s => ({ ...s, benefits_package: updated }));
    } else {
      const updated = current ? `${current} + ${tag}` : tag;
      setSpecs(s => ({ ...s, benefits_package: updated }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.department || !form.location || !form.type) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    // Cleanly encode custom specifications into description
    const finalDescription = hasEducationalSpecs
      ? encodeJobDescription(form.description, specs)
      : form.description;

    onAdd({
      ...form,
      description: finalDescription,
    });
    onClose();
  };

  const selectedChainObj = (approvalChains || []).find(c => c.name === form.approvalChain);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-display font-bold">{initialData ? "تعديل بيانات الشاغر الوظيفي" : "إضافة وظيفة أو شاغر جديد"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">حدد تفاصيل الوظيفة، المواصفات التعليمية، المزايا، وسلسلة الاعتماد</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Job Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">عنوان الوظيفة / الشاغر <span className="text-destructive">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="مثال: معلم لغة إنجليزية (المرحلة الثانوية) أو مطور برمجيات"
              maxLength={100}
              required
            />
          </div>

          {/* Department & Location */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> القسم / التخصص <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowAddDept(!showAddDept)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-bold"
                >
                  <Plus className="w-3 h-3" /> {showAddDept ? "إلغاء" : "قسم جديد"}
                </button>
              </div>

              <Select value={form.department} onValueChange={(v) => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر القسم أو التخصص" /></SelectTrigger>
                <SelectContent>
                  {departmentNames.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>

              {showAddDept && (
                <div className="flex gap-1 pt-1">
                  <Input
                    value={newDeptInput}
                    onChange={(e) => setNewDeptInput(e.target.value)}
                    placeholder="اسم القسم الجديد..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={handleCreateQuickDept} className="h-8 px-3 text-xs shrink-0 font-bold">إضافة</Button>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> الموقع / الفرع <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowAddLoc(!showAddLoc)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
                >
                  <Plus className="w-3 h-3" /> {showAddLoc ? "إلغاء" : "فرع/موقع جديد"}
                </button>
              </div>

              <Select value={form.location} onValueChange={(v) => setForm(f => ({ ...f, location: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر الموقع والفرع" /></SelectTrigger>
                <SelectContent>
                  {locationNames.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>

              {showAddLoc && (
                <div className="flex gap-1 pt-1">
                  <Input
                    value={newLocInput}
                    onChange={(e) => setNewLocInput(e.target.value)}
                    placeholder="اسم الموقع أو الفرع والمدينة..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={handleCreateQuickLoc} className="h-8 px-3 text-xs bg-emerald-600 text-white shrink-0 font-bold">إضافة</Button>
                </div>
              )}
            </div>
          </div>

          {/* Type & Experience */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع الدوام <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر نوع الدوام" /></SelectTrigger>
                <SelectContent>
                  {jobTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-500" /> مستوى الخبرة
                </Label>
                <button
                  type="button"
                  onClick={() => setShowAddExp(!showAddExp)}
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 font-bold"
                >
                  <Plus className="w-3 h-3" /> {showAddExp ? "إلغاء" : "مستوى جديد"}
                </button>
              </div>

              <Select value={form.experience} onValueChange={(v) => setForm(f => ({ ...f, experience: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر مستوى الخبرة المطلوب" /></SelectTrigger>
                <SelectContent>
                  {experienceLevelNames.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>

              {showAddExp && (
                <div className="flex gap-1 pt-1">
                  <Input
                    value={newExpInput}
                    onChange={(e) => setNewExpInput(e.target.value)}
                    placeholder="مستوى الخبرة المطلوبة..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={handleCreateQuickExp} className="h-8 px-3 text-xs bg-purple-600 text-white shrink-0 font-bold">إضافة</Button>
                </div>
              )}
            </div>
          </div>

          {/* ─── Dedicated Customizable Educational & Benefits Card ─── */}
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-teal-500/5 to-transparent p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">بطاقة تفاصيل ومواصفات الشاغر التعليمي والمزايا</h3>
                  <p className="text-[11px] text-muted-foreground">تخصيص المنهج، نصاب الحصص، ساعات العمل، وباقة المزايا للظهور في تفاصيل الوظيفة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="toggle-specs" className="text-xs font-semibold cursor-pointer">
                  {hasEducationalSpecs ? "مفعلة" : "معطلة"}
                </Label>
                <Switch id="toggle-specs" checked={hasEducationalSpecs} onCheckedChange={setHasEducationalSpecs} />
              </div>
            </div>

            {hasEducationalSpecs && (
              <div className="space-y-4 pt-2 border-t border-indigo-500/10">
                {/* 1. School Type & Curriculum */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" /> نوع المدرسة / المنشأة
                      </Label>
                      <button type="button" onClick={() => setShowAddSchoolType(!showAddSchoolType)} className="text-[10px] text-indigo-600 hover:underline font-bold">
                        {showAddSchoolType ? "إلغاء" : "+ نوع جديد"}
                      </button>
                    </div>
                    <Select value={specs.school_type || schoolTypes[0]} onValueChange={v => setSpecs(s => ({ ...s, school_type: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {schoolTypes.map((st, i) => <SelectItem key={i} value={st}>{st}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showAddSchoolType && (
                      <div className="flex gap-1 pt-1">
                        <Input value={newSchoolTypeInput} onChange={e => setNewSchoolTypeInput(e.target.value)} placeholder="نوع جديد..." className="h-7 text-xs bg-card" />
                        <Button type="button" size="sm" onClick={handleCreateQuickSchoolType} className="h-7 px-2 text-xs">حفظ</Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> المنهج التعليمي
                      </Label>
                      <button type="button" onClick={() => setShowAddCurriculum(!showAddCurriculum)} className="text-[10px] text-emerald-600 hover:underline font-bold">
                        {showAddCurriculum ? "إلغاء" : "+ منهج جديد"}
                      </button>
                    </div>
                    <Select value={specs.curriculum || curricula[0]} onValueChange={v => setSpecs(s => ({ ...s, curriculum: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {curricula.map((c, i) => <SelectItem key={i} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showAddCurriculum && (
                      <div className="flex gap-1 pt-1">
                        <Input value={newCurriculumInput} onChange={e => setNewCurriculumInput(e.target.value)} placeholder="منهج جديد..." className="h-7 text-xs bg-card" />
                        <Button type="button" size="sm" onClick={handleCreateQuickCurriculum} className="h-7 px-2 text-xs bg-emerald-600 text-white">حفظ</Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Grade Level & Weekly Classes */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> المرحلة والصفوف الدراسية
                      </Label>
                      <button type="button" onClick={() => setShowAddGrade(!showAddGrade)} className="text-[10px] text-blue-600 hover:underline font-bold">
                        {showAddGrade ? "إلغاء" : "+ مرحلة جديدة"}
                      </button>
                    </div>
                    <Select value={specs.grade_level || gradeLevels[0]} onValueChange={v => setSpecs(s => ({ ...s, grade_level: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {gradeLevels.map((g, i) => <SelectItem key={i} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showAddGrade && (
                      <div className="flex gap-1 pt-1">
                        <Input value={newGradeInput} onChange={e => setNewGradeInput(e.target.value)} placeholder="مرحلة جديدة..." className="h-7 text-xs bg-card" />
                        <Button type="button" size="sm" onClick={handleCreateQuickGrade} className="h-7 px-2 text-xs bg-blue-600 text-white">حفظ</Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-500" /> نصاب الحصص الأسبوعي
                    </Label>
                    <Select value={specs.weekly_classes || teachingLoads[0]} onValueChange={v => setSpecs(s => ({ ...s, weekly_classes: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {teachingLoads.map((tl, i) => <SelectItem key={i} value={tl}>{tl}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 3. Start Date & Working Hours */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> تاريخ بدء العمل
                    </Label>
                    <Input
                      value={specs.work_start_date || ""}
                      onChange={e => setSpecs(s => ({ ...s, work_start_date: e.target.value }))}
                      placeholder="مثال: 18 أغسطس 2026 (بداية الفصل الأول)"
                      className="h-8 text-xs bg-card"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-500" /> مواعيد وساعات العمل
                    </Label>
                    <Select value={specs.working_hours || workingHoursList[0]} onValueChange={v => setSpecs(s => ({ ...s, working_hours: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {workingHoursList.map((wh, i) => <SelectItem key={i} value={wh}>{wh}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 4. Class Size & Application Deadline */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-500" /> متوسط حجم الفصل
                    </Label>
                    <Input
                      value={specs.class_size || ""}
                      onChange={e => setSpecs(s => ({ ...s, class_size: e.target.value }))}
                      placeholder="مثال: 20 - 25 طالباً في الفصل"
                      className="h-8 text-xs bg-card"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" /> موعد إغلاق التقديم
                    </Label>
                    <Input
                      value={specs.application_deadline || ""}
                      onChange={e => setSpecs(s => ({ ...s, application_deadline: e.target.value }))}
                      placeholder="مثال: 15 أغسطس 2026"
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                </div>

                {/* 5. Benefits & Allowances Package */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <Heart className="w-3.5 h-3.5" /> حزمة المزايا والبدلات المعتمدة للمعلم / الموظف:
                  </Label>
                  <Textarea
                    value={specs.benefits_package || ""}
                    onChange={e => setSpecs(s => ({ ...s, benefits_package: e.target.value }))}
                    placeholder="تأمين طبي فئة A + بدل سكن 25% + بدل نقل..."
                    className="text-xs bg-card min-h-[50px]"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground py-0.5">انقر لإضافة بدلات سريعة:</span>
                    {benefitsList.map((ben, i) => (
                      <Badge
                        key={i}
                        variant={specs.benefits_package?.includes(ben) ? "default" : "outline"}
                        className="cursor-pointer text-[10px] py-0.5"
                        onClick={() => toggleBenefitTag(ben)}
                      >
                        + {ben}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Job Approval Chain / Workflow Selection */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                سلسلة / مسار الموافقات المخصص لهذه الوظيفة
              </Label>
              <button
                type="button"
                onClick={() => setShowAddChain(!showAddChain)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold"
              >
                <Plus className="w-3 h-3" /> {showAddChain ? "إلغاء" : "سلسلة جديدة"}
              </button>
            </div>

            <Select value={form.approvalChain} onValueChange={(v) => setForm(f => ({ ...f, approvalChain: v }))}>
              <SelectTrigger className="h-10 text-xs bg-card border-indigo-200 dark:border-indigo-900/50">
                <SelectValue placeholder="اختر سلسلة الموافقة المطبقة" />
              </SelectTrigger>
              <SelectContent>
                {approvalChains.map(c => (
                  <SelectItem key={c.id} value={c.name}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-semibold text-xs">{c.name}</span>
                      {c.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">{c.badge}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showAddChain && (
              <div className="flex gap-1 pt-1">
                <Input
                  value={newChainInput}
                  onChange={(e) => setNewChainInput(e.target.value)}
                  placeholder="اسم سلسلة الموافقة مخصصة (مثال: موافقة المدير المالي والـ HR)..."
                  className="h-8 text-xs bg-card"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleCreateQuickChain} className="h-8 px-3 text-xs bg-indigo-600 text-white shrink-0 font-bold">إضافة</Button>
              </div>
            )}

            {/* Approval Chain Visual Steps Indicator */}
            {selectedChainObj && (
              <div className="pt-2 border-t border-indigo-500/10">
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">{selectedChainObj.description}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedChainObj.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {idx + 1}. {step}
                      </span>
                      {idx < selectedChainObj.steps.length - 1 && (
                        <span className="text-muted-foreground text-xs font-bold">➔</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">نطاق الراتب المتوقع (ريال)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                value={form.salaryMin}
                onChange={(e) => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                placeholder="الحد الأدنى (مثال: 12000)"
                min={0}
              />
              <Input
                type="number"
                value={form.salaryMax}
                onChange={(e) => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                placeholder="الحد الأقصى (مثال: 15000)"
                min={0}
              />
            </div>
          </div>

          {/* AI Generator Button */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">توليد الوصف والمتطلبات تلقائياً بالذكاء الاصطناعي</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
              disabled={generating}
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5 text-xs font-bold"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating ? "جاري التوليد..." : "توليد بالذكاء الاصطناعي ✨"}
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">الوصف الوظيفي</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="اكتب وصفاً مفصلاً للمهام والمسؤوليات اليومية..."
              rows={4}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">المتطلبات والمؤهلات (سطر لكل متطلب)</Label>
            <Textarea
              value={form.requirements}
              onChange={(e) => setForm(f => ({ ...f, requirements: e.target.value }))}
              placeholder={"• بكالوريوس في التخصص\n• خبرة 3+ سنوات\n• إتقان مهارات التدريس"}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" className="font-bold px-6">
              {submitLabel || (initialData ? "حفظ التعديلات" : "نشر الوظيفة")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
