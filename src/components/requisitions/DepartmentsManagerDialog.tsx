import { useEffect, useState } from "react";
import { Building2, Plus, Pencil, RefreshCw, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateDepartment,
  useUpdateDepartment,
  type CompanyDepartment,
} from "@/hooks/useRequisitions";
import { useCompanyMembers, type Company, type CompanyMember } from "@/hooks/useCompanies";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface DepartmentsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName?: string | null;
  branches: Company[];
  departments: CompanyDepartment[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  canManage: boolean;
}

interface DepartmentFormState {
  name: string;
  branch_name: string;
  cost_center: string;
  manager_user_id: string;
  is_active: boolean;
}

const EMPTY_FORM: DepartmentFormState = {
  name: "",
  branch_name: "",
  cost_center: "",
  manager_user_id: "__none__",
  is_active: true,
};

export function DepartmentsManagerDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  branches,
  departments,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  canManage,
}: DepartmentsManagerDialogProps) {
  const { locale, dir } = useI18n();
  const ar = locale !== "en";

  const createDepartment = useCreateDepartment(companyId);
  const updateDepartment = useUpdateDepartment(companyId);
  const membersQuery = useCompanyMembers(open ? companyId : undefined);
  const members: CompanyMember[] = membersQuery.data ?? [];

  const [editingDepartment, setEditingDepartment] = useState<CompanyDepartment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DepartmentFormState>(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEditingDepartment(null);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setValidationError(null);
    }
  }, [open]);

  const startCreate = () => {
    setEditingDepartment(null);
    setForm(EMPTY_FORM);
    setValidationError(null);
    setFormOpen(true);
  };

  const startEdit = (dept: CompanyDepartment) => {
    setEditingDepartment(dept);
    setForm({
      name: dept.name,
      branch_name: dept.branch_name ?? "",
      cost_center: dept.cost_center ?? "",
      manager_user_id: dept.manager_user_id ?? "__none__",
      is_active: dept.is_active,
    });
    setValidationError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setValidationError(ar ? "يرجى إدخال اسم الإدارة أو القسم." : "Department name is required.");
      return;
    }
    setValidationError(null);

    const payload = {
      name: trimmedName,
      branch_name: form.branch_name.trim() || null,
      cost_center: form.cost_center.trim() || null,
      manager_user_id: form.manager_user_id === "__none__" ? null : form.manager_user_id,
      is_active: form.is_active,
    };

    try {
      if (editingDepartment) {
        await updateDepartment.mutateAsync({
          id: editingDepartment.id,
          ...payload,
        });
      } else {
        await createDepartment.mutateAsync(payload);
      }
      setFormOpen(false);
      setEditingDepartment(null);
      setForm(EMPTY_FORM);
    } catch {
      // Mutation hook displays toast; keep form open for user correction
    }
  };

  const handleToggleActive = async (dept: CompanyDepartment) => {
    if (!canManage) return;
    try {
      await updateDepartment.mutateAsync({
        id: dept.id,
        name: dept.name,
        branch_name: dept.branch_name,
        cost_center: dept.cost_center,
        manager_user_id: dept.manager_user_id,
        is_active: !dept.is_active,
      });
    } catch {
      // Error toast handled in mutation hook
    }
  };

  const memberNameMap = new Map<string, string>();
  for (const m of members) {
    const label = m.profiles?.full_name?.trim() || m.user_id.slice(0, 8);
    memberNameMap.set(m.user_id, label);
  }

  const branchOptions = Array.from(
    new Set(
      [
        ...(companyName ? [companyName] : []),
        ...branches.map((b) => b.name),
        ...departments.map((d) => d.branch_name).filter((b): b is string => Boolean(b)),
      ].filter((v) => v.trim() !== ""),
    ),
  );

  const isSaving = createDepartment.isPending || updateDepartment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className={cn(ar ? "text-right" : "text-left")}>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Building2 className="w-5 h-5 text-primary" />
            <span>{ar ? "إدارة الإدارات والفروع" : "Departments & Branches"}</span>
          </DialogTitle>
          <DialogDescription>
            {ar
              ? "إعداد الأقسام ومراكز التكلفة والفروع المرتبطة بالشركة النشطة لتنظيم طلبات الاحتياج الوظيفي."
              : "Configure company departments, branches, and cost centers for manpower requisitions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>{ar ? "تعذر تحميل الإدارات" : "Failed to load departments"}</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3 mt-1">
                <span>{errorMessage || (ar ? "حدث خطأ أثناء الاتصال بقاعدة البيانات." : "Database error occurred.")}</span>
                <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {ar ? "إعادة المحاولة" : "Retry"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {canManage && !formOpen && (
            <div className="flex justify-end">
              <Button type="button" onClick={startCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                {ar ? "إضافة إدارة جديدة" : "Add Department"}
              </Button>
            </div>
          )}

          {formOpen && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-border bg-muted/30 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">
                  {editingDepartment
                    ? ar
                      ? "تعديل بيانات الإدارة"
                      : "Edit Department"
                    : ar
                      ? "إضافة إدارة جديدة"
                      : "New Department"}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingDepartment(null);
                    setValidationError(null);
                  }}
                >
                  {ar ? "إلغاء" : "Cancel"}
                </Button>
              </div>

              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dept-name">
                    {ar ? "اسم الإدارة / القسم *" : "Department Name *"}
                  </Label>
                  <Input
                    id="dept-name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={ar ? "مثال: التقنية والهندسة" : "e.g. Engineering"}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dept-branch">
                    {ar ? "اسم الفرع / الموقع" : "Branch Name"}
                  </Label>
                  <Input
                    id="dept-branch"
                    list="company-branch-suggestions"
                    value={form.branch_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))}
                    placeholder={ar ? "مثال: الفرع الرئيسي - الرياض" : "e.g. Riyadh HQ"}
                  />
                  <datalist id="company-branch-suggestions">
                    {branchOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dept-cost-center">
                    {ar ? "مركز التكلفة (Cost Center)" : "Cost Center"}
                  </Label>
                  <Input
                    id="dept-cost-center"
                    value={form.cost_center}
                    onChange={(e) => setForm((prev) => ({ ...prev, cost_center: e.target.value }))}
                    placeholder="CC-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dept-manager">
                    {ar ? "مدير الإدارة" : "Department Manager"}
                  </Label>
                  <Select
                    value={form.manager_user_id}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, manager_user_id: value }))
                    }
                  >
                    <SelectTrigger id="dept-manager">
                      <SelectValue placeholder={ar ? "بدون تحديد" : "Unassigned"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {ar ? "بدون تحديد" : "Unassigned"}
                      </SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profiles?.full_name?.trim() || m.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="dept-active"
                    checked={form.is_active}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="dept-active" className="cursor-pointer text-xs">
                    {ar ? "الإدارة نشطة ومتاحة للطلبات الجديدة" : "Department is active"}
                  </Label>
                </div>

                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? ar
                      ? "جارٍ الحفظ..."
                      : "Saving..."
                    : editingDepartment
                      ? ar
                        ? "حفظ التعديلات"
                        : "Save Changes"
                      : ar
                        ? "حفظ الإدارة"
                        : "Save Department"}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground" role="status">
              {ar ? "جارٍ تحميل الإدارات..." : "Loading departments..."}
            </div>
          ) : !isError && departments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                {ar ? "لا توجد إدارات مسجلة لهذه الشركة بعد" : "No departments registered yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ar
                  ? "أضف الإدارات ومراكز التكلفة لتسهيل ربط طلبات الاحتياج الوظيفي."
                  : "Add departments and cost centers to organize hiring requisitions."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {departments.map((dept) => {
                const managerLabel = dept.manager_user_id
                  ? memberNameMap.get(dept.manager_user_id) || dept.manager_user_id.slice(0, 8)
                  : null;

                return (
                  <div
                    key={dept.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{dept.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            dept.is_active
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {dept.is_active ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {ar ? "نشط" : "Active"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {ar ? "معطّل" : "Inactive"}
                            </span>
                          )}
                        </Badge>
                        {dept.cost_center && (
                          <Badge variant="secondary" className="text-[11px]">
                            {dept.cost_center}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {dept.branch_name && (
                          <span>
                            {ar ? "الفرع:" : "Branch:"} {dept.branch_name}
                          </span>
                        )}
                        {managerLabel && (
                          <span>
                            {ar ? "المدير:" : "Manager:"} {managerLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(dept)}
                          className="gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {ar ? "تعديل" : "Edit"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={updateDepartment.isPending}
                          onClick={() => handleToggleActive(dept)}
                        >
                          {dept.is_active
                            ? ar
                              ? "تعطيل"
                              : "Deactivate"
                            : ar
                              ? "تفعيل"
                              : "Activate"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
