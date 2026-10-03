import { supabase } from "@/integrations/supabase/client";

export interface CompanyDeletionResult {
  success: boolean;
  deleted_company_id: string;
  deleted_company_name?: string;
  deleted_branches_count?: number;
  deleted_users_count?: number;
  deleted_jobs_count?: number;
  message?: string;
}

/**
 * Centralized Permanent Delete Service for Tawzeef-X
 * This is the SINGLE canonical entry point for permanently deleting a tenant company,
 * its child branches, all operational records, and purging exclusive user accounts.
 */
export async function deleteCompanyPermanently(companyId: string): Promise<CompanyDeletionResult> {
  if (!companyId || companyId.trim() === "") {
    throw new Error("Target company ID is required");
  }

  // 1. Hard Safeguard against Platform Owner company
  if (companyId === "00000000-0000-0000-0000-000000000001") {
    throw new Error("Security Restriction: Platform Owner company cannot be deleted");
  }

  // The server verifies the caller and coordinates deletion. Failure stops here.
  const { data, error } = await supabase.functions.invoke("delete-company", {
    body: { action: "permanent_delete", companyId },
  });
  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "تعذر إكمال حذف الشركة عبر خدمة الخادم");
  }
  const result = data as CompanyDeletionResult;

  // 4. Local state cleanup: clear active company from localStorage if deleted
  try {
    const activeId = localStorage.getItem("tx_active_company_id");
    if (activeId === companyId) {
      localStorage.removeItem("tx_active_company_id");
    }
  } catch (cleanErr) {
    console.warn("Failed to clear tx_active_company_id from localStorage:", cleanErr);
  }

  return result;
}

export interface OrphanPurgeResult {
  success: boolean;
  purged_branches_count: number;
  purged_jobs_count: number;
  purged_users_count: number;
}

export async function purgeOrphanedBranches(): Promise<OrphanPurgeResult> {
  const { data, error } = await supabase.functions.invoke("delete-company", {
    body: { action: "purge_orphans" },
  });
  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "تعذر تطهير الفروع عبر خدمة الخادم");
  }
  return data as OrphanPurgeResult;
}

export interface CompanyDeletionDryRunResult {
  success: boolean;
  dryRun: true;
  summary: {
    companyId: string;
    companyName: string;
    status: string;
    branchesCount: number;
    branchesList: string[];
    jobsCount: number;
    applicationsCount: number;
    candidatesCount: number;
    interviewsCount: number;
    exclusiveUsersCount: number;
    exclusiveUsersList: string[];
    estimatedFilesCount: number;
  };
}

/**
 * Dry Run preview of permanent deletion - shows exact counts of resources
 * that will be deleted WITHOUT modifying any data.
 */
export async function previewCompanyDeletion(companyId: string): Promise<CompanyDeletionDryRunResult> {
  if (!companyId || companyId.trim() === "") {
    throw new Error("Target company ID is required");
  }

  const { data, error } = await supabase.functions.invoke("delete-company", {
    body: {
      action: "dry_run",
      companyId,
    },
  });

  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || "فشل إجراء المعاينة المسبقة لحذف الشركة");
  }

  return data as CompanyDeletionDryRunResult;
}

/**
 * Deactivate Company Service (Preserves all data, blocks login)
 */
export async function deactivateCompany(companyId: string): Promise<void> {
  if (!companyId) throw new Error("Company ID is required");

  // Deactivate parent company
  const { error: parentErr } = await supabase
    .from("companies" as any)
    .update({ status: "inactive" })
    .eq("id", companyId);

  if (parentErr) throw parentErr;

  // Deactivate all child branches
  await supabase
    .from("companies" as any)
    .update({ status: "inactive" })
    .eq("parent_company_id", companyId);
}

/**
 * Reactivate Company Service (Restores login and operational access)
 */
export async function reactivateCompany(companyId: string): Promise<void> {
  if (!companyId) throw new Error("Company ID is required");

  // Activate parent company
  const { error: parentErr } = await supabase
    .from("companies" as any)
    .update({ status: "active" })
    .eq("id", companyId);

  if (parentErr) throw parentErr;

  // Activate all child branches
  await supabase
    .from("companies" as any)
    .update({ status: "active" })
    .eq("parent_company_id", companyId);
}
