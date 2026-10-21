import { describe, expect, it } from "vitest";
import { resolveOfferCompanyId } from "./offerCompany";

describe("offer tenant selection", () => {
  it("uses the branch of the candidate instead of the parent's active company", () => {
    expect(resolveOfferCompanyId({ candidateCompanyId: "branch", activeCompanyId: "parent" })).toBe("branch");
  });

  it("rejects a job in another company before sending an offer", () => {
    expect(() => resolveOfferCompanyId({ candidateCompanyId: "branch-a", jobCompanyId: "branch-b" }))
      .toThrow("الوظيفة والمرشح تابعان لشركتين مختلفتين");
  });

  it("uses the selected company when no hiring record is linked", () => {
    expect(resolveOfferCompanyId({ activeCompanyId: "parent" })).toBe("parent");
  });
});
