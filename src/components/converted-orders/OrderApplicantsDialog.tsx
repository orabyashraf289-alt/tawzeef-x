import { Bot, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CandidateRow } from "@/hooks/useJobs";
import type { ConvertedOrder } from "@/types/convertedOrders";

interface OrderApplicantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: ConvertedOrder | null;
  matchedCandidates: CandidateRow[];
  onReviewCandidate: (candidateId: string) => void;
}

export default function OrderApplicantsDialog({
  open,
  onOpenChange,
  selectedOrder,
  matchedCandidates,
  onReviewCandidate,
}: OrderApplicantsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            متقدمو الوظيفة المرتبطة — ({selectedOrder?.job_title})
          </DialogTitle>
          <DialogDescription className="text-xs">
            متقدمون مرتبطون بنفس الوظيفة، مرتّبون بالاسم. راجع الملف والتقييم قبل اتخاذ القرار.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {matchedCandidates.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              لا توجد طلبات مرتبطة بهذه الوظيفة، أو لم يُربط الأمر بوظيفة بعد.
            </div>
          ) : (
            matchedCandidates.map((cand) => (
              <div
                key={cand.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-foreground">{cand.name}</span>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold">
                      متقدم لنفس الوظيفة
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{cand.role}</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => onReviewCandidate(cand.id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-8 px-3 gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  مراجعة الملف
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
