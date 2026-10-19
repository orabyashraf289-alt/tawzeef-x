export type TenantRegistryState = {
  company_id: string;
  isolation_mode: string;
  provisioning_state: string;
};

export type TenantRouteDecision =
  | { route: "shared"; provisioningState: string }
  | { route: "unavailable"; code: "TENANT_REGISTRY_MISSING" | "DEDICATED_ROUTING_UNAVAILABLE" | "TENANT_REGISTRY_INVALID" };

// The central project remains the source of tenant data until an authenticated
// server gateway can connect to, verify, and route a dedicated database. A
// registry label alone must never make the browser choose a database.
export function decideTenantRoute(
  rootCompanyId: string,
  state: TenantRegistryState | null,
): TenantRouteDecision {
  if (!state) return { route: "unavailable", code: "TENANT_REGISTRY_MISSING" };
  if (state.company_id !== rootCompanyId) {
    return { route: "unavailable", code: "TENANT_REGISTRY_INVALID" };
  }
  if (state.isolation_mode === "shared" &&
      ["pending", "provisioning", "migrating", "failed"].includes(state.provisioning_state)) {
    return { route: "shared", provisioningState: state.provisioning_state };
  }
  if (state.isolation_mode === "dedicated" &&
      ["pending", "provisioning", "migrating", "ready", "failed"].includes(state.provisioning_state)) {
    return { route: "unavailable", code: "DEDICATED_ROUTING_UNAVAILABLE" };
  }
  return { route: "unavailable", code: "TENANT_REGISTRY_INVALID" };
}
