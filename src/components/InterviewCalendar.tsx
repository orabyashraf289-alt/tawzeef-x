import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Interview {
  id: string;
  date: string;
  time: string;
  candidate_name: string;
  position: string;
  status: string;
}

interface Props {
  interviews: Interview[];
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

const DAY_NAMES = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function InterviewCalendar({ interviews, onSelectDate, selectedDate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const interviewsByDate = useMemo(() => {
    const map: Record<string, Interview[]> = {};
    interviews.forEach(i => {
      if (!map[i.date]) map[i.date] = [];
      map[i.date].push(i);
    });
    return map;
  }, [interviews]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          {MONTH_NAMES[month]} {year}
        </h3>
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayInterviews = interviewsByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasScheduled = dayInterviews.some(i => i.status === "مجدولة");
          const hasCompleted = dayInterviews.some(i => i.status === "مكتملة");

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "relative h-10 rounded-lg text-xs font-medium transition-all",
                isSelected ? "bg-primary text-primary-foreground shadow-sm" :
                isToday ? "bg-accent text-accent-foreground font-bold" :
                "hover:bg-muted/50 text-foreground"
              )}
            >
              {day}
              {dayInterviews.length > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {hasScheduled && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground/80" : "bg-info")} />}
                  {hasCompleted && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground/60" : "bg-success")} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
