import { describe, expect, it } from "vitest";
import { canUseTool, normalizeToolOutput, parseToolInput } from "../../supabase/functions/recruitment-ai-tools/policy";

const description = "A job description with responsibilities, working hours, requirements, and location.";

describe("recruitment AI tool boundary", () => {
  it("requires a staff role and company membership, except for platform admins", () => {
    expect(canUseTool(true, true, false)).toBe(true);
    expect(canUseTool(true, false, false)).toBe(false);
    expect(canUseTool(false, true, false)).toBe(false);
    expect(canUseTool(false, false, true)).toBe(true);
  });
  it("accepts only supported modules with bounded text", () => {
    expect(parseToolInput({ mode: "job_review", title: " HR specialist ", description, language: "ar" })?.title).toBe("HR specialist");
    for (const mode of ["screening_checklist", "hiring_workflow", "candidate_outreach"]) {
      expect(parseToolInput({ mode, title: "HR", description, language: "en" })?.mode).toBe(mode);
    }
    expect(parseToolInput({ mode: "make_hiring_decision", title: "HR", description, language: "ar" })).toBeNull();
    expect(parseToolInput({ mode: "interview_scorecard", title: "HR", description: "short", language: "en" })).toBeNull();
    expect(parseToolInput({ mode: "job_review", title: "HR", description: "x".repeat(6001), language: "en" })).toBeNull();
  });

  it("rejects empty provider output and keeps only display-safe fields", () => {
    expect(normalizeToolOutput("job_review", { issues: [], strengths: [] })).toBeNull();
    expect(normalizeToolOutput("interview_scorecard", { criteria: [] })).toBeNull();
    expect(normalizeToolOutput("job_review", {
      strengths: ["Clear working hours"],
      issues: [{ finding: "Missing location", suggestion: "State the work location", secret: "ignore" }],
      revisedDraft: "Revised text",
      decision: "hire",
    })).toEqual({
      mode: "job_review",
      strengths: ["Clear working hours"],
      issues: [{ finding: "Missing location", suggestion: "State the work location" }],
      revisedDraft: "Revised text",
    });
  });

  it("requires observable evidence and guidance for each scorecard criterion", () => {
    expect(normalizeToolOutput("interview_scorecard", {
      criteria: [{ name: "Problem solving" }, { name: "Collaboration", evidence: "Examples of teamwork", ratingGuide: "1-5 based on examples" }],
      interviewerNotes: ["Use the same questions for everyone"],
    })).toEqual({
      mode: "interview_scorecard",
      criteria: [{ name: "Collaboration", evidence: "Examples of teamwork", ratingGuide: "1-5 based on examples" }],
      interviewerNotes: ["Use the same questions for everyone"],
    });
  });

  it("filters incomplete checklist and workflow entries", () => {
    expect(normalizeToolOutput("screening_checklist", {
      requirements: [{ criterion: "Experience" }, { criterion: "Role-specific skill", evidence: "Relevant work sample", decision: "reject" }],
      verificationQuestions: ["Which tools have you used?"],
    })).toEqual({
      mode: "screening_checklist",
      requirements: [{ criterion: "Role-specific skill", evidence: "Relevant work sample" }],
      verificationQuestions: ["Which tools have you used?"],
      reviewNotes: [],
    });
    expect(normalizeToolOutput("hiring_workflow", {
      stages: [{ name: "Screening", purpose: "Check the stated requirements", completionSignal: "Human review is complete" }, { name: "Missing" }],
      planningNotes: ["Agree on owners"],
    })).toEqual({
      mode: "hiring_workflow",
      stages: [{ name: "Screening", purpose: "Check the stated requirements", completionSignal: "Human review is complete" }],
      planningNotes: ["Agree on owners"],
    });
  });

  it("requires both editable outreach drafts", () => {
    expect(normalizeToolOutput("candidate_outreach", { invitation: "Hello", followUp: "" })).toBeNull();
    expect(normalizeToolOutput("candidate_outreach", {
      invitation: "Hello [Candidate Name]", followUp: "Following up", placeholders: ["[Candidate Name]"], recipientEmail: "hidden",
    })).toEqual({ mode: "candidate_outreach", invitation: "Hello [Candidate Name]", followUp: "Following up", placeholders: ["[Candidate Name]"] });
  });
});
