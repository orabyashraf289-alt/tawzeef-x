import { describe, it, expect } from "vitest";
import {
  generateIndeedXmlFeed,
  generateGoogleJobsJsonLd,
  validateFeedHealth,
  mapIndeedJobType,
  formatRfc822Date,
  sanitizeCdata,
  type FeedJobItem,
} from "../lib/jobFeedGenerator";

describe("Job Feed Generator (Indeed & Bayt XML, Google Jobs JSON-LD)", () => {
  const sampleJobs: FeedJobItem[] = [
    {
      id: "job-101",
      title: "مهندس برمجيات أول",
      description: "نبحث عن مهندس برمجيات أول ذو خبرة عالية في React و Node.js للانضمام إلى فريقنا التقني المتميز في الرياض.",
      department: "الهندسة والتقنية",
      location: "الرياض، المملكة العربية السعودية",
      type: "دوام كامل",
      salary_min: 15000,
      salary_max: 22000,
      salary_currency: "SAR",
      experience_level: "خبير (5+ سنوات)",
      created_at: "2026-05-10T12:00:00Z",
      status: "نشطة",
      company_name: "شركة توظيف التقنية",
    },
    {
      id: "job-102",
      title: "مصمم واجهات منتجات",
      description: "تصميم واجهات المستخدم للمنصات الرقمية وتطبيقات الهاتف الذكي.",
      department: "التصميم",
      location: "جدة",
      type: "دوام جزئي",
      salary_min: 8000,
      salary_max: null,
      salary_currency: "SAR",
      experience_level: "متوسط",
      created_at: "2026-06-01T09:30:00Z",
      status: "open",
    },
    {
      id: "job-103",
      title: "مساعد إداري",
      description: "مؤرشفة لا تظهر",
      status: "مؤرشفة",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  it("maps Arabic and English job types to Indeed standard types correctly", () => {
    expect(mapIndeedJobType("دوام كامل")).toBe("fulltime");
    expect(mapIndeedJobType("دوام جزئي")).toBe("parttime");
    expect(mapIndeedJobType("عقد مؤقت")).toBe("contract");
    expect(mapIndeedJobType("تدريب تعاوني")).toBe("internship");
    expect(mapIndeedJobType(null)).toBe("fulltime");
  });

  it("sanitizes CDATA properly to prevent XML breakage", () => {
    expect(sanitizeCdata("Normal text")).toBe("Normal text");
    expect(sanitizeCdata("Broken ]]> tag")).toBe("Broken ]]]]><![CDATA[> tag");
    expect(sanitizeCdata(undefined)).toBe("");
  });

  it("formats RFC 822 date correctly", () => {
    const formatted = formatRfc822Date("2026-05-10T12:00:00Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("GMT");
  });

  it("generates valid Indeed XML feed containing active jobs only", () => {
    const xml = generateIndeedXmlFeed(sampleJobs, {
      publisherName: "TawzeefX Platform",
      publisherUrl: "https://tawzeefx.com",
      defaultCompany: "تطبيق تجريبي",
      baseUrl: "https://tawzeefx.com",
    });

    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain("<publisher><![CDATA[TawzeefX Platform]]></publisher>");
    expect(xml).toContain("<title><![CDATA[مهندس برمجيات أول]]></title>");
    expect(xml).toContain("<referencenumber><![CDATA[job-101]]></referencenumber>");
    expect(xml).toContain("<jobtype><![CDATA[fulltime]]></jobtype>");
    expect(xml).toContain("<jobtype><![CDATA[parttime]]></jobtype>");
    expect(xml).toContain("<salary><![CDATA[15000 - 22000 SAR شهرياً]]></salary>");

    // Should NOT contain archived job
    expect(xml).not.toContain("job-103");
  });

  it("generates Schema.org JobPosting JSON-LD for Google for Jobs", () => {
    const jsonLd = generateGoogleJobsJsonLd(sampleJobs[0], {
      companyName: "شركة توظيف التقنية",
      baseUrl: "https://tawzeefx.com",
    });

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("JobPosting");
    expect(jsonLd["title"]).toBe("مهندس برمجيات أول");
    expect(jsonLd["directApply"]).toBe(true);

    const hiringOrg: any = jsonLd["hiringOrganization"];
    expect(hiringOrg["@type"]).toBe("Organization");
    expect(hiringOrg["name"]).toBe("شركة توظيف التقنية");

    const baseSalary: any = jsonLd["baseSalary"];
    expect(baseSalary["currency"]).toBe("SAR");
    expect(baseSalary["value"]["minValue"]).toBe(15000);
    expect(baseSalary["value"]["maxValue"]).toBe(22000);
  });

  it("audits feed health and scores quality accurately", () => {
    const health = validateFeedHealth(sampleJobs);
    expect(health.totalJobs).toBe(2);
    expect(health.eligibleJobs).toBe(2);
    expect(health.score).toBe(100);
    expect(health.isReadyForSyndication).toBe(true);

    const flawedJobs: FeedJobItem[] = [
      {
        id: "flawed-1",
        title: "DEV", // too short
        description: "short", // < 30 chars
        status: "نشطة",
        created_at: new Date().toISOString(),
      },
    ];

    const flawedHealth = validateFeedHealth(flawedJobs);
    expect(flawedHealth.isReadyForSyndication).toBe(false);
    expect(flawedHealth.warnings.length).toBeGreaterThan(0);
    expect(flawedHealth.score).toBeLessThan(100);
  });
});