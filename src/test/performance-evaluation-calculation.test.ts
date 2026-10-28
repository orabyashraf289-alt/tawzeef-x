import { describe, expect, it } from "vitest";
import { aggregateEvaluations, evaluationTrend, overallScore, validScore, type EvaluationRow } from "@/lib/performanceEvaluation";

const row = (score: number, relationship = "manager", extra: Partial<EvaluationRow> = {}): EvaluationRow => ({
  id: crypto.randomUUID(), evalee_user_id: "employee-a", evalee_name: "Employee", evalee_role: "Engineer",
  reviewer_name: "Reviewer", relationship, productivity: score, leadership: score,
  teamwork: score, technical: score, communication: score, created_at: "2026-01-10T12:00:00Z", ...extra,
});

describe("performance review integrity", () => {
  it("does not seed employees or scores when no reviews exist", () => {
    expect(aggregateEvaluations([])).toEqual([]);
    expect(evaluationTrend([], "employee-a")).toEqual([]);
  });
  it("does not invent missing perspectives or dilute the only external review", () => {
    const member = aggregateEvaluations([row(4)])[0];
    expect(member.scores[0]).toMatchObject({ self: null, manager: 4, peers: null, subordinates: null });
    expect(overallScore(member.scores)).toBe(4);
    expect(member.counts).toEqual({ self: 0, manager: 1, peers: 0, subordinates: 0 });
  });
  it("does not let self ratings inflate the external average", () => {
    expect(overallScore(aggregateEvaluations([row(10, "self"), row(2)])[0].scores)).toBe(2);
    expect(overallScore(aggregateEvaluations([row(10, "self")])[0].scores)).toBeNull();
  });
  it("weights present external groups equally regardless of their record counts", () => {
    const member = aggregateEvaluations([row(9), ...Array.from({ length: 5 }, () => row(1, "peers"))])[0];
    expect(overallScore(member.scores)).toBe(5);
  });
  it("keeps precision until presentation", () => {
    const member = aggregateEvaluations([row(6.1), row(6.2), row(6.2)])[0];
    expect(member.scores[0].manager).toBeCloseTo(6.16666667);
  });
  it("keeps people with identical names separate and their IDs stable on reorder", () => {
    const rows = [row(2), row(9, "manager", { evalee_user_id: "employee-b" })];
    expect(aggregateEvaluations(rows).map(m => m.id).sort()).toEqual(["employee-a", "employee-b"]);
    expect(aggregateEvaluations([...rows].reverse()).find(m => m.id === "employee-a")?.scores[0].manager).toBe(2);
  });
  it("excludes invalid values and unknown relationships instead of manufacturing results", () => {
    expect(aggregateEvaluations([row(0), row(11), row(NaN), row(5, "unknown"), row(5, "manager", { technical: null })])).toEqual([]);
    for (const value of [null, "", "8", Infinity, -1, 0, 11]) expect(validScore(value)).toBe(false);
  });
  it("never manufactures a trend from a single observation", () => {
    expect(evaluationTrend([row(5)], "employee-a")).toEqual([{ date: "2026-01-10", score: 5 }]);
  });
  it("retains years and uses the same weighting for the timeline", () => {
    const rows = [row(9), row(1, "peers"), row(1, "peers"), row(7, "manager", { created_at: "2025-01-10T12:00:00Z" }), row(10, "self")];
    expect(evaluationTrend(rows, "employee-a")).toEqual([{ date: "2025-01-10", score: 7 }, { date: "2026-01-10", score: 5 }]);
  });
  it("does not substitute today's date for an undated record", () => {
    expect(evaluationTrend([row(5, "manager", { created_at: undefined }), row(5, "manager", { created_at: "invalid" })], "employee-a")).toEqual([]);
  });
});
