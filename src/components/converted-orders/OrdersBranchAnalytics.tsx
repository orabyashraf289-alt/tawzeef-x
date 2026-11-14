import { Download, TrendingUp } from "lucide-react";
import SARSymbol from "@/components/SARSymbol";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BranchOrderStats } from "./convertedOrdersConstants";

interface OrdersBranchAnalyticsProps {
  branchStats: BranchOrderStats[];
  onExportErp: () => void;
}

export default function OrdersBranchAnalytics({ branchStats, onExportErp }: OrdersBranchAnalyticsProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            متابعة الأوامر المسجلة حسب الفرع
          </h3>
          <p className="text-xs text-muted-foreground">
            نسبة الأوامر الجاهزة أو المكتملة من إجمالي الأوامر المسجلة. لا تمثل مستهدف احتياج معتمدًا.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onExportErp}
          className="text-xs font-bold rounded-xl gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
        >
          <Download className="w-3.5 h-3.5" />
          تصدير الأوامر المسجلة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {branchStats.map((bs) => (
          <Card key={bs.branch} className="rounded-2xl border border-border/80 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-foreground truncate max-w-[170px]" title={bs.branch}>
                {bs.branch}
              </span>
              <Badge
                variant="outline"
                className={
                  bs.fulfillmentPct >= 75
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                    : "bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                }
              >
                {bs.fulfillmentPct}% مكتمل
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                <span>الجاهز والمكتمل:</span>
                <span className="font-black text-foreground">
                  {bs.completed} / {bs.targetQuota} أمر
                </span>
              </div>
              <Progress value={bs.fulfillmentPct} className="h-2 rounded-full" />
            </div>

            <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50">
              <span>إجمالي الرواتب:</span>
              <span className="font-bold text-foreground font-mono">
                {bs.payroll.toLocaleString()} <SARSymbol />
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
