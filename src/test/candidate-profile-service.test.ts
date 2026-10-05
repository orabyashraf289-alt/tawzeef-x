import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCandidateProfile } from "@/services/candidateProfileService";
import { supabase } from "@/integrations/supabase/client";

const mocks = vi.hoisted(() => ({
  candidate: null as Record<string, unknown> | null,
  linkedCandidate: null as Record<string, unknown> | null,
  application: null as Record<string, unknown> | null,
  error: null as { message: string } | null,
  insert: vi.fn(), upsert: vi.fn(), update: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: vi.fn((table: string) => {
    let linked = false;
    const query = {
      select: vi.fn(() => query), or: vi.fn(() => query),
      eq: vi.fn(() => { linked = true; return query; }), ilike: vi.fn(() => query),
      insert: mocks.insert, upsert: mocks.upsert, update: mocks.update,
      maybeSingle: vi.fn(async () => ({
        data: table === "applications" ? mocks.application : linked ? mocks.linkedCandidate : mocks.candidate,
        error: mocks.error,
      })),
    };
    return query;
  }),
} }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.candidate = null; mocks.linkedCandidate = null; mocks.error = null;
  mocks.application = { id: "application-a", name: "Applicant", email: "applicant@example.test", job_id: "job-a", company_id: "branch-a", created_at: "2026-10-04", jobs: { title: "Engineer" } };
});
describe("Candidate profile reads", () => {
  it("shows an unmatched application in its recorded company without assigning an owner or writing a candidate", async () => {
    const profile = await fetchCandidateProfile("application-tracking-code");
    expect(profile).toMatchObject({ id: "application-a", company_id: "branch-a", user_id: null, role: "Engineer" });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("prefers the existing candidate linked to the application job and email", async () => {
    mocks.linkedCandidate = { id: "candidate-a", company_id: "branch-a", user_id: "original-owner", stage: "Interview" };
    expect(await fetchCandidateProfile("application-tracking-code")).toBe(mocks.linkedCandidate);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("reports a failed read instead of inventing a candidate fallback", async () => {
    mocks.error = { message: "permission denied" };
    await expect(fetchCandidateProfile("candidate-a")).rejects.toMatchObject(mocks.error);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
