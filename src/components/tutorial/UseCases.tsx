import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { TrendingUp, Building2, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";

const cases = [
  { key: "case1", color: "border-blue-500/30", accent: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "case2", color: "border-emerald-500/30", accent: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "case3", color: "border-violet-500/30", accent: "text-violet-500", bg: "bg-violet-500/10" },
];

export default function UseCases() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{t("tutorial.usecases.title")}</h2>
      {cases.map((c, i) => (
        <motion.div key={c.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <Card className={`border-s-4 ${c.color}`}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.bg}`}>
                    <Building2 className={`w-5 h-5 ${c.accent}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t(`tutorial.usecases.${c.key}.company`)}</CardTitle>
                  </div>
                </div>
                <Badge variant="outline">{t(`tutorial.usecases.${c.key}.industry`)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">التحدي / Challenge</p>
                  <p className="text-sm text-muted-foreground">{t(`tutorial.usecases.${c.key}.challenge`)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">الحل / Solution</p>
                  <p className="text-sm text-muted-foreground">{t(`tutorial.usecases.${c.key}.solution`)}</p>
                </div>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  النتائج / Results
                </p>
                <div className="space-y-1.5">
                  {t(`tutorial.usecases.${c.key}.result`).split("|").map((r, ri) => (
                    <div key={ri} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">{r.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
