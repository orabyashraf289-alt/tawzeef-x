import { describe, expect, it } from "vitest";
import { parseCandidateEvaluation, type CandidateEvaluation } from "../../supabase/functions/_shared/candidateEvaluation";
import { groundEvaluationEvidence } from "../../supabase/functions/evaluate-candidate/evidence";
import type { EvaluationCandidate, EvaluationJob } from "../../supabase/functions/evaluate-candidate/policy";

const candidate: EvaluationCandidate = {
  id: "candidate-a", user_id: "applicant-a", company_id: "company-a", job_id: "job-a",
  role: "Developer", skills: ["React", "SQL"], experience: "3 years building web apps",
  education: "Computer Science", summary: "Built internal tools",
};
const job: EvaluationJob = {
  id: "job-a", user_id: "recruiter-a", company_id: "company-a", status: "نشطة",
  title: "Developer", department: null, location: null, type: null, experience_level: null,
  description: "Python and Java", requirements: ["React", "Python", "Java"],
};
const proposed: CandidateEvaluation = {
  score: 70, summary: "Professional profile review", strengths: [], weaknesses: [], recommendation: "Human review",
  requirementEvidence: [
    { requirement: "React", status: "supported", evidence: "React", source: "resume" },
    { requirement: "Python", status: "supported", evidence: "Built Python services", source: "profile" },
    { requirement: "Java", status: "supported", evidence: "10 years of Java", source: "resume" },
  ],
};
const at = "2026-10-22T10:00:00.000Z";

describe("ATS evidence report grounding", () => {
  it("derives sources from supplied text, downgrades invented quotes, and stamps server provenance", () => {
    const report = groundEvaluationEvidence({ ...proposed, requestedBy: "model-invented", evaluatedAt: "2000-01-01" },
      candidate, job, "Built Python services", "recruiter-a", at);
    expect(report).toMatchObject({ evaluatedAt: at, requestedBy: "recruiter-a", evidenceVersion: 1, cvAnalyzed: true });
    expect(report.requirementEvidence).toEqual([
      { requirement: "React", status: "supported", evidence: "React", source: "profile" },
      { requirement: "Python", status: "supported", evidence: "Built Python services", source: "resume" },
      { requirement: "Java", status: "unconfirmed", evidence: "", source: "unconfirmed" },
    ]);
  });

  it("never uses job text or an unavailable CV as candidate evidence", () => {
    const report = groundEvaluationEvidence(proposed, candidate, job, null, "recruiter-a", at);
    expect(report.cvAnalyzed).toBe(false);
    expect(report.requirementEvidence?.slice(1).every(item => item.status === "unconfirmed" && !item.evidence)).toBe(true);
  });

  it("keeps canonical job order, adds omitted requirements, and discards unrelated or conflicting model rows", () => {
    const report = groundEvaluationEvidence({ ...proposed, requirementEvidence: [
      { requirement: "React", status: "supported", evidence: "React" },
      { requirement: " React ", status: "unconfirmed", evidence: "" },
      { requirement: "Invented qualification", status: "supported", evidence: "SQL" },
    ] }, candidate, job, null, "recruiter-a", at);
    expect(report.requirementEvidence?.map(item => item.requirement)).toEqual(job.requirements);
    expect(report.requirementEvidence?.every(item => item.status === "unconfirmed")).toBe(true);
  });

  it("handles whitespace and letter case without accepting fragments of other words", () => {
    const input = { ...proposed, requirementEvidence: [{ requirement: "React", status: "supported" as const, evidence: "react" }] };
    expect(groundEvaluationEvidence(input, { ...candidate, skills: ["Reactions"] }, job, null, "staff", at)
      .requirementEvidence?.[0].status).toBe("unconfirmed");
    const spaced = { ...proposed, requirementEvidence: [{ requirement: "React", status: "supported" as const, evidence: "Built\n internal   tools" }] };
    expect(groundEvaluationEvidence(spaced, candidate, job, null, "staff", at).requirementEvidence?.[0].source).toBe("profile");
  });

  it("does not join different profile fields to manufacture a quotation", () => {
    const report = groundEvaluationEvidence({ ...proposed, requirementEvidence: [
      { requirement: "React", status: "supported", evidence: "Computer Science Built internal tools" },
    ] }, candidate, job, null, "staff", at);
    expect(report.requirementEvidence?.[0].status).toBe("unconfirmed");
  });

  it("does not create requirements when no job requirements were published", () => {
    expect(groundEvaluationEvidence(proposed, candidate, null, null, "staff", at).requirementEvidence).toEqual([]);
    expect(groundEvaluationEvidence(proposed, candidate, { ...job, requirements: [] }, null, "staff", at).requirementEvidence).toEqual([]);
  });

  it("records the full requirement count when the bounded model review covers only the first 25", () => {
    const requirements = Array.from({ length: 28 }, (_, index) => `Requirement ${index}`);
    const report = groundEvaluationEvidence(proposed, candidate, { ...job, requirements }, null, "staff", at);
    expect(report.requirementsTotal).toBe(28);
    expect(report.requirementEvidence?.map(item => item.requirement)).toEqual(requirements.slice(0, 25));
  });
});

describe("stored ATS report validation", () => {
  it("supports legacy reports while rejecting malformed fields and ignoring cultural fit", () => {
    expect(parseCandidateEvaluation({ ...proposed, requirementEvidence: undefined, culturalFitScore: 90 }))
      .toEqual({ ...proposed, requirementEvidence: undefined });
    expect(parseCandidateEvaluation({ ...proposed, strengths: "not an array" })).toBeNull();
    expect(parseCandidateEvaluation({ ...proposed, score: -1 })).toBeNull();
    expect(parseCandidateEvaluation({ ...proposed, requirementEvidence: [null] })).toBeNull();
  });
});
