import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ConvertedOrder, OrderStatus } from "@/types/convertedOrders";
import { isOrderStatus, STATUS_BADGE_MAP } from "./convertedOrdersConstants";

interface OrderStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: ConvertedOrder | null;
  selectedNewStatus: OrderStatus;
  onChangeStatus: (status: OrderStatus) => void;
  statusChangeNotes: string;
  onChangeNotes: (notes: string) => void;
  onConfirm: () => void;
}

export default function OrderStatusDialog({
  open,
  onOpenChange,
  selectedOrder,
  selectedNewStatus,
  onChangeStatus,
  statusChangeNotes,
  onChangeNotes,
  onConfirm,
}: OrderStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-black">
            تحديث حالة أمر التعيين #{selectedOrder?.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold">الحالة الجديدة</Label>
            <Select
              value={selectedNewStatus}
              onValueChange={(v) => {
                if (isOrderStatus(v)) onChangeStatus(v);
              }}
            >
              <SelectTrigger className="text-xs rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {Object.entries(STATUS_BADGE_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">ملاحظات التحديث</Label>
            <Textarea
              value={statusChangeNotes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="ملاحظات حول سبب التغيير أو التقدم في الإجراءات..."
              className="text-xs rounded-xl min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
            إلغاء
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
          >
            تحديث الحالة ✅
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
