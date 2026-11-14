import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ConvertedOrder, OrderChecklist } from "@/types/convertedOrders";
import { ORDER_DOCUMENT_KINDS, type OrderDocument } from "@/types/orderOnboardingDocuments";
import { CHECKLIST_ITEMS } from "./convertedOrdersConstants";

interface OrderChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: ConvertedOrder | null;
  currentChecklist: OrderChecklist;
  onToggleChecklistItem: (key: keyof OrderChecklist, checked: boolean) => void;
  requiredKinds: string[];
  onToggleRequiredKind: (key: string) => void;
  submittedDocuments: OrderDocument[];
  documentsLoading: boolean;
  reviewingDocument: string | null;
  reviewNotes: Record<string, string>;
  onChangeReviewNote: (docId: string, note: string) => void;
  onRefreshDocuments: (orderId: string) => void;
  onOpenDocument: (doc: OrderDocument) => void;
  onReviewDocument: (doc: OrderDocument, decision: "approved" | "rejected") => void;
  onSaveChecklist: () => void;
}

export default function OrderChecklistDialog({
  open,
  onOpenChange,
  selectedOrder,
  currentChecklist,
  onToggleChecklistItem,
  requiredKinds,
  onToggleRequiredKind,
  submittedDocuments,
  documentsLoading,
  reviewingDocument,
  reviewNotes,
  onChangeReviewNote,
  onRefreshDocuments,
  onOpenDocument,
  onReviewDocument,
  onSaveChecklist,
}: OrderChecklistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            مسوغات التعيين الرسمية — {selectedOrder?.candidate_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            حدد المستندات المطلوبة لهذا الأمر. اعتماد ملف مرفوع يحدّث بند الاستلام المرتبط به تلقائيًا.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-2">
          {CHECKLIST_ITEMS.map((item) => {
            const docStatus = submittedDocuments.find((doc) => doc.kind === item.key)?.review_status;
            return (
              <div
                key={item.key}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <Checkbox
                  id={item.key}
                  checked={Boolean(currentChecklist[item.key])}
                  disabled={docStatus === "pending" || docStatus === "rejected"}
                  onCheckedChange={(checked) => onToggleChecklistItem(item.key, !!checked)}
                />
                <label htmlFor={item.key} className="text-xs font-semibold text-foreground cursor-pointer flex-1">
                  {item.label}
                </label>
                {selectedOrder?.order_type === "direct_hire" && (
                  <button
                    type="button"
                    aria-pressed={requiredKinds.includes(item.key)}
                    onClick={() => onToggleRequiredKind(item.key)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      requiredKinds.includes(item.key)
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "text-muted-foreground border-border"
                    }`}
                  >
                    {requiredKinds.includes(item.key) ? "مطلوب" : "اختياري"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedOrder?.onboarding_token && (
          <section className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm">مستندات المرشح المرفوعة للمراجعة</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={documentsLoading}
                onClick={() => selectedOrder && onRefreshDocuments(selectedOrder.id)}
              >
                <RefreshCw className="w-3.5 h-3.5 ml-1" /> تحديث الملفات
              </Button>
            </div>

            {!documentsLoading && submittedDocuments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {submittedDocuments.filter((item) => item.review_status === "pending").length} ملف قيد المراجعة
                {" · "}
                {submittedDocuments.filter((item) => item.review_status === "rejected").length} نسخة مرفوضة محفوظة في السجل
              </p>
            )}

            {documentsLoading ? (
              <p className="text-xs text-muted-foreground">جاري تحميل المستندات...</p>
            ) : submittedDocuments.length === 0 ? (
              <p className="text-xs text-muted-foreground">لم يرفع المرشح مستندات بعد.</p>
            ) : (
              ORDER_DOCUMENT_KINDS.map(({ key, label }) => {
                const versions = submittedDocuments.filter((item) => item.kind === key);
                const doc = versions[0];
                if (!doc) return null;
                return (
                  <div key={key} className="rounded-lg border p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{label}</strong>
                      <span>
                        {doc.review_status === "approved"
                          ? "معتمد"
                          : doc.review_status === "rejected"
                            ? "مطلوب إعادة الرفع"
                            : "قيد المراجعة"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenDocument(doc)}
                      className="max-w-full truncate"
                    >
                      فتح الملف: {doc.file_name}
                    </Button>
                    <p className="text-muted-foreground">رُفع في {new Date(doc.created_at).toLocaleString("ar-SA")}</p>
                    {doc.review_note && <p className="text-red-700">ملاحظة المراجعة: {doc.review_note}</p>}
                    {doc.review_status === "pending" && (
                      <>
                        <Input
                          value={reviewNotes[doc.id] || ""}
                          maxLength={1000}
                          onChange={(event) => onChangeReviewNote(doc.id, event.target.value)}
                          placeholder="سبب إعادة الرفع عند الرفض"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!!reviewingDocument}
                            onClick={() => onReviewDocument(doc, "approved")}
                          >
                            اعتماد المستند
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!!reviewingDocument}
                            onClick={() => onReviewDocument(doc, "rejected")}
                          >
                            طلب إعادة الرفع
                          </Button>
                        </div>
                      </>
                    )}
                    {versions.length > 1 && (
                      <details className="border-t pt-2">
                        <summary className="cursor-pointer font-semibold">النسخ السابقة ({versions.length - 1})</summary>
                        <div className="space-y-2 mt-2">
                          {versions.slice(1).map((previous) => (
                            <div key={previous.id} className="rounded-md bg-muted/40 p-2 space-y-1">
                              <p>
                                {previous.review_status === "approved"
                                  ? "معتمد"
                                  : previous.review_status === "rejected"
                                    ? "مرفوض"
                                    : "قيد المراجعة"}
                                {" · "}
                                {new Date(previous.created_at).toLocaleString("ar-SA")}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenDocument(previous)}
                                className="max-w-full truncate"
                              >
                                فتح النسخة: {previous.file_name}
                              </Button>
                              {previous.review_note && <p className="text-red-700">سبب الرفض: {previous.review_note}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })
            )}
            <p className="text-xs text-muted-foreground">
              المراجعة تحدّث بند المستند فقط؛ حالة أمر التعيين والمباشرة تحتاج تحديثًا منفصلًا.
            </p>
          </section>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
            إغلاق
          </Button>
          <Button
            onClick={onSaveChecklist}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
          >
            حفظ التحديثات ✅
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
