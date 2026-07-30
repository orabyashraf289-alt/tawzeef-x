import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

export interface PipelineRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  onConfirm: (reason: string) => void;
}

export default function PipelineRejectionModal({
  isOpen,
  onClose,
  candidateName,
  onConfirm,
}: PipelineRejectionModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold">
            تأكيد رفض المرشح {candidateName ? `"${candidateName}"` : ""}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            سيتم استبعاد المرشح ونقله لقائمة المرفوضين. يمكنك كتابة سبب الرفض أدناه للأرشيف:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Textarea
            placeholder="سبب الرفض (اختياري - مهارات غير كافية، عدم التفرغ...)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs min-h-[90px]"
          />
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={onClose} className="text-xs h-8">
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            تأكيد الرفض
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
