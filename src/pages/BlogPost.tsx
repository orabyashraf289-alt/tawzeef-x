import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/marketing/SEO";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

function escapeInlineHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applySafeInlineFormatting(rawLine: string): string {
  const escaped = escapeInlineHtml(rawLine);
  const withLinks = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, rawUrl: string) => {
    const cleanUrl = rawUrl.trim();
    if (!/^(\/|https?:\/\/)/i.test(cleanUrl)) {
      return label;
    }
    const isExternal = /^https?:\/\//i.test(cleanUrl);
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${cleanUrl}"${attrs} class="text-primary underline underline-offset-4 font-semibold hover:opacity-85">${label}</a>`;
  });
  return withLinks.replace(/\*\*([^*]+)\*\*/g, "<strong class=\"text-foreground font-bold\">$1</strong>");
}

/** Lightweight safe markdown renderer supporting headings, bold, safe links, and lists. */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const blocks: JSX.Element[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="list-disc ms-6 my-4 space-y-2 text-muted-foreground">
        {listBuf.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: applySafeInlineFormatting(item) }} />
        ))}
      </ul>
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push(<h3 key={key++} className="text-xl font-bold text-foreground mt-7 mb-3">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={key++} className="text-2xl font-extrabold text-foreground mt-9 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(<h2 key={key++} className="text-2xl md:text-3xl font-black text-foreground mt-8 mb-4">{line.slice(2)}</h2>);
    } else if (line.startsWith("- ")) {
      listBuf.push(line.slice(2));
    } else {
      flushList();
      blocks.push(
        <p
          key={key++}
          className="text-muted-foreground leading-[1.95] mb-4"
          dangerouslySetInnerHTML={{ __html: applySafeInlineFormatting(line) }}
        />
      );
    }
  }
  flushList();
  return blocks;
}

export default function BlogPost() {
  const { slug } = useParams();
  const { t, locale } = useI18n();
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const ForwardArrow = locale === "ar" ? ArrowLeft : ArrowRight;

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ["blog-related-posts", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title_ar, title_en, excerpt_ar, excerpt_en, category, read_time_minutes, published_at")
        .eq("published", true)
        .neq("slug", slug!)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </MarketingLayout>
    );
  }

  if (isError || !post) {
    return <Navigate to="/blog" replace />;
  }

  const title = locale === "ar" ? post.title_ar : post.title_en;
  const content = locale === "ar" ? post.content_ar : post.content_en;
  const excerpt = locale === "ar" ? post.excerpt_ar : post.excerpt_en;
  const encodedSlug = encodeURIComponent(slug || "");
  const canonicalUrl = `https://www.tawzeefx.com/blog/${encodedSlug}`;

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <MarketingLayout>
      <SEO
        title={locale === "ar" ? `${title} | مدونة توظيف إكس (TawzeefX)` : `${title} | TawzeefX Blog`}
        description={excerpt || title}
        keywords={`${title}, توظيف إكس, TawzeefX, مدونة التوظيف الذكي, نظام تتبع المتقدمين ATS`}
        canonical={canonicalUrl}
        type="article"
        image={post.cover_image || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              headline: title,
              url: canonicalUrl,
              mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
              datePublished: post.published_at,
              dateModified: post.updated_at,
              author: { "@type": "Person", name: post.author_name },
              publisher: { "@id": "https://www.tawzeefx.com/#organization" },
              description: excerpt,
              image: post.cover_image || "https://www.tawzeefx.com/icon-512x512.png",
              inLanguage: locale === "ar" ? "ar" : "en",
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: locale === "ar" ? "الرئيسية" : "Home",
                  item: "https://www.tawzeefx.com/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: locale === "ar" ? "المدونة" : "Blog",
                  item: "https://www.tawzeefx.com/blog",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: title,
                  item: canonicalUrl,
                },
              ],
            },
          ],
        }}
      />

      <article className="container max-w-3xl mx-auto px-6 py-16">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <BackIcon className="w-4 h-4" />
          {t("blog.backToBlog")}
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md font-semibold uppercase tracking-wide">
              {post.category}
            </span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time_minutes} {t("blog.minRead")}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formattedDate}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight tracking-tight">{title}</h1>
          {excerpt && (
            <p className="text-lg text-muted-foreground mt-5 leading-relaxed">{excerpt}</p>
          )}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
            <div className="w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {post.author_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.author_name}</p>
              <p className="text-xs text-muted-foreground">{t("blog.publishedOn")} {formattedDate}</p>
            </div>
          </div>
        </motion.header>

        {post.cover_image && (
          <img src={post.cover_image} alt={title} className="w-full rounded-2xl mb-10" loading="lazy" />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="prose-content"
        >
          {renderMarkdown(content || "")}
        </motion.div>

        {/* Internal SEO & Product CTA */}
        <section className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div className="space-y-3">
              <h2 className="text-xl font-black text-foreground">
                {locale === "ar"
                  ? "طوّر التوظيف في منشأتك مع توظيف إكس (TawzeefX)"
                  : "Accelerate Hiring with TawzeefX"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {locale === "ar"
                  ? "اكتشف نظام تتبع المتقدمين ATS والفرز بالذكاء الاصطناعي وإدارة المقابلات وإشعارات المرشحين في منصة عربية سحابية متكاملة."
                  : "Explore our bilingual ATS, AI candidate screening, interview workflows, and candidate portal built for modern HR teams."}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link to="/features">
                  <Button size="sm" className="gradient-primary border-0 text-primary-foreground">
                    {locale === "ar" ? "استعرض المميزات" : "Explore Features"}
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="sm" variant="outline">
                    {locale === "ar" ? "الأسعار والباقات" : "Pricing Plans"}
                  </Button>
                </Link>
                <Link to="/careers">
                  <Button size="sm" variant="ghost">
                    {locale === "ar" ? "الوظائف الشاغرة" : "Open Careers"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Blog Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section className="mt-14 pt-10 border-t border-border">
            <h2 className="text-2xl font-black text-foreground mb-6">{t("blog.relatedPosts")}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedPosts.map((rel) => {
                const relTitle = locale === "ar" ? rel.title_ar : rel.title_en;
                return (
                  <Link
                    key={rel.id}
                    to={`/blog/${rel.slug}`}
                    className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors group"
                  >
                    <span className="text-[11px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {rel.category}
                    </span>
                    <h3 className="font-bold text-sm text-foreground mt-2.5 line-clamp-2 group-hover:text-primary transition-colors">
                      {relTitle}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-3">
                      {t("blog.readMore")} <ForwardArrow className="w-3 h-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </MarketingLayout>
  );
}
