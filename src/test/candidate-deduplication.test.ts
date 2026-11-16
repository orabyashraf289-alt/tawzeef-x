import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  normalizeEmail,
  computeNameSimilarity,
  detectCandidateDuplicates,
  buildMergedCandidatePayload,
  type CandidateDeduplicationItem,
} from "../lib/candidateDeduplication";

describe("Candidate Deduplication & Smart Profile Merging", () => {
  it("normalizes phone numbers across different regional formats", () => {
    expect(normalizePhoneNumber("+966501234567")).toBe("501234567");
    expect(normalizePhoneNumber("00966501234567")).toBe("501234567");
    expect(normalizePhoneNumber("050-123-4567")).toBe("501234567");
    expect(normalizePhoneNumber("0501234567")).toBe("501234567");
    expect(normalizePhoneNumber("")).toBe("");
  });

  it("normalizes email addresses cleanly", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmail(null)).toBe("");
  });

  it("calculates name similarity with Arabic normalization", () => {
    expect(computeNameSimilarity("أحمد عبد الله", "احمد عبدالله")).toBeGreaterThanOrEqual(0.7);
    expect(computeNameSimilarity("سارة محمد", "سارة محمد")).toBe(1.0);
    expect(computeNameSimilarity("خالد علي", "محمود إبراهيم")).toBe(0);
  });

  it("detects exact email duplicate group with 100% confidence", () => {
    const list: CandidateDeduplicationItem[] = [
      {
        id: "cand-1",
        name: "فهد العتيبي",
        email: "fahad@example.com",
        phone: "0551112233",
        role: "مهندس برمجيات",
        skills: ["React", "TypeScript"],
        ai_score: 85,
        created_at: "2026-05-01T10:00:00Z",
      },
      {
        id: "cand-2",
        name: "فهد بن عبد الله العتيبي",
        email: "fahad@example.com", // same email
        phone: "0551112233",
        role: "مطور واجهات",
        skills: ["Tailwind", "Next.js"],
        ai_score: 90,
        resume_url: "https://example.com/cv.pdf",
        created_at: "2026-06-01T10:00:00Z",
      },
      {
        id: "cand-3",
        name: "سلمان الدوسري",
        email: "salman@example.com",
        phone: "0509998877",
      },
    ];

    const groups = detectCandidateDuplicates(list);
    expect(groups.length).toBe(1);
    expect(groups[0].confidence).toBe(100);
    expect(groups[0].matchReason).toContain("البريد الإلكتروني");
    // cand-2 should be primary because it has resume_url and higher ai_score
    expect(groups[0].primaryCandidate.id).toBe("cand-2");
    expect(groups[0].duplicates[0].id).toBe("cand-1");
  });

  it("detects exact phone duplicate group with 95% confidence", () => {
    const list: CandidateDeduplicationItem[] = [
      {
        id: "c-10",
        name: "مها الزهراني",
        email: "maha.z@work.com",
        phone: "+966 54 999 0011",
      },
      {
        id: "c-11",
        name: "مها الزهراني",
        email: "maha.personal@gmail.com",
        phone: "0549990011", // same phone
      },
    ];

    const groups = detectCandidateDuplicates(list);
    expect(groups.length).toBe(1);
    expect(groups[0].confidence).toBe(95);
    expect(groups[0].matchReason).toContain("رقم الجوال");
  });

  it("builds consolidated merged candidate payload accurately", () => {
    const primary: CandidateDeduplicationItem = {
      id: "p-1",
      name: "عمر السالم",
      email: "omar@corp.com",
      phone: "0501112222",
      skills: ["SQL", "Python"],
      source: "معرض توظيف QR",
      ai_score: 82,
      resume_url: "https://bucket/cv1.pdf",
    };

    const secondary: CandidateDeduplicationItem = {
      id: "s-2",
      name: "عمر السالم",
      email: "omar@personal.com",
      phone: "0501112222",
      skills: ["PowerBI", "Python"],
      source: "Indeed XML",
      ai_score: 88,
      summary: "خبرة في تحليل بيانات المبيعات",
    };

    const merged = buildMergedCandidatePayload(primary, secondary);
    expect(merged.skills).toContain("SQL");
    expect(merged.skills).toContain("Python");
    expect(merged.skills).toContain("PowerBI");
    expect(merged.skills?.length).toBe(3); // deduped
    expect(merged.source).toContain("معرض توظيف QR");
    expect(merged.source).toContain("Indeed XML");
    expect(merged.ai_score).toBe(88); // takes highest
    expect(merged.summary).toContain("دمج ملف مكرر");
  });
});