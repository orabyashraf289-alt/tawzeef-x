import { Copy, Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConvertedOrder } from "@/types/convertedOrders";
import { getOnboardingPortalLink, getWhatsAppMessage } from "./convertedOrdersConstants";

interface OrderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: ConvertedOrder | null;
  onShareWhatsApp: (order: ConvertedOrder) => void;
  onShareEmail: (order: ConvertedOrder) => void;
  onCopyLink: (order: ConvertedOrder) => void;
}

export default function OrderShareDialog({
  open,
  onOpenChange,
  selectedOrder,
  onShareWhatsApp,
  onShareEmail,
  onCopyLink,
}: OrderShareDialogProps) {
  const portalLink = selectedOrder ? getOnboardingPortalLink(selectedOrder) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            مشاركة رابط إقرار استلام أمر التعيين
          </DialogTitle>
          <DialogDescription className="text-xs">
            يُقر المرشح باستلام تفاصيل الأمر. تراجع الإدارة مسوغات التعيين وتعتمد المباشرة بعد ذلك.
          </DialogDescription>
        </DialogHeader>

        {selectedOrder && (
          <div className="space-y-4 py-2">
            {selectedOrder.onboarding_acknowledged_at && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                تم تسجيل إقرار استلام المرشح في {new Date(selectedOrder.onboarding_acknowledged_at).toLocaleString("ar-SA")}
              </p>
            )}
            <div className="p-3 bg-muted/40 rounded-xl space-y-2 border text-xs">
              <p className="font-bold text-foreground">نص الرسالة التلقائي المعتمد:</p>
              <p className="text-muted-foreground whitespace-pre-line text-[11px] bg-background p-2.5 rounded-lg border leading-relaxed">
                {getWhatsAppMessage(selectedOrder)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onShareWhatsApp(selectedOrder)}
                disabled={!portalLink}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl gap-1.5 h-10 shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                إرسال عبر WhatsApp
              </Button>

              <Button
                onClick={() => onShareEmail(selectedOrder)}
                disabled={!portalLink}
                variant="outline"
                className="border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5 h-10"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                إرسال عبر البريد
              </Button>
            </div>

            <Button
              onClick={() => onCopyLink(selectedOrder)}
              disabled={!portalLink}
              variant="ghost"
              className="w-full text-xs font-bold rounded-xl gap-1.5 border border-dashed border-slate-300"
            >
              <Copy className="w-3.5 h-3.5" />
              نسخ رابط البوابة المباشر
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
