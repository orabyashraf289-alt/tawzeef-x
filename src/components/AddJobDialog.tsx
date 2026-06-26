import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  } | null;
  /** Label for the primary submit button. Defaults to "نشر الوظيفة". */
  submitLabel?: string;
}

const departments = ["الهندسة", "التصميم", "الإدارة", "البيانات", "التسويق", "الموارد البشرية", "المالية"];
const locations = ["الرياض", "جدة", "الدمام", "عن بُعد", "مكة", "المدينة"];
const jobTypes = ["دوام كامل", "دوام جزئي", "عقد مؤقت", "تدريب", "عن بُعد"];
const experienceLevels = ["بدون خبرة", "1-2 سنوات", "3-5 سنوات", "5-7 سنوات", "7-10 سنوات", "+10 سنوات"];

export default function AddJobDialog({ open, onClose, onAdd, initialData, submitLabel }: AddJobDialogProps) {
  const { toast } = useToast();
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
  });

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
      toast({ title: "تم توليد الوصف بنجاح ✨" });
    } catch (e: any) {
      toast({ title: "خطأ في التوليد", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.department || !form.location || !form.type) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    onAdd(form);
    setForm({ title: "", department: "", location: "", type: "", description: "", requirements: "", salaryMin: "", salaryMax: "", experience: "" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 animate-fade-up">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">القسم <span className="text-destructive">*</span></Label>
              <Select value={form.department} onValueChange={(v) => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">الموقع <span className="text-destructive">*</span></Label>
              <Select value={form.location} onValueChange={(v) => setForm(f => ({ ...f, location: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر الموقع" /></SelectTrigger>
                <SelectContent>
                  {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type & Experience */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع الوظيفة <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  {jobTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">مستوى الخبرة</Label>
              <Select value={form.experience} onValueChange={(v) => setForm(f => ({ ...f, experience: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر مستوى الخبرة" /></SelectTrigger>
                <SelectContent>
                  {experienceLevels.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
