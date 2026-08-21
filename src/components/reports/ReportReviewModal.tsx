import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Printer,
  FileDown,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Filter,
  Eye,
  FileText,
  Building2,
  Users,
  Award,
  BarChart3,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrintableReportDocument, type PrintableReportData } from "./PrintableReportDocument";
import { exportReportElementToPdf } from "@/lib/reportPdfGenerator";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: PrintableReportData;
  locale?: string;
  onExportExcel?: () => void;
}

export default function ReportReviewModal({
  open,
  onOpenChange,
  reportData,
  locale = "ar",
  onExportExcel,
}: Props) {
  const isAr = locale !== "en";
  const { toast } = useToast();
  const documentRef = useRef<HTMLDivElement>(null);

  const [selectedReport, setSelectedReport] = useState<string>("all");
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeRecommendations, setIncludeRecommendations] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>("");

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!documentRef.current) return;
    setExportingPdf(true);

    try {
      const titleSlug = selectedReport === "all" ? "Comprehensive" : selectedReport;
      const filename = `TawzeefX-Report-${titleSlug}-${new Date().toISOString().slice(0, 10)}.pdf`;

      await exportReportElementToPdf(documentRef.current, {
        filename,
        scale: 2,
        onProgress: (_prog, stepText) => {
          setExportProgressText(stepText);
        },
      });

      toast({
        title: isAr ? "تم تصدير ملف PDF بنجاح 📄" : "PDF Exported Successfully 📄",
        description: isAr
          ? "تم حفظ التقرير التنفيذي بدقة عالية على جهازك."
          : "The executive report has been saved in high resolution.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: isAr ? "فشل تصدير PDF" : "PDF Export Failed",
        description: isAr ? "حدث خطأ أثناء معالجة المستند." : "An error occurred while generating PDF.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
      setExportProgressText("");
    }
  };

  const reportTitles: Record<string, { ar: string; en: string }> = {
    all: { ar: "التقرير التنفيذي الشامل (كافة الأقسام والمؤشرات)", en: "Comprehensive Executive Audit Report" },
    overview: { ar: "تقرير مؤشرات الأداء الرئيسية والملخص (KPIs)", en: "Executive KPIs & Performance Summary" },
    pipeline: { ar: "تقرير مسار التوظيف والفرز (Pipeline & Funnel)", en: "Recruitment Pipeline & Conversion Funnel" },
    branches: { ar: "تقرير أداء ومقارنة الفروع (Branch Benchmark)", en: "Branch & Regional Performance Report" },
    departments: { ar: "تقرير التوزيع حسب الأقسام (Department Analysis)", en: "Department Allocation & Job Breakdown" },
    sources: { ar: "تقرير مصادر الاستقطاب وقنوات التوظيف (Sources)", en: "Candidate Source Attribution Report" },
    offers: { ar: "تقرير العروض الوظيفية والرواتب (Offers & Salaries)", en: "Job Offers, Acceptance & Salaries" },
  };

  const currentTitle = isAr
    ? reportTitles[selectedReport]?.ar || "التقرير التنفيذي"
    : reportTitles[selectedReport]?.en || "Executive Report";

  const enrichedData: PrintableReportData = {
    ...reportData,
    reportTitle: currentTitle,
    includeSignatures,
    includeRecommendations,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white shadow-2xl rounded-2xl">
        {/* ==================================================================== */}
        {/* MODAL TOOLBAR / HEADER */}
        {/* ==================================================================== */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <span>{isAr ? "مركز مراجعة وطباعة التقارير" : "Report Review & Print Center"}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {isAr ? "A4 جاهز" : "A4 Ready"}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {isAr
                  ? "معاينة حية للمستندات التنفيذية مع خيارات الطباعة والتصدير بدقة عالية"
                  : "Live preview of executive reports with high-resolution print & PDF export"}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 hover:text-white"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                title={isAr ? "تصغير" : "Zoom Out"}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono font-bold px-2 text-slate-300 min-w-[40px] text-center">
                {zoomLevel}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 hover:text-white"
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                title={isAr ? "تكبير" : "Zoom In"}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={() => setZoomLevel(100)}
                title={isAr ? "إعادة الضبط" : "Reset Zoom"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Print Button */}
            <Button
              onClick={handlePrint}
              variant="outline"
              className="gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white font-bold h-9 px-3.5 text-xs rounded-xl shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? "طباعة فورية" : "Print Report"}</span>
            </Button>

            {/* Export PDF Button */}
            <Button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 text-xs rounded-xl shadow-md"
            >
              {exportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>
                {exportingPdf
                  ? exportProgressText || (isAr ? "جاري التصدير..." : "Exporting...")
                  : isAr
                  ? "تصدير PDF عالي الدقة"
                  : "Download PDF"}
              </span>
            </Button>

            {onExportExcel && (
              <Button
                onClick={onExportExcel}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-white rounded-xl"
                title={isAr ? "تصدير Excel" : "Export Excel"}
              >
                <Download className="w-4 h-4 text-emerald-400" />
              </Button>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* FILTER & CUSTOMIZATION SUB-BAR */}
        {/* ==================================================================== */}
        <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">{isAr ? "نوع التقرير المعروض:" : "Report Scope:"}</span>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className="w-[280px] h-8 text-xs bg-slate-900 border-slate-700 text-white rounded-lg">
                  <SelectValue placeholder={isAr ? "اختر نوع التقرير" : "Select Report"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
                  <SelectItem value="all">🌟 {isAr ? "التقرير التنفيذي الشامل (All-in-One)" : "Comprehensive Executive Report"}</SelectItem>
                  <SelectItem value="overview">📊 {isAr ? "المؤشرات الرئيسية والملخص (KPIs)" : "Key Performance Indicators"}</SelectItem>
                  <SelectItem value="pipeline">👥 {isAr ? "مسار مراحل التوظيف (Pipeline Funnel)" : "Recruitment Funnel"}</SelectItem>
                  <SelectItem value="branches">🏢 {isAr ? "مقارنة أداء الفروع (Branches)" : "Branch Performance"}</SelectItem>
                  <SelectItem value="departments">💼 {isAr ? "التوزيع حسب الأقسام (Departments)" : "Department Breakdown"}</SelectItem>
                  <SelectItem value="sources">🌐 {isAr ? "مصادر الاستقطاب (Sources)" : "Candidate Sources"}</SelectItem>
                  <SelectItem value="offers">🏆 {isAr ? "العروض الوظيفية والرواتب (Offers)" : "Offers & Compensation"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="modal-sig-toggle"
                checked={includeSignatures}
                onCheckedChange={setIncludeSignatures}
                className="data-[state=checked]:bg-emerald-600 scale-75"
              />
              <Label htmlFor="modal-sig-toggle" className="text-xs text-slate-300 cursor-pointer">
                {isAr ? "خانات التوقيع والاعتماد" : "Signatures"}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="modal-rec-toggle"
                checked={includeRecommendations}
                onCheckedChange={setIncludeRecommendations}
                className="data-[state=checked]:bg-emerald-600 scale-75"
              />
              <Label htmlFor="modal-rec-toggle" className="text-xs text-slate-300 cursor-pointer">
                {isAr ? "التوصيات الاستراتيجية" : "Recommendations"}
              </Label>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* DOCUMENT PREVIEW CONTAINER (SCROLLABLE & ZOOMABLE) */}
        {/* ==================================================================== */}
        <div className="flex-1 bg-slate-950/80 p-4 sm:p-8 overflow-auto flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="w-full flex justify-center"
          >
            <PrintableReportDocument
              ref={documentRef}
              data={enrichedData}
              locale={locale}
              selectedReportKey={selectedReport}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
