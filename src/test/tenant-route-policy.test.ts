import { describe, expect, it } from "vitest";
import { decideTenantRoute } from "../../supabase/functions/_shared/tenantRoutePolicy";

const root = "e35c8528-8304-42d1-8658-c5da2244ef60";

describe("tenant route cutover guard", () => {
  it("keeps a shared company available while its dedicated copy is being prepared", () => {
    for (const provisioning_state of ["pending", "provisioning", "migrating", "failed"]) {
      expect(decideTenantRoute(root, { company_id: root, isolation_mode: "shared", provisioning_state }))
        .toEqual({ route: "shared", provisioningState: provisioning_state });
    }
  });

  it("does not route to a dedicated environment based on registry metadata alone", () => {
    expect(decideTenantRoute(root, { company_id: root, isolation_mode: "dedicated", provisioning_state: "ready" }))
      .toEqual({ route: "unavailable", code: "DEDICATED_ROUTING_UNAVAILABLE" });
  });

  it("fails closed when a record is absent, belongs to another root, or has an impossible state", () => {
    expect(decideTenantRoute(root, null)).toEqual({ route: "unavailable", code: "TENANT_REGISTRY_MISSING" });
    expect(decideTenantRoute(root, { company_id: "another", isolation_mode: "shared", provisioning_state: "pending" }))
      .toEqual({ route: "unavailable", code: "TENANT_REGISTRY_INVALID" });
    expect(decideTenantRoute(root, { company_id: root, isolation_mode: "shared", provisioning_state: "ready" }))
      .toEqual({ route: "unavailable", code: "TENANT_REGISTRY_INVALID" });
  });
});
