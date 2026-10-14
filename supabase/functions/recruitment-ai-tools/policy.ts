export type ToolMode = "job_review" | "interview_scorecard";

export function canUseTool(staffRole: boolean, companyMember: boolean, platformAdmin: boolean): boolean {
  return platformAdmin || (staffRole && companyMember);
}

export function parseToolInput(value: unknown): { mode: ToolMode; title: string; description: string; language: "ar" | "en" } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (input.mode !== "job_review" && input.mode !== "interview_scorecard") return null;
  if (typeof input.title !== "string" || typeof input.description !== "string") return null;
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 150 || description.length < 40 || description.length > 6000) return null;
  if (input.language !== "ar" && input.language !== "en") return null;
  return { mode: input.mode, title, description, language: input.language };
}

function shortText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function strings(value: unknown, maxItems: number): string[] {
  return Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => shortText(item)).filter(Boolean)
    : [];
}

export function normalizeToolOutput(mode: ToolMode, value: unknown) {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (mode === "job_review") {
    const strengths = strings(data.strengths, 5);
    const issues = Array.isArray(data.issues)
      ? data.issues.slice(0, 6).map((item) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { finding: shortText(row.finding), suggestion: shortText(row.suggestion) };
      }).filter((item) => item.finding && item.suggestion)
      : [];
    if (!strengths.length && !issues.length) return null;
    return { mode, strengths, issues, revisedDraft: shortText(data.revisedDraft, 6000) };
  }

  const criteria = Array.isArray(data.criteria)
    ? data.criteria.slice(0, 8).map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        name: shortText(row.name, 150),
        evidence: shortText(row.evidence),
        ratingGuide: shortText(row.ratingGuide),
      };
    }).filter((item) => item.name && item.evidence && item.ratingGuide)
    : [];
  if (!criteria.length) return null;
  return { mode, criteria, interviewerNotes: strings(data.interviewerNotes, 5) };
}
