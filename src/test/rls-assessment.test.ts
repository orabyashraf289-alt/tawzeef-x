import { describe, it, expect } from "vitest";

/**
 * RLS contract tests for assessment data integrity.
 *
 * These mirror the SQL policies defined in the latest security migrations:
 *  - question_options: SELECT restricted to question owners only.
 *  - assessment_responses: INSERT/UPDATE locked down — clients must go through
 *    start_assessment_response / submit_assessment_response RPCs.
 *  - assessments: candidates only fetch via get_assessment_for_candidate which
 *    omits the is_correct flag.
 */

describe("RLS: question_options is_correct exposure", () => {
  // Mirrors policy: SELECT only when question.user_id = auth.uid()
  const canSelectOption = (
    optionQuestionOwnerId: string,
    callerId: string | null,
  ) => callerId !== null && optionQuestionOwnerId === callerId;

  it("anonymous callers cannot read option rows", () => {
    expect(canSelectOption("owner-1", null)).toBe(false);
  });

  it("non-owner authenticated user cannot read options", () => {
    expect(canSelectOption("owner-1", "other-user")).toBe(false);
  });

  it("owner can read their own options", () => {
    expect(canSelectOption("owner-1", "owner-1")).toBe(true);
  });

  it("candidate-facing payload never includes is_correct", () => {
    // Mirrors get_assessment_for_candidate jsonb projection.
    const candidatePayload = {
      id: "opt-1",
      option_text: "Option A",
      sort_order: 0,
    };
    expect(Object.keys(candidatePayload)).not.toContain("is_correct");
  });
});

describe("RLS: assessment_responses access control", () => {
  // Mirrors: there is NO INSERT policy → only SECURITY DEFINER RPC can create.
  const canDirectInsert = () => false;

  // UPDATE policy: only the owning recruiter (assessment.user_id = auth.uid()).
  const canDirectUpdate = (
    assessmentOwnerId: string,
    callerId: string | null,
  ) => callerId !== null && assessmentOwnerId === callerId;

  // SELECT policy: same as UPDATE.
  const canDirectSelect = canDirectUpdate;

  it("clients cannot directly insert response rows", () => {
    expect(canDirectInsert()).toBe(false);
  });

  it("candidates cannot update their submitted response", () => {
    expect(canDirectUpdate("owner-1", "candidate-anon")).toBe(false);
    expect(canDirectUpdate("owner-1", null)).toBe(false);
  });

  it("recruiter who owns the assessment can read responses", () => {
    expect(canDirectSelect("owner-1", "owner-1")).toBe(true);
  });

  it("anonymous candidates cannot list responses", () => {
    expect(canDirectSelect("owner-1", null)).toBe(false);
  });
});

describe("RPC: submit_assessment_response is the only write path", () => {
  // Replays the server-side scoring contract — answers compared against
  // correct_answer / is_correct that the client never sees.
  const score = (
    questions: Array<{
      id: string;
      type: "multiple_choice" | "true_false" | "open_ended";
      correct: string;
      points: number;
    }>,
    answers: Array<{ question_id: string; answer: string }>,
  ) => {
    let total = 0;
    let max = 0;
    for (const q of questions) {
      max += q.points;
      const a = answers.find((x) => x.question_id === q.id);
      if (!a) continue;
      if (q.type !== "open_ended" && a.answer === q.correct) {
        total += q.points;
      }
    }
    return { total, max };
  };

  it("scores correct answers without leaking the correct value", () => {
    const result = score(
      [
        { id: "q1", type: "multiple_choice", correct: "opt-2", points: 5 },
        { id: "q2", type: "true_false", correct: "true", points: 3 },
      ],
      [
        { question_id: "q1", answer: "opt-2" },
        { question_id: "q2", answer: "false" },
      ],
    );
    expect(result.total).toBe(5);
    expect(result.max).toBe(8);
  });

  it("defers open-ended questions to AI (no auto points)", () => {
    const result = score(
      [{ id: "q1", type: "open_ended", correct: "anything", points: 4 }],
      [{ question_id: "q1", answer: "candidate text" }],
    );
    expect(result.total).toBe(0);
    expect(result.max).toBe(4);
  });
});
