import { useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, any>;
  noindex?: boolean;
}

const DEFAULT_OG_IMAGE = "https://www.tawzeefx.com/icon-512x512.png";
const BASE_DOMAIN = "https://www.tawzeefx.com";

/**
 * Lightweight SEO manager — sets <title>, meta description, OG/Twitter tags,
 * canonical link, robots indexation, and optional JSON-LD without external heavy dependencies.
 */
export function SEO({
  title,
  description,
  canonical,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  jsonLd,
  noindex = false,
}: SEOProps) {
  const { locale, dir } = useI18n();

  useEffect(() => {
    document.title = title;
    document.documentElement.setAttribute("lang", locale || "ar");
    document.documentElement.setAttribute("dir", dir || "rtl");

    const ensureMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Robots meta: noindex for private pages, index for public pages
    ensureMeta(
      `meta[name="robots"]`,
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow"
    );

    // Primary Meta Tags
    ensureMeta(`meta[name="description"]`, "name", "description", description);
    ensureMeta(`meta[property="og:site_name"]`, "property", "og:site_name", "TawzeefX");
    ensureMeta(`meta[property="og:title"]`, "property", "og:title", title);
    ensureMeta(`meta[property="og:description"]`, "property", "og:description", description);
    ensureMeta(`meta[property="og:type"]`, "property", "og:type", type);
    ensureMeta(`meta[property="og:locale"]`, "property", "og:locale", locale === "en" ? "en_US" : "ar_SA");
    ensureMeta(`meta[name="twitter:card"]`, "name", "twitter:card", "summary_large_image");
    ensureMeta(`meta[name="twitter:title"]`, "name", "twitter:title", title);
    ensureMeta(`meta[name="twitter:description"]`, "name", "twitter:description", description);

    // Canonical link handling
    let fullCanonical = canonical;
    if (!fullCanonical) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        fullCanonical = `${BASE_DOMAIN}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;
      } else {
        fullCanonical = `${BASE_DOMAIN}/`;
      }
    } else if (fullCanonical.startsWith("/")) {
      fullCanonical = `${BASE_DOMAIN}${fullCanonical}`;
    }

    if (fullCanonical) {
      ensureMeta(`meta[property="og:url"]`, "property", "og:url", fullCanonical);
      let link = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", fullCanonical);
    }

    // Social Preview Images
    const resolvedImage = image.startsWith("/") ? `${BASE_DOMAIN}${image}` : image;
    ensureMeta(`meta[property="og:image"]`, "property", "og:image", resolvedImage);
    ensureMeta(`meta[name="twitter:image"]`, "name", "twitter:image", resolvedImage);

    // JSON-LD Structured Data
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
  }, [title, description, canonical, image, type, jsonLd, noindex, locale, dir]);

  return null;
}
