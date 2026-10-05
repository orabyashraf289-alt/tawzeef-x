import { describe, expect, it } from "vitest";
import { readAssessmentAnswers, readProctoringLog } from "@/lib/assessmentResponseData";
describe("Assessment JSON compatibility", () => {
  it.each([null, "{bad json", "[]", 7])("handles unusable proctoring logs without crashing or inventing a score: %j", (value) => {
    expect(readProctoringLog(value)).toBeNull();
  });
  it("reads a structured legacy log and preserves a genuine zero score", () => {
    expect(readProctoringLog(JSON.stringify({ cheat_score: 0, counters: { visibility: 2 }, events: [{ time: "2026-10-04", type: "blur" }] })))
      .toMatchObject({ cheat_score: 0, counters: { visibility: 2 }, events: [{ time: "2026-10-04", type: "blur" }] });
  });
  it("does not present invalid scores and counters as assessment evidence", () => {
    expect(readProctoringLog({ cheat_score: "80", counters: { visibility: -1 }, events: [null] }))
      .toEqual({ counters: {}, events: [] });
  });
  it("accepts ungraded answers and skips malformed entries while retaining AI feedback", () => {
    expect(readAssessmentAnswers([null, { question_id: 1 }, { question_id: "q", answer: "Response", is_correct: null, points_earned: null, ai_feedback: "Review pending" }]))
      .toEqual([{ question_id: "q", answer: "Response", is_correct: false, points_earned: 0, ai_feedback: "Review pending" }]);
    expect(readAssessmentAnswers({ question_id: "q" })).toEqual([]);
  });
});
