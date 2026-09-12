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

    // 2. Check Super Admin permission (Platform Owner)
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

    // 4. Admin client with full service role privileges
    const adminClient = createClient(supabaseUrl, serviceKey);

    // =========================================================================
    // ACTION: PURGE ORPHANS (Branches, orphaned jobs, and orphaned auth users)
    // =========================================================================
    if (action === "purge_orphans" || companyId === "orphans") {
      // Find all valid parent companies
      const { data: parents } = await adminClient
        .from("companies")
        .select("id")
        .is("parent_company_id", null);

      const parentIds = (parents || []).map((p: any) => p.id);

      // Find all branches
      const { data: allBranches } = await adminClient
        .from("companies")
        .select("id, name, parent_company_id")
        .not("parent_company_id", "is", null);

      const orphanedBranches = (allBranches || []).filter((b: any) => !parentIds.includes(b.parent_company_id));
      const orphanBranchIds = orphanedBranches.map((b: any) => b.id);

      // Set of all valid company IDs (Parents + valid branches)
      const validCompanyIds = new Set([
        ...parentIds,
        ...(allBranches || []).filter((b: any) => parentIds.includes(b.parent_company_id)).map((b: any) => b.id),
      ]);

      // Find all orphaned jobs (jobs whose company_id is not in valid companies)
      const { data: allJobs } = await adminClient.from("jobs").select("id, company_id, title");
      const orphanedJobs = (allJobs || []).filter((j: any) => !validCompanyIds.has(j.company_id));
      const orphanJobIds = orphanedJobs.map((j: any) => j.id);

      // Clean up orphaned jobs and dependent data
      if (orphanJobIds.length > 0) {
        await adminClient.from("applications").delete().in("job_id", orphanJobIds);
        await adminClient.from("interviews").delete().in("job_id", orphanJobIds);
        await adminClient.from("job_offers").delete().in("job_id", orphanJobIds);
        await adminClient.from("jobs").delete().in("id", orphanJobIds);
      }

      // Clean up orphaned branches and their direct records
      if (orphanBranchIds.length > 0) {
        await adminClient.from("jobs").delete().in("company_id", orphanBranchIds);
        await adminClient.from("company_invitations").delete().in("company_id", orphanBranchIds);
        await adminClient.from("company_members").delete().in("company_id", orphanBranchIds);
        await adminClient.from("companies").delete().in("id", orphanBranchIds);
      }

      // Purge orphaned users who have no membership in any valid company
      let purgedUsersCount = 0;
      try {
        const { data: { users: allAuthUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        for (const u of (allAuthUsers || [])) {
          const uEmail = (u.email || "").toLowerCase();
          const isImmune =
            uEmail === "tx@tawzeefx.com" ||
            uEmail === "ctraining801@gmail.com" ||
            u.user_metadata?.role === "super_admin" ||
            u.user_metadata?.account_type === "candidate" ||
            u.user_metadata?.account_type === "job_seeker";

          if (isImmune) continue;

          // Check if user has membership in any valid company
          const { count: validMemberCount } = await adminClient
            .from("company_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", u.id)
            .in("company_id", Array.from(validCompanyIds));

          const { count: validOwnerCount } = await adminClient
            .from("companies")
            .select("id", { count: "exact", head: true })
            .in("id", Array.from(validCompanyIds))
            .or(`owner_user_id.eq.${u.id},user_id.eq.${u.id}`);

          if ((!validMemberCount || validMemberCount === 0) && (!validOwnerCount || validOwnerCount === 0)) {
            console.log(`Purging orphaned user: ${u.email} (${u.id})`);
            await adminClient.auth.admin.signOut(u.id);
            const { error: delErr } = await adminClient.auth.admin.deleteUser(u.id);
            if (delErr) {
              await adminClient.auth.admin.updateUserById(u.id, {
                ban_duration: "876000h",
                user_metadata: { banned: true, reason: "Orphan user purged" },
              });
            }
            await adminClient.from("profiles").delete().eq("user_id", u.id);
            await adminClient.from("user_roles").delete().eq("user_id", u.id);
            purgedUsersCount++;
          }
        }
      } catch (userPurgeErr) {
        console.warn("Error during orphan user purge scan:", userPurgeErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          purged_branches_count: orphanBranchIds.length,
          purged_jobs_count: orphanJobIds.length,
          purged_users_count: purgedUsersCount,
          purged_branches: orphanedBranches.map((o: any) => o.name),
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

    // =========================================================================
    // CASCADE DELETION OF TARGET COMPANY & ALL CHILD BRANCHES
    // =========================================================================

    // A. Collect all child branches
    const { data: branches } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("parent_company_id", companyId);

    const allCompanyIds = [companyId, ...(branches || []).map((b: any) => b.id)];

    // B. Collect and purge exclusive company users from auth.users & revoke sessions
    const { data: memberRows } = await adminClient
      .from("company_members")
      .select("user_id")
      .in("company_id", allCompanyIds);

    const { data: ownerRows } = await adminClient
      .from("companies")
      .select("owner_user_id, user_id")
      .in("id", allCompanyIds);

    const candidateUserIds = Array.from(
      new Set([
        ...(memberRows || []).map((m: any) => m.user_id),
        ...(ownerRows || []).map((o: any) => o.owner_user_id),
        ...(ownerRows || []).map((o: any) => o.user_id),
      ].filter(Boolean))
    );

    let purgedUsersCount = 0;

    for (const uId of candidateUserIds) {
      try {
        const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(uId);
        if (targetUser) {
          const uEmail = (targetUser.email || "").toLowerCase();
          const isSuper =
            uEmail === "tx@tawzeefx.com" ||
            uEmail === "ctraining801@gmail.com" ||
            targetUser.user_metadata?.role === "super_admin";

          if (isSuper) {
            continue; // Never delete platform Super Admin
          }
        }

        // Check if user belongs to other companies outside this deletion scope
        const { count: otherCompaniesCount } = await adminClient
          .from("company_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uId)
          .not("company_id", "in", `(${allCompanyIds.join(",")})`);

        if (otherCompaniesCount && otherCompaniesCount > 0) {
          continue; // Keep user account for their other companies
        }

        // 1. Immediately revoke all active sessions and refresh tokens
        await adminClient.auth.admin.signOut(uId);

        // 2. Permanently delete user from Supabase Auth
        const { error: delUserErr } = await adminClient.auth.admin.deleteUser(uId);
        if (delUserErr) {
          console.warn(`deleteUser failed for ${uId}, applying 100-year ban fallback:`, delUserErr);
          await adminClient.auth.admin.updateUserById(uId, {
            ban_duration: "876000h",
            user_metadata: { banned: true, reason: "Company permanently deleted" },
          });
        }

        // 3. Clean up user profile and role tables
        await adminClient.from("profiles").delete().eq("user_id", uId);
        await adminClient.from("user_roles").delete().eq("user_id", uId);
        await adminClient.from("activity_log").delete().eq("user_id", uId);

        purgedUsersCount++;
      } catch (userPurgeErr) {
        console.error(`Error purging user ${uId}:`, userPurgeErr);
      }
    }

    // C. Collect all associated jobs
    const { data: jobs } = await adminClient
      .from("jobs")
      .select("id")
      .in("company_id", allCompanyIds);

    const jobIds = (jobs || []).map((j: any) => j.id);

    // D. Cascade delete across all dependent tables in topological order
    if (jobIds.length > 0) {
      await adminClient.from("candidate_checklists").delete().in("job_id", jobIds);
      await adminClient.from("interviews").delete().in("job_id", jobIds);
      await adminClient.from("job_offers").delete().in("job_id", jobIds);
      await adminClient.from("applications").delete().in("job_id", jobIds);
    }

    await adminClient.from("candidate_checklists").delete().in("company_id", allCompanyIds);
    await adminClient.from("agency_assignments").delete().in("company_id", allCompanyIds);
    await adminClient.from("interviews").delete().in("company_id", allCompanyIds);
    await adminClient.from("job_offers").delete().in("company_id", allCompanyIds);
    await adminClient.from("applications").delete().in("company_id", allCompanyIds);
    await adminClient.from("candidates").delete().in("company_id", allCompanyIds);
    await adminClient.from("jobs").delete().in("company_id", allCompanyIds);
    await adminClient.from("pipeline_sub_stages").delete().in("company_id", allCompanyIds);
    await adminClient.from("pipeline_stages").delete().in("company_id", allCompanyIds);
    await adminClient.from("question_bank").delete().in("company_id", allCompanyIds);
    await adminClient.from("talent_pool").delete().in("company_id", allCompanyIds);
    await adminClient.from("notification_templates").delete().in("company_id", allCompanyIds);
    await adminClient.from("company_invitations").delete().in("company_id", allCompanyIds);
    await adminClient.from("company_subscriptions").delete().in("company_id", allCompanyIds);
    await adminClient.from("company_invoices").delete().in("company_id", allCompanyIds);
    await adminClient.from("subscription_upgrade_requests").delete().in("company_id", allCompanyIds);
    await adminClient.from("company_members").delete().in("company_id", allCompanyIds);

    // Decouple audit logs
    await adminClient.from("audit_log").update({ company_id: null }).in("company_id", allCompanyIds);

    // Delete child branches first
    if (branches && branches.length > 0) {
      await adminClient.from("companies").delete().eq("parent_company_id", companyId);
    }

    // Delete target parent company
    const { error: finalDelErr } = await adminClient.from("companies").delete().eq("id", companyId);
    if (finalDelErr) {
      throw finalDelErr;
    }

    // Record audit trail entry
    await adminClient.from("audit_log").insert({
      user_id: user.id,
      action: "COMPANY_CASCADE_DELETED",
      resource: "companies",
      details: {
        company_id: companyId,
        company_name: targetCompany.name,
        deleted_branches_count: branches?.length || 0,
        deleted_users_count: purgedUsersCount,
        deleted_jobs_count: jobIds.length,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        deleted_company_id: companyId,
        deleted_company_name: targetCompany.name,
        deleted_branches_count: branches?.length || 0,
        deleted_users_count: purgedUsersCount,
        deleted_jobs_count: jobIds.length,
        message: "Company, branches, jobs, and all exclusive users permanently deleted",
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
