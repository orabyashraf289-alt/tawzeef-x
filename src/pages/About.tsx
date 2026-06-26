import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, Lightbulb, Shield, Globe, Eye, Target, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/marketing/SEO";
import { useI18n } from "@/contexts/I18nContext";

const valueIcons = [Lightbulb, Eye, Shield, Globe];

export default function About() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  const values = [
    { key: "innovation" },
    { key: "transparency" },
    { key: "trust" },
    { key: "global" },
  ];

  const stats = [
    { value: "50+", label: locale === "ar" ? "دولة مدعومة" : "Countries supported" },
    { value: "24/7", label: locale === "ar" ? "دعم متواصل" : "Continuous support" },
    { value: "AR/EN", label: locale === "ar" ? "لغات أساسية" : "Core languages" },
    { value: "99.9%", label: locale === "ar" ? "وقت التشغيل" : "Uptime" },
  ];

  return (
    <MarketingLayout>
      <SEO
        title={t("about.seo.title")}
        description={t("about.seo.description")}
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Tawzeef-X",
          url: typeof window !== "undefined" ? window.location.origin : "",
          description: t("about.seo.description"),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(170deg, hsl(160 84% 28% / 0.04) 0%, hsl(0 0% 99%) 60%, hsl(168 70% 34% / 0.03) 100%)" }}
        />
        <div className="container max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-primary text-sm font-semibold bg-primary/8 px-4 py-1.5 rounded-full border border-primary/15"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t("about.hero.badge")}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mt-6 leading-tight tracking-tight"
          >
            {t("about.hero.title")} <span className="text-gradient">{t("about.hero.highlight")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed"
          >
            {t("about.hero.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Mission + Vision */}
      <section className="container max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: Target, titleKey: "about.mission.title", textKey: "about.mission.text", color: "primary" },
            { icon: Heart, titleKey: "about.vision.title", textKey: "about.vision.text", color: "accent" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors"
            >
              <div className={`w-12 h-12 rounded-2xl bg-${item.color}/10 text-${item.color} flex items-center justify-center mb-5`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-foreground">{t(item.titleKey)}</h2>
              <p className="text-muted-foreground leading-relaxed">{t(item.textKey)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/20">
        <div className="container max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums">{s.value}</div>
                <div className="text-muted-foreground text-sm mt-2">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">{t("about.values.title")}</h2>
          <p className="text-muted-foreground mt-3">{t("about.values.subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v, i) => {
            const Icon = valueIcons[i];
            return (
              <motion.div
                key={v.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/25 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{t(`about.value.${v.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.value.${v.key}.text`)}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Team teaser */}
      <section className="container max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-card border border-border rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <Users className="w-14 h-14 text-primary/40 mx-auto mb-5" />
          <h2 className="text-3xl font-extrabold text-foreground">{t("about.team.title")}</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">{t("about.team.subtitle")}</p>
        </div>
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
          <h2 className="text-3xl md:text-4xl font-black mb-4">{t("about.cta.title")}</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">{t("about.cta.subtitle")}</p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-13 px-8 rounded-2xl gap-2 font-bold">
              {t("marketing.nav.signup")} <Arrow className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </MarketingLayout>
  );
}
