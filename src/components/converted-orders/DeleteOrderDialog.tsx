import { AlertCircle, Trash2 } from "lucide-react";
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
import type { ConvertedOrder } from "@/types/convertedOrders";

interface DeleteOrderDialogProps {
  orderToDelete: ConvertedOrder | null;
  onClose: () => void;
  onConfirmDelete: (orderId: string) => void;
}

export default function DeleteOrderDialog({
  orderToDelete,
  onClose,
  onConfirmDelete,
}: DeleteOrderDialogProps) {
  return (
    <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent
        className="sm:max-w-[460px] p-6 text-right rounded-2xl border border-border/80 shadow-2xl bg-card"
        dir="rtl"
      >
        <AlertDialogHeader className="space-y-3 text-right">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20 shadow-sm">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            تأكيد حذف أمر التحويل
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            هل أنت متأكد من رغبتك في حذف أمر التحويل رقم{" "}
            <span className="font-bold text-foreground underline decoration-red-500/40">
              {orderToDelete?.order_number}
            </span>
            {orderToDelete?.candidate_name ? (
              <>
                {" "}
                الخاص بالمرشح <strong className="text-foreground">"{orderToDelete.candidate_name}"</strong>؟
              </>
            ) : (
              "؟"
            )}
            <span className="text-xs text-red-600 dark:text-red-400 font-medium block mt-3 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
              ⚠️ تنبيه: سيتم حذف أمر التحويل نهائياً من سجلات الشركة ولن يمكن استعادته.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row gap-2 justify-end sm:space-x-0" dir="rtl">
          <AlertDialogCancel className="font-bold text-xs rounded-xl px-5 h-10 border-border hover:bg-muted">
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (orderToDelete) {
                onConfirmDelete(orderToDelete.id);
                onClose();
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl px-5 h-10 gap-1.5 shadow-md shadow-red-600/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            تأكيد الحذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
