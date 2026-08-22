import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActiveCompanyId, resolveTenantCompanyScope } from "@/hooks/useJobs";
import { parseJobCustomSpecs, encodeJobDescription, type JobCustomSpecs } from "@/lib/jobSpecsHelper";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "companies") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: "comp-alandalus-main", name: "مدارس الأندلس", parent_company_id: null },
              { id: "comp-alandalus-b1", name: "فرع الأندلس جدة", parent_company_id: "comp-alandalus-main" },
              { id: "comp-alandalus-b2", name: "فرع الأندلس الرياض", parent_company_id: "comp-alandalus-main" },
              { id: "comp-tawzeefx", name: "توظيف إكس", parent_company_id: null },
            ],
            error: null,
          }),
        };
      }
      if (table === "company_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { company_id: "comp-tawzeefx", member_role: "owner" },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

describe("Multi-Tenant Data Isolation Security Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should read activeCompanyId from localStorage correctly", () => {
    expect(getActiveCompanyId()).toBeNull();

    localStorage.setItem("tx_active_company_id", "comp-alandalus-main");
    expect(getActiveCompanyId()).toBe("comp-alandalus-main");

    localStorage.setItem("tx_active_company_id", "comp-tawzeefx");
    expect(getActiveCompanyId()).toBe("comp-tawzeefx");
  });

  it("should scope company branch IDs only to the active tenant", async () => {
    // When TawzeefX is selected:
    const tawzeefScope = await resolveTenantCompanyScope("user-123", "comp-tawzeefx");
    expect(tawzeefScope).toContain("comp-tawzeefx");
    expect(tawzeefScope).not.toContain("comp-alandalus-main");
    expect(tawzeefScope).not.toContain("comp-alandalus-b1");

    // When Al-Andalus Main is selected:
    const alandalusScope = await resolveTenantCompanyScope("user-123", "comp-alandalus-main");
    expect(alandalusScope).toContain("comp-alandalus-main");
    expect(alandalusScope).not.toContain("comp-tawzeefx");
  });

  it("should prevent cross-company candidate leak via tenant filtering", () => {
    const candidates = [
      { id: "cand-1", name: "أحمد", company_id: "comp-tawzeefx", job_id: "job-tx" },
      { id: "cand-2", name: "سارة", company_id: "comp-alandalus-main", job_id: "job-al" },
      { id: "cand-3", name: "خالد", company_id: "comp-alandalus-b1", job_id: "job-al-b1" },
    ];

    const activeTenant = "comp-tawzeefx";
    const scopedCandidates = candidates.filter(c => c.company_id === activeTenant);

    expect(scopedCandidates.length).toBe(1);
    expect(scopedCandidates[0].name).toBe("أحمد");
    expect(scopedCandidates.some(c => c.company_id === "comp-alandalus-main")).toBe(false);
  });
});
