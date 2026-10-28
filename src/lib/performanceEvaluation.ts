export const dimensions = [
  { key: "productivity", ar: "الإنتاجية والإنجاز", en: "Productivity" },
  { key: "leadership", ar: "القيادة والمبادرة", en: "Leadership" },
  { key: "teamwork", ar: "العمل الجماعي والتعاون", en: "Teamwork" },
  { key: "technical", ar: "المهارة التقنية", en: "Technical" },
  { key: "communication", ar: "مهارات التواصل", en: "Communication" },
] as const;
export const relationships = ["self", "manager", "peers", "subordinates"] as const;
export type Relationship = typeof relationships[number];
export type Dimension = typeof dimensions[number]["key"];
export type Score = number | null;
export type EvaluationRow = Record<Dimension, unknown> & {
  id: string; evalee_name: string; evalee_name_en?: string | null;
  evalee_role: string; evalee_role_en?: string | null;
  evalee_user_id?: string | null; user_id?: string;
  relationship: string; reviewer_name: string; reviewer_name_en?: string | null;
  comment?: string | null; created_at?: string;
};
export type DimensionScore = Record<Relationship, Score> & { subject: string; subjectEn: string };
export function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 10;
}
export function mean(values: Score[]): Score {
  const present = values.filter(validScore);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}
export const displayScore = (value: Score) => value === null ? "—" : value.toFixed(1);
// Self appraisal is a comparison, not an input to the external feedback score.
export const externalScore = (score: DimensionScore) => mean([score.manager, score.peers, score.subordinates]);
export const overallScore = (scores: DimensionScore[]) => mean(scores.map(externalScore));
export const employeeKey = (row: Pick<EvaluationRow, "evalee_user_id" | "evalee_name" | "evalee_role">) =>
  row.evalee_user_id || JSON.stringify([row.evalee_name.trim(), row.evalee_role.trim()]);
export const validEvaluation = (row: EvaluationRow) =>
  relationships.includes(row.relationship as Relationship) && dimensions.every(d => validScore(row[d.key]));

export function aggregateEvaluations(rows: EvaluationRow[]) {
  const groups = new Map<string, EvaluationRow[]>();
  for (const row of rows.filter(validEvaluation)) {
    const key = employeeKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups].map(([id, entries]) => {
    const first = entries[0];
    const counts = Object.fromEntries(relationships.map(rel => [rel, entries.filter(e => e.relationship === rel).length])) as Record<Relationship, number>;
    return {
      id, name: first.evalee_name, nameEn: first.evalee_name_en || first.evalee_name,
      role: first.evalee_role, roleEn: first.evalee_role_en || first.evalee_role,
      count: entries.length, counts,
      scores: dimensions.map(d => ({
        subject: d.ar, subjectEn: d.en,
        ...Object.fromEntries(relationships.map(rel => [rel, mean(entries.filter(e => e.relationship === rel).map(e => e[d.key] as number))])),
      })) as DimensionScore[],
      comments: entries.filter(e => e.comment?.trim()).map(e => ({
        author: e.reviewer_name, authorEn: e.reviewer_name_en || e.reviewer_name,
        relationship: ({ self: "ذاتي", manager: "مدير", peers: "زميل", subordinates: "مرؤوس" })[e.relationship as Relationship],
        relationshipEn: e.relationship,
        text: e.comment!, textEn: e.comment!,
      })),
    };
  });
}

export function evaluationTrend(rows: EvaluationRow[], memberId: string) {
  const days = new Map<string, EvaluationRow[]>();
  for (const row of rows.filter(validEvaluation)) {
    if (employeeKey(row) !== memberId || !row.created_at || !Number.isFinite(Date.parse(row.created_at))) continue;
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    days.set(day, [...(days.get(day) || []), row]);
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, entries]) => ({
    date, score: overallScore(aggregateEvaluations(entries)[0].scores),
  })).filter(point => point.score !== null);
}
