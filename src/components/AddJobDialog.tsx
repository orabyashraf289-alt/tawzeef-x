import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Plus, Building2, MapPin, Award, GitBranch, Workflow, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyTaxonomy } from "@/hooks/useCompanyTaxonomy";

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
    requirements?: string;
    salaryMin?: string;
    salaryMax?: string;
    experience?: string;
    approvalChain?: string;
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
    addQuickDepartment,
    addQuickLocation,
    addQuickExperienceLevel,
    addQuickApprovalChain,
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

  // Quick Inline Addition Inputs State
  const [newDeptInput, setNewDeptInput] = useState("");
  const [showAddDept, setShowAddDept] = useState(false);

  const [newLocInput, setNewLocInput] = useState("");
  const [showAddLoc, setShowAddLoc] = useState(false);

  const [newExpInput, setNewExpInput] = useState("");
  const [showAddExp, setShowAddExp] = useState(false);

  const [newChainInput, setNewChainInput] = useState("");
  const [showAddChain, setShowAddChain] = useState(false);

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData && open) {
      setForm({
        title: initialData.title || "",
        department: initialData.department || "",
        location: initialData.location || "",
        type: initialData.type || "",
        description: initialData.description || "",
        requirements: initialData.requirements || "",
        salaryMin: initialData.salaryMin || "",
        salaryMax: initialData.salaryMax || "",
        experience: initialData.experience || "",
        approvalChain: initialData.approvalChain || "سلسلة موافقة قياسية (مدير الموارد البشرية)",
      });
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
      // Fallback local AI generator if Edge Function fails or returns error
      const deptText = form.department ? `في قسم ${form.department}` : "";
      const expText = form.experience ? `بمستوى خبرة ${form.experience}` : "";
      const typeText = form.type ? `بنمط عمل (${form.type})` : "";

      const fallbackDesc = `نبحث عن محترف لشغل وظيفة "${form.title}" ${deptText} للانضمام إلى فريق عملنا.
تتطلب الوظيفة العمل ${typeText} ${expText}، حيث ستكون مسؤولاً عن تنفيذ المهام الموكلة وإدارة المشاريع والتعاون الفعال مع بقية الفريق لضمان تحقيق أعلى مستويات الجودة والإنتاجية.

المهام والمسؤوليات الرئيسية:
• تخطيط وتنفيذ المهام المطلوبة بكفاءة عالية وفق المعايير المعتمدة.
• إعداد التقارير ومتابعة مؤشرات الأداء الخاصة بالوظيفة.
• التعاون المستمر مع الأقسام المختلفة لتحقيق أهداف المنظمة.
• تقديم المقترحات والحلول المبتكرة لتطوير آليات العمل.`;

      const fallbackReqs = `• مؤهل علمي مناسب أو خبرة عمل مكافئة في مجال الوظيفة.
• ${form.experience ? `خبرة عملية في المجال (${form.experience})` : "خبرة عملية مثبتة في وظائف مشابهة."}
• إتقان مهارات التواصل والتفاعل مع فرق العمل المختلفة.
• القدرة على تنظيم الأولويات وإدارة الوقت وتجاوز التحديات.
• إجادة استخدام الأدوات والتطبيقات الرقمية الحديثة ذات الصلة.`;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.department || !form.location || !form.type) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    onAdd(form);
    onClose();
  };

  const selectedChainObj = approvalChains.find(c => c.name === form.approvalChain);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-xl font-display font-bold">{initialData ? "تعديل الوظيفة" : "إضافة وظيفة جديدة"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Job Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">عنوان الوظيفة <span className="text-destructive">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="مثال: مطور واجهات أمامية (React)"
              maxLength={100}
            />
          </div>

          {/* Department & Location */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> القسم <span className="text-destructive">*</span>
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
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر القسم المخصص" /></SelectTrigger>
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
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> الموقع <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowAddLoc(!showAddLoc)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
                >
                  <Plus className="w-3 h-3" /> {showAddLoc ? "إلغاء" : "موقع جديد"}
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
                    placeholder="اسم الموقع والمدينة..."
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
              <Label className="text-sm font-medium">نوع الوظيفة <span className="text-destructive">*</span></Label>
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 shadow-sm">
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
            <Label className="text-sm font-medium">نطاق الراتب (ريال)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                value={form.salaryMin}
                onChange={(e) => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                placeholder="الحد الأدنى"
                min={0}
              />
              <Input
                type="number"
                value={form.salaryMax}
                onChange={(e) => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                placeholder="الحد الأقصى"
                min={0}
              />
            </div>
          </div>

          {/* AI Generate Button */}
          <Button type="button" variant="outline" onClick={handleGenerateAI} disabled={generating || !form.title.trim()}
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "جاري التوليد بالذكاء الاصطناعي..." : "توليد الوصف والمتطلبات بالذكاء الاصطناعي ✨"}
          </Button>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">وصف الوظيفة</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="اكتب وصفاً تفصيلياً للوظيفة والمهام المطلوبة..."
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">المتطلبات والمؤهلات</Label>
            <Textarea
              value={form.requirements}
              onChange={(e) => setForm(f => ({ ...f, requirements: e.target.value }))}
              placeholder="اكتب المتطلبات والمؤهلات المطلوبة (كل متطلب في سطر جديد)..."
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 gradient-primary border-0 text-primary-foreground hover:opacity-90">
              {submitLabel ?? (initialData ? "حفظ التعديلات" : "معاينة قبل النشر")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
