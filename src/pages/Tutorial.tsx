import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Briefcase, Users, Calendar, BarChart3, Bot, Settings, Share2, FileText, Kanban, Target,
  PlayCircle, BookOpen, HelpCircle, Lightbulb, ArrowRight, Shield, Bell, UserCheck, Video,
  Mail, Globe, Zap, CheckCircle2, GitBranch, Keyboard, Layers, Trophy, Sparkles,
} from "lucide-react";
import PracticalExamples from "@/components/tutorial/PracticalExamples";
import KeyboardShortcuts from "@/components/tutorial/KeyboardShortcuts";
import UseCases from "@/components/tutorial/UseCases";
import FeatureVideos from "@/components/tutorial/FeatureVideos";
import AIGuide from "@/components/tutorial/AIGuide";

const features = [
  { icon: Briefcase, titleKey: "tutorial.feat.jobs.title", descKey: "tutorial.feat.jobs.desc", stepsKey: "tutorial.feat.jobs.steps", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { icon: Users, titleKey: "tutorial.feat.candidates.title", descKey: "tutorial.feat.candidates.desc", stepsKey: "tutorial.feat.candidates.steps", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { icon: Kanban, titleKey: "tutorial.feat.pipeline.title", descKey: "tutorial.feat.pipeline.desc", stepsKey: "tutorial.feat.pipeline.steps", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { icon: Calendar, titleKey: "tutorial.feat.interviews.title", descKey: "tutorial.feat.interviews.desc", stepsKey: "tutorial.feat.interviews.steps", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { icon: FileText, titleKey: "tutorial.feat.offers.title", descKey: "tutorial.feat.offers.desc", stepsKey: "tutorial.feat.offers.steps", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  { icon: Bot, titleKey: "tutorial.feat.ai.title", descKey: "tutorial.feat.ai.desc", stepsKey: "tutorial.feat.ai.steps", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { icon: BarChart3, titleKey: "tutorial.feat.reports.title", descKey: "tutorial.feat.reports.desc", stepsKey: "tutorial.feat.reports.steps", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { icon: Target, titleKey: "tutorial.feat.hiring.title", descKey: "tutorial.feat.hiring.desc", stepsKey: "tutorial.feat.hiring.steps", color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  { icon: Share2, titleKey: "tutorial.feat.share.title", descKey: "tutorial.feat.share.desc", stepsKey: "tutorial.feat.share.steps", color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  { icon: Settings, titleKey: "tutorial.feat.settings.title", descKey: "tutorial.feat.settings.desc", stepsKey: "tutorial.feat.settings.steps", color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" },
];

const quickStartSteps = [
  { icon: Briefcase, titleKey: "tutorial.qs.step1.title", descKey: "tutorial.qs.step1.desc" },
  { icon: Share2, titleKey: "tutorial.qs.step2.title", descKey: "tutorial.qs.step2.desc" },
  { icon: Users, titleKey: "tutorial.qs.step3.title", descKey: "tutorial.qs.step3.desc" },
  { icon: Calendar, titleKey: "tutorial.qs.step4.title", descKey: "tutorial.qs.step4.desc" },
  { icon: FileText, titleKey: "tutorial.qs.step5.title", descKey: "tutorial.qs.step5.desc" },
  { icon: CheckCircle2, titleKey: "tutorial.qs.step6.title", descKey: "tutorial.qs.step6.desc" },
];

const additionalFeatures = [
  { icon: Shield, titleKey: "tutorial.extra.roles.title", descKey: "tutorial.extra.roles.desc" },
  { icon: Bell, titleKey: "tutorial.extra.notifications.title", descKey: "tutorial.extra.notifications.desc" },
  { icon: UserCheck, titleKey: "tutorial.extra.portal.title", descKey: "tutorial.extra.portal.desc" },
  { icon: Video, titleKey: "tutorial.extra.video.title", descKey: "tutorial.extra.video.desc" },
  { icon: Mail, titleKey: "tutorial.extra.email.title", descKey: "tutorial.extra.email.desc" },
  { icon: Globe, titleKey: "tutorial.extra.multilang.title", descKey: "tutorial.extra.multilang.desc" },
  { icon: Zap, titleKey: "tutorial.extra.webhooks.title", descKey: "tutorial.extra.webhooks.desc" },
  { icon: PlayCircle, titleKey: "tutorial.extra.onboarding.title", descKey: "tutorial.extra.onboarding.desc" },
];

const faqKeys = [
  "tutorial.faq.q1", "tutorial.faq.q2", "tutorial.faq.q3", "tutorial.faq.q4",
  "tutorial.faq.q5", "tutorial.faq.q6", "tutorial.faq.q7", "tutorial.faq.q8",
];

export default function Tutorial() {
  const { t, locale } = useI18n();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/10 p-8 md:p-10"
        >
          <div className="absolute top-0 end-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 start-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-start space-y-3">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Sparkles className="w-5 h-5 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  {locale === "en" ? "User Guide" : "دليل المستخدم"}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {t("tutorial.title")}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-xl">
                {t("tutorial.subtitle")}
              </p>
            </div>

            {/* Welcome Video */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full md:w-[420px] shrink-0"
            >
              <div className="rounded-xl overflow-hidden shadow-lg border border-border/50">
                <video
                  src="/videos/tawzeef-x-tutorial-main.mp4"
                  controls
                  loop
                  playsInline
                  className="w-full aspect-video bg-black"
                  preload="metadata"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2 flex items-center gap-1 justify-center">
                <PlayCircle className="w-3 h-3" />
                {locale === "en" ? "Quick platform overview" : "نظرة سريعة على المنصة"}
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <TabsList className="flex-wrap h-auto gap-1 p-1.5 bg-muted/60 rounded-xl">
              <TabsTrigger value="overview" className="gap-1.5 rounded-lg"><PlayCircle className="w-4 h-4" />{t("tutorial.tab.overview")}</TabsTrigger>
              <TabsTrigger value="quickstart" className="gap-1.5 rounded-lg"><Zap className="w-4 h-4" />{t("tutorial.tab.quickstart")}</TabsTrigger>
              <TabsTrigger value="workflow" className="gap-1.5 rounded-lg"><GitBranch className="w-4 h-4" />{t("tutorial.tab.workflow")}</TabsTrigger>
              <TabsTrigger value="features" className="gap-1.5 rounded-lg"><BookOpen className="w-4 h-4" />{t("tutorial.tab.features")}</TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 rounded-lg"><Bot className="w-4 h-4" />{t("tutorial.tab.ai")}</TabsTrigger>
              <TabsTrigger value="examples" className="gap-1.5 rounded-lg"><Layers className="w-4 h-4" />{t("tutorial.tab.examples")}</TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-1.5 rounded-lg"><Keyboard className="w-4 h-4" />{t("tutorial.tab.shortcuts")}</TabsTrigger>
              <TabsTrigger value="usecases" className="gap-1.5 rounded-lg"><Trophy className="w-4 h-4" />{t("tutorial.tab.usecases")}</TabsTrigger>
              <TabsTrigger value="faq" className="gap-1.5 rounded-lg"><HelpCircle className="w-4 h-4" />{t("tutorial.tab.faq")}</TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ===== TAB: Overview ===== */}
          <TabsContent value="overview" className="space-y-8">
            {/* Platform Overview */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10"><Globe className="w-4 h-4 text-primary" /></div>
                    {t("tutorial.overview.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>{t("tutorial.overview.p1")}</p>
                  <p>{t("tutorial.overview.p2")}</p>
                  <p>{t("tutorial.overview.p3")}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Start Interactive Tour CTA */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-foreground">
                        {locale === "en" ? "Take the Interactive Walkthrough Tour" : "ابدأ الجولة الإرشادية التفاعلية للمنصة"}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                        {locale === "en" 
                          ? "Let our virtual assistant guide you through the screens of Tawzeef-X in a real-time, step-by-step interactive walkthrough." 
                          : "دع مساعدنا الافتراضي يأخذك في جولة حية سريعة لجميع شاشات النظام لتتعرف على الميزات والوظائف خطوة بخطوة."}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      localStorage.removeItem("tawzeef-x-tour-completed");
                      window.location.reload();
                    }}
                    className="gap-2 shrink-0 w-full sm:w-auto"
                  >
                    <Zap className="w-4 h-4" />
                    {locale === "en" ? "Start Interactive Tour" : "بدء الجولة التفاعلية"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Features Grid */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t("tutorial.extra.title")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {additionalFeatures.map((feat, i) => (
                  <motion.div key={feat.titleKey} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="h-full border-0 shadow-sm bg-card/80 hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-4 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <feat.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t(feat.titleKey)}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t(feat.descKey)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ===== TAB: Quick Start ===== */}
          <TabsContent value="quickstart" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-amber-500/10"><Zap className="w-4 h-4 text-amber-500" /></div>
                    {t("tutorial.qs.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{t("tutorial.qs.subtitle")}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {quickStartSteps.map((step, i) => (
                      <motion.div
                        key={step.titleKey}
                        initial={{ opacity: 0, x: locale === "ar" ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex gap-4 relative"
                      >
                        {i < quickStartSteps.length - 1 && (
                          <div className="absolute start-5 top-12 bottom-0 w-px bg-gradient-to-b from-primary/30 to-transparent" />
                        )}
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 z-10">
                          <step.icon className="w-5 h-5" />
                        </div>
                        <div className="pb-8">
                          <div className="flex items-center gap-2">
                            <Badge className="text-[10px] bg-primary/10 text-primary border-0 font-bold">{i + 1}</Badge>
                            <p className="text-sm font-semibold text-foreground">{t(step.titleKey)}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(step.descKey)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Tips */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border border-primary/15 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-1.5 rounded-lg bg-amber-500/10"><Lightbulb className="w-4 h-4 text-amber-500" /></div>
                    {t("tutorial.tips.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1,2,3,4,5,6].map(n => (
                      <div key={n} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{t(`tutorial.tips.tip${n}`)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== TAB: Workflow ===== */}
          <TabsContent value="workflow" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10"><GitBranch className="w-4 h-4 text-primary" /></div>
                    {t("tutorial.workflow.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{t("tutorial.workflow.subtitle")}</p>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {[1,2,3,4,5,6,7].map((n, i) => {
                      const icons = [Briefcase, Users, Bot, Kanban, Calendar, FileText, CheckCircle2];
                      const colors = [
                        "bg-blue-500/10 text-blue-500 border-blue-500/20",
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                        "bg-violet-500/10 text-violet-500 border-violet-500/20",
                        "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        "bg-rose-500/10 text-rose-500 border-rose-500/20",
                        "bg-green-500/10 text-green-500 border-green-500/20",
                      ];
                      const Icon = icons[i];
                      return (
                        <motion.div
                          key={n}
                          initial={{ opacity: 0, x: locale === "ar" ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex gap-4 relative"
                        >
                          {i < 6 && (
                            <div className="absolute start-6 top-14 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 to-transparent" />
                          )}
                          <div className={`w-12 h-12 rounded-xl border ${colors[i]} flex items-center justify-center shrink-0 z-10`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="pb-8 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="text-[10px] bg-primary/10 text-primary border-0 font-bold">{i + 1}</Badge>
                              <p className="text-sm font-semibold text-foreground">{t(`tutorial.workflow.step${n}.title`)}</p>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{t(`tutorial.workflow.step${n}.desc`)}</p>
                            {i < 6 && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-primary/60">
                                <ArrowRight className="w-3 h-3" />
                                <span>{t(`tutorial.workflow.step${n + 1}.title`)}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Flow summary */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm bg-muted/30">
                <CardContent className="py-6">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {[1,2,3,4,5,6,7].map((n, i) => (
                      <motion.div
                        key={n}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-2"
                      >
                        <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/15 whitespace-nowrap">
                          {t(`tutorial.workflow.step${n}.title`)}
                        </div>
                        {i < 6 && <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== TAB: Features ===== */}
          <TabsContent value="features" className="space-y-6">
            <FeatureVideos />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {t("tutorial.featuresTitle")}
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {features.map((feat, i) => (
                  <AccordionItem key={feat.titleKey} value={feat.titleKey} className={`border rounded-xl px-4 ${feat.border} bg-card/50`}>
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${feat.bg} ${feat.color}`}>
                          <feat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold">{t(feat.titleKey)}</span>
                        <Badge variant="outline" className="text-[10px] ms-1 opacity-60">{String(i + 1).padStart(2, "0")}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{t(feat.descKey)}</p>
                      <div className="bg-muted/40 rounded-xl p-4">
                        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          {t("tutorial.howTo")}
                        </p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {t(feat.stepsKey).split("|").map((step, si) => (
                            <li key={si} className="flex items-start gap-2">
                              <ArrowRight className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                              <span>{step.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>

          {/* ===== TAB: AI Guide ===== */}
          <TabsContent value="ai">
            <AIGuide />
          </TabsContent>

          {/* ===== TAB: Examples ===== */}
          <TabsContent value="examples">
            <PracticalExamples />
          </TabsContent>

          {/* ===== TAB: Shortcuts ===== */}
          <TabsContent value="shortcuts">
            <KeyboardShortcuts />
          </TabsContent>

          {/* ===== TAB: Use Cases ===== */}
          <TabsContent value="usecases">
            <UseCases />
          </TabsContent>

          {/* ===== TAB: FAQ ===== */}
          <TabsContent value="faq" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              {t("tutorial.faq.title")}
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqKeys.map((key) => (
                <AccordionItem key={key} value={key} className="border rounded-xl px-4 bg-card/50">
                  <AccordionTrigger className="hover:no-underline text-sm font-medium">
                    {t(`${key}.q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {t(`${key}.a`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
