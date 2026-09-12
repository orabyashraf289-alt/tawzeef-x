import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Authenticate calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check Super Admin permission
    const isSuperAdmin =
      ["tx@tawzeefx.com", "ctraining801@gmail.com"].includes(user.email || "") ||
      user.user_metadata?.role === "super_admin" ||
      user.user_metadata?.role === "admin";

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Super Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse request body
    const body = await req.json();
    const { companyId, action } = body;

    // 4. Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceKey);

    // SPECIAL ACTION: Purge all orphaned branches
    if (action === "purge_orphans" || companyId === "orphans") {
      const { data: parents } = await adminClient
        .from("companies")
        .select("id")
        .is("parent_company_id", null);

      const parentIds = (parents || []).map((p: any) => p.id);

      const { data: allBranches } = await adminClient
        .from("companies")
        .select("id, name, parent_company_id")
        .not("parent_company_id", "is", null);

      const orphaned = (allBranches || []).filter((b: any) => !parentIds.includes(b.parent_company_id));
      const orphanIds = orphaned.map((b: any) => b.id);

      if (orphanIds.length > 0) {
        await adminClient.from("jobs").delete().in("company_id", orphanIds);
        await adminClient.from("company_invitations").delete().in("company_id", orphanIds);
        await adminClient.from("company_members").delete().in("company_id", orphanIds);
        await adminClient.from("companies").delete().in("id", orphanIds);
      }

      return new Response(
        JSON.stringify({
          success: true,
          purged_count: orphanIds.length,
          purged_names: orphaned.map((o: any) => o.name),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!companyId) {
      return new Response(JSON.stringify({ error: "Missing companyId parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve target company info
    const { data: targetCompany, error: fetchErr } = await adminClient
      .from("companies")
      .select("id, name, parent_company_id")
      .eq("id", companyId)
      .maybeSingle();

    if (fetchErr || !targetCompany) {
      return new Response(JSON.stringify({ error: "Company not found or already deleted" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Hard Safeguard: Prevent deleting the platform owner company
    const lowerName = (targetCompany.name || "").toLowerCase();
    if (
      companyId === "00000000-0000-0000-0000-000000000001" ||
      lowerName.includes("tawzeef") ||
      targetCompany.name?.includes("توظيف إكس")
    ) {
      return new Response(
        JSON.stringify({ error: "Security restriction: Platform Owner company cannot be deleted" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Execute RPC cascade deletion if available, or admin direct cascade
    const { data: rpcResult, error: rpcError } = await adminClient.rpc("delete_company_cascade", {
      target_company_id: companyId,
    });

    if (!rpcError) {
      return new Response(JSON.stringify(rpcResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct Service Role Cascade Fallback
    console.warn("RPC failed, executing service role direct cascade:", rpcError);

    // Find all branches
    const { data: branches } = await adminClient
      .from("companies")
      .select("id")
      .eq("parent_company_id", companyId);

    const allIds = [companyId, ...(branches || []).map((b) => b.id)];

    // Cascade delete across dependent tables using service role
    await adminClient.from("jobs").delete().in("company_id", allIds);
    await adminClient.from("company_invitations").delete().in("company_id", allIds);
    await adminClient.from("company_members").delete().in("company_id", allIds);
    await adminClient.from("companies").delete().eq("parent_company_id", companyId);
    const { error: finalDelErr } = await adminClient.from("companies").delete().eq("id", companyId);

    if (finalDelErr) {
      throw finalDelErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_company_id: companyId,
        deleted_branches_count: branches?.length || 0,
        message: "Company deleted successfully via service role fallback",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("delete-company error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
