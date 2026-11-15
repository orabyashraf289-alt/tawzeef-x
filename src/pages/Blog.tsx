import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/marketing/SEO";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  all: { ar: "جميع المقالات", en: "All Articles" },
  ats: { ar: "نظام تتبع المتقدمين ATS", en: "ATS Systems" },
  ai: { ar: "الذكاء الاصطناعي", en: "AI Hiring" },
  hr: { ar: "الموارد البشرية والمقابلات", en: "HR & Interviews" },
  branding: { ar: "العلامة التجارية للمنشأة", en: "Employer Branding" },
  general: { ar: "عام", en: "General" },
};

export default function Blog() {
  const { t, locale } = useI18n();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title_ar, title_en, excerpt_ar, excerpt_en, cover_image, category, author_name, read_time_minutes, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    const found = new Set<string>();
    (posts || []).forEach((p) => {
      if (p.category) found.add(p.category);
    });
    return ["all", ...Array.from(found)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (selectedCategory === "all") return posts;
    return posts.filter((p) => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryLabel = (cat: string) => {
    const entry = CATEGORY_LABELS[cat];
    if (entry) return locale === "ar" ? entry.ar : entry.en;
    return cat;
  };

  return (
    <MarketingLayout>
      <SEO
        title={t("blog.seo.title")}
        description={t("blog.seo.description")}
        keywords="مدونة توظيف إكس, TawzeefX blog, نظام تتبع المتقدمين ATS, التوظيف الذكي, فرز السير الذاتية بالذكاء الاصطناعي, مقابلات الفيديو, نصائح الموارد البشرية"
        canonical="https://www.tawzeefx.com/blog"
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(170deg, hsl(160 84% 28% / 0.04) 0%, hsl(0 0% 99%) 60%, hsl(168 70% 34% / 0.03) 100%)" }} />
        <div className="container max-w-4xl mx-auto px-6 py-24 md:py-28 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
          >
            {t("blog.hero.title")} <span className="text-gradient">{t("blog.hero.highlight")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground mt-6 max-w-xl mx-auto"
          >
            {t("blog.hero.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Category Filter + Posts grid */}
      <section className="container max-w-6xl mx-auto px-6 pb-20">
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                className="rounded-full"
              >
                {getCategoryLabel(cat)}
              </Button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">{t("blog.empty")}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, i) => {
              const title = locale === "ar" ? post.title_ar : post.title_en;
              const excerpt = locale === "ar" ? post.excerpt_ar : post.excerpt_en;
              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 6) * 0.06 }}
                >
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/25 hover:-translate-y-1 hover:shadow-lg transition-all h-full group"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center text-5xl font-black text-primary/30">
                      {post.cover_image ? (
                        <img src={post.cover_image} alt={title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        title?.[0] || "T"
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md font-semibold uppercase tracking-wide">
                          {getCategoryLabel(post.category || "general")}
                        </span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time_minutes} {t("blog.minRead")}</span>
                      </div>
                      <h2 className="font-bold text-lg text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">{title}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{excerpt}</p>
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.published_at)}
                        </span>
                        <span className="text-primary font-semibold text-sm flex items-center gap-1">
                          {t("blog.readMore")} <Arrow className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Internal Product & Careers Cross-Links */}
        <div className="mt-16 rounded-2xl border border-border bg-card/60 p-8 text-center">
          <h2 className="text-2xl font-black text-foreground mb-2">
            {locale === "ar" ? "استكشف حلول منصة توظيف إكس (TawzeefX)" : "Explore the TawzeefX Recruitment Platform"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
            {locale === "ar"
              ? "تعرف على نظام تتبع المتقدمين ATS بالذكاء الاصطناعي أو تصفح الوظائف الشاغرة المتاحة حالياً للشركات والباحثين عن عمل."
              : "Discover our AI-powered Applicant Tracking System or browse live openings across employers."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/features">
              <Button variant="default" className="gradient-primary border-0 text-primary-foreground">
                {locale === "ar" ? "مميزات نظام ATS" : "Platform Features"}
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline">{locale === "ar" ? "الأسعار والباقات" : "Pricing"}</Button>
            </Link>
            <Link to="/careers">
              <Button variant="outline">{locale === "ar" ? "الوظائف الشاغرة" : "Open Jobs"}</Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
