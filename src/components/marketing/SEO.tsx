import { useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, any>;
}

/**
 * Lightweight SEO manager — sets <title>, meta description, OG/Twitter tags,
 * canonical link, and optional JSON-LD without an external dependency.
 */
export function SEO({ title, description, canonical, image, type = "website", jsonLd }: SEOProps) {
  const { locale, dir } = useI18n();

  useEffect(() => {
    document.title = title;
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", dir);

    const ensureMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    ensureMeta(`meta[name="description"]`, "name", "description", description);
    ensureMeta(`meta[property="og:title"]`, "property", "og:title", title);
    ensureMeta(`meta[property="og:description"]`, "property", "og:description", description);
    ensureMeta(`meta[property="og:type"]`, "property", "og:type", type);
    ensureMeta(`meta[name="twitter:card"]`, "name", "twitter:card", "summary_large_image");
    ensureMeta(`meta[name="twitter:title"]`, "name", "twitter:title", title);
    ensureMeta(`meta[name="twitter:description"]`, "name", "twitter:description", description);

    const url = canonical || (typeof window !== "undefined" ? window.location.href : "");
    if (url) {
      ensureMeta(`meta[property="og:url"]`, "property", "og:url", url);
      let link = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", url);
    }

    if (image) {
      ensureMeta(`meta[property="og:image"]`, "property", "og:image", image);
      ensureMeta(`meta[name="twitter:image"]`, "name", "twitter:image", image);
    }

    // JSON-LD
    let scriptEl = document.head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-seo="true"]`);
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.setAttribute("type", "application/ld+json");
        scriptEl.setAttribute("data-seo", "true");
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, canonical, image, type, jsonLd, locale, dir]);

  return null;
}
