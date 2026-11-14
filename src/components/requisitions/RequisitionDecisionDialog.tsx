import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDecideRequisition, type JobRequisition } from "@/hooks/useRequisitions";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface RequisitionDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  requisition: JobRequisition | null;
  decision: "approved" | "rejected" | null;
}

export function RequisitionDecisionDialog({
  open,
  onOpenChange,
  companyId,
  requisition,
  decision,
}: RequisitionDecisionDialogProps) {
  const { locale, dir } = useI18n();
  const ar = locale !== "en";
  const decideMutation = useDecideRequisition(companyId);

  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNotes("");
      setErrorMessage(null);
    }
  }, [open, requisition?.id, decision]);

  if (!requisition || !decision) {
    return null;
  }

  const isReject = decision === "rejected";
  const canConfirm = !isReject || notes.trim().length > 0;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReject && !notes.trim()) {
      setErrorMessage(ar ? "يجب كتابة سبب الرفض بوضوح." : "A rejection reason is required.");
      return;
    }
    setErrorMessage(null);
    try {
      await decideMutation.mutateAsync({
        requisitionId: requisition.id,
        decision,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // Mutation hook displays error toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-md">
        <DialogHeader className={cn(ar ? "text-right" : "text-left")}>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            {isReject ? (
              <XCircle className="w-5 h-5 text-destructive" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-success" />
            )}
            <span>
              {isReject
                ? ar
                  ? "رفض طلب الاحتياج الوظيفي"
                  : "Reject Job Requisition"
                : ar
                  ? "اعتماد طلب الاحتياج الوظيفي"
                  : "Approve Job Requisition"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {ar
              ? `الطلب: ${requisition.title} (${requisition.headcount_requested} مقعد)`
              : `Requisition: ${requisition.title} (${requisition.headcount_requested} headcount)`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="decision-notes">
              {isReject
                ? ar
                  ? "سبب الرفض *"
                  : "Rejection Reason *"
                : ar
                  ? "ملاحظات الاعتماد (اختياري)"
                  : "Approval Notes (optional)"}
            </Label>
            <Textarea
              id="decision-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isReject
                  ? ar
                    ? "اذكر سبب الرفض ليتمكن مقدم الطلب من المراجعة..."
                    : "Provide the reason for rejection..."
                  : ar
                    ? "أضف ملاحظات أو توجيهات للبدء بالتوظيف..."
                    : "Optional approval comments..."
              }
              required={isReject}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={decideMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant={isReject ? "destructive" : "default"}
              disabled={!canConfirm || decideMutation.isPending}
            >
              {decideMutation.isPending
                ? ar
                  ? "جارٍ التنفيذ..."
                  : "Submitting..."
                : isReject
                  ? ar
                    ? "تأكيد الرفض"
                    : "Confirm Rejection"
                  : ar
                    ? "تأكيد الاعتماد"
                    : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
