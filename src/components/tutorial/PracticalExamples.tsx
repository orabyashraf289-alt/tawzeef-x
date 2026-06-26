import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle2, Briefcase, Users, UserCheck, ArrowRight } from "lucide-react";

const scenarios = [
  { key: "scenario1", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "scenario2", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "scenario3", icon: UserCheck, color: "text-violet-500", bg: "bg-violet-500/10" },
];

export default function PracticalExamples() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{t("tutorial.examples.title")}</h2>
      {scenarios.map((s, i) => (
        <motion.div key={s.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t(`tutorial.examples.${s.key}.title`)}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t(`tutorial.examples.${s.key}.desc`)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  {t("tutorial.howTo")}
                </p>
                <div className="space-y-2">
                  {t(`tutorial.examples.${s.key}.steps`).split("|").map((step, si) => (
                    <div key={si} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        {si + 1}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.trim()}</p>
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
