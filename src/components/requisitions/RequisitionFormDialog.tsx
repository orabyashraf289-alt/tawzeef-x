import { useEffect, useState } from "react";
import { Briefcase, Send, Save, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  normalizeRequirementsText,
  useCreateRequisition,
  useUpdateRequisition,
  type CompanyDepartment,
  type JobRequisition,
  type RequisitionCurrency,
  type RequisitionPriority,
} from "@/hooks/useRequisitions";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  REQUISITION_CURRENCIES,
  REQUISITION_PRIORITIES,
} from "@/components/requisitions/requisitionMeta";
import type { Company } from "@/hooks/useCompanies";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface RequisitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName?: string | null;
  branches: Company[];
  departments: CompanyDepartment[];
  editingRequisition: JobRequisition | null;
  onOpenDepartmentsManager?: () => void;
}

interface RequisitionFormState {
  title: string;
  department_id: string;
  branch_name: string;
  employment_type: string;
  headcount_requested: string;
  budget_min: string;
  budget_max: string;
  currency: RequisitionCurrency;
  priority: RequisitionPriority;
  target_start_date: string;
  justification: string;
  requirements: string;
}

function buildInitialState(req: JobRequisition | null): RequisitionFormState {
  if (!req) {
    return {
      title: "",
      department_id: "__none__",
      branch_name: "",
      employment_type: "دوام كامل",
      headcount_requested: "1",
      budget_min: "",
      budget_max: "",
      currency: "SAR",
      priority: "medium",
      target_start_date: "",
      justification: "",
      requirements: "",
    };
  }
  const normalizedCurrency =
    req.currency === "EGP" || req.currency === "USD" || req.currency === "SAR"
      ? req.currency
      : "SAR";

  return {
    title: req.title,
    department_id: req.department_id ?? "__none__",
    branch_name: req.branch_name ?? "",
    employment_type: req.employment_type || "دوام كامل",
    headcount_requested: String(req.headcount_requested || 1),
    budget_min: req.budget_min !== null && req.budget_min !== undefined ? String(req.budget_min) : "",
    budget_max: req.budget_max !== null && req.budget_max !== undefined ? String(req.budget_max) : "",
    currency: normalizedCurrency,
    priority: req.priority || "medium",
    target_start_date: req.target_start_date ? req.target_start_date.slice(0, 10) : "",
    justification: req.justification ?? "",
    requirements: normalizeRequirementsText(req.requirements),
  };
}

