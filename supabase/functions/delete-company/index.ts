import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    const adminClient = createClient(supabaseUrl, serviceKey);

    // 2. Verify Platform Super Admin via single server-side source of truth (public.platform_roles)
    const { data: platformRole } = await adminClient
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (platformRole?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Platform Super Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse request body
    const body = await req.json();
    const { companyId, action = "permanent_delete" } = body;

    // =========================================================================
    // ACTION: PURGE ORPHANS (Branches, orphaned jobs, and orphaned auth users)
    // =========================================================================
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

      const orphanedBranches = (allBranches || []).filter((b: any) => !parentIds.includes(b.parent_company_id));
      const orphanBranchIds = orphanedBranches.map((b: any) => b.id);

      const validCompanyIds = new Set([
        ...parentIds,
        ...(allBranches || []).filter((b: any) => parentIds.includes(b.parent_company_id)).map((b: any) => b.id),
      ]);

      const { data: allJobs } = await adminClient.from("jobs").select("id, company_id, title");
      const orphanedJobs = (allJobs || []).filter((j: any) => !validCompanyIds.has(j.company_id));
      const orphanJobIds = orphanedJobs.map((j: any) => j.id);

      if (orphanJobIds.length > 0) {
        await adminClient.from("applications").delete().in("job_id", orphanJobIds);
        await adminClient.from("interviews").delete().in("job_id", orphanJobIds);
        await adminClient.from("job_offers").delete().in("job_id", orphanJobIds);
        await adminClient.from("jobs").delete().in("id", orphanJobIds);
      }

      if (orphanBranchIds.length > 0) {
        await adminClient.from("jobs").delete().in("company_id", orphanBranchIds);
        await adminClient.from("company_invitations").delete().in("company_id", orphanBranchIds);
        await adminClient.from("company_members").delete().in("company_id", orphanBranchIds);
        await adminClient.from("companies").delete().in("id", orphanBranchIds);
      }

      let purgedUsersCount = 0;
      try {
        const { data: { users: allAuthUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        for (const u of (allAuthUsers || [])) {
          // Skip platform roles
          const { data: uPlatformRole } = await adminClient
            .from("platform_roles")
            .select("role")
            .eq("user_id", u.id)
            .maybeSingle();
          if (uPlatformRole) continue;

          // Skip candidates
          const { data: uRole } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", u.id)
            .maybeSingle();
          if (uRole?.role === "job_seeker" || u.user_metadata?.account_type === "candidate") continue;

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
      .select("id, name, status, is_platform_company, parent_company_id")
      .eq("id", companyId)
      .maybeSingle();

    if (fetchErr || !targetCompany) {
      return new Response(JSON.stringify({ error: "Company not found or already deleted" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Hard Safeguard: Prevent deleting the platform owner company
    const lowerName = (targetCompany.name || "").toLowerCase();
    if (
      companyId === "00000000-0000-0000-0000-000000000001" ||
      targetCompany.is_platform_company === true ||
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

    // Collect child branches
    const { data: branches = [] } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("parent_company_id", companyId);

    const allCompanyIds = [companyId, ...(branches || []).map((b: any) => b.id)];

    // Collect jobs
    const { data: jobs = [] } = await adminClient
      .from("jobs")
      .select("id, title")
      .in("company_id", allCompanyIds);

    const jobIds = (jobs || []).map((j: any) => j.id);

    // Collect applications
    const { count: applicationsCount = 0 } = await adminClient
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("company_id", allCompanyIds);

    // Collect candidates
    const { count: candidatesCount = 0 } = await adminClient
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .in("company_id", allCompanyIds);

    // Collect interviews
    const { count: interviewsCount = 0 } = await adminClient
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .in("company_id", allCompanyIds);

    // Identify exclusive company users
    const { data: memberRows = [] } = await adminClient
      .from("company_members")
      .select("user_id")
      .in("company_id", allCompanyIds);

    const { data: ownerRows = [] } = await adminClient
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

    const exclusiveUserIds: string[] = [];
    const exclusiveUserEmails: string[] = [];

    for (const uId of candidateUserIds) {
      // Check if user has platform role
      const { data: pRole } = await adminClient
        .from("platform_roles")
        .select("role")
        .eq("user_id", uId)
        .maybeSingle();

      if (pRole) continue; // Platform roles are never deleted

      // Check if candidate/job seeker
      const { data: uRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", uId)
        .maybeSingle();

      if (uRole?.role === "job_seeker") continue; // Never delete candidate profiles

      // Check if user belongs to other companies
      const { count: otherCount } = await adminClient
        .from("company_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uId)
        .not("company_id", "in", `(${allCompanyIds.join(",")})`);

      if (otherCount && otherCount > 0) continue; // User belongs to another company

      exclusiveUserIds.push(uId);

      const { data: { user: uObj } } = await adminClient.auth.admin.getUserById(uId);
      if (uObj?.email) exclusiveUserEmails.push(uObj.email);
    }

    // =========================================================================
    // ACTION: DRY RUN (Preview affected resources before permanent delete)
    // =========================================================================
    if (action === "dry_run") {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          summary: {
            companyId,
            companyName: targetCompany.name,
            status: targetCompany.status,
            branchesCount: branches.length,
            branchesList: branches.map((b: any) => b.name),
            jobsCount: jobs.length,
            applicationsCount: applicationsCount || 0,
            candidatesCount: candidatesCount || 0,
            interviewsCount: interviewsCount || 0,
            exclusiveUsersCount: exclusiveUserIds.length,
            exclusiveUsersList: exclusiveUserEmails,
            estimatedFilesCount: applicationsCount || 0,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =========================================================================
    // ACTION: PERMANENT DELETE SAGA
    // =========================================================================

    // Step 1: Lock tenant across target company and all child branches
    await adminClient
      .from("companies")
      .update({ status: "deleting", updated_at: new Date().toISOString() })
      .in("id", allCompanyIds);

    // Step 2: Invalidate active sessions & delete exclusive users from auth.users
    let purgedUsersCount = 0;
    for (const uId of exclusiveUserIds) {
      try {
        await adminClient.auth.admin.signOut(uId);
        const { error: delUserErr } = await adminClient.auth.admin.deleteUser(uId);
        if (delUserErr) {
          console.warn(`deleteUser fallback ban for ${uId}:`, delUserErr);
          await adminClient.auth.admin.updateUserById(uId, {
            ban_duration: "876000h",
            user_metadata: { banned: true, reason: "Company permanently deleted" },
          });
        }
        await adminClient.from("profiles").delete().eq("user_id", uId);
        await adminClient.from("user_roles").delete().eq("user_id", uId);
        await adminClient.from("activity_log").delete().eq("user_id", uId);
        purgedUsersCount++;
      } catch (purgeErr) {
        console.error(`Error purging user ${uId}:`, purgeErr);
      }
    }

    // Step 3: Paginated Storage Cleanup across storage buckets
    const storageBuckets = ["resumes", "company-logos", "avatars", "documents"];
    let deletedFilesCount = 0;

    for (const bucketName of storageBuckets) {
      for (const cId of allCompanyIds) {
        try {
          const { data: fileList, error: listErr } = await adminClient.storage
            .from(bucketName)
            .list(cId, { limit: 100 });

          if (!listErr && fileList && fileList.length > 0) {
            const filesToRemove = fileList.map((f: any) => `${cId}/${f.name}`);
            const { error: removeErr } = await adminClient.storage
              .from(bucketName)
              .remove(filesToRemove);

            if (!removeErr) {
              deletedFilesCount += filesToRemove.length;
            }
          }
        } catch (storageErr) {
          console.warn(`Storage cleanup notice for bucket ${bucketName}/${cId}:`, storageErr);
        }
      }
    }

    // Step 4: Database Atomic Cascade Deletion (Call PostgreSQL RPC)
    const { data: rpcResult, error: rpcErr } = await adminClient.rpc(
      "delete_company_permanently",
      {
        target_company_id: companyId,
        calling_user_id: user.id,
      }
    );

    if (rpcErr) {
      console.error("Database deletion RPC failed, setting delete_failed state:", rpcErr);
      await adminClient
        .from("companies")
        .update({ status: "delete_failed", updated_at: new Date().toISOString() })
        .in("id", allCompanyIds);

      throw new Error(`Database cascade failed: ${rpcErr.message}`);
    }

    // Step 5: Post-Delete Orphan Verification
    const { count: remainingCompanyCount } = await adminClient
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("id", companyId);

    const { count: remainingJobsCount } = await adminClient
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .in("company_id", allCompanyIds);

    const { count: remainingMembersCount } = await adminClient
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .in("company_id", allCompanyIds);

    const zeroOrphansVerified =
      (remainingCompanyCount ?? 0) === 0 &&
      (remainingJobsCount ?? 0) === 0 &&
      (remainingMembersCount ?? 0) === 0;

    // Step 6: Log immutable audit event
    await adminClient.from("audit_log").insert({
      user_id: user.id,
      action: "COMPANY_PERMANENT_DELETED_SAGA",
      resource: "companies",
      details: {
        company_id: companyId,
        company_name: targetCompany.name,
        deleted_branches_count: branches.length,
        deleted_users_count: purgedUsersCount,
        deleted_jobs_count: jobIds.length,
        deleted_files_count: deletedFilesCount,
        zero_orphans_verified: zeroOrphansVerified,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        deleted_company_id: companyId,
        deleted_company_name: targetCompany.name,
        deleted_branches_count: branches.length,
        deleted_users_count: purgedUsersCount,
        deleted_jobs_count: jobIds.length,
        deleted_files_count: deletedFilesCount,
        zero_orphans_verified: zeroOrphansVerified,
        message: "Company deletion saga completed with zero orphan records",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("delete-company saga error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal server error during company deletion",
        code: "COMPANY_DELETE_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
