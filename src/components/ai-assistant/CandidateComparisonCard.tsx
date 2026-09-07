import { motion } from "framer-motion";
import { Sparkles, User, Star, CalendarCheck, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ComparisonCandidate {
  id: string;
  name: string;
  role: string;
  rating: number;
  matchScore: number;
  experience: string;
  skills: string[];
  education: string;
  summary: string;
  matchAnalysis: string;
}

export interface CandidateComparisonData {
  jobTitle?: string;
  candidates: ComparisonCandidate[];
}

export default function CandidateComparisonCard({
  comparison,
  onActionClick
}: {
  comparison: CandidateComparisonData;
  onActionClick: (text: string) => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="font-bold text-sm text-foreground">
            مقارنة المرشحين الذكية {comparison.jobTitle && `لـ: ${comparison.jobTitle}`}
          </h3>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
          تحليل الذكاء الاصطناعي
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparison.candidates.map((c) => (
          <div 
            key={c.id} 
            className="p-4 rounded-xl border border-border/50 bg-card/65 hover:bg-card hover:border-primary/30 transition-all duration-300 flex flex-col justify-between shadow-sm relative overflow-hidden group"
          >
            {/* Top match score badge */}
            <div className="absolute top-3 left-3 bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{c.matchScore}% توافق</span>
            </div>

            <div className="space-y-3">
              {/* Profile header */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{c.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{c.role}</p>
                </div>
              </div>

              {/* Star Rating & Experience */}
              <div className="flex items-center gap-4 text-[10px] font-semibold text-muted-foreground border-y border-border/20 py-2">
                <div className="flex items-center gap-1">
                  <span className="text-amber-500 flex">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star 
                        key={idx} 
                        className={cn("w-3 h-3", idx < c.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30")} 
                      />
                    ))}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-foreground/80">الخبرة:</span>
                  <span className="font-bold text-foreground">{c.experience}</span>
                </div>
              </div>

              {/* Match Score Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                  <span>نسبة مطابقة المتطلبات</span>
                  <span className="text-primary">{c.matchScore}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${c.matchScore}%` }}
                  />
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground block">المهارات الرئيسية:</span>
                <div className="flex flex-wrap gap-1">
                  {c.skills && c.skills.length > 0 ? (
                    c.skills.slice(0, 4).map((skill, sIdx) => (
                      <span key={sIdx} className="text-[9px] bg-muted/65 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-muted-foreground italic">لا توجد مهارات مسجلة</span>
                  )}
                  {c.skills && c.skills.length > 4 && (
                    <span className="text-[9px] text-muted-foreground/60 font-semibold px-1 py-0.5">
                      +{c.skills.length - 4} أخرى
                    </span>
                  )}
                </div>
              </div>

              {/* Match Analysis */}
              <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg leading-relaxed border border-border/20">
                {c.matchAnalysis}
              </p>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex gap-2 border-t border-border/30 pt-3 mt-3 w-full">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[10px] h-7 gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-bold"
                onClick={() => onActionClick(`جدول مقابلة مع ${c.name} لوظيفة ${comparison.jobTitle || c.role}`)}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                جدولة مقابلة
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[10px] h-7 gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-bold"
                onClick={() => onActionClick(`أرسل بريداً إلكترونياً إلى ${c.name} لإبلاغه بالتوافق المبدئي`)}
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                إرسال بريد
              </Button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
