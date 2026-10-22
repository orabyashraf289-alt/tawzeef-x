import type { CandidateEvaluation, EvaluationEvidence } from "../_shared/candidateEvaluation.ts";
import type { EvaluationCandidate, EvaluationJob } from "./policy.ts";

const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const wordCharacter = /[\p{L}\p{N}]/u;

function containsQuote(text: string, quote: string): boolean {
  const source = normalize(text);
  for (let index = source.indexOf(quote); index !== -1; index = source.indexOf(quote, index + 1)) {
    // A skill such as React must not match a fragment of an unrelated word.
    const before = source[index - 1] || "";
    const after = source[index + quote.length] || "";
    if (!(wordCharacter.test(quote[0]) && wordCharacter.test(before)) &&
        !(wordCharacter.test(quote[quote.length - 1]) && wordCharacter.test(after))) return true;
  }
  return false;
}

export function groundEvaluationEvidence(
  evaluation: CandidateEvaluation,
  candidate: EvaluationCandidate,
  job: EvaluationJob | null,
  resumeExcerpt: string | null,
  requestedBy: string,
  evaluatedAt = new Date().toISOString(),
): CandidateEvaluation {
  const fields = [candidate.role, (candidate.skills || []).join(", "), candidate.experience, candidate.education, candidate.summary]
    .filter((field): field is string => typeof field === "string" && !!field.trim());
  const requirements = (job?.requirements || []).filter(item => typeof item === "string" && !!item.trim());
  const requirementEvidence = requirements.slice(0, 25).map((requirement): EvaluationEvidence => {
    const unconfirmed: EvaluationEvidence = { requirement, status: "unconfirmed", source: "unconfirmed", evidence: "" };
    const proposed = (evaluation.requirementEvidence || []).filter(item => normalize(item.requirement) === normalize(requirement));
    // Missing or conflicting model rows must not silently become confirmed evidence.
    if (proposed.length !== 1 || proposed[0].status !== "supported") return unconfirmed;
    const quote = normalize(proposed[0].evidence);
    if (quote.length < 3) return unconfirmed;
    const source = fields.some(field => containsQuote(field, quote)) ? "profile"
      : resumeExcerpt && containsQuote(resumeExcerpt.slice(0, 8000), quote) ? "resume" : null;
    if (!source) return unconfirmed;
    return { requirement, status: "supported", source, evidence: proposed[0].evidence.trim() };
  });
  return {
    ...evaluation, requirementEvidence, cvAnalyzed: Boolean(resumeExcerpt),
    evidenceVersion: 1, evaluatedAt, requestedBy, requirementsTotal: requirements.length,
  };
}
