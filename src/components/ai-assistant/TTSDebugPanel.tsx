import { useState } from "react";
import { Bug, Trash2, X, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSpeechService } from "@/hooks/useSpeechService";
import { cn } from "@/lib/utils";

export default function TTSDebugPanel() {
  const svc = useSpeechService();
  const [open, setOpen] = useState(false);

  const counts = svc.logs.reduce(
    (acc, l) => {
      acc[l.outcome] = (acc[l.outcome] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1 relative"
          title="سجل أحداث القراءة الصوتية"
        >
          <Bug className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">سجل TTS</span>
          {svc.logs.length > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
              {svc.logs.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            سجل القراءة الصوتية (TTS)
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 py-3 border-b text-xs">
          <Badge variant={svc.elevenLabsBlocked ? "destructive" : "secondary"}>
            ElevenLabs: {svc.elevenLabsBlocked ? "محظور" : "متاح"}
          </Badge>
          <Badge variant="outline">المزود الفعّال: {svc.activeProvider === "browser" ? "المتصفح" : "ElevenLabs"}</Badge>
          <Badge variant="outline">الحالة: {svc.status}</Badge>
        </div>

        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <span className="text-green-600">نجاح: {counts.success || 0}</span>
            <span className="text-amber-600">احتياطي: {counts.fallback || 0}</span>
            <span className="text-destructive">خطأ: {counts.error || 0}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => svc.clearLogs()}
            disabled={svc.logs.length === 0}
            className="h-7 text-xs gap-1"
          >
            <Trash2 className="w-3 h-3" /> مسح
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {svc.logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              لا توجد أحداث بعد. اضغط زر الاستماع على أي رسالة لتسجيل النشاط.
            </p>
          ) : (
            <div className="space-y-2 pb-4">
              {svc.logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "p-3 rounded-lg border text-xs space-y-1",
                    log.outcome === "success" && "border-green-500/30 bg-green-500/5",
                    log.outcome === "fallback" && "border-amber-500/30 bg-amber-500/5",
                    log.outcome === "error" && "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {log.outcome === "success" && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                      {log.outcome === "fallback" && <RotateCw className="w-3 h-3 text-amber-600" />}
                      {log.outcome === "error" && <AlertCircle className="w-3 h-3 text-destructive" />}
                      <span className="font-medium">
                        {log.provider === "elevenlabs" ? "ElevenLabs" : log.provider === "browser" ? "متصفح" : "غير معروف"}
                      </span>
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">{log.outcome}</Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {log.durationMs ? `${log.durationMs}ms` : ""}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2" dir="rtl">"{log.textPreview}..."</p>
                  {log.error && (
                    <p className="text-destructive text-[11px] font-mono break-words">{log.error}</p>
                  )}
                  {log.details && (
                    <details className="text-[10px] text-muted-foreground">
                      <summary className="cursor-pointer">تفاصيل</summary>
                      <pre className="whitespace-pre-wrap break-all mt-1">{log.details}</pre>
                    </details>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString("ar-SA")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
