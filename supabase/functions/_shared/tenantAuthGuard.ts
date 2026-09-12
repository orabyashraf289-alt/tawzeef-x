import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface TenantAuthResult {
  authorized: boolean;
  status?: number;
  error?: string;
  code?: string;
  user?: any;
  isSuperAdmin?: boolean;
  isCandidate?: boolean;
  companyId?: string;
  companyRole?: string;
}

/**
 * Server-side Tenant Validation Middleware Guard for Edge Functions
 * Enforces: User Valid + Token Valid + Company Exists + Company Status = ACTIVE + User has membership
 */
export async function validateTenantRequest(
  req: Request,
  targetCompanyId?: string
): Promise<TenantAuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      authorized: false,
      status: 401,
      error: "Missing authorization header",
      code: "AUTH_HEADER_MISSING",
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Verify User Token
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      status: 401,
      error: "Invalid or expired authorization token",
      code: "TOKEN_INVALID",
    };
  }

  const email = (user.email || "").toLowerCase().trim();
  const meta = user.user_metadata || {};
  const userRole = meta.role || meta.account_type;

  // 2. Super Admin Bypass (Platform Owner)
  const isSuperAdmin =
    email === "tx@tawzeefx.com" ||
    email === "ctraining801@gmail.com" ||
    userRole === "super_admin" ||
    meta.role === "admin";

  if (isSuperAdmin) {
    return {
      authorized: true,
      user,
      isSuperAdmin: true,
      companyId: targetCompanyId,
      companyRole: "super_admin",
    };
  }

  // 3. Candidate / Job Seeker Bypass
  const isCandidate =
    userRole === "candidate" ||
    userRole === "job_seeker" ||
    meta.account_type === "candidate" ||
    meta.account_type === "job_seeker";

  if (isCandidate) {
    return {
      authorized: true,
      user,
      isCandidate: true,
    };
  }

  // 4. Tenant User Authorization with Service Role
  const adminClient = createClient(supabaseUrl, serviceKey);

  // If a specific company is requested in the query / body / header
  const companyToCheck = targetCompanyId || req.headers.get("X-Company-ID") || undefined;

  if (companyToCheck) {
    // Verify target company exists and is ACTIVE
    const { data: company, error: compErr } = await adminClient
      .from("companies")
      .select("id, name, status, parent_company_id")
      .eq("id", companyToCheck)
      .maybeSingle();

    if (compErr || !company) {
      return {
        authorized: false,
        status: 403,
        error: "Tenant company not found or permanently deleted",
        code: "COMPANY_NOT_FOUND",
      };
    }

    if (company.status === "inactive" || company.status === "suspended" || company.status === "deleting") {
      return {
        authorized: false,
        status: 403,
        error: "Tenant company is inactive or suspended",
        code: "COMPANY_INACTIVE",
      };
    }

    // Verify user is a registered member or owner
    const allValidCompanyIds = [company.id];
    if (company.parent_company_id) allValidCompanyIds.push(company.parent_company_id);

    const { data: membership } = await adminClient
      .from("company_members")
      .select("member_role, company_id")
      .eq("user_id", user.id)
      .in("company_id", allValidCompanyIds)
      .maybeSingle();

    const { data: owned } = await adminClient
      .from("companies")
      .select("id")
      .eq("id", company.id)
      .or(`owner_user_id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!membership && !owned) {
      return {
        authorized: false,
        status: 403,
        error: "User is not a member of the requested company",
        code: "TENANT_ACCESS_DENIED",
      };
    }

    return {
      authorized: true,
      user,
      companyId: company.id,
      companyRole: membership?.member_role || "owner",
    };
  }

  // General check: verify user has at least one active, non-deleted company
  const { data: userMemberships } = await adminClient
    .from("company_members")
    .select("company_id, member_role, company:companies(id, status)")
    .eq("user_id", user.id);

  const activeCompanies = (userMemberships || [])
    .map((m: any) => m.company)
    .filter((c: any) => c && c.status === "active");

  if (activeCompanies.length === 0) {
    return {
      authorized: false,
      status: 403,
      error: "User does not belong to any active company. Tenant deleted or suspended.",
      code: "TENANT_ACCESS_DENIED",
    };
  }

  return {
    authorized: true,
    user,
    companyId: activeCompanies[0].id,
  };
}
