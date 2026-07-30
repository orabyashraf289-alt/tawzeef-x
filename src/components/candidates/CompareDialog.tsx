import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { GitCompareArrows, X, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface CompareDialogProps {
  candidates: any[];
  onClose: () => void;
}

const getInitials = (name?: string | null) => {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

export default function CompareDialog({ candidates, onClose }: CompareDialogProps) {
  if (candidates.length < 2) return null;

  const fields = [
    { label: "الوظيفة", key: "role" },
    { label: "الخبرة", key: "experience" },
    { label: "التعليم", key: "education" },
    { label: "الحالة", key: "status" },
    { label: "المرحلة", key: "stage" },
    { label: "المصدر", key: "source" },
    { label: "التقييم", key: "rating" },
    { label: "تقييم AI", key: "ai_score" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto z-10"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-2xl z-20">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-primary" />
            مقارنة المرشحين ({candidates.length})
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground w-28">المعيار</th>
                  {candidates.map(c => (
                    <th key={c.id} className="py-3 px-3 text-center min-w-[150px]">
                      <Link to={`/candidates/${c.id}`} className="hover:text-primary transition-colors inline-block">
                        <Avatar className="w-10 h-10 mx-auto mb-2 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{getInitials(c.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-xs block truncate max-w-[140px] mx-auto">{c.name || "مرشح بدون اسم"}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f.key} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-3 text-xs font-medium text-muted-foreground">{f.label}</td>
                    {candidates.map(c => (
                      <td key={c.id} className="py-3 px-3 text-center text-xs font-semibold">
                        {f.key === "rating" ? (
                          <div className="flex items-center justify-center gap-0.5">
                            {c.rating ? (
                              Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < c.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        ) : f.key === "ai_score" ? (
                          c.ai_score != null ? (
                            <Badge variant="outline" className={c.ai_score >= 70 ? "bg-green-500/10 text-green-700" : c.ai_score >= 40 ? "bg-amber-500/10 text-amber-700" : "bg-destructive/10 text-destructive"}>
                              {c.ai_score} / 100
                            </Badge>
                          ) : <span className="text-muted-foreground">-</span>
                        ) : (
                          c[f.key] || <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
