import { describe, expect, it } from "vitest";
import {
  buildGeminiRequest,
  canEvaluateCandidate,
  GEMINI_ENDPOINT,
  GEMINI_MODEL,
  isInvalidGeminiKeyResponse,
  jobMatchesCandidate,
  parseGeminiEvaluation,
  type EvaluationCandidate,
  type EvaluationJob,
} from "../../supabase/functions/evaluate-candidate/policy";

const candidate: EvaluationCandidate = {
  id: "candidate-1", user_id: "applicant", company_id: "company-1", job_id: "job-1",
  role: "مهندس برمجيات", skills: ["React"], experience: "3 سنوات",
  education: "بكالوريوس", summary: "بنى تطبيقات ويب",
};
const job: EvaluationJob = {
  id: "job-1", user_id: "recruiter", company_id: "company-1", status: "نشطة",
  title: "مطور واجهات", department: "الهندسة", location: "القاهرة", type: "دوام كامل",
  experience_level: "متوسط", description: "بناء واجهات", requirements: ["React"],
};

describe("candidate evaluation authorization", () => {
  it("rejects an applicant or another company member for a company candidate", () => {
    expect(canEvaluateCandidate(candidate, "applicant", false, false)).toBe(false);
    expect(canEvaluateCandidate(candidate, "outsider", false, false)).toBe(false);
    expect(canEvaluateCandidate(candidate, "recruiter", false, true)).toBe(true);
    expect(canEvaluateCandidate(candidate, "admin", true, false)).toBe(true);
  });

  it("allows only the owner of a personal candidate", () => {
    const personal = { ...candidate, company_id: null };
    expect(canEvaluateCandidate(personal, "applicant", false, false)).toBe(true);
    expect(canEvaluateCandidate(personal, "outsider", false, false)).toBe(false);
  });

  it("prevents a candidate from being matched against an unrelated job", () => {
    expect(jobMatchesCandidate(candidate, job, "recruiter")).toBe(true);
    expect(jobMatchesCandidate(candidate, { ...job, id: "other-job" }, "recruiter")).toBe(false);
    expect(jobMatchesCandidate(candidate, { ...job, company_id: "company-2" }, "recruiter")).toBe(false);
    const personal = { ...candidate, company_id: null };
    expect(jobMatchesCandidate(personal, { ...job, company_id: null, status: "مسودة" }, "applicant")).toBe(false);
    expect(jobMatchesCandidate(personal, { ...job, company_id: null }, "applicant")).toBe(true);
  });
});

describe("Gemini request and response", () => {
  it("recognizes Google's array-wrapped invalid key error without treating other validation errors as credentials", () => {
    expect(isInvalidGeminiKeyResponse([{ error: { code: 400, message: "Please pass a valid API key", status: "INVALID_ARGUMENT" } }])).toBe(true);
    expect(isInvalidGeminiKeyResponse({ error: { message: "Invalid JSON payload" } })).toBe(false);
    expect(isInvalidGeminiKeyResponse(null)).toBe(false);
  });

  it("sends only the approved profile fields to Google's endpoint", () => {
    const withContact = { ...candidate, name: "Full Name", email: "private@example.invalid", phone: "01000000000" };
    const body = buildGeminiRequest(withContact, job);
    expect(GEMINI_ENDPOINT).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(body.model).toBe(GEMINI_MODEL);
    expect(JSON.stringify(body)).toContain("React");
    expect(JSON.stringify(body)).toContain("بناء واجهات");
    expect(JSON.stringify(body)).not.toMatch(/Full Name|private@example\.invalid|01000000000|candidate-1|company-1/);
  });

  it("accepts a valid tool result and refuses malformed or inflated scores", () => {
    const result = (argumentsJson: string) => ({ choices: [{ message: { tool_calls: [{ function: {
      name: "evaluate_candidate", arguments: argumentsJson,
    } }] } }] });
    const valid = { score: 72, summary: "مناسب", strengths: ["React"], weaknesses: [], recommendation: "مقابلة" };
    expect(parseGeminiEvaluation(result(JSON.stringify(valid)))).toEqual(valid);
    expect(parseGeminiEvaluation(result(JSON.stringify({ ...valid, score: 150 })))).toBeNull();
    expect(parseGeminiEvaluation(result(JSON.stringify({ ...valid, strengths: "React" })))).toBeNull();
    expect(parseGeminiEvaluation({ choices: [{ message: { content: "72" } }] })).toBeNull();
  });
});
