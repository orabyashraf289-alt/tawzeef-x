import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ErpSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookUrl: string;
  onChangeWebhookUrl: (url: string) => void;
  isPingingWebhook: boolean;
  onPingWebhook: () => void;
  onExportErp: () => void;
}

const SAMPLE_JSON_SCHEMA = `{
  "event": "order.completed",
  "order_number": "ORD-2026-001",
  "employee": {
    "name": "أحمد بن محمد القحطاني",
    "national_id": "1089345210",
    "position": "معلم لغة عربية",
    "branch": "مجمع بنين - الرياض",
    "basic_salary": 8500,
    "total_salary": 11500,
    "joining_date": "2026-09-01"
  }
}`;

export default function ErpSyncDialog({
  open,
  onOpenChange,
  webhookUrl,
  onChangeWebhookUrl,
  isPingingWebhook,
  onPingWebhook,
  onExportErp,
}: ErpSyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            تكامل أنظمة الموارد البشرية والـ ERP (Odoo / SAP / Qiwa)
          </DialogTitle>
          <DialogDescription className="text-xs">
            مزامنة أوامر التعيين المكتملة تلقائياً مع نظام الرواتب وشؤون الموظفين.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="font-bold">رابط الـ Webhook المباشر (ERP Sync Endpoint)</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => onChangeWebhookUrl(e.target.value)}
                className="text-xs font-mono rounded-xl h-9"
                dir="ltr"
              />
              <Button
                onClick={onPingWebhook}
                disabled={isPingingWebhook}
                className="bg-slate-900 text-white font-bold text-xs rounded-xl h-9 px-3"
              >
                {isPingingWebhook ? "جاري الفحص..." : "اختبار الربط ⚡"}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl space-y-2 border">
            <p className="font-black text-foreground">الحمولة الموحدة للبيانات (Standard JSON Schema):</p>
            <pre className="text-[10px] font-mono text-slate-600 bg-background p-2.5 rounded-lg border overflow-x-auto" dir="ltr">
              {SAMPLE_JSON_SCHEMA}
            </pre>
          </div>

          <Button
            onClick={onExportErp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            تنزيل كشف ERP / Qiwa الموحد (Excel)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
