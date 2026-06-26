import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Bot, Users, Video, TrendingUp, FileText, Shield, Briefcase, BarChart3,
  Calendar, MessageSquare, Star, Zap, Globe, Bell, Code, Mail,
  ArrowLeft, ArrowRight, CheckCircle2, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/marketing/SEO";
import { useI18n } from "@/contexts/I18nContext";

const featureGroups = [
  {
    titleAr: "الذكاء الاصطناعي",
    titleEn: "Artificial Intelligence",
    items: [
      { icon: Bot, ar: "تقييم تلقائي للمرشحين", en: "Automatic candidate scoring" },
      { icon: Sparkles, ar: "توليد وصف الوظائف بالـ AI", en: "AI-generated job descriptions" },
      { icon: MessageSquare, ar: "مساعد ذكي للمرشحين", en: "AI candidate chatbot" },
      { icon: Mail, ar: "تحليل المشاعر في الردود", en: "Sentiment analysis on replies" },
    ],
  },
  {
    titleAr: "إدارة المرشحين",
    titleEn: "Candidate Management",
    items: [
      { icon: Users, ar: "Kanban Board متقدم", en: "Advanced Kanban board" },
      { icon: Star, ar: "قاعدة مواهب مع وسوم", en: "Talent pool with tags" },
      { icon: FileText, ar: "تحليل السير الذاتية", en: "Resume parsing" },
      { icon: TrendingUp, ar: "تتبع المراحل والتاريخ", en: "Stage tracking & history" },
    ],
  },
  {
    titleAr: "المقابلات",
    titleEn: "Interviews",
    items: [
      { icon: Video, ar: "غرف فيديو مدمجة", en: "Built-in video rooms" },
      { icon: Calendar, ar: "حجز مقابلات ذاتي", en: "Self-service booking" },
      { icon: Code, ar: "تسجيل ونسخ نصي", en: "Recording & transcription" },
      { icon: CheckCircle2, ar: "تقييمات مفصّلة", en: "Detailed evaluations" },
    ],
  },
  {
    titleAr: "العروض الوظيفية",
    titleEn: "Job Offers",
    items: [
      { icon: FileText, ar: "عروض رقمية احترافية", en: "Professional digital offers" },
      { icon: Shield, ar: "توقيع إلكتروني آمن", en: "Secure e-signature" },
      { icon: Bell, ar: "إشعارات استجابة فورية", en: "Real-time response alerts" },
      { icon: Briefcase, ar: "PDF قابل للتصدير", en: "Exportable PDF" },
    ],
  },
  {
    titleAr: "التقارير والتحليلات",
    titleEn: "Reports & Analytics",
    items: [
      { icon: BarChart3, ar: "لوحات تحكم تفاعلية", en: "Interactive dashboards" },
      { icon: TrendingUp, ar: "مؤشرات KPI للتوظيف", en: "Hiring KPI metrics" },
      { icon: FileText, ar: "تصدير PDF & Excel", en: "PDF & Excel export" },
      { icon: Calendar, ar: "فلترة زمنية متقدمة", en: "Advanced date filtering" },
    ],
  },
  {
    titleAr: "الأمان والصلاحيات",
    titleEn: "Security & Permissions",
    items: [
      { icon: Shield, ar: "أدوار متعددة (Admin/Recruiter)", en: "Multiple roles (Admin/Recruiter)" },
      { icon: Zap, ar: "صلاحيات دقيقة بالشاشة", en: "Granular screen permissions" },
      { icon: Globe, ar: "تشفير RLS كامل", en: "Full RLS encryption" },
      { icon: CheckCircle2, ar: "OTP + Rate Limiting", en: "OTP + Rate limiting" },
    ],
  },
];

export default function Features() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <MarketingLayout>
      <SEO
        title={t("features.seo.title")}
        description={t("features.seo.description")}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(170deg, hsl(160 84% 28% / 0.04) 0%, hsl(0 0% 99%) 60%, hsl(168 70% 34% / 0.03) 100%)" }} />
        <div className="container max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
          >
            {t("features.hero.title")} <span className="text-gradient">{t("features.hero.highlight")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed"
          >
            {t("features.hero.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Feature groups */}
      <section className="container max-w-6xl mx-auto px-6 pb-20 space-y-16">
        {featureGroups.map((group, gi) => (
          <motion.div
            key={gi}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-8 flex items-center gap-3">
              <span className="w-1.5 h-7 bg-primary rounded-full" />
              {locale === "ar" ? group.titleAr : group.titleEn}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {group.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/25 hover:-translate-y-1 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-sm text-foreground leading-snug">
                    {locale === "ar" ? item.ar : item.en}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      <section className="container max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl p-12 md:p-16 text-center text-primary-foreground"
          style={{ background: "linear-gradient(135deg, hsl(160 84% 24%) 0%, hsl(160 84% 32%) 50%, hsl(168 70% 30%) 100%)" }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">{t("features.cta.title")}</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">{t("features.cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-13 px-8 rounded-2xl gap-2 font-bold">
                {t("marketing.nav.signup")} <Arrow className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="h-13 px-8 rounded-2xl border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                {t("marketing.nav.pricing")}
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </MarketingLayout>
  );
}
