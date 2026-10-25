import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCandidates, usePaginatedCandidates } from "@/hooks/useJobs";

const mocks = vi.hoisted(() => ({
  failTable: "", calls: [] as Array<{ table: string; selection: string; filters: string[] }>,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "staff-a" } }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => options, useMutation: vi.fn(), useQueryClient: vi.fn(), keepPreviousData: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const call = { table, selection: "", filters: [] as string[] };
    mocks.calls.push(call);
    const query = {
      select: (value: string) => { call.selection = value; return query; },
      eq: (key: string, value: string) => { call.filters.push(`${key}=${value}`); return query; },
      in: (key: string, values: string[]) => { call.filters.push(`${key}=${values.join(",")}`); return query; },
      or: (value: string) => { call.filters.push(value); return query; },
      order: () => query, range: () => query,
      then: (resolve: (value: unknown) => unknown) => {
        const ambiguous = /(?:^|,\s*)jobs\(/.test(call.selection);
        if (ambiguous || table === mocks.failTable) return Promise.resolve(resolve({ data: null,
          error: { code: ambiguous ? "PGRST201" : "READ_FAILED", message: "Read failed" } }));
        const data = table === "companies" ? [{ id: "branch-a" }] : table === "jobs" ? [{ id: "job-a" }]
          : table === "candidates" ? [{ id: "candidate-a", name: "Applicant", email: "a@example.test", job_id: "job-a", jobs: { title: "Engineer" } }]
            : table === "applications" ? [{ id: "application-a", name: "New applicant", email: "b@example.test", job_id: "job-a", company_id: "branch-a", jobs: { title: "Engineer" } }] : [];
        return Promise.resolve(resolve({ data, error: null, count: data.length }));
      },
    };
    return query;
  },
} }));

const read = (result: unknown) => (result as { queryFn: () => Promise<unknown> }).queryFn();
beforeEach(() => { mocks.failTable = ""; mocks.calls = []; });

describe("candidate list relationship reads", () => {
  it("loads candidates and unmatched applications despite multiple job foreign keys, retaining tenant filters", async () => {
    const result = await read(useCandidates("company-a"));
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "candidate-a", jobs: { title: "Engineer" } }),
      expect.objectContaining({ id: "application-a", company_id: "branch-a", role: "Engineer" }),
    ]));
    expect(mocks.calls.find(call => call.table === "candidates")?.filters)
      .toContain("company_id.in.(company-a,branch-a),job_id.in.(job-a),user_id.eq.staff-a");
    expect(mocks.calls.find(call => call.table === "applications")?.filters).toContain("job_id=job-a");
  });

  it.each(["jobs", "candidates", "applications"])("surfaces a failed %s read rather than returning an empty or partial list", async table => {
    mocks.failTable = table;
    await expect(read(useCandidates("company-a"))).rejects.toMatchObject({ code: "READ_FAILED" });
  });

  it("also disambiguates job relationships for paginated candidate reads", async () => {
    const result = await read(usePaginatedCandidates());
    expect(result).toMatchObject({ data: expect.arrayContaining([
      expect.objectContaining({ id: "candidate-a" }), expect.objectContaining({ id: "application-a" }),
    ]) });
  });
});
