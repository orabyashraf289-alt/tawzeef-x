import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCompanyPermanently, purgeOrphanedBranches } from "@/services/companyDeletionService";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke }, rpc: mocks.rpc, from: mocks.from },
}));
const companyId = "15000000-0000-0000-0000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("tx_active_company_id", companyId);
});

describe("Server-only company deletion", () => {
  it("clears the selected company only after confirmed server success", async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true, deleted_company_id: companyId }, error: null });
    await expect(deleteCompanyPermanently(companyId)).resolves.toMatchObject({ success: true });
    expect(mocks.invoke).toHaveBeenCalledWith("delete-company", { body: { action: "permanent_delete", companyId } });
    expect(localStorage.getItem("tx_active_company_id")).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("preserves selection and performs no fallback after a server rejection", async () => {
    mocks.invoke.mockResolvedValue({ data: { success: false, error: "Forbidden" }, error: null });
    await expect(deleteCompanyPermanently(companyId)).rejects.toThrow("Forbidden");
    expect(localStorage.getItem("tx_active_company_id")).toBe(companyId);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("stops on a network failure without calling a database deletion RPC", async () => {
    mocks.invoke.mockRejectedValue(new Error("Network unavailable"));
    await expect(deleteCompanyPermanently(companyId)).rejects.toThrow("Network unavailable");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(localStorage.getItem("tx_active_company_id")).toBe(companyId);
  });
  it("uses the server's zero purge count instead of the client selection size", async () => {
    const result = { success: true, purged_branches_count: 0, purged_jobs_count: 0, purged_users_count: 0 };
    mocks.invoke.mockResolvedValue({ data: result, error: null });
    await expect(purgeOrphanedBranches()).resolves.toEqual(result);
    expect(mocks.invoke).toHaveBeenCalledWith("delete-company", { body: { action: "purge_orphans" } });
  });
  it("stops a denied purge without direct row deletion", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: "Forbidden" } });
    await expect(purgeOrphanedBranches()).rejects.toThrow("Forbidden");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