export function RequisitionFormDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  branches,
  departments,
  editingRequisition,
  onOpenDepartmentsManager,
}: RequisitionFormDialogProps) {
  const { locale, dir } = useI18n();
  const ar = locale !== "en";

  const createRequisition = useCreateRequisition(companyId);
  const updateRequisition = useUpdateRequisition(companyId);

  const [form, setForm] = useState<RequisitionFormState>(() =>
    buildInitialState(editingRequisition),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(editingRequisition));
      setValidationError(null);
    }
  }, [open, editingRequisition]);

  const activeDepartments = departments.filter(
    (d) => d.is_active || d.id === editingRequisition?.department_id,
  );

  const branchSuggestions = Array.from(
    new Set(
      [
        ...(companyName ? [companyName] : []),
        ...branches.map((b) => b.name),
        ...departments.map((d) => d.branch_name).filter((b): b is string => Boolean(b)),
      ].filter((v) => v.trim() !== ""),
    ),
  );

  const handleDepartmentChange = (deptId: string) => {
    const matched = departments.find((d) => d.id === deptId);
    setForm((prev) => ({
      ...prev,
      department_id: deptId,
      branch_name:
        !prev.branch_name.trim() && matched?.branch_name
          ? matched.branch_name
          : prev.branch_name,
    }));
  };

  const handleSave = async (submitImmediately: boolean) => {
    const title = form.title.trim();
    if (!title) {
      setValidationError(ar ? "يرجى إدخال المسمى الوظيفي." : "Job title is required.");
      return;
    }

    const headcount = Number(form.headcount_requested);
    if (!Number.isInteger(headcount) || headcount < 1) {
      setValidationError(
        ar ? "يجب أن يكون العدد المطلوب رقماً صحيحاً لا يقل عن 1." : "Headcount must be at least 1.",
      );
      return;
    }

    const budgetMin = form.budget_min.trim() !== "" ? Number(form.budget_min) : null;
    const budgetMax = form.budget_max.trim() !== "" ? Number(form.budget_max) : null;

    if ((budgetMin !== null && (Number.isNaN(budgetMin) || budgetMin < 0)) ||
        (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0))) {
      setValidationError(
        ar ? "يرجى إدخال قيم ميزانية صحيحة غير سالبة." : "Budget values must be valid non-negative numbers.",
      );
      return;
    }

    if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) {
      setValidationError(
        ar
          ? "الحد الأقصى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى."
          : "Maximum budget must be greater than or equal to minimum budget.",
      );
      return;
    }

    setValidationError(null);

    const payload = {
      title,
      department_id: form.department_id === "__none__" ? null : form.department_id,
      branch_name: form.branch_name.trim() || null,
      employment_type: form.employment_type,
      headcount_requested: headcount,
      budget_min: budgetMin,
      budget_max: budgetMax,
      currency: form.currency,
      priority: form.priority,
      target_start_date: form.target_start_date || null,
      justification: form.justification.trim() || null,
      requirements: form.requirements.trim() || null,
      submitImmediately,
    };

    try {
      if (editingRequisition) {
        await updateRequisition.mutateAsync({
          id: editingRequisition.id,
          ...payload,
        });
      } else {
        await createRequisition.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Mutation hook displays destructive toast
    }
  };

  const isBusy = createRequisition.isPending || updateRequisition.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className={cn(ar ? "text-right" : "text-left")}>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Briefcase className="w-5 h-5 text-primary" />
            <span>
              {editingRequisition
                ? editingRequisition.status === "rejected"
                  ? ar
                    ? "تعديل وإعادة تقديم طلب الاحتياج"
                    : "Edit & Resubmit Requisition"
                  : ar
                    ? "تعديل مسودة طلب الاحتياج"
                    : "Edit Draft Requisition"
                : ar
                  ? "إنشاء طلب احتياج وظيفي جديد"
                  : "New Job Requisition"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {ar
              ? "حدد تفاصيل الاحتياج الوظيفي والميزانية المعتمدة ومبررات التعيين قبل إرساله للاعتماد."
              : "Define headcount, department, budget range, and justification before submitting for approval."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave(false);
          }}
          className="space-y-4 mt-2"
        >
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="req-title">
                {ar ? "المسمى الوظيفي المطلوب *" : "Job Title *"}
              </Label>
              <Input
                id="req-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={ar ? "مثال: مهندس برمجيات أول" : "e.g. Senior Software Engineer"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="req-department">
                  {ar ? "الإدارة / القسم" : "Department"}
                </Label>
                {onOpenDepartmentsManager && (
                  <button
                    type="button"
                    onClick={onOpenDepartmentsManager}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Building2 className="w-3 h-3" />
                    {ar ? "إدارة الأقسام" : "Manage"}
                  </button>
                )}
              </div>
              <Select value={form.department_id} onValueChange={handleDepartmentChange}>
                <SelectTrigger id="req-department">
                  <SelectValue placeholder={ar ? "اختر الإدارة" : "Select department"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {ar ? "بدون تحديد إدارة" : "Unassigned"}
                  </SelectItem>
                  {activeDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                      {dept.cost_center ? ` (${dept.cost_center})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-branch">
                {ar ? "الفرع / الموقع" : "Branch / Location"}
              </Label>
              <Input
                id="req-branch"
                list="req-branch-suggestions"
                value={form.branch_name}
                onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))}
                placeholder={ar ? "مثال: الفرع الرئيسي - الرياض" : "e.g. Riyadh HQ"}
              />
              <datalist id="req-branch-suggestions">
                {branchSuggestions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-employment-type">
                {ar ? "نوع التوظيف" : "Employment Type"}
              </Label>
              <Select
                value={form.employment_type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, employment_type: value }))}
              >
                <SelectTrigger id="req-employment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {ar ? opt.ar : opt.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-headcount">
                {ar ? "العدد المطلوب (Headcount) *" : "Headcount Requested *"}
              </Label>
              <Input
                id="req-headcount"
                type="number"
                min={1}
                step={1}
                value={form.headcount_requested}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, headcount_requested: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-priority">
                {ar ? "الأولوية" : "Priority"}
              </Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, priority: value as RequisitionPriority }))
                }
              >
                <SelectTrigger id="req-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUISITION_PRIORITIES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {ar ? opt.ar : opt.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-target-date">
                {ar ? "تاريخ المباشرة المستهدف" : "Target Start Date"}
              </Label>
              <Input
                id="req-target-date"
                type="date"
                value={form.target_start_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, target_start_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-currency">
                {ar ? "العملة" : "Currency"}
              </Label>
              <Select
                value={form.currency}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, currency: value as RequisitionCurrency }))
                }
              >
                <SelectTrigger id="req-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUISITION_CURRENCIES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {ar ? opt.ar : opt.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="req-budget-min">
                  {ar ? "الحد الأدنى للميزانية" : "Budget Min"}
                </Label>
                <Input
                  id="req-budget-min"
                  type="number"
                  min={0}
                  step="any"
                  value={form.budget_min}
                  onChange={(e) => setForm((prev) => ({ ...prev, budget_min: e.target.value }))}
                  placeholder="8000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-budget-max">
                  {ar ? "الحد الأقصى للميزانية" : "Budget Max"}
                </Label>
                <Input
                  id="req-budget-max"
                  type="number"
                  min={0}
                  step="any"
                  value={form.budget_max}
                  onChange={(e) => setForm((prev) => ({ ...prev, budget_max: e.target.value }))}
                  placeholder="14000"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="req-justification">
                {ar ? "مبرر الاحتياج الوظيفي" : "Business Justification"}
              </Label>
              <Textarea
                id="req-justification"
                rows={3}
                value={form.justification}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, justification: e.target.value }))
                }
                placeholder={
                  ar
                    ? "توضيح أسباب التعيين (توسع، إحلال، إطلاق مشروع جديد)..."
                    : "Explain hiring need (expansion, backfill, new initiative)..."
                }
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="req-requirements">
                {ar ? "المتطلبات والمؤهلات الرئيسية" : "Key Requirements"}
              </Label>
              <Textarea
                id="req-requirements"
                rows={3}
                value={form.requirements}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, requirements: e.target.value }))
                }
                placeholder={
                  ar
                    ? "اكتب كل متطلب في سطر منفصل..."
                    : "List key qualifications and skills (one per line)..."
                }
              />
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
            >
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={isBusy}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {ar ? "حفظ كمسودة" : "Save Draft"}
            </Button>
            <Button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSave(true)}
              className="gap-1.5"
            >
              <Send className="w-4 h-4" />
              {ar ? "حفظ وإرسال للاعتماد" : "Save & Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
