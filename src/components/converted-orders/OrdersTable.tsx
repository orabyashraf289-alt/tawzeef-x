import { Building2, FileCheck2, Plus, Printer, Send, Sparkles, Trash2 } from "lucide-react";
import SARSymbol from "@/components/SARSymbol";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConvertedOrder } from "@/types/convertedOrders";
import { getChecklistCount, ORDER_TYPE_LABELS, STATUS_BADGE_MAP } from "./convertedOrdersConstants";

interface OrdersTableProps {
  orders: ConvertedOrder[];
  onCreateFirstOrder: () => void;
  onOpenStatusChange: (order: ConvertedOrder) => void;
  onOpenChecklist: (order: ConvertedOrder) => void;
  onOpenShare: (order: ConvertedOrder) => void;
  onOpenAiMatcher: (order: ConvertedOrder) => void;
  onOpenPrint: (order: ConvertedOrder) => void;
  onRequestDelete: (order: ConvertedOrder) => void;
}

export default function OrdersTable({
  orders,
  onCreateFirstOrder,
  onOpenStatusChange,
  onOpenChecklist,
  onOpenShare,
  onOpenAiMatcher,
  onOpenPrint,
  onRequestDelete,
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <FileCheck2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-black text-foreground">لا توجد أوامر محولة مطابقة</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          يمكنك إنشاء أمر تعيين مباشر جديد أو طلب استقدام عبر الوكالات بنقرة واحدة.
        </p>
        <Button
          onClick={onCreateFirstOrder}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
        >
          <Plus className="w-3.5 h-3.5 ml-1" />
          إنشاء أول أمر تعيين
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="text-right text-xs font-black">رقم الأمر</TableHead>
            <TableHead className="text-right text-xs font-black">المرشح / الطلب</TableHead>
            <TableHead className="text-right text-xs font-black">المسمى والفرع</TableHead>
            <TableHead className="text-right text-xs font-black">النوع</TableHead>
            <TableHead className="text-right text-xs font-black">الحالة</TableHead>
            <TableHead className="text-right text-xs font-black">المسوغات</TableHead>
            <TableHead className="text-right text-xs font-black">الحزمة الشهرية</TableHead>
            <TableHead className="text-center text-xs font-black">الإجراءات والمباشرة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/60">
          {orders.map((order) => {
            const statusInfo = STATUS_BADGE_MAP[order.status] || STATUS_BADGE_MAP.pending_documents;
            const typeInfo = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.direct_hire;
            const TypeIcon = typeInfo.icon;
            const { completed: docsCount, total: docsTotal } = getChecklistCount(order.documents_checklist);

            return (
              <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-mono font-bold text-xs text-foreground">
                  <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">{order.order_number}</span>
                </TableCell>

                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-black text-xs text-foreground leading-tight">{order.candidate_name}</p>
                    {order.agency_name && (
                      <p className="text-[10px] text-purple-700 font-bold">مكتب: {order.agency_name}</p>
                    )}
                    {order.candidate_phone && (
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                        {order.candidate_phone}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-foreground">{order.job_title}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{order.target_branch || order.source_branch}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.color}`}>
                    <TypeIcon className="w-3 h-3" />
                    {typeInfo.label}
                  </span>
                </TableCell>

                <TableCell>
                  <button
                    onClick={() => onOpenStatusChange(order)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border transition-transform hover:scale-105 ${statusInfo.class}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </button>
                </TableCell>

                <TableCell>
                  <button
                    onClick={() => onOpenChecklist(order)}
                    className="text-right space-y-1 group hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground gap-2">
                      <span>المسوغات:</span>
                      <span className="font-black text-foreground">
                        {docsCount} / {docsTotal}
                      </span>
                    </div>
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(docsCount / docsTotal) * 100}%` }}
                      />
                    </div>
                  </button>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-black text-foreground font-mono">
                    {order.total_salary.toLocaleString()} <SARSymbol />
                  </div>
                  <span className="text-[9px] text-muted-foreground">شاملاً البدلات</span>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onOpenShare(order)}
                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      title="إرسال رابط المباشرة (WhatsApp / البريد)"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onOpenAiMatcher(order)}
                      className="h-8 w-8 text-purple-600 hover:bg-purple-50 rounded-lg"
                      title="عرض متقدمي الوظيفة"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenPrint(order)}
                      className="h-8 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold gap-1"
                      title="طباعة قرار التعيين الرسمي"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      طباعة
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onRequestDelete(order)}
                      className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                      title="حذف أمر التحويل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
