import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Rocket, Cpu, CheckCircle2, ArrowRight, Zap, Target, ShieldCheck, Compass, Bot, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AIStrategicRoadmapCardProps {
  onPromptClick: (promptText: string) => void;
}

export default function AIStrategicRoadmapCard({ onPromptClick }: AIStrategicRoadmapCardProps) {
  const [activeTab, setActiveTab] = useState<"current" | "roadmap" | "metrics">("roadmap");

  const currentFeatures = [
    { title: "التقييم الفوري ومطابقة المهارات", desc: "تحليل السيرة وتحديد التوافق المئوي ورادار المهارات", tag: "مُفعل ✅", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { title: "توليد الوصف الوظيفي والأسئلة", desc: "صياغة المتطلبات وأسئلة المقابلات التقييمية تلقائياً", tag: "مُفعل ✅", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { title: "الجدولة التلقائية وغرف Jitsi Meet", desc: "جدولة المقابلات وإنشاء روابط الفيديو وإرسال التقويم", tag: "مُفعل ✅", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { title: "الدردشة التفاعلية وبوابة المرشحين", desc: "الإجابة على الاستفسارات ومتابعة رمز التتبع 24/7", tag: "مُفعل ✅", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  ];

  const roadmapItems = [
    {
      quarter: "Q3 2026",
      title: "الترشيح التنبؤي ومؤشر البقاء (Predictive Retention Score)",
      desc: "تحليل احتمالية استمرار الموظف بالشركة وتوقع أدائه بناءً على بيانات التوظيف التاريخية.",
      prompt: "ما هو النموذج التنبؤي لفرص استمرار الموظف واستقراره الوظيفي؟",
      icon: Target,
      status: "جاري التطوير 🚀",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      quarter: "Q4 2026",
      title: "المُقابل الصوتي المستقل (Autonomous AI Voice Interviewer)",
      desc: "إجراء المقابلة الصوتية الأولى مع المرشح عبر الهاتف أو الويب، وتحليل الإجابات ونبرة الصوت فوراً.",
      prompt: "كيف سيتم إجراء المقابلات الصوتية المستقلة بواسطة الذكاء الاصطناعي؟",
      icon: Cpu,
      status: "مخطط مستقبلي 💡",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      quarter: "Q1 2027",
      title: "مؤشر الرواتب الذكي وسوق العمل (Market Salary Indexing)",
      desc: "ربط فوري بقواعد بيانات الرواتب بالسوق السعودي والخليجي للوظائف الشاغرة لتحديد النطاق الموصى به.",
      prompt: "ما هو متوسط الرواتب والمزايا الوظيفية الموصى بها لوظيفة مطور بالرياض؟",
      icon: Activity,
      status: "قيد البحث 🔬",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      quarter: "Q2 2027",
      title: "روبوت الواتساب التلقائي للتوظيف (24/7 WhatsApp AI Bot)",
      desc: "تواصل تلقائي شامل مع المرشحين عبر الواتساب لإكمال البيانات وتحديد المقابلات والإجابة التفاعلية.",
      prompt: "أخبرني كيف ستتم أتمتة التواصل والتتبع مع المرشحين عبر الواتساب",
      icon: Bot,
      status: "مخطط مستقبلي 💡",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-br from-card via-card/90 to-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden backdrop-blur-xl mb-4"
    >
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-primary/20 text-white shrink-0">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-foreground">خطة التطوير الإستراتيجية للمساعد الذكي</h2>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
                Tawzeef-X Horizon v2.5 🧠
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">خارطة طريق قدرات الذكاء الاصطناعي التوليدي والتحليلي المتقدم للنظام</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-muted/40 p-1 rounded-xl border border-border/40 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("roadmap")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === "roadmap" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Rocket className="w-3.5 h-3.5" />
            خارطة المستقبل
          </button>
          <button
            onClick={() => setActiveTab("current")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === "current" ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            الميزات المفعلة
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "roadmap" && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {roadmapItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-card/70 border border-border/50 hover:border-primary/40 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-md group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-extrabold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {item.quarter}
                      </span>
                      <Badge className={cn("text-[9px] border px-1.5 py-0.2 font-semibold", item.badgeColor)}>
                        {item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-foreground leading-tight">{item.title}</h3>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full mt-3 h-7 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1 justify-between"
                    onClick={() => onPromptClick(item.prompt)}
                  >
                    <span>استفسر عن الميزة 💬</span>
                    <ArrowRight className="w-3 h-3 rotate-180" />
                  </Button>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "current" && (
          <motion.div
            key="current"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {currentFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="bg-card/70 border border-border/50 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full border", feat.color)}>
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground">{feat.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
