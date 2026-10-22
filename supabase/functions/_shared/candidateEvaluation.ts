export interface EvaluationEvidence {
  requirement: string;
  status: "supported" | "unconfirmed";
  evidence: string;
  source?: "profile" | "resume" | "unconfirmed";
}

export interface CandidateEvaluation {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  skillsMatchScore?: number;
  experienceMatchScore?: number;
  educationMatchScore?: number;
  tailoredInterviewQuestions?: string[];
  requirementEvidence?: EvaluationEvidence[];
  cvAnalyzed?: boolean;
  evidenceVersion?: 1;
  evaluatedAt?: string;
  requestedBy?: string;
  requirementsTotal?: number;
}

const isScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 2000;
const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 10 && value.every(isText);

// Both stored reports and provider responses are untrusted. Copy only known fields.
export function parseCandidateEvaluation(value: unknown): CandidateEvaluation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (!isScore(data.score) || !isText(data.summary) || !isTextList(data.strengths) ||
      !isTextList(data.weaknesses) || !isText(data.recommendation)) return null;

  const result: CandidateEvaluation = {
    score: data.score,
    summary: data.summary,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    recommendation: data.recommendation,
  };
  for (const key of ["skillsMatchScore", "experienceMatchScore", "educationMatchScore"] as const) {
    if (data[key] !== undefined) {
      if (!isScore(data[key])) return null;
      result[key] = data[key];
    }
  }
  if (data.tailoredInterviewQuestions !== undefined) {
    if (!isTextList(data.tailoredInterviewQuestions)) return null;
    result.tailoredInterviewQuestions = data.tailoredInterviewQuestions;
  }
  if (data.requirementEvidence !== undefined) {
    if (!Array.isArray(data.requirementEvidence) || data.requirementEvidence.length > 25) return null;
    const evidence: EvaluationEvidence[] = [];
    for (const item of data.requirementEvidence) {
      if (!item || typeof item !== "object" || !isText(item.requirement) ||
          !["supported", "unconfirmed"].includes(item.status) ||
          typeof item.evidence !== "string" || item.evidence.length > 500 ||
          (item.source !== undefined && !["profile", "resume", "unconfirmed"].includes(item.source))) return null;
      evidence.push({
        requirement: item.requirement, status: item.status, evidence: item.evidence,
        ...(item.source !== undefined ? { source: item.source } : {}),
      });
    }
    result.requirementEvidence = evidence;
  }
  if (typeof data.cvAnalyzed === "boolean") result.cvAnalyzed = data.cvAnalyzed;
  if (data.evidenceVersion === 1) result.evidenceVersion = 1;
  if (typeof data.evaluatedAt === "string" && data.evaluatedAt.length <= 40 &&
      Number.isFinite(Date.parse(data.evaluatedAt))) result.evaluatedAt = data.evaluatedAt;
  if (typeof data.requestedBy === "string" && data.requestedBy.length <= 100) result.requestedBy = data.requestedBy;
  if (typeof data.requirementsTotal === "number" && Number.isSafeInteger(data.requirementsTotal) && data.requirementsTotal >= 0)
    result.requirementsTotal = data.requirementsTotal;
  return result;
}
