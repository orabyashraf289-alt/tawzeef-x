import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const SEO_BASE_URL = "https://www.tawzeefx.com";

export interface RouteSeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
}

const DEFAULT_PRIVATE_METADATA: Omit<RouteSeoMetadata, "canonicalUrl"> = {
  title: "TawzeefX | منصة التوظيف الذكية",
  description: "منصة TawzeefX لإدارة عمليات التوظيف واستقطاب الكفاءات.",
  robots: "noindex, nofollow",
};

const PUBLIC_ROUTE_METADATA: Record<string, Omit<RouteSeoMetadata, "canonicalUrl" | "robots">> = {
  "/": {
    title: "TawzeefX | وظائف وفرص عمل ومنصة توظيف ذكية",
    description:
      "اكتشف أحدث الوظائف وفرص العمل مع TawzeefX، منصة توظيف ذكية تساعد الباحثين عن عمل على الوصول للفرص المناسبة وتساعد الشركات على العثور على أفضل المرشحين.",
  },
  "/features": {
    title: "المميزات | TawzeefX - منصة التوظيف الذكية وأتمتة الاستقطاب",
    description:
      "تعرف على مميزات TawzeefX لإدارة التوظيف بالذكاء الاصطناعي، فرز السير الذاتية، جدولة المقابلات، وأتمتة التواصل مع المرشحين.",
  },
  "/pricing": {
    title: "الأسعار والباقات | TawzeefX - حلول توظيف مرنة للشركات",
    description:
      "استعرض باقات وأسعار منصة TawzeefX المصممة للشركات الناشئة والمتوسطة والمؤسسات مع أدوات توظيف ذكية متكاملة.",
  },
  "/careers": {
    title: "الوظائف المتاحة | TawzeefX - تصفح أحدث فرص العمل",
    description:
      "تصفح أحدث الوظائف الشاغرة وفرص العمل المتاحة عبر منصة TawzeefX وقدّم سيرتك الذاتية مباشرة للشركات الموثوقة.",
  },
  "/blog": {
    title: "المدونة | TawzeefX - مقالات ونصائح التوظيف والموارد البشرية",
    description:
      "اقرأ أحدث المقالات والأدلة المتخصصة في التوظيف الذكي، إدارة المواهب، وأفضل ممارسات الموارد البشرية على مدونة TawzeefX.",
  },
  "/about": {
    title: "عن المنصة | TawzeefX - رؤيتنا لمستقبل التوظيف الذكي",
    description:
      "تعرف على منصة TawzeefX ورؤيتنا في تطوير تجربة التوظيف وربط الكفاءات بأفضل جهات العمل عبر تقنيات الذكاء الاصطناعي.",
  },
  "/contact": {
    title: "تواصل معنا | TawzeefX - فريق الدعم والمبيعات",
    description:
      "تواصل مع فريق TawzeefX للاستفسارات، طلب عرض توضيحي للمنصة، أو الحصول على الدعم الفني للشركات والباحثين عن عمل.",
  },
  "/privacy": {
    title: "سياسة الخصوصية | TawzeefX",
    description:
      "اطلع على سياسة الخصوصية وحماية البيانات الشخصية للمرشحين والشركات في منصة TawzeefX وفق أعلى معايير الأمان.",
  },
  "/terms": {
    title: "الشروط والأحكام | TawzeefX",
    description:
      "تعرف على الشروط والأحكام المنظمة لاستخدام منصة TawzeefX لخدمات التوظيف الذكي للشركات والمرشحين.",
  },
  "/apply": {
    title: "التقديم على وظيفة | TawzeefX",
    description:
      "قدّم طلبك وسيرتك الذاتية للوظيفة الشاغرة عبر بوابة التوظيف الذكية في TawzeefX.",
  },
};

/** Resolve SEO title, description, canonical URL, and robots policy for a route path. */
export function getRouteSeoMetadata(pathname: string): RouteSeoMetadata {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  const cleanPath = trimmed ? `/${trimmed}` : "/";
  const canonicalUrl = `${SEO_BASE_URL}${cleanPath}`;

  if (cleanPath in PUBLIC_ROUTE_METADATA) {
    return {
      ...PUBLIC_ROUTE_METADATA[cleanPath],
      canonicalUrl,
      robots: "index, follow",
    };
  }

  if (cleanPath.startsWith("/blog/")) {
    return {
      ...PUBLIC_ROUTE_METADATA["/blog"],
      canonicalUrl,
      robots: "index, follow",
    };
  }

  if (cleanPath.startsWith("/apply/")) {
    return {
      ...PUBLIC_ROUTE_METADATA["/apply"],
      canonicalUrl,
      robots: "index, follow",
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

/** Sync document title, canonical link, and social/search meta tags on route changes. */
export function RouteSeoManager() {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteSeoMetadata(location.pathname);
    document.title = meta.title;
    upsertCanonicalLink(meta.canonicalUrl);
    upsertMetaTag("name", "description", meta.description);
    upsertMetaTag("name", "robots", meta.robots);
    upsertMetaTag("property", "og:title", meta.title);
    upsertMetaTag("property", "og:description", meta.description);
    upsertMetaTag("property", "og:url", meta.canonicalUrl);
    upsertMetaTag("name", "twitter:title", meta.title);
    upsertMetaTag("name", "twitter:description", meta.description);
  }, [location.pathname]);

  return null;
}
