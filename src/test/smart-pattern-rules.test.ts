import { describe, it, expect } from "vitest";
import {
  DEFAULT_SMART_PATTERN_RULES,
  evaluateCandidatePatterns,
  type CandidatePatternProfile,
} from "../lib/smartPatternRules";

describe("Smart Pattern-Based Rules Engine (p4-smart-rules)", () => {
  it("provides default configured smart pattern rules", () => {
    expect(DEFAULT_SMART_PATTERN_RULES.length).toBeGreaterThanOrEqual(4);
    const topTalent = DEFAULT_SMART_PATTERN_RULES.find((r) => r.id === "pattern-top-talent");
    expect(topTalent).toBeDefined();
    expect(topTalent?.enabled).toBe(true);
    expect(topTalent?.thresholds.minAiScore).toBe(85);
  });

  it("detects top talent and recommends fast-track to technical interview", () => {
    const candidates: CandidatePatternProfile[] = [
      {
        id: "cand-fast",
        name: "نورة القحطاني",
        ai_score: 92,
        stage: "تقديم الطلب",
        status: "قيد المراجعة",
        created_at: new Date().toISOString(),
      },
      {
        id: "cand-normal",
        name: "خالد الشهري",
        ai_score: 72,
        stage: "تقديم الطلب",
        status: "قيد المراجعة",
        created_at: new Date().toISOString(),
      },
    ];

    const matches = evaluateCandidatePatterns(candidates, DEFAULT_SMART_PATTERN_RULES);
    const topMatches = matches.filter((m) => m.ruleId === "pattern-top-talent");

    expect(topMatches.length).toBe(1);
    expect(topMatches[0].candidateId).toBe("cand-fast");
    expect(topMatches[0].suggestedAction).toContain("المقابلة التقنية");
  });

  it("detects stage stagnation exceeding SLA days", () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const candidates: CandidatePatternProfile[] = [
      {
        id: "cand-stagnant",
        name: "ياسر الحربي",
        stage: "مراجعة السيرة",
        status: "قيد المراجعة",
        created_at: eightDaysAgo.toISOString(),
        last_activity_at: eightDaysAgo.toISOString(),
      },
    ];

    const matches = evaluateCandidatePatterns(candidates, DEFAULT_SMART_PATTERN_RULES);
    const stagMatches = matches.filter((m) => m.ruleId === "pattern-stagnation-guard");

    expect(stagMatches.length).toBe(1);
    expect(stagMatches[0].candidateId).toBe("cand-stagnant");
    expect(stagMatches[0].severity).toBe("warning");
  });

  it("detects licensed professional candidate pattern", () => {
    const candidates: CandidatePatternProfile[] = [
      {
        id: "cand-licensed",
        name: "د. سامي العلي",
        stage: "تقديم الطلب",
        license_status: "valid",
        created_at: new Date().toISOString(),
      },
    ];

    const matches = evaluateCandidatePatterns(candidates, DEFAULT_SMART_PATTERN_RULES);
    const licMatches = matches.filter((m) => m.ruleId === "pattern-license-compliance");

    expect(licMatches.length).toBe(1);
    expect(licMatches[0].candidateId).toBe("cand-licensed");
    expect(licMatches[0].matchedReason).toContain("رخصة مهنية معتمدة");
  });

  it("detects multi-job applicant pattern", () => {
    const candidates: CandidatePatternProfile[] = [
      {
        id: "cand-multi",
        name: "فيصل المطيري",
        applications_count: 3,
        created_at: new Date().toISOString(),
      },
    ];

    const matches = evaluateCandidatePatterns(candidates, DEFAULT_SMART_PATTERN_RULES);
    const multiMatches = matches.filter((m) => m.ruleId === "pattern-multi-applicant");

    expect(multiMatches.length).toBe(1);
    expect(multiMatches[0].candidateId).toBe("cand-multi");
  });
});