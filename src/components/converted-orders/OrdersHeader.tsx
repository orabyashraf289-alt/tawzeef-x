import { ArrowRightLeft, Download, FileCheck2, Handshake, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrdersHeaderProps {
  onOpenNewOrder: () => void;
  onOpenAgencyOrder: () => void;
  onOpenBranchTransfer: () => void;
  onOpenErpSync: () => void;
  onExportExcel: () => void;
}

export default function OrdersHeader({
  onOpenNewOrder,
  onOpenAgencyOrder,
  onOpenBranchTransfer,
  onOpenErpSync,
  onExportExcel,
}: OrdersHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card rounded-2xl border border-border/80 p-6 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              إدارة الطلبات وأوامر التعيين المحولة
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-xs font-bold">
                Converted Orders
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              منظومة إصدار قرارات التعيين، وبوابة مباشرة الموظف الذاتية، وتحليلات سد الاحتياج للفروع.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onOpenNewOrder}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-xs"
        >
          <Plus className="w-4 h-4" />
          أمر تعيين مباشر
        </Button>

        <Button
          onClick={onOpenAgencyOrder}
          variant="outline"
          className="gap-1.5 border-purple-500/30 hover:bg-purple-50 text-purple-700 font-bold h-10 rounded-xl"
        >
          <Handshake className="w-4 h-4 text-purple-600" />
          طلب استقدام وكالة
        </Button>

        <Button
          onClick={onOpenBranchTransfer}
          variant="outline"
          className="gap-1.5 border-blue-500/30 hover:bg-blue-50 text-blue-700 font-bold h-10 rounded-xl"
        >
          <ArrowRightLeft className="w-4 h-4 text-blue-600" />
          تحويل بين الفروع
        </Button>

        <Button
          onClick={onOpenErpSync}
          variant="outline"
          className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold h-10 rounded-xl"
          title="تكامل ERP و Qiwa"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          تكامل ERP
        </Button>

        <Button
          onClick={onExportExcel}
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl border border-border"
          title="تصدير Excel"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
