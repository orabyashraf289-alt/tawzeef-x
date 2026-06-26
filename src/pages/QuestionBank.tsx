import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, ClipboardList, BarChart3, LayoutTemplate, HelpCircle } from "lucide-react";
import QuestionsList from "@/components/question-bank/QuestionsList";
import AssessmentsList from "@/components/question-bank/AssessmentsList";
import AssessmentAnalytics from "@/components/question-bank/AssessmentAnalytics";
import QuestionTemplates from "@/components/question-bank/QuestionTemplates";
import { motion } from "framer-motion";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } }
};

export default function QuestionBank() {
  const { t, dir } = useI18n();
  const [tab, setTab] = useState("questions");

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 select-none min-h-screen"
        dir={dir}
      >
        
        {/* Ambient Decorative Background Glows */}
        <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full filter blur-[100px] pointer-events-none dark:bg-primary/5" />
        <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none dark:bg-indigo-500/5" />

        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-sm animate-pulse">
                <HelpCircle className="w-6.5 h-6.5" />
              </div>
              <span>{t("qbank.title")}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-2xl leading-relaxed">
              {t("qbank.subtitle")}
            </p>
          </div>
        </motion.div>

        {/* Tabs section with glass styling */}
        <motion.div variants={itemVariants} className="relative z-10">
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="bg-card/40 backdrop-blur-xl border border-border/40 p-1 rounded-xl shadow-lg inline-flex w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="questions" className="gap-2.5 font-bold rounded-lg text-xs py-2.5 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <BookOpen className="h-4 w-4" />
                {t("qbank.questions")}
              </TabsTrigger>
              <TabsTrigger value="assessments" className="gap-2.5 font-bold rounded-lg text-xs py-2.5 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <ClipboardList className="h-4 w-4" />
                {t("qbank.assessments")}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2.5 font-bold rounded-lg text-xs py-2.5 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4" />
                {t("qbank.analytics")}
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2.5 font-bold rounded-lg text-xs py-2.5 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <LayoutTemplate className="h-4 w-4" />
                {t("qbank.templates")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
              <QuestionsList />
            </TabsContent>
            <TabsContent value="assessments" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
              <AssessmentsList />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
              <AssessmentAnalytics />
            </TabsContent>
            <TabsContent value="templates" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
              <QuestionTemplates />
            </TabsContent>
          </Tabs>
        </motion.div>

      </motion.div>
    </DashboardLayout>
  );
}
