import { DollarSign, Handshake, Layers, Users } from "lucide-react";
import SARSymbol from "@/components/SARSymbol";
import { Card, CardContent } from "@/components/ui/card";
import type { OrdersStatsSummary } from "./convertedOrdersConstants";

export default function OrdersKpiCards({ stats }: { stats: OrdersStatsSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 text-right">
            <span className="text-xs font-bold text-muted-foreground">إجمالي الأوامر</span>
            <p className="text-2xl font-black text-foreground">{stats.total}</p>
            <span className="text-[10px] text-emerald-600 font-bold block">{stats.readyOrCompleted} جاهز/مكتمل</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 text-right">
            <span className="text-xs font-bold text-muted-foreground">قرارات التعيين المباشرة</span>
            <p className="text-2xl font-black text-emerald-700">{stats.directHire}</p>
            <span className="text-[10px] text-muted-foreground">مرشحون من المنصة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 text-right">
            <span className="text-xs font-bold text-muted-foreground">أوامر استقدام الوكالات</span>
            <p className="text-2xl font-black text-purple-700">{stats.agencyFulfillment}</p>
            <span className="text-[10px] text-purple-600 font-bold">مكاتب معتمدة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Handshake className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-sm transition-all">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 text-right">
            <span className="text-xs font-bold text-muted-foreground">كتلة الرواتب المحولة</span>
            <p className="text-xl font-black text-foreground font-mono">
              {stats.totalPayroll.toLocaleString()} <SARSymbol />
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">شهرياً للفروع</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
