import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Printer,
  FileDown,
} from "lucide-react";
import { QUALITY_REPORT, reportStatus, type QualityCheck } from "@/data/qualityReport";

const STATUS_META: Record<
  QualityCheck["status"],
  { icon: typeof CheckCircle2; tone: string; ar: string; en: string }
> = {
  pass: {
    icon: CheckCircle2,
    tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    ar: "ناجح",
    en: "Pass",
  },
  warn: {
    icon: AlertTriangle,
    tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    ar: "تحذير",
    en: "Warn",
  },
  fail: {
    icon: XCircle,
    tone: "text-red-600 bg-red-500/10 border-red-500/20",
    ar: "فشل",
    en: "Fail",
  },
};

export default function QualityReport() {
  const { locale, dir } = useI18n();
  const isAR = locale === "ar";

  const overall = useMemo(() => reportStatus(QUALITY_REPORT), []);
  const OverallIcon = STATUS_META[overall].icon;

  const generatedAt = new Date(QUALITY_REPORT.generatedAt);
  const generatedStr = generatedAt.toLocaleString(isAR ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <DashboardLayout>
      <div dir={dir} className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              {isAR ? "تقرير جودة الكود" : "Code Quality Report"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAR
                ? "ملخص تلقائي لنتائج TypeScript والاختبارات و Supabase Linter وفحص الأمان."
                : "Automated snapshot of TypeScript, tests, Supabase Linter, and security checks."}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${STATUS_META[overall].tone}`}
            >
              <OverallIcon className="w-5 h-5" />
              <div className="text-sm">
                <div className="font-semibold">
                  {isAR ? "الحالة الإجمالية" : "Overall"}: {isAR ? STATUS_META[overall].ar : STATUS_META[overall].en}
                </div>
                <div className="text-xs flex items-center gap-1 opacity-80">
                  <Clock className="w-3 h-3" /> {generatedStr}
                </div>
              </div>
            </div>
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="gap-2 h-10 px-3.5 text-xs font-bold rounded-xl"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>{isAR ? "طباعة التقرير" : "Print Report"}</span>
            </Button>
          </div>
        </div>

        {/* Refresh instructions */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {isAR ? "كيفية تحديث التقرير" : "How to refresh"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1 font-mono">
            <div>npx tsc --noEmit</div>
            <div>bunx vitest run</div>
            <div>supabase linter / security scan</div>
            <div className="pt-2 text-[11px] not-italic font-sans">
              {isAR
                ? "ثم حدّث القيم في الملف src/data/qualityReport.ts."
                : "Then update the values in src/data/qualityReport.ts."}
            </div>
          </CardContent>
        </Card>

        {/* Checks grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {QUALITY_REPORT.checks.map((c) => {
            const meta = STATUS_META[c.status];
            const Icon = meta.icon;
            return (
              <Card key={c.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {isAR ? c.label.ar : c.label.en}
                    </CardTitle>
                    <Badge variant="outline" className={`gap-1 ${meta.tone}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {isAR ? meta.ar : meta.en}
                    </Badge>
                  </div>
                  <code className="text-[11px] text-muted-foreground font-mono break-all">
                    {c.command}
                  </code>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground">
                    {isAR ? c.summary.ar : c.summary.en}
                  </p>
                  {c.details && (
                    <div className="text-xs font-mono bg-muted/50 rounded-md p-2 text-muted-foreground whitespace-pre-wrap break-words">
                      {c.details}
                    </div>
                  )}
                  {c.docsUrl && (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 text-primary hover:text-primary/80"
                    >
                      <a
                        href={c.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs"
                      >
                        {isAR ? "تفاصيل ومراجع" : "Details & docs"}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
