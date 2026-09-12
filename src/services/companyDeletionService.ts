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

  let result: CompanyDeletionResult | null = null;
  let edgeError: any = null;

  // 2. First attempt: Central Serverless Edge Function (executes storage cleanup + auth.users purge + DB cascade)
  try {
    const { data, error } = await supabase.functions.invoke("delete-company", {
      body: {
        action: "permanent_delete",
        companyId,
      },
    });

    if (!error && data?.success) {
      result = data;
    } else if (error) {
      edgeError = error;
      if (error.message?.includes("Security restriction") || error.message?.includes("الشركة المركزية")) {
        throw new Error("لا يمكن حذف الشركة المركزية للمنصة");
      }
    }
  } catch (err: any) {
    edgeError = err;
    if (err.message?.includes("الشركة المركزية")) throw err;
    console.warn("Edge function delete-company unavailable, attempting database RPC fallback:", err);
  }

  // 3. Fallback: Atomic Database Transaction RPC
  if (!result) {
    const { data: rpcData, error: rpcError } = await supabase.rpc("delete_company_permanently" as any, {
      target_company_id: companyId,
    });

    if (!rpcError && rpcData?.success) {
      result = rpcData;
    } else {
      // Also try previous cascade RPC if delete_company_permanently not yet migrated
      const { data: fallbackData, error: fallbackErr } = await supabase.rpc("delete_company_cascade" as any, {
        target_company_id: companyId,
      });

      if (!fallbackErr && fallbackData?.success) {
        result = fallbackData;
      } else {
        const failureMessage =
          rpcError?.message ||
          fallbackErr?.message ||
          edgeError?.message ||
          "حدث خطأ غير متوقع أثناء محاولة حذف الشركة نهائياً";
        throw new Error(failureMessage);
      }
    }
  }

  // 4. Local state cleanup: clear active company from localStorage if deleted
  try {
    const activeId = localStorage.getItem("tx_active_company_id");
    if (activeId === companyId) {
      localStorage.removeItem("tx_active_company_id");
    }
  } catch (cleanErr) {
    console.warn("Failed to clear tx_active_company_id from localStorage:", cleanErr);
  }

  return result!;
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
