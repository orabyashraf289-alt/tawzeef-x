import { describe, expect, it } from "vitest";
import { buildResultsEmail, type ResultEmail } from "../../supabase/functions/send-assessment-results/email";

const result: ResultEmail = { candidate_name: "Candidate", candidate_email: "candidate@example.test", title: "Test", total_score: 8, max_score: 10, passing_score: 85, answers: [{ question_text: "Question", points_earned: 8, max_points: 10, feedback: "Reviewed" }] };
describe("saved assessment result email", () => {
  it("uses the assessment threshold and calculates the percentage from saved scores", () => {
    expect(buildResultsEmail(result)).toContain("لم تصل النتيجة");
    expect(buildResultsEmail({ ...result, passing_score: 75 })).toContain("اجتزت الحد");
    expect(buildResultsEmail(result)).toContain("80%");
  });
  it("escapes candidate, question and reviewer-controlled HTML", () => {
    const html = buildResultsEmail({ ...result, candidate_name: '<img src=x onerror="alert(1)">', title: "<script>alert(1)</script>", answers: [{ ...result.answers[0], question_text: "<b>Question</b>", feedback: "<a href='evil'>review</a>" }] });
    expect(html).not.toMatch(/<script|<img|<a href|<b>/);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;a href=&#39;evil&#39;");
  });
});
