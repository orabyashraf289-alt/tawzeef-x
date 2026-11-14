import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const SEO_BASE_URL = "https://www.tawzeefx.com";

export interface RouteSeoMetadata {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
}

const DEFAULT_PRIVATE_METADATA: Omit<RouteSeoMetadata, "canonicalUrl"> = {
  title: "توظيف إكس (TawzeefX) | منصة التوظيف الذكية",
  description: "منصة توظيف إكس (TawzeefX) لإدارة عمليات التوظيف واستقطاب الكفاءات.",
  keywords: "توظيف إكس, TawzeefX, نظام تتبع المتقدمين",
  robots: "noindex, nofollow",
};

const PUBLIC_ROUTE_METADATA: Record<string, Omit<RouteSeoMetadata, "canonicalUrl" | "robots">> = {
  "/": {
    title: "توظيف إكس (TawzeefX) | منصة توظيف ذكية ووظائف شاغرة ونظام تتبع المتقدمين ATS",
    description:
      "توظيف إكس (TawzeefX - توظيف اكس) منصة توظيف ذكية ونظام تتبع المتقدمين (ATS) في السعودية والعالم العربي: تصفح أحدث الوظائف وفرص العمل، فرز السير الذاتية بالذكاء الاصطناعي، مقابلات الفيديو، والعروض الوظيفية الرقمية.",
    keywords:
      "توظيف إكس, توظيف اكس, منصة توظيف إكس, TawzeefX, Tawzeef-X, منصة توظيف ذكية, نظام تتبع المتقدمين, ATS عربي, وظائف شاغرة, فرص عمل في السعودية, فرز السير الذاتية بالذكاء الاصطناعي",
  },
  "/features": {
    title: "المميزات | توظيف إكس (TawzeefX) - نظام تتبع المتقدمين ATS وأتمتة الاستقطاب",
    description:
      "تعرف على مميزات منصة توظيف إكس (TawzeefX) لإدارة التوظيف بالذكاء الاصطناعي، فرز السير الذاتية، جدولة المقابلات، وأتمتة التواصل مع المرشحين.",
    keywords:
      "مميزات توظيف إكس, نظام تتبع المتقدمين ATS, فرز السير الذاتية بالذكاء الاصطناعي, مقابلات فيديو للتوظيف, برنامج توظيف للشركات, TawzeefX features",
  },
  "/pricing": {
    title: "الأسعار والباقات | توظيف إكس (TawzeefX) - حلول توظيف مرنة للشركات",
    description:
      "استعرض باقات وأسعار منصة توظيف إكس (TawzeefX) المصممة للشركات الناشئة والمتوسطة والمؤسسات مع أدوات توظيف ذكية متكاملة.",
    keywords:
      "أسعار توظيف إكس, باقات توظيف إكس, اشتراك منصة توظيف, أسعار نظام ATS, TawzeefX pricing",
  },
  "/careers": {
    title: "الوظائف المتاحة | توظيف إكس (TawzeefX) - تصفح أحدث فرص العمل",
    description:
      "تصفح أحدث الوظائف الشاغرة وفرص العمل المتاحة عبر منصة توظيف إكس (TawzeefX) وقدّم سيرتك الذاتية مباشرة للشركات الموثوقة.",
    keywords:
      "وظائف توظيف إكس, وظائف شاغرة, فرص عمل في السعودية, تقديم وظائف, بوابة التوظيف, TawzeefX careers",
  },
  "/blog": {
    title: "المدونة | توظيف إكس (TawzeefX) - مقالات ونصائح التوظيف والموارد البشرية",
    description:
      "اقرأ أحدث المقالات والأدلة المتخصصة في التوظيف الذكي، إدارة المواهب، وأفضل ممارسات الموارد البشرية على مدونة توظيف إكس (TawzeefX).",
    keywords:
      "مدونة توظيف إكس, مقالات الموارد البشرية, نصائح المقابلات الشخصية, التوظيف الذكي, TawzeefX blog",
  },
  "/about": {
    title: "عن المنصة | توظيف إكس (TawzeefX) - رؤيتنا لمستقبل التوظيف الذكي",
    description:
      "تعرف على منصة توظيف إكس (TawzeefX - توظيف اكس) ورؤيتنا في تطوير تجربة التوظيف وربط الكفاءات بأفضل جهات العمل عبر تقنيات الذكاء الاصطناعي.",
    keywords: "عن توظيف إكس, من نحن توظيف اكس, شركة TawzeefX, منصة التوظيف الذكية",
  },
  "/contact": {
    title: "تواصل معنا | توظيف إكس (TawzeefX) - فريق الدعم والمبيعات",
    description:
      "تواصل مع فريق توظيف إكس (TawzeefX) للاستفسارات، طلب عرض توضيحي للمنصة، أو الحصول على الدعم الفني للشركات والباحثين عن عمل.",
    keywords: "تواصل مع توظيف إكس, دعم توظيف إكس, حجز عرض توضيحي TawzeefX",
  },
  "/privacy": {
    title: "سياسة الخصوصية | توظيف إكس (TawzeefX)",
    description:
      "اطلع على سياسة الخصوصية وحماية البيانات الشخصية للمرشحين والشركات في منصة توظيف إكس (TawzeefX) وفق أعلى معايير الأمان.",
    keywords: "سياسة الخصوصية توظيف إكس, حماية البيانات TawzeefX",
  },
  "/terms": {
    title: "الشروط والأحكام | توظيف إكس (TawzeefX)",
    description:
      "تعرف على الشروط والأحكام المنظمة لاستخدام منصة توظيف إكس (TawzeefX) لخدمات التوظيف الذكي للشركات والمرشحين.",
    keywords: "الشروط والأحكام توظيف إكس, شروط استخدام TawzeefX",
  },
  "/apply": {
    title: "التقديم على وظيفة | توظيف إكس (TawzeefX)",
    description:
      "قدّم طلبك وسيرتك الذاتية للوظيفة الشاغرة عبر بوابة التوظيف الذكية في توظيف إكس (TawzeefX).",
    keywords: "التقديم على وظيفة, توظيف إكس, رفع السيرة الذاتية, TawzeefX apply",
  },
};

/** Resolve SEO title, description, keywords, canonical URL, and robots policy for a route path. */
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

/** Sync document title, canonical link, keywords, and social/search meta tags on route changes. */
export function RouteSeoManager() {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteSeoMetadata(location.pathname);
    document.title = meta.title;
    upsertCanonicalLink(meta.canonicalUrl);
    upsertMetaTag("name", "description", meta.description);
    upsertMetaTag("name", "keywords", meta.keywords);
    upsertMetaTag("name", "robots", meta.robots);
    upsertMetaTag("property", "og:site_name", "توظيف إكس | TawzeefX");
    upsertMetaTag("property", "og:title", meta.title);
    upsertMetaTag("property", "og:description", meta.description);
    upsertMetaTag("property", "og:url", meta.canonicalUrl);
    upsertMetaTag("name", "twitter:title", meta.title);
    upsertMetaTag("name", "twitter:description", meta.description);
  }, [location.pathname]);

  return null;
}
