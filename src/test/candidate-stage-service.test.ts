import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { updateCandidateStage, updateCandidateStatus } from "@/services/candidateStageService";

const mocks = vi.hoisted(() => ({
  writeError: null as null | { message: string },
  readError: null as null | { message: string },
  writes: [] as Array<Record<string, unknown>>,
  filters: [] as Array<Array<[string, string]>>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => {
    let writing = false;
    const filters: Array<[string, string]> = [];
    mocks.filters.push(filters);
    const query = {
      update: vi.fn((value: Record<string, unknown>) => { writing = true; mocks.writes.push(value); return query; }),
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: string) => { filters.push([key, value]); return query; }),
      single: vi.fn(async () => writing
        ? { data: mocks.writeError ? null : { id: "candidate-a" }, error: mocks.writeError }
        : { data: mocks.readError ? null : { id: "candidate-a", company_id: "company-a", stage: "screened-by-automation", status: "قيد المراجعة" }, error: mocks.readError }),
    };
    return query;
  }) },
}));
const input = { candidateId: "candidate-a", companyId: "company-a", stage: "review", status: "قيد المراجعة" };
beforeEach(() => { vi.mocked(supabase.from).mockClear(); mocks.writeError = null; mocks.readError = null; mocks.writes = []; mocks.filters = []; });

describe("Candidate stage updates with automation", () => {
  it("rejects without rewriting a newer stage or resetting its elapsed time", async () => {
    await updateCandidateStatus({ candidateId: "candidate-a", companyId: "company-a", status: "مرفوض", notes: "Review reason" });
    expect(mocks.writes).toEqual([{ status: "مرفوض", notes: "Review reason", updated_at: expect.any(String) }]);
  });
  it("writes once in the candidate's company and returns the final stage from a separate read", async () => {
    const saved = await updateCandidateStage(input);
    expect(saved.stage).toBe("screened-by-automation");
    expect(mocks.writes).toHaveLength(1);
    expect(mocks.writes[0]).toEqual({ stage: "review", status: "قيد المراجعة", stage_entered_at: expect.any(String), updated_at: expect.any(String) });
    expect(mocks.filters).toEqual([
      [["id", "candidate-a"], ["company_id", "company-a"]],
      [["id", "candidate-a"], ["company_id", "company-a"]],
    ]);
  });
  it("stops on a rejected write without retrying or reading an invented success", async () => {
    mocks.writeError = { message: "permission denied" };
    await expect(updateCandidateStage(input)).rejects.toMatchObject({ message: "permission denied" });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.writes).toHaveLength(1);
  });
  it("reports a failed final read without repeating the stage event", async () => {
    mocks.readError = { message: "network failure" };
    await expect(updateCandidateStage(input)).rejects.toThrow("تم حفظ التغيير لكن تعذر قراءة المرحلة النهائية");
    expect(mocks.writes).toHaveLength(1);
  });
  it("requires a known company instead of assigning the active company implicitly", async () => {
    await expect(updateCandidateStage({ ...input, companyId: null })).rejects.toThrow("مراجعة ربط المرشح");
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
