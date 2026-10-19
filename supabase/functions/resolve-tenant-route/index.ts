import { createClient } from "npm:@supabase/supabase-js@2.95.3";
import { getExtendedCorsHeaders } from "../_shared/cors.ts";
import { decideTenantRoute } from "../_shared/tenantRoutePolicy.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const headers = { ...getExtendedCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, { code: "METHOD_NOT_ALLOWED" });

  let companyId: unknown;
  try {
    ({ companyId } = await req.json());
  } catch {
    return reply(400, { code: "INVALID_REQUEST" });
  }
  if (typeof companyId !== "string" || !uuid.test(companyId)) {
    return reply(400, { code: "INVALID_COMPANY_ID" });
  }

  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !anonKey || !serviceKey || token === anonKey || token === serviceKey) {
    return reply(401, { code: "AUTH_REQUIRED" });
  }

  try {
    const auth = createClient(url, anonKey);
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user || user.is_anonymous) return reply(401, { code: "AUTH_REQUIRED" });

    const db = createClient(url, serviceKey);
    const { data: company, error: companyError } = await db.from("companies")
      .select("id,parent_company_id,status").eq("id", companyId).maybeSingle();
    if (companyError) throw companyError;
    if (!company || company.status !== "active") return reply(404, { code: "COMPANY_UNAVAILABLE" });

    const rootCompanyId = company.parent_company_id || company.id;
    if (company.parent_company_id) {
      const { data: parent, error: parentError } = await db.from("companies")
        .select("status,parent_company_id").eq("id", rootCompanyId).maybeSingle();
      if (parentError) throw parentError;
      if (!parent || parent.parent_company_id || parent.status !== "active") {
        return reply(404, { code: "COMPANY_UNAVAILABLE" });
      }
    }

    const [{ data: memberships, error: memberError }, { data: adminRole, error: roleError }] = await Promise.all([
      db.from("company_members").select("company_id").eq("user_id", user.id)
        .in("company_id", company.id === rootCompanyId ? [rootCompanyId] : [company.id, rootCompanyId]).limit(1),
      db.from("platform_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle(),
    ]);
    if (memberError || roleError) throw memberError || roleError;
    if (!memberships?.length && !adminRole) return reply(403, { code: "TENANT_ACCESS_DENIED" });

    const { data: state, error: stateError } = await db.from("tenant_database_registry")
      .select("company_id,isolation_mode,provisioning_state")
      .eq("company_id", rootCompanyId).maybeSingle();
    if (stateError) throw stateError;
    const decision = decideTenantRoute(rootCompanyId, state);
    if (decision.route === "unavailable") return reply(503, { code: decision.code });

    // No connection string, database reference, or service key leaves the server.
    return reply(200, { companyId: company.id, rootCompanyId, route: "shared", provisioningState: decision.provisioningState });
  } catch (error) {
    console.error("Tenant route resolution failed", error instanceof Error ? error.message : "Unknown error");
    return reply(500, { code: "TENANT_ROUTE_ERROR" });
  }
});
