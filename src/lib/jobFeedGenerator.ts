/**
 * Job Feed Generator for Indeed, Bayt.com, and Google for Jobs
 * Compliant with Indeed XML Feed Specification v2 and Schema.org JobPosting.
 */

export interface FeedJobItem {
  id: string;
  title: string;
  description: string;
  department?: string | null;
  location?: string | null;
  type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  experience_level?: string | null;
  created_at: string;
  status: string;
  company_name?: string | null;
  apply_url?: string;
}

export interface FeedValidationReport {
  totalJobs: number;
  eligibleJobs: number;
  warnings: { jobId: string; jobTitle: string; issue: string }[];
  isReadyForSyndication: boolean;
  score: number;
}

/**
 * Maps system job type to Indeed recognized job types
 */
export function mapIndeedJobType(type?: string | null): string {
  if (!type) return "fulltime";
  const lower = type.toLowerCase();
  if (lower.includes("جزئي") || lower.includes("part")) return "parttime";
  if (lower.includes("عقد") || lower.includes("contract")) return "contract";
  if (lower.includes("تدريب") || lower.includes("intern")) return "internship";
  if (lower.includes("مؤقت") || lower.includes("temp")) return "temporary";
  return "fulltime";
}

/**
 * Formats RFC 822 date for XML feed
 */
export function formatRfc822Date(dateString: string): string {
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

/**
 * Strips unsafe HTML or escapes for CDATA inclusion
 */
export function sanitizeCdata(text?: string | null): string {
  if (!text) return "";
  // Ensure CDATA closing tag is not broken
  return text.replace(/]]>/g, "]]]]><![CDATA[>");
}

/**
 * Generates valid Indeed & Bayt.com XML Feed Specification v2 string
 */
export function generateIndeedXmlFeed(
  jobs: FeedJobItem[],
  options?: {
    publisherName?: string;
    publisherUrl?: string;
    defaultCompany?: string;
    baseUrl?: string;
  }
): string {
  const publisherName = options?.publisherName || "توظيف إكس - TawzeefX";
  const publisherUrl = options?.publisherUrl || "https://tawzeefx.com";
  const defaultCompany = options?.defaultCompany || "شركة معتمدة";
  const baseUrl = options?.baseUrl || "https://tawzeefx.com";

  const activeJobs = jobs.filter((j) => j.status === "open" || j.status === "نشطة");
  const lastBuildDate = new Date().toUTCString();

  const xmlJobs = activeJobs
    .map((j) => {
      const applyUrl = j.apply_url || `${baseUrl}/apply/${j.id}`;
      const company = j.company_name || defaultCompany;
      const jobType = mapIndeedJobType(j.type);
      const postDate = formatRfc822Date(j.created_at);

      // Parse location
      let city = "الرياض";
      let country = "SA";
      if (j.location) {
        city = j.location.split("-")[0]?.split("،")[0]?.trim() || j.location;
      }

      // Salary formatting
      let salaryNode = "";
      if (j.salary_min || j.salary_max) {
        const cur = j.salary_currency || "SAR";
        if (j.salary_min && j.salary_max) {
          salaryNode = `\n      <salary><![CDATA[${j.salary_min} - ${j.salary_max} ${cur} شهرياً]]></salary>`;
        } else if (j.salary_min) {
          salaryNode = `\n      <salary><![CDATA[من ${j.salary_min} ${cur} شهرياً]]></salary>`;
        }
      }

      return `    <job>
      <title><![CDATA[${sanitizeCdata(j.title)}]]></title>
      <date><![CDATA[${postDate}]]></date>
      <referencenumber><![CDATA[${j.id}]]></referencenumber>
      <url><![CDATA[${applyUrl}]]></url>
      <company><![CDATA[${sanitizeCdata(company)}]]></company>
      <city><![CDATA[${sanitizeCdata(city)}]]></city>
      <state><![CDATA[${sanitizeCdata(city)}]]></state>
      <country><![CDATA[${country}]]></country>
      <jobtype><![CDATA[${jobType}]]></jobtype>
      <category><![CDATA[${sanitizeCdata(j.department || "عام")}]]></category>
      <description><![CDATA[${sanitizeCdata(j.description)}]]></description>${salaryNode}
      <experience><![CDATA[${sanitizeCdata(j.experience_level || "غير محدد")}]]></experience>
    </job>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher><![CDATA[${publisherName}]]></publisher>
  <publisherurl><![CDATA[${publisherUrl}]]></publisherurl>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
${xmlJobs}
</source>`;
}

/**
 * Generates Schema.org JobPosting JSON-LD for Google for Jobs
 */
export function generateGoogleJobsJsonLd(
  job: FeedJobItem,
  options?: { companyName?: string; baseUrl?: string }
): Record<string, unknown> {
  const company = job.company_name || options?.companyName || "شركة معتمدة";
  const baseUrl = options?.baseUrl || "https://tawzeefx.com";
  const applyUrl = job.apply_url || `${baseUrl}/apply/${job.id}`;

  const validThroughDate = new Date(job.created_at);
  validThroughDate.setDate(validThroughDate.getDate() + 60);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    identifier: {
      "@type": "PropertyValue",
      name: company,
      value: job.id,
    },
    datePosted: new Date(job.created_at).toISOString(),
    validThrough: validThroughDate.toISOString(),
    employmentType: job.type === "دوام جزئي" ? "PART_TIME" : "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: company,
      sameAs: baseUrl,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location || "الرياض",
        addressRegion: "الرياض",
        addressCountry: "SA",
      },
    },
    directApply: true,
    url: applyUrl,
  };

  if (job.salary_min || job.salary_max) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "SAR",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min || undefined,
        maxValue: job.salary_max || undefined,
        unitText: "MONTH",
      },
    };
  }

  return jsonLd;
}

/**
 * Validates active jobs for syndication readiness
 */
export function validateFeedHealth(jobs: FeedJobItem[]): FeedValidationReport {
  const activeJobs = jobs.filter((j) => j.status === "open" || j.status === "نشطة");
  const warnings: { jobId: string; jobTitle: string; issue: string }[] = [];

  activeJobs.forEach((j) => {
    if (!j.title || j.title.trim().length < 4) {
      warnings.push({ jobId: j.id, jobTitle: j.title || "بدون عنوان", issue: "عنوان الوظيفة قصير جداً أو مفقود" });
    }
    if (!j.description || j.description.trim().length < 30) {
      warnings.push({ jobId: j.id, jobTitle: j.title, issue: "الوصف الوظيفي مختصر جداً (أقل من 30 حرف)" });
    }
    if (!j.location) {
      warnings.push({ jobId: j.id, jobTitle: j.title, issue: "موقع العمل (المدينة) غير محدد" });
    }
  });

  const validCount = activeJobs.length - warnings.length;
  const score = activeJobs.length > 0 ? Math.max(0, Math.round((validCount / activeJobs.length) * 100)) : 100;

  return {
    totalJobs: activeJobs.length,
    eligibleJobs: Math.max(0, validCount),
    warnings,
    isReadyForSyndication: warnings.length === 0 && activeJobs.length > 0,
    score,
  };
}
