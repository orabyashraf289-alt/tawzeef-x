import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearRecordedRuntimeErrors,
  collectNavigationTiming,
  getRecordedRuntimeErrors,
  inspectClientStorageFootprint,
  probeDatabaseLatency,
  type DbLatencyProbeResult,
  type RuntimeErrorEvent,
} from "@/lib/systemHealthMonitor";
import { cn } from "@/lib/utils";

interface SystemHealthMonitorPanelProps {
  locale?: string;
}

export default function SystemHealthMonitorPanel({ locale = "ar" }: SystemHealthMonitorPanelProps) {
  const isAr = locale === "ar";
  const [probing, setProbing] = useState(false);
  const [dbProbe, setDbProbe] = useState<DbLatencyProbeResult | null>(null);
  const [vitals, setVitals] = useState(() => collectNavigationTiming());
  const [storage, setStorage] = useState(() => inspectClientStorageFootprint());
  const [errors, setErrors] = useState<RuntimeErrorEvent[]>(() => getRecordedRuntimeErrors());

  const runProbe = useCallback(async () => {
    setProbing(true);
    const result = await probeDatabaseLatency();
    setDbProbe(result);
    setVitals(collectNavigationTiming());
    setStorage(inspectClientStorageFootprint());
    setErrors(getRecordedRuntimeErrors());
    setProbing(false);
  }, []);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  const handleClearErrors = () => {
    clearRecordedRuntimeErrors();
    setErrors([]);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {isAr ? "مراقبة صحة النظام وقاعدة البيانات الحية" : "Live System Health & DB Latency Monitor"}
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {isAr
              ? "فحص حي لزمن استجابة قاعدة البيانات Supabase، مؤشرات التحميل، طابور المزامنة، وتنبيهات الأخطاء."
              : "Live Supabase round-trip latency, Web Vitals timing, offline sync queue, and runtime alerts."}
          </CardDescription>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void runProbe()}
          disabled={probing}
          className="gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", probing && "animate-spin")} />
          {isAr ? "فحص حي الآن" : "Probe Now"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 4 Live Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-semibold">
                <Database className="w-3.5 h-3.5 text-primary" />
                {isAr ? "استجابة Supabase DB" : "Supabase DB Latency"}
              </span>
              {dbProbe && (
                <Badge
                  variant={dbProbe.status === "healthy" ? "default" : "destructive"}
                  className={cn(
                    "text-[10px]",
                    dbProbe.status === "healthy" && "bg-emerald-600 text-white",
                  )}
                >
                  {dbProbe.status === "healthy"
                    ? isAr
                      ? "ممتاز"
                      : "Healthy"
                    : dbProbe.status === "degraded"
                    ? isAr
                      ? "بطيء"
                      : "Degraded"
                    : isAr
                    ? "حرج"
                    : "Critical"}
                </Badge>
              )}
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {dbProbe ? `${dbProbe.latencyMs} ms` : "—"}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Gauge className="w-3.5 h-3.5 text-blue-500" />
              {isAr ? "زمن أول بايت (TTFB)" : "Time to First Byte"}
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {vitals.ttfbMs !== null ? `${vitals.ttfbMs} ms` : "—"}
            </div>
            <p className="text-[10px] text-muted-foreground">
              DOM Interactive: {vitals.domInteractiveMs !== null ? `${vitals.domInteractiveMs} ms` : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
              {isAr ? "التخزين المحلي والمزامنة" : "Client Cache & Offline Queue"}
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {(storage.estimatedBytes / 1024).toFixed(1)} KB
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isAr
                ? `${storage.localStorageKeys} مفاتيح • ${storage.offlinePendingActions} بانتظار المزامنة`
                : `${storage.localStorageKeys} keys • ${storage.offlinePendingActions} queued`}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {errors.length === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
                {isAr ? "تنبيهات الأخطاء المسجلة" : "Recorded Runtime Alerts"}
              </span>
              {errors.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearErrors}
                  className="text-[10px] text-destructive hover:underline inline-flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                  {isAr ? "مسح" : "Clear"}
                </button>
              )}
            </div>
            <div className="text-2xl font-black font-mono text-foreground">{errors.length}</div>
            <p className="text-[10px] text-muted-foreground">
              {errors.length === 0
                ? isAr
                  ? "لا توجد أخطاء تشغيلية مسجلة"
                  : "Zero runtime errors captured"
                : errors[0].message.slice(0, 48)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
