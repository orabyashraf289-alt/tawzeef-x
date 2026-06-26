import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/marketing/SEO";
import { useI18n } from "@/contexts/I18nContext";

/** Very small markdown-ish renderer: handles ##, ### headings, **bold**, lists, paragraphs. */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const blocks: JSX.Element[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="list-disc ms-6 my-4 space-y-1.5 text-muted-foreground">
        {listBuf.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: applyInline(item) }} />
        ))}
      </ul>
    );
    listBuf = [];
  };

  const applyInline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push(<h3 key={key++} className="text-xl font-bold text-foreground mt-7 mb-3">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={key++} className="text-2xl font-extrabold text-foreground mt-9 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(<h1 key={key++} className="text-3xl font-black text-foreground mt-10 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ")) {
      listBuf.push(line.slice(2));
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="text-muted-foreground leading-[1.9] mb-4" dangerouslySetInnerHTML={{ __html: applyInline(line) }} />
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

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";

  return (
    <MarketingLayout>
      <SEO
        title={`${title} | Tawzeef-X`}
        description={excerpt || title}
        type="article"
        image={post.cover_image || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          author: { "@type": "Person", name: post.author_name },
          description: excerpt,
          image: post.cover_image,
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
      </article>
    </MarketingLayout>
  );
}
