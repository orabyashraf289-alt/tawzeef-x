/**
 * scripts/data-integrity-scan.cjs
 *
 * Data Integrity Scan & Cleanup Tool for Tawzeef-X Multi-Tenancy
 *
 * Usage:
 *   node scripts/data-integrity-scan.cjs --scan      (Read-only inspection)
 *   node scripts/data-integrity-scan.cjs --cleanup   (Purge orphans & legacy remnants)
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// 1. Load Environment Configuration
const envPath = path.resolve(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
  console.error("Error: .env file not found at " + envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const [k, ...rest] = line.split("=");
  if (k && rest.length) env[k.trim()] = rest.join("=").trim().replace(/^[\"\']|[\"\']$/g, "");
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const isCleanupMode = args.includes("--cleanup");

async function run() {
  console.log("===============================================================================");
  console.log(" Tawzeef-X Multi-Tenancy Data Integrity Scanner");
  console.log(" Mode: " + (isCleanupMode ? "CLEANUP (PURGE ORPHANS)" : "SCAN ONLY (NON-DESTRUCTIVE)"));
  console.log(" Timestamp: " + new Date().toISOString());
  console.log("===============================================================================\n");

  try {
    // 1. Fetch all companies
    const { data: companies, error: compErr } = await supabase
      .from("companies")
      .select("id, name, status, parent_company_id, created_at");

    if (compErr) {
      console.error("Error fetching companies:", compErr.message);
    }

    const companyMap = new Map((companies || []).map((c) => [c.id, c]));
    console.log(`[1] Total Companies Registered: ${(companies || []).length}`);
    (companies || []).forEach((c) => {
      console.log(`    - ID: ${c.id} | Name: "${c.name}" | Status: ${c.status} | Parent: ${c.parent_company_id || "None"}`);
    });

    // 2. Identify Orphaned Branches (parent_company_id points to nonexistent company)
    const orphanBranches = (companies || []).filter(
      (c) => c.parent_company_id && !companyMap.has(c.parent_company_id)
    );
    console.log(`\n[2] Orphaned Child Branches: ${orphanBranches.length}`);
    orphanBranches.forEach((ob) => {
      console.log(`    - ID: ${ob.id} | Name: "${ob.name}" | Dead Parent ID: ${ob.parent_company_id}`);
    });

    // 3. Inspect Jobs for Orphan records
    const { data: jobs, error: jobErr } = await supabase
      .from("jobs")
      .select("id, title, company_id, location, status, created_at");

    if (jobErr) {
      console.error("Error fetching jobs:", jobErr.message);
    }

    const orphanJobs = (jobs || []).filter((j) => !companyMap.has(j.company_id));
    const andalusJobs = (jobs || []).filter(
      (j) =>
        (j.title && j.title.includes("الأندلس")) ||
        (j.location && j.location.includes("الأندلس")) ||
        j.company_id === "f06dacc5-bdb4-4389-9163-a9e64b301db9"
    );

    console.log(`\n[3] Total Jobs: ${(jobs || []).length}`);
    console.log(`    Orphan Jobs (company_id missing): ${orphanJobs.length}`);
    orphanJobs.forEach((oj) => {
      console.log(`    - Job ID: ${oj.id} | Title: "${oj.title}" | Dead Company ID: ${oj.company_id} | Loc: ${oj.location}`);
    });
    console.log(`    Al-Andalus Related Jobs: ${andalusJobs.length}`);
    andalusJobs.forEach((aj) => {
      console.log(`    - Al-Andalus Job ID: ${aj.id} | Title: "${aj.title}" | Company ID: ${aj.company_id} | Loc: ${aj.location}`);
    });

    // 4. Inspect Profiles and Company Members
    const { data: members } = await supabase
      .from("company_members")
      .select("id, company_id, user_id, member_role, created_at");

    const orphanMembers = (members || []).filter((m) => !companyMap.has(m.company_id));
    console.log(`\n[4] Total Company Memberships: ${(members || []).length}`);
    console.log(`    Orphan Memberships (company_id missing): ${orphanMembers.length}`);

    // 5. Inspect Candidates
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, first_name, last_name, company_id, email, status");

    const orphanCandidates = (candidates || []).filter((c) => !companyMap.has(c.company_id));
    console.log(`\n[5] Total Candidates: ${(candidates || []).length}`);
    console.log(`    Orphan Candidates: ${orphanCandidates.length}`);

    // 6. Inspect Specific Al-Andalus Remnants
    console.log("\n[6] Al-Andalus Remnants Check:");
    const andalusCompanies = (companies || []).filter(
      (c) =>
        (c.name && c.name.includes("الأندلس")) ||
        c.id === "f06dacc5-bdb4-4389-9163-a9e64b301db9"
    );
    console.log(`    - Al-Andalus Companies Found: ${andalusCompanies.length}`);
    andalusCompanies.forEach((ac) => {
      console.log(`      * Company ID: ${ac.id} | Name: "${ac.name}" | Status: ${ac.status}`);
    });

    // 7. Cleanup execution if requested
    if (isCleanupMode) {
      console.log("\n===============================================================================");
      console.log(" EXECUTING CLEANUP PROCEDURE");
      console.log("===============================================================================");

      // A. Invoke Edge Function with purge_orphans if possible
      try {
        console.log("Calling Edge Function delete-company [action: purge_orphans]...");
        const { data: edgeData, error: edgeCallErr } = await supabase.functions.invoke("delete-company", {
          body: { action: "purge_orphans" },
        });

        if (!edgeCallErr && edgeData?.success) {
          console.log("Edge Function purge_orphans succeeded:", edgeData);
        } else {
          console.warn("Edge Function purge_orphans returned:", edgeCallErr || edgeData);
        }
      } catch (e) {
        console.warn("Edge function invocation failed, proceeding with direct purge:", e.message);
      }

      // B. Purge specific orphan jobs (e.g. Al-Andalus orphan job)
      if (orphanJobs.length > 0) {
        for (const oj of orphanJobs) {
          console.log(`Deleting orphan job ID: ${oj.id} ("${oj.title}")...`);
          const { error: delJobErr } = await supabase.from("jobs").delete().eq("id", oj.id);
          if (delJobErr) {
            console.error(`Failed to delete job ${oj.id}:`, delJobErr.message);
          } else {
            console.log(`Successfully deleted job ${oj.id}`);
          }
        }
      }

      // C. Purge orphan branches if any
      if (orphanBranches.length > 0) {
        for (const ob of orphanBranches) {
          console.log(`Deleting orphan branch ID: ${ob.id} ("${ob.name}")...`);
          const { error: delBranchErr } = await supabase.from("companies").delete().eq("id", ob.id);
          if (delBranchErr) {
            console.error(`Failed to delete branch ${ob.id}:`, delBranchErr.message);
          } else {
            console.log(`Successfully deleted branch ${ob.id}`);
          }
        }
      }

      console.log("\nCleanup procedure finished. Running verification scan...");
      const { data: remainingJobs } = await supabase.from("jobs").select("id, title, company_id");
      const remainingOrphanJobs = (remainingJobs || []).filter((j) => !companyMap.has(j.company_id));
      console.log(`Remaining orphan jobs: ${remainingOrphanJobs.length}`);
    }

    console.log("\n===============================================================================");
    console.log(" Data Integrity Scan Complete");
    console.log("===============================================================================");
  } catch (err) {
    console.error("Fatal error during scan:", err);
  }
}

run();
