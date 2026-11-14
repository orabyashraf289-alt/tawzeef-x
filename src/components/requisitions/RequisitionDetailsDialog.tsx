import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  formatCurrencyAmount,
  normalizeRequirementsText,
  useRequisitionApprovals,
  type CompanyDepartment,
  type JobRequisition,
} from "@/hooks/useRequisitions";
import {
  APPROVAL_DECISION_META,
  REQUISITION_PRIORITY_META,
  REQUISITION_STATUS_META,
} from "@/components/requisitions/requisitionMeta";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface RequisitionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  requisition: JobRequisition | null;
  department: CompanyDepartment | null;
}

export function RequisitionDetailsDialog({
  open,
  onOpenChange,
  companyId,
  requisition,
  department,
}: RequisitionDetailsDialogProps) {
  const { locale, dir } = useI18n();
  const ar = locale !== "en";

  const approvalsQuery = useRequisitionApprovals(
    open && requisition ? requisition.id : null,
    companyId,
  );

  if (!requisition) {
    return null;
  }

  const statusMeta = REQUISITION_STATUS_META[requisition.status] ?? REQUISITION_STATUS_META.draft;
  const priorityMeta =
    REQUISITION_PRIORITY_META[requisition.priority] ?? REQUISITION_PRIORITY_META.medium;
  const requirementsText = normalizeRequirementsText(requisition.requirements);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className={cn(ar ? "text-right" : "text-left")}>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg font-bold">
            <FileText className="w-5 h-5 text-primary" />
            <span>{requisition.title}</span>
            <Badge variant="outline" className={statusMeta.badgeClass}>
              {ar ? statusMeta.ar : statusMeta.en}
            </Badge>
            <Badge variant="outline" className={priorityMeta.badgeClass}>
              {ar ? priorityMeta.ar : priorityMeta.en}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {department ? department.name : ar ? "بدون إدارة محددة" : "Unassigned Department"}
            {requisition.branch_name ? ` • ${requisition.branch_name}` : ""}
            {` • ${requisition.employment_type}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">
                {ar ? "العدد المطلوب" : "Requested"}
              </p>
              <p className="text-base font-bold mt-0.5">{requisition.headcount_requested}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">
                {ar ? "تم التعيين" : "Filled"}
              </p>
              <p className="text-base font-bold mt-0.5">{requisition.headcount_filled}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">
                {ar ? "الميزانية" : "Budget"}
              </p>
              <p className="text-xs font-bold mt-1">
                {requisition.budget_min !== null || requisition.budget_max !== null
                  ? `${requisition.budget_min !== null ? formatCurrencyAmount(requisition.budget_min, requisition.currency, locale) : "—"} - ${requisition.budget_max !== null ? formatCurrencyAmount(requisition.budget_max, requisition.currency, locale) : "—"}`
                  : ar
                    ? "غير محددة"
                    : "Not specified"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">
                {ar ? "تاريخ المباشرة" : "Target Start"}
              </p>
              <p className="text-xs font-bold mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {requisition.target_start_date
                  ? requisition.target_start_date.slice(0, 10)
                  : ar
                    ? "غير محدد"
                    : "TBD"}
              </p>
            </div>
          </div>

          {requisition.status === "rejected" && requisition.rejection_reason && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <span className="font-bold">
                  {ar ? "سبب الرفض: " : "Rejection Reason: "}
                </span>
                {requisition.rejection_reason}
              </AlertDescription>
            </Alert>
          )}

          {requisition.linked_job_id && (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>
                  {ar
                    ? "تم تحويل هذا الاحتياج إلى وظيفة منشورة"
                    : "This requisition is linked to a published job"}
                </span>
              </div>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/jobs/${requisition.linked_job_id}`}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {ar ? "فتح الوظيفة" : "View Job"}
                </Link>
              </Button>
            </div>
          )}

          {requisition.justification && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-muted-foreground">
                {ar ? "مبرر الاحتياج الوظيفي" : "Justification"}
              </h4>
              <p className="text-sm rounded-xl border border-border bg-card p-3 whitespace-pre-line">
                {requisition.justification}
              </p>
            </div>
          )}

          {requirementsText && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-muted-foreground">
                {ar ? "المتطلبات والمؤهلات" : "Requirements"}
              </h4>
              <p className="text-sm rounded-xl border border-border bg-card p-3 whitespace-pre-line">
                {requirementsText}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {ar ? "سجل خطوات الاعتماد" : "Approval Timeline"}
            </h4>

            {approvalsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground" role="status">
                {ar ? "جارٍ تحميل سجل الاعتمادات..." : "Loading approvals..."}
              </p>
            ) : approvalsQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>
                    {approvalsQuery.error instanceof Error
                      ? approvalsQuery.error.message
                      : ar
                        ? "تعذر تحميل سجل الاعتمادات"
                        : "Failed to load approval timeline"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approvalsQuery.refetch()}
                    className="gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {ar ? "إعادة المحاولة" : "Retry"}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (approvalsQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {ar
                  ? "لا توجد خطوات اعتماد مسجلة بعد."
                  : "No approval steps recorded yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {(approvalsQuery.data ?? []).map((step) => {
                  const decisionMeta =
                    APPROVAL_DECISION_META[step.decision] ?? APPROVAL_DECISION_META.pending;
                  return (
                    <div
                      key={step.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            {ar ? `الخطوة ${step.step_order}` : `Step ${step.step_order}`}
                          </span>
                          <Badge variant="outline" className={decisionMeta.badgeClass}>
                            {ar ? decisionMeta.ar : decisionMeta.en}
                          </Badge>
                        </div>
                        {step.notes && (
                          <p className="text-muted-foreground">{step.notes}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {step.decided_at
                          ? step.decided_at.slice(0, 10)
                          : step.created_at.slice(0, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
