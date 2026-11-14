import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  computeRequisitionKpis,
  formatCurrencyAmount,
  useCompanyDepartments,
  useConvertRequisitionToJob,
  useDeleteRequisition,
  useJobRequisitions,
  useRequisitionPermissions,
  useSubmitRequisition,
  type CompanyDepartment,
  type JobRequisition,
} from "@/hooks/useRequisitions";
import {
  REQUISITION_PRIORITIES,
  REQUISITION_PRIORITY_META,
  REQUISITION_STATUS_META,
} from "@/components/requisitions/requisitionMeta";
import { DepartmentsManagerDialog } from "@/components/requisitions/DepartmentsManagerDialog";
import { RequisitionFormDialog } from "@/components/requisitions/RequisitionFormDialog";
import { RequisitionDecisionDialog } from "@/components/requisitions/RequisitionDecisionDialog";
import { RequisitionDetailsDialog } from "@/components/requisitions/RequisitionDetailsDialog";
import { cn } from "@/lib/utils";

interface RequisitionsWorkspaceProps {
  companyIdOverride?: string | null;
}

export function RequisitionsWorkspace({ companyIdOverride }: RequisitionsWorkspaceProps) {
  const { locale, dir } = useI18n();
  const ar = locale !== "en";

  const {
    activeCompany,
    activeCompanyId,
    companyBranches,
    isLoading: companyLoading,
    refetchCompanies,
  } = useCompany();

  const effectiveCompanyId =
    companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;
  const hasValidCompanyId =
    typeof effectiveCompanyId === "string" &&
    effectiveCompanyId.trim() !== "" &&
    effectiveCompanyId !== "undefined" &&
    effectiveCompanyId !== "null";

  const permissions = useRequisitionPermissions();
  const departmentsQuery = useCompanyDepartments(effectiveCompanyId);
  const requisitionsQuery = useJobRequisitions(effectiveCompanyId);
  const submitMutation = useSubmitRequisition(effectiveCompanyId);
  const convertMutation = useConvertRequisitionToJob(effectiveCompanyId);
  const deleteMutation = useDeleteRequisition(effectiveCompanyId);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const [departmentsDialogOpen, setDepartmentsDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<JobRequisition | null>(null);
  const [detailsRequisition, setDetailsRequisition] = useState<JobRequisition | null>(null);
  const [decisionState, setDecisionState] = useState<{
    requisition: JobRequisition;
    decision: "approved" | "rejected";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobRequisition | null>(null);

  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  );
  const requisitions = useMemo(
    () => requisitionsQuery.data ?? [],
    [requisitionsQuery.data],
  );

  const departmentMap = useMemo(() => {
    const map = new Map<string, CompanyDepartment>();
    for (const dept of departments) {
      map.set(dept.id, dept);
    }
    return map;
  }, [departments]);

  const kpis = useMemo(() => computeRequisitionKpis(requisitions), [requisitions]);

  const filteredRequisitions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requisitions.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (priorityFilter !== "all" && req.priority !== priorityFilter) return false;
      if (departmentFilter !== "all" && req.department_id !== departmentFilter) return false;

      if (!q) return true;
      const deptName = req.department_id ? (departmentMap.get(req.department_id)?.name ?? "") : "";
      return (
        req.title.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q) ||
        (req.branch_name ?? "").toLowerCase().includes(q) ||
        (req.justification ?? "").toLowerCase().includes(q)
      );
    });
  }, [requisitions, statusFilter, priorityFilter, departmentFilter, searchQuery, departmentMap]);

  // Fail-closed loading state while company context resolves
  if (companyIdOverride === undefined && companyLoading) {
    return (
      <Card className="border-border/50 bg-card/70 p-8 text-center" role="status">
        <p className="text-sm text-muted-foreground">
          {ar ? "جارٍ التحقق من الشركة النشطة..." : "Loading active company..."}
        </p>
      </Card>
    );
  }

  // Fail-closed missing activeCompanyId state
  if (!hasValidCompanyId) {
    return (
      <Alert variant="destructive" className="rounded-2xl p-5" role="alert">
        <AlertCircle className="w-5 h-5" />
        <AlertTitle className="font-bold">
          {ar ? "لم يتم تحديد شركة نشطة" : "No Active Company Selected"}
        </AlertTitle>
        <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>
            {ar
              ? "لا يمكن عرض أو إدارة طلبات الاحتياج الوظيفي بدون تحديد شركة نشطة صالحة."
              : "Job requisitions and manpower planning require a valid active company."}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchCompanies()}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {ar ? "إعادة المحاولة" : "Retry"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const queryHasError = requisitionsQuery.isError || departmentsQuery.isError;
  const queryErrorMessage =
    (requisitionsQuery.error instanceof Error ? requisitionsQuery.error.message : null) ||
    (departmentsQuery.error instanceof Error ? departmentsQuery.error.message : null);

  if (queryHasError) {
    return (
      <Alert variant="destructive" className="rounded-2xl p-5" role="alert">
        <AlertCircle className="w-5 h-5" />
        <AlertTitle className="font-bold">
          {ar ? "تعذر تحميل بيانات الاحتياج الوظيفي" : "Failed to Load Requisitions"}
        </AlertTitle>
        <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>
            {queryErrorMessage ||
              (ar
                ? "حدث خطأ أثناء جلب طلبات التوظيف أو الإدارات من الخادم."
                : "An error occurred while fetching requisitions or departments.")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void requisitionsQuery.refetch();
              void departmentsQuery.refetch();
            }}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {ar ? "إعادة المحاولة" : "Retry"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const isLoadingData = requisitionsQuery.isLoading || departmentsQuery.isLoading;

  const primaryBudget = kpis.estimatedBudgetByCurrency[0];
  const secondaryBudgets = kpis.estimatedBudgetByCurrency.slice(1);

  return (
    <div dir={dir} className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/50 bg-card/75 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {ar ? "إجمالي الاحتياج المطلوب" : "Total Requested"}
              </p>
              <p className="text-2xl font-black text-foreground mt-1">
                {kpis.totalRequestedHeadcount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {ar ? `${requisitions.length} طلب مسجل` : `${requisitions.length} requisitions`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/75 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {ar ? "تم التعيين (المُغطى)" : "Filled Headcount"}
              </p>
              <p className="text-2xl font-black text-success mt-1">{kpis.filledHeadcount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {kpis.totalRequestedHeadcount > 0
                  ? `${Math.min(
                      100,
                      Math.round((kpis.filledHeadcount / kpis.totalRequestedHeadcount) * 100),
                    )}% ${ar ? "نسبة التغطية" : "filled"}`
                  : ar
                    ? "لا توجد مقاعد مطلوبة"
                    : "No requested seats"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/75 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {ar ? "الشواغر المفتوحة" : "Open Positions"}
              </p>
              <p className="text-2xl font-black text-info mt-1">{kpis.openHeadcount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {ar ? "مقاعد متبقية للتغطية" : "Seats remaining"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-info/15 text-info flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/75 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {ar ? "بانتظار الاعتماد" : "Pending Approval"}
              </p>
              <p className="text-2xl font-black text-warning mt-1">{kpis.pendingApprovalCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {ar
                  ? `${kpis.pendingApprovalHeadcount} مقعد قيد المراجعة`
                  : `${kpis.pendingApprovalHeadcount} seats in review`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/75 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {ar ? "الميزانية التقديرية" : "Estimated Budget"}
              </p>
              <p className="text-lg font-black text-foreground mt-1 truncate">
                {primaryBudget
                  ? formatCurrencyAmount(primaryBudget.total, primaryBudget.currency, locale)
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {secondaryBudgets.length > 0
                  ? secondaryBudgets
                      .map((b) => formatCurrencyAmount(b.total, b.currency, locale))
                      .join(" • ")
                  : ar
                    ? "للشواغر النشطة شهرياً"
                    : "Active monthly estimate"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar & Filters */}
      <Card className="border-border/50 bg-card/70 backdrop-blur-sm rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                className={cn(
                  "w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2",
                  ar ? "right-3" : "left-3",
                )}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  ar
                    ? "بحث بالمسمى الوظيفي، الإدارة، الفرع..."
                    : "Search by title, department, branch..."
                }
                className={cn(ar ? "pr-9" : "pl-9")}
                aria-label={ar ? "بحث في طلبات الاحتياج" : "Search requisitions"}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDepartmentsDialogOpen(true)}
                className="gap-2"
              >
                <Building2 className="w-4 h-4" />
                {ar ? "الإدارات والفروع" : "Departments & Branches"}
                <Badge variant="secondary" className="text-[11px]">
                  {departments.length}
                </Badge>
              </Button>

              {permissions.canCreate && (
                <Button
                  type="button"
                  onClick={() => {
                    setEditingRequisition(null);
                    setFormDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {ar ? "طلب احتياج جديد" : "New Requisition"}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label={ar ? "تصفية حسب الحالة" : "Filter by status"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "كل الحالات" : "All Statuses"}</SelectItem>
                {(Object.keys(REQUISITION_STATUS_META) as Array<keyof typeof REQUISITION_STATUS_META>).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {ar ? REQUISITION_STATUS_META[key].ar : REQUISITION_STATUS_META[key].en}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger aria-label={ar ? "تصفية حسب الأولوية" : "Filter by priority"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "كل الأولويات" : "All Priorities"}</SelectItem>
                {REQUISITION_PRIORITIES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {ar ? opt.ar : opt.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger aria-label={ar ? "تصفية حسب الإدارة" : "Filter by department"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "كل الإدارات" : "All Departments"}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions List */}
      {isLoadingData ? (
        <Card className="border-border/50 bg-card/60 p-10 text-center" role="status">
          <p className="text-sm text-muted-foreground">
            {ar ? "جارٍ تحميل طلبات الاحتياج الوظيفي..." : "Loading job requisitions..."}
          </p>
        </Card>
      ) : filteredRequisitions.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50 p-10 text-center space-y-3">
          <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground">
              {requisitions.length === 0
                ? ar
                  ? "لا توجد طلبات احتياج وظيفي مسجلة بعد"
                  : "No job requisitions created yet"
                : ar
                  ? "لا توجد نتائج مطابقة لمرشحات البحث"
                  : "No requisitions match your current filters"}
            </p>
            <p className="text-xs text-muted-foreground">
              {requisitions.length === 0
                ? ar
                  ? "ابدأ بإنشاء مسودة طلب احتياج وظيفي لتحديد الأعداد والميزانية وإرسالها للاعتماد."
                  : "Create a draft requisition to define headcount, budget, and submit for approval."
                : ar
                  ? "جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر."
                  : "Try adjusting your search or filter criteria."}
            </p>
          </div>
          {requisitions.length === 0 && permissions.canCreate && (
            <Button
              type="button"
              onClick={() => {
                setEditingRequisition(null);
                setFormDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {ar ? "إنشاء أول طلب احتياج" : "Create First Requisition"}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequisitions.map((req) => {
            const dept = req.department_id ? (departmentMap.get(req.department_id) ?? null) : null;
            const statusMeta = REQUISITION_STATUS_META[req.status] ?? REQUISITION_STATUS_META.draft;
            const priorityMeta =
              REQUISITION_PRIORITY_META[req.priority] ?? REQUISITION_PRIORITY_META.medium;
            const fillPct =
              req.headcount_requested > 0
                ? Math.min(100, Math.round((req.headcount_filled / req.headcount_requested) * 100))
                : 0;
            const openSeats = Math.max(0, req.headcount_requested - req.headcount_filled);

            return (
              <Card
                key={req.id}
                className="border-border/60 bg-card/85 backdrop-blur-sm rounded-2xl transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{req.title}</h3>
                        <Badge variant="outline" className={statusMeta.badgeClass}>
                          {ar ? statusMeta.ar : statusMeta.en}
                        </Badge>
                        <Badge variant="outline" className={priorityMeta.badgeClass}>
                          {ar ? priorityMeta.ar : priorityMeta.en}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          {req.employment_type}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {dept ? dept.name : ar ? "إدارة غير محددة" : "No department"}
                          {dept?.cost_center ? ` (${dept.cost_center})` : ""}
                        </span>
                        {req.branch_name && (
                          <span>
                            {ar ? "الفرع:" : "Branch:"} {req.branch_name}
                          </span>
                        )}
                        {(req.budget_min !== null || req.budget_max !== null) && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Banknote className="w-3.5 h-3.5 text-primary" />
                            {req.budget_min !== null
                              ? formatCurrencyAmount(req.budget_min, req.currency, locale)
                              : "—"}{" "}
                            -{" "}
                            {req.budget_max !== null
                              ? formatCurrencyAmount(req.budget_max, req.currency, locale)
                              : "—"}
                          </span>
                        )}
                        {req.target_start_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {ar ? "المباشرة:" : "Start:"} {req.target_start_date.slice(0, 10)}
                          </span>
                        )}
                      </div>

                      {req.justification && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {req.justification}
                        </p>
                      )}
                    </div>

                    {/* Headcount progress indicator */}
                    <div className="w-full lg:w-56 shrink-0 rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {ar ? "التعيين / المطلوب" : "Filled / Requested"}
                        </span>
                        <span className="font-bold text-foreground">
                          {req.headcount_filled} / {req.headcount_requested}
                        </span>
                      </div>
                      <Progress value={fillPct} className="h-2" />
                      <p className="text-[11px] text-muted-foreground">
                        {openSeats > 0
                          ? ar
                            ? `متبقي ${openSeats} شاغر`
                            : `${openSeats} open seats`
                          : ar
                            ? "مكتمل التغطية"
                            : "Fully staffed"}
                      </p>
                    </div>
                  </div>

                  {req.status === "rejected" && req.rejection_reason && (
                    <Alert variant="destructive" className="py-2.5">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription className="text-xs">
                        <span className="font-bold">
                          {ar ? "سبب الرفض: " : "Rejection Reason: "}
                        </span>
                        {req.rejection_reason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Lifecycle Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailsRequisition(req)}
                      className="gap-1.5 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {ar ? "التفاصيل وسجل الاعتماد" : "Details & Approvals"}
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      {(req.status === "draft" || req.status === "rejected") &&
                        permissions.canCreate && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRequisition(req);
                              setFormDialogOpen(true);
                            }}
                            className="gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {req.status === "rejected"
                              ? ar
                                ? "تعديل الطلب"
                                : "Edit Request"
                              : ar
                                ? "تعديل المسودة"
                                : "Edit Draft"}
                          </Button>
                          {req.status === "draft" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(req)}
                              className="gap-1.5 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {ar ? "حذف" : "Delete"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={submitMutation.isPending}
                            onClick={() => submitMutation.mutate(req.id)}
                            className="gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {req.status === "rejected"
                              ? ar
                                ? "إعادة الإرسال للاعتماد"
                                : "Resubmit for Approval"
                              : ar
                                ? "إرسال للاعتماد"
                                : "Submit for Approval"}
                          </Button>
                        </>
                      )}

                      {req.status === "pending_approval" && permissions.canApprove && (
                        <>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setDecisionState({ requisition: req, decision: "rejected" })
                            }
                            className="gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {ar ? "رفض" : "Reject"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              setDecisionState({ requisition: req, decision: "approved" })
                            }
                            className="gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {ar ? "اعتماد" : "Approve"}
                          </Button>
                        </>
                      )}

                      {req.status === "approved" && permissions.canConvert && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={convertMutation.isPending}
                          onClick={() => convertMutation.mutate(req.id)}
                          className="gap-1.5"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          {convertMutation.isPending
                            ? ar
                              ? "جارٍ التحويل..."
                              : "Converting..."
                            : ar
                              ? "تحويل إلى وظيفة منشورة"
                              : "Convert to Published Job"}
                        </Button>
                      )}

                      {req.status === "converted" && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link to={req.linked_job_id ? `/jobs/${req.linked_job_id}` : "/jobs"}>
                            <ExternalLink className="w-3.5 h-3.5" />
                            {ar ? "عرض الوظيفة المنشورة" : "View Published Job"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <DepartmentsManagerDialog
        open={departmentsDialogOpen}
        onOpenChange={setDepartmentsDialogOpen}
        companyId={effectiveCompanyId}
        companyName={activeCompany?.name}
        branches={companyBranches}
        departments={departments}
        isLoading={departmentsQuery.isLoading}
        isError={departmentsQuery.isError}
        errorMessage={
          departmentsQuery.error instanceof Error ? departmentsQuery.error.message : null
        }
        onRetry={() => {
          void departmentsQuery.refetch();
        }}
        canManage={permissions.canManageDepartments}
      />

      <RequisitionFormDialog
        open={formDialogOpen}
        onOpenChange={(nextOpen) => {
          setFormDialogOpen(nextOpen);
          if (!nextOpen) setEditingRequisition(null);
        }}
        companyId={effectiveCompanyId}
        companyName={activeCompany?.name}
        branches={companyBranches}
        departments={departments}
        editingRequisition={editingRequisition}
        onOpenDepartmentsManager={() => {
          setFormDialogOpen(false);
          setDepartmentsDialogOpen(true);
        }}
      />

      <RequisitionDecisionDialog
        open={!!decisionState}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDecisionState(null);
        }}
        companyId={effectiveCompanyId}
        requisition={decisionState?.requisition ?? null}
        decision={decisionState?.decision ?? null}
      />

      <RequisitionDetailsDialog
        open={!!detailsRequisition}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailsRequisition(null);
        }}
        companyId={effectiveCompanyId}
        requisition={detailsRequisition}
        department={
          detailsRequisition?.department_id
            ? (departmentMap.get(detailsRequisition.department_id) ?? null)
            : null
        }
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader className={cn(ar ? "text-right sm:text-right" : "text-left sm:text-left")}>
            <AlertDialogTitle>
              {ar ? "حذف مسودة طلب الاحتياج" : "Delete Draft Requisition"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? `هل أنت متأكد من حذف المسودة "${deleteTarget?.title ?? ""}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete draft "${deleteTarget?.title ?? ""}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ar ? "حذف المسودة" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
