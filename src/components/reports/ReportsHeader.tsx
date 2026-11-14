import { motion } from "framer-motion";
import { BarChart3, Download, FileDown, Filter, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DateRangeFilter, { type DateRange } from "./DateRangeFilter";

interface ReportsHeaderProps {
  title: string;
  subtitle: string;
  exportExcelLabel: string;
  locale: string;
  dir: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onOpenReviewModal: () => void;
  onExportExcel: () => void;
}

export function ReportsHeader({
  title,
  subtitle,
  exportExcelLabel,
  locale,
  dir,
  dateRange,
  onDateRangeChange,
  onOpenReviewModal,
  onExportExcel,
}: ReportsHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md3-full bg-md-primary-container text-md-on-primary-container text-xs font-bold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>مركز التقارير ومؤشرات الأداء التنفيذية</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">{title}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            onClick={onOpenReviewModal}
            className="gap-2 rounded-md3-xl bg-md-primary text-md-on-primary hover:bg-md-primary/90 h-10 px-4 text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>
              {locale === "en" ? "Review & Print Reports" : "مراجعة وطباعة التقارير 🖨️"}
            </span>
          </Button>
          <Button
            onClick={onOpenReviewModal}
            variant="outline"
            className="gap-2 rounded-md3-xl border-md-outline-variant h-10 px-4 text-xs font-bold"
          >
            <FileDown className="w-4 h-4 text-primary" />
            <span>{locale === "en" ? "Export PDF" : "تصدير PDF 📄"}</span>
          </Button>
          <Button
            onClick={onExportExcel}
            variant="outline"
            className="gap-2 rounded-md3-xl border-md-outline-variant h-10 px-4 text-xs font-bold"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>{exportExcelLabel}</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-md-surface-container p-2.5 rounded-md3-2xl border border-md-outline-variant shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Filter className="w-4 h-4 text-primary" />
          <span>{locale === "en" ? "Date Range:" : "الفترة الزمنية:"}</span>
        </div>
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          locale={locale}
          dir={dir}
        />
        {(dateRange.from || dateRange.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
            className="gap-1.5 text-xs text-rose-500 hover:text-rose-600 rounded-md3-full h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {locale === "en" ? "Reset" : "إعادة ضبط"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
