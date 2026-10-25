import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { accountHome, checkCompanyStatus } from "@/lib/accountAccess";
import { loadApplicantPortal } from "@/lib/applicantPortal";

beforeEach(() => vi.clearAllMocks());
describe("server-owned registration and applicant routing", () => {
  it.each(["pending", "rejected"])("keeps %s companies on their request page", async status => {
    rpc.mockResolvedValueOnce({ data: { access_state: "DENIED", denial_reason: "NO_COMPANY_MEMBERSHIP" } })
      .mockResolvedValueOnce({ data: { status } });
    const access = await checkCompanyStatus({ user_metadata: { role: "super_admin" } });
    expect(accountHome(access)).toBe("/company-registration");
    expect(rpc).not.toHaveBeenCalledWith("can_complete_company_onboarding");
  });
  it("does not use client metadata to grant company or applicant access", async () => {
    rpc.mockResolvedValueOnce({ data: { access_state: "DENIED", denial_reason: "NO_COMPANY_MEMBERSHIP" } })
      .mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: false });
    expect((await checkCompanyStatus({ user_metadata: { account_type: "job_seeker", role: "admin" } })).allowed).toBe(false);
  });
  it("allows only an unused server registration intent to reach onboarding", async () => {
    rpc.mockResolvedValueOnce({ data: { access_state: "DENIED", denial_reason: "NO_COMPANY_MEMBERSHIP" } })
      .mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: true });
    expect(accountHome(await checkCompanyStatus({}))).toBe("/onboarding");
  });
  it("fails closed when the registration check fails", async () => {
    rpc.mockResolvedValueOnce({ data: { access_state: "DENIED", denial_reason: "NO_COMPANY_MEMBERSHIP" } })
      .mockResolvedValueOnce({ error: new Error("offline") });
    expect((await checkCompanyStatus({})).allowed).toBe(false);
  });
  it.each([
    [{ is_candidate: true }, "/applicant-dashboard"],
    [{ is_candidate: true, is_platform_admin: true }, "/dashboard"],
    [{ is_agency: true }, "/agency"],
    [{}, "/dashboard"],
  ])("routes an allowed server account %o", async (flags, route) => {
    rpc.mockResolvedValueOnce({ data: { access_state: "ALLOWED", ...flags } });
    expect(accountHome(await checkCompanyStatus({ user_metadata: { account_type: "company" } }))).toBe(route);
  });
});
describe("applicant portal read", () => {
  it("uses the server identity without email or company selectors", async () => {
    const data = { applications: [{ id: "own-application" }], candidates: [], interviews: [], offers: [] };
    rpc.mockResolvedValueOnce({ data });
    expect(await loadApplicantPortal()).toEqual(data);
    expect(rpc).toHaveBeenCalledWith("get_my_applicant_portal");
  });
  it("does not turn a read failure into an empty account", async () => {
    rpc.mockResolvedValueOnce({ error: new Error("offline") });
    await expect(loadApplicantPortal()).rejects.toThrow("offline");
  });
  it("rejects an incomplete response", async () => {
    rpc.mockResolvedValueOnce({ data: { applications: [] } });
    await expect(loadApplicantPortal()).rejects.toThrow("Invalid applicant portal response");
  });
});
