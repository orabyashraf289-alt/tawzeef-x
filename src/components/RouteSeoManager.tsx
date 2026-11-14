import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import seoRoutesConfig from "@/data/seoRoutes.json";

export const SEO_BASE_URL = seoRoutesConfig.baseUrl;

export interface RouteSeoMetadata {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
}

interface StaticSeoEntry {
  prerender?: boolean;
  robots: string;
  changefreq?: string;
  priority?: string;
  breadcrumbName?: string;
  schemaType?: string;
  title: string;
  description: string;
  keywords: string;
  h1?: string;
  summary?: string;
  highlights?: string[];
}

const DEFAULT_PRIVATE_METADATA: Omit<RouteSeoMetadata, "canonicalUrl"> =
  seoRoutesConfig.defaultPrivate;

const ROUTE_METADATA_MAP = seoRoutesConfig.routes as Record<string, StaticSeoEntry>;

/** Resolve SEO title, description, keywords, canonical URL, and robots policy for a route path. */
export function getRouteSeoMetadata(pathname: string): RouteSeoMetadata {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  const cleanPath = trimmed ? `/${trimmed}` : "/";
  const canonicalUrl = `${SEO_BASE_URL}${cleanPath}`;

  if (cleanPath in ROUTE_METADATA_MAP) {
    const entry = ROUTE_METADATA_MAP[cleanPath];
    return {
      title: entry.title,
      description: entry.description,
      keywords: entry.keywords,
      canonicalUrl,
      robots: entry.robots || "index, follow",
    };
  }

  if (cleanPath.startsWith("/blog/")) {
    const blogEntry = ROUTE_METADATA_MAP["/blog"];
    return {
      title: blogEntry.title,
      description: blogEntry.description,
      keywords: blogEntry.keywords,
      canonicalUrl,
      robots: blogEntry.robots || "index, follow",
    };
  }

  if (cleanPath.startsWith("/apply/")) {
    const applyEntry = ROUTE_METADATA_MAP["/apply"];
    return {
      title: applyEntry.title,
      description: applyEntry.description,
      keywords: applyEntry.keywords,
      canonicalUrl,
      robots: applyEntry.robots || "index, follow",
    };
  }

  return {
    ...DEFAULT_PRIVATE_METADATA,
    canonicalUrl,
  };
}

function upsertMetaTag(attributeName: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attributeName}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonicalLink(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/** Remove pre-rendered route JSON-LD once client navigation leaves the initial pre-rendered path. */
function syncPrerenderedJsonLd(cleanPath: string) {
  const existing = document.getElementById("route-seo-jsonld");
  if (existing && existing.getAttribute("data-route") !== cleanPath) {
    existing.remove();
  }
}

/** Sync document title, canonical link, keywords, and social/search meta tags on route changes. */
export function RouteSeoManager() {
  const location = useLocation();

  useEffect(() => {
    const trimmed = location.pathname.replace(/^\/+|\/+$/g, "");
    const cleanPath = trimmed ? `/${trimmed}` : "/";
    const meta = getRouteSeoMetadata(location.pathname);

    syncPrerenderedJsonLd(cleanPath);
    document.title = meta.title;
    upsertCanonicalLink(meta.canonicalUrl);
    upsertMetaTag("name", "description", meta.description);
    upsertMetaTag("name", "keywords", meta.keywords);
    upsertMetaTag("name", "robots", meta.robots);
    upsertMetaTag("property", "og:site_name", seoRoutesConfig.siteName);
    upsertMetaTag("property", "og:title", meta.title);
    upsertMetaTag("property", "og:description", meta.description);
    upsertMetaTag("property", "og:url", meta.canonicalUrl);
    upsertMetaTag("name", "twitter:title", meta.title);
    upsertMetaTag("name", "twitter:description", meta.description);
  }, [location.pathname]);

  return null;
}
