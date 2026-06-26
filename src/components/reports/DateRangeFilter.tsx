import { useState } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  locale: string;
  dir: string;
}

const presets = (locale: string) => [
  { label: locale === "en" ? "Last 7 days" : "آخر ٧ أيام", range: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: locale === "en" ? "Last 30 days" : "آخر ٣٠ يوم", range: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: locale === "en" ? "Last 3 months" : "آخر ٣ أشهر", range: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: locale === "en" ? "This month" : "هذا الشهر", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: locale === "en" ? "Last month" : "الشهر الماضي", range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: locale === "en" ? "This year" : "هذا العام", range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: locale === "en" ? "All time" : "كل الفترات", range: () => ({ from: undefined, to: undefined }) },
];

export default function DateRangeFilter({ dateRange, onDateRangeChange, locale, dir }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const dateLocale = locale === "en" ? enUS : ar;
  const allPresets = presets(locale);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return format(date, "d MMM yyyy", { locale: dateLocale });
  };

  const displayText = dateRange.from && dateRange.to
    ? `${formatDate(dateRange.from)} — ${formatDate(dateRange.to)}`
    : dateRange.from
      ? `${locale === "en" ? "From" : "من"} ${formatDate(dateRange.from)}`
      : locale === "en" ? "All time" : "كل الفترات";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between gap-2 min-w-[240px] h-10 border-border/60 bg-card hover:bg-muted/50 font-normal",
            !dateRange.from && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm truncate">{displayText}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={dir === "rtl" ? "end" : "start"} sideOffset={8}>
        <div className="flex flex-col sm:flex-row">
          {/* Presets */}
          <div className="border-b sm:border-b-0 sm:border-e border-border/50 p-2 space-y-0.5 min-w-[160px]">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
              {locale === "en" ? "Quick Select" : "اختيار سريع"}
            </p>
            {allPresets.map((preset, i) => (
              <button
                key={i}
                onClick={() => {
                  onDateRangeChange(preset.range());
                  setOpen(false);
                }}
                className="w-full text-start px-3 py-1.5 text-sm rounded-md hover:bg-muted/60 transition-colors text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground px-3 pb-1">
                  {locale === "en" ? "From" : "من"}
                </p>
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                  locale={dateLocale}
                  className="p-2 pointer-events-auto"
                  disabled={(date) => dateRange.to ? date > dateRange.to : false}
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground px-3 pb-1">
                  {locale === "en" ? "To" : "إلى"}
                </p>
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
                  locale={dateLocale}
                  className="p-2 pointer-events-auto"
                  disabled={(date) => dateRange.from ? date < dateRange.from : false}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
