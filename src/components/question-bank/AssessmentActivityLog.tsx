import { useState } from "react";
import { readProctoringLog } from "@/lib/assessmentResponseData";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  visibility_hidden: "مغادرة التبويب",
  visibility_visible: "العودة إلى التبويب",
  blur: "فقدان تركيز النافذة",
  focus: "العودة إلى النافذة",
  copy: "نسخ",
  cut: "قص",
  paste: "لصق",
  contextmenu: "فتح القائمة السياقية",
  fullscreen_exit: "الخروج من ملء الشاشة",
  fullscreenExit: "الخروج من ملء الشاشة",
};
export default function AssessmentActivityLog(
  { log, tabSwitches }: { log: unknown; tabSwitches?: number | null },
) {
  const [expanded, setExpanded] = useState(false);
  const parsed = readProctoringLog(log);
  const events = parsed?.events || [];
  const recordedSwitches = parsed?.counters.visibility ?? tabSwitches;
  return (
    <section className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold">سجل نشاط جلسة الاختبار</h3>
      <p className="text-xs text-muted-foreground">
        أحداث مسجلة للمراجعة البشرية. مغادرة التبويب لا تثبت الغش، وغياب الأحداث لا
        يثبت النزاهة. لا تعتمد عليها وحدها في قرار التوظيف.
      </p>
      {typeof recordedSwitches === "number" &&
        Number.isFinite(recordedSwitches) && (
        <p className="text-sm">مغادرات التبويب المسجلة: {recordedSwitches}</p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "إخفاء السجل" : "عرض الأحداث المسجلة"}
      </Button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
          {events.length === 0
            ? <p>لا توجد تفاصيل أحداث مسجلة.</p>
            : events.map((event, index) => (
              <p key={index}>
                {Number.isFinite(new Date(event.time).getTime())
                  ? new Date(event.time).toLocaleString("ar-EG")
                  : "وقت غير متاح"} — {labels[event.type] || event.type}
              </p>
            ))}
        </div>
      )}
    </section>
  );
}
