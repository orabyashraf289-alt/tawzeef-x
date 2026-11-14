import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";

export type RequisitionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "converted"
  | "closed";

export type RequisitionPriority = "low" | "medium" | "high" | "urgent";

export type RequisitionCurrency = "SAR" | "EGP" | "USD";

export type ApprovalDecision = "pending" | "approved" | "rejected";

export interface CompanyDepartment {
  id: string;
  company_id: string;
  name: string;
  branch_name: string | null;
  cost_center: string | null;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobRequisition {
  id: string;
  company_id: string;
  department_id: string | null;
  branch_name: string | null;
  title: string;
  employment_type: string;
  headcount_requested: number;
  headcount_filled: number;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  priority: RequisitionPriority;
  target_start_date: string | null;
  justification: string | null;
  requirements: string | string[] | null;
  status: RequisitionStatus;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  linked_job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequisitionApproval {
  id: string;
  company_id: string;
  requisition_id: string;
  step_order: number;
  approver_user_id: string | null;
  decision: ApprovalDecision | string;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface CreateDepartmentInput {
  name: string;
  branch_name?: string | null;
  cost_center?: string | null;
  manager_user_id?: string | null;
  is_active?: boolean;
}

export interface UpdateDepartmentInput extends CreateDepartmentInput {
  id: string;
}

export interface CreateRequisitionInput {
  title: string;
  department_id?: string | null;
  branch_name?: string | null;
  employment_type: string;
  headcount_requested: number;
  budget_min?: number | null;
  budget_max?: number | null;
  currency: RequisitionCurrency;
  priority: RequisitionPriority;
  target_start_date?: string | null;
  justification?: string | null;
  requirements?: string | null;
  submitImmediately?: boolean;
}

export interface UpdateRequisitionInput extends Omit<CreateRequisitionInput, "submitImmediately"> {
  id: string;
  submitImmediately?: boolean;
}

export interface CurrencyBudgetTotal {
  currency: string;
  total: number;
}

export interface RequisitionKpiSummary {
  totalRequestedHeadcount: number;
  filledHeadcount: number;
  openHeadcount: number;
  pendingApprovalCount: number;
  pendingApprovalHeadcount: number;
  estimatedBudgetByCurrency: CurrencyBudgetTotal[];
}

export interface RequisitionPermissions {
  canCreate: boolean;
  canApprove: boolean;
  canConvert: boolean;
  canManageDepartments: boolean;
  isViewerOnly: boolean;
}

export interface ConvertRequisitionResult {
  jobId: string | null;
  raw: unknown;
}

type RequisitionTableName = "company_departments" | "job_requisitions" | "requisition_approvals";

type RequisitionRpcName =
  | "submit_job_requisition"
  | "decide_job_requisition"
  | "convert_requisition_to_job";

interface SupabaseErrorLike {
  message: string;
  code?: string;
  details?: string;
}

interface SupabaseQueryResult<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

interface RequisitionQueryBuilder<TRow, TResult = TRow[]>
  extends PromiseLike<SupabaseQueryResult<TResult>> {
  select: (columns?: string) => RequisitionQueryBuilder<TRow, TRow[]>;
  eq: (column: string, value: string | boolean | number) => RequisitionQueryBuilder<TRow, TResult>;
  neq: (column: string, value: string | boolean | number) => RequisitionQueryBuilder<TRow, TResult>;
  in: (column: string, values: string[]) => RequisitionQueryBuilder<TRow, TResult>;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => RequisitionQueryBuilder<TRow, TResult>;
  single: () => Promise<SupabaseQueryResult<TRow>>;
  maybeSingle: () => Promise<SupabaseQueryResult<TRow>>;
}

interface RequisitionTableClient<TRow> {
  select: (columns?: string) => RequisitionQueryBuilder<TRow, TRow[]>;
  insert: (
    values: Record<string, unknown> | Record<string, unknown>[],
  ) => RequisitionQueryBuilder<TRow, TRow[]>;
  update: (values: Record<string, unknown>) => RequisitionQueryBuilder<TRow, TRow[]>;
  delete: () => RequisitionQueryBuilder<TRow, TRow[]>;
}

interface RequisitionSupabaseClient {
  from: <TRow>(table: RequisitionTableName) => RequisitionTableClient<TRow>;
  rpc: <TResult = unknown>(
    fn: RequisitionRpcName,
    args: Record<string, unknown>,
  ) => Promise<SupabaseQueryResult<TResult>>;
}

/**
 * Single typed wrapper over the Supabase client for Phase 1 requisition tables and RPCs
 * not yet reflected in generated Database types.
 */
export function requisitionDb(): RequisitionSupabaseClient {
  return supabase as unknown as RequisitionSupabaseClient;
}

function isValidId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "" && value !== "undefined" && value !== "null";
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim() !== "") return msg;
  }
  return fallback;
}

function toDbError(error: SupabaseErrorLike, fallback: string): Error {
  return new Error(error.message?.trim() ? error.message : fallback);
}

function extractConvertedJobId(data: unknown): string | null {
  if (typeof data === "string" && data.trim() !== "") {
    return data.trim();
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.job_id === "string" && record.job_id.trim() !== "") {
      return record.job_id.trim();
    }
    if (typeof record.linked_job_id === "string" && record.linked_job_id.trim() !== "") {
      return record.linked_job_id.trim();
    }
    if (typeof record.id === "string" && record.id.trim() !== "") {
      return record.id.trim();
    }
  }
  return null;
}

/**
 * Normalizes requirements stored either as multiline text or as a string array.
 */
export function normalizeRequirementsText(value: string | string[] | null | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim() !== "").join("\n");
  }
  return value;
}

/**
 * Formats a numeric budget amount with localized currency display.
 */
export function formatCurrencyAmount(
  amount: number,
  currency: string,
  locale: "ar" | "en" = "ar",
): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  const normalizedCurrency = (currency || "SAR").toUpperCase();
  const formattedNumber = safeAmount.toLocaleString(locale === "ar" ? "ar-SA" : "en-US");
  if (locale === "ar") {
    if (normalizedCurrency === "SAR") return `${formattedNumber} ر.س`;
    if (normalizedCurrency === "EGP") return `${formattedNumber} ج.م`;
    if (normalizedCurrency === "USD") return `${formattedNumber} $`;
  }
  return `${formattedNumber} ${normalizedCurrency}`;
}

/**
 * Computes manpower and budget KPIs from company job requisitions.
 */
export function computeRequisitionKpis(requisitions: JobRequisition[]): RequisitionKpiSummary {
  const nonRejected = requisitions.filter((r) => r.status !== "rejected");
  const active = requisitions.filter((r) => r.status !== "rejected" && r.status !== "closed");

  const totalRequestedHeadcount = nonRejected.reduce(
    (sum, r) => sum + Math.max(0, Number(r.headcount_requested) || 0),
    0,
  );
  const filledHeadcount = nonRejected.reduce(
    (sum, r) => sum + Math.max(0, Number(r.headcount_filled) || 0),
    0,
  );
  const openHeadcount = active.reduce((sum, r) => {
    const requested = Math.max(0, Number(r.headcount_requested) || 0);
    const filled = Math.max(0, Number(r.headcount_filled) || 0);
    return sum + Math.max(0, requested - filled);
  }, 0);

  const pendingRequisitions = requisitions.filter((r) => r.status === "pending_approval");
  const pendingApprovalCount = pendingRequisitions.length;
  const pendingApprovalHeadcount = pendingRequisitions.reduce(
    (sum, r) => sum + Math.max(0, Number(r.headcount_requested) || 0),
    0,
  );

  const budgetMap = new Map<string, number>();
  for (const req of active) {
    const maxVal = req.budget_max ?? req.budget_min;
    if (maxVal === null || maxVal === undefined || Number.isNaN(Number(maxVal))) continue;
    const minVal = req.budget_min ?? maxVal;
    const perSeat = (Number(minVal) + Number(maxVal)) / 2;
    const seats = Math.max(1, Number(req.headcount_requested) || 1);
    const currency = (req.currency || "SAR").toUpperCase();
    budgetMap.set(currency, (budgetMap.get(currency) ?? 0) + perSeat * seats);
  }

  const estimatedBudgetByCurrency: CurrencyBudgetTotal[] = Array.from(budgetMap.entries()).map(
    ([currency, total]) => ({
      currency,
      total: Math.round(total),
    }),
  );

  return {
    totalRequestedHeadcount,
    filledHeadcount,
    openHeadcount,
    pendingApprovalCount,
    pendingApprovalHeadcount,
    estimatedBudgetByCurrency,
  };
}

/**
 * Evaluates UI permissions fail-closed while role metadata is loading or for viewer/reviewer accounts.
 */
export function getRequisitionPermissions(params: {
  appRole?: string | null;
  companyRole?: string | null;
  isSuperAdmin?: boolean;
  isLoading?: boolean;
}): RequisitionPermissions {
  if (params.isLoading) {
    return {
      canCreate: false,
      canApprove: false,
      canConvert: false,
      canManageDepartments: false,
      isViewerOnly: true,
    };
  }

  const isViewerOnly =
    params.companyRole === "viewer" ||
    params.appRole === "reviewer" ||
    params.appRole === "job_seeker";

  if (isViewerOnly && !params.isSuperAdmin) {
    return {
      canCreate: false,
      canApprove: false,
      canConvert: false,
      canManageDepartments: false,
      isViewerOnly: true,
    };
  }

  const hasElevatedRole =
    params.isSuperAdmin === true ||
    params.appRole === "admin" ||
    params.companyRole === "owner" ||
    params.companyRole === "admin" ||
    params.companyRole === "hr";

  return {
    canCreate: true,
    canApprove: hasElevatedRole,
    canConvert: hasElevatedRole,
    canManageDepartments: hasElevatedRole,
    isViewerOnly: false,
  };
}

export function useRequisitionPermissions(): RequisitionPermissions & { isLoading: boolean } {
  const { role, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { companyRole, isLoading: companyLoading } = useCompany();
  const isLoading = roleLoading || companyLoading;
  return {
    ...getRequisitionPermissions({
      appRole: role,
      companyRole,
      isSuperAdmin,
      isLoading,
    }),
    isLoading,
  };
}

export function useCompanyDepartments(companyIdOverride?: string | null) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;
  const hasCompany = isValidId(effectiveCompanyId);

  return useQuery({
    queryKey: ["company-departments", effectiveCompanyId],
    enabled: !!user && hasCompany,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<CompanyDepartment[]> => {
      if (!hasCompany) {
        throw new Error("معرف الشركة النشطة غير متوفر.");
      }
      const { data, error } = await requisitionDb()
        .from<CompanyDepartment>("company_departments")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("name", { ascending: true });
      if (error) {
        throw toDbError(error, "تعذر تحميل الإدارات والفروع.");
      }
      return data ?? [];
    },
  });
}

export function useCreateDepartment(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (input: CreateDepartmentInput): Promise<CompanyDepartment> => {
      if (!user || !isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة لإضافة إدارة جديدة.");
      }
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error("اسم الإدارة مطلوب.");
      }
      const { data, error } = await requisitionDb()
        .from<CompanyDepartment>("company_departments")
        .insert({
          company_id: effectiveCompanyId,
          name: trimmedName,
          branch_name: input.branch_name?.trim() || null,
          cost_center: input.cost_center?.trim() || null,
          manager_user_id: input.manager_user_id || null,
          is_active: input.is_active ?? true,
        })
        .select("*")
        .single();
      if (error) {
        throw toDbError(error, "تعذر إنشاء الإدارة.");
      }
      if (!data) {
        throw new Error("لم يتم استلام بيانات الإدارة المنشأة.");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-departments", effectiveCompanyId] });
      toast({ title: "تم إضافة الإدارة بنجاح" });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر إضافة الإدارة",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDepartment(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (input: UpdateDepartmentInput): Promise<CompanyDepartment> => {
      if (!user || !isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة لتعديل الإدارة.");
      }
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error("اسم الإدارة مطلوب.");
      }
      const { data, error } = await requisitionDb()
        .from<CompanyDepartment>("company_departments")
        .update({
          name: trimmedName,
          branch_name: input.branch_name?.trim() || null,
          cost_center: input.cost_center?.trim() || null,
          manager_user_id: input.manager_user_id || null,
          is_active: input.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("company_id", effectiveCompanyId)
        .select("*")
        .single();
      if (error) {
        throw toDbError(error, "تعذر تحديث الإدارة.");
      }
      if (!data) {
        throw new Error("لم يتم العثور على الإدارة المطلوب تحديثها.");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-departments", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      toast({ title: "تم تحديث بيانات الإدارة بنجاح" });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر تحديث الإدارة",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useJobRequisitions(companyIdOverride?: string | null) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;
  const hasCompany = isValidId(effectiveCompanyId);

  return useQuery({
    queryKey: ["job-requisitions", effectiveCompanyId],
    enabled: !!user && hasCompany,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<JobRequisition[]> => {
      if (!hasCompany) {
        throw new Error("معرف الشركة النشطة غير متوفر.");
      }
      const { data, error } = await requisitionDb()
        .from<JobRequisition>("job_requisitions")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("created_at", { ascending: false });
      if (error) {
        throw toDbError(error, "تعذر تحميل طلبات الاحتياج الوظيفي.");
      }
      return data ?? [];
    },
  });
}

export function useRequisitionApprovals(
  requisitionId?: string | null,
  companyIdOverride?: string | null,
) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;
  const hasCompany = isValidId(effectiveCompanyId);

  return useQuery({
    queryKey: ["requisition-approvals", effectiveCompanyId, requisitionId ?? "all"],
    enabled: !!user && hasCompany && requisitionId !== null,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<RequisitionApproval[]> => {
      if (!hasCompany) {
        throw new Error("معرف الشركة النشطة غير متوفر.");
      }
      let query = requisitionDb()
        .from<RequisitionApproval>("requisition_approvals")
        .select("*")
        .eq("company_id", effectiveCompanyId);
      if (requisitionId) {
        query = query.eq("requisition_id", requisitionId);
      }
      const { data, error } = await query.order("step_order", { ascending: true });
      if (error) {
        throw toDbError(error, "تعذر تحميل سجل الاعتمادات.");
      }
      return data ?? [];
    },
  });
}

export function useCreateRequisition(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (input: CreateRequisitionInput): Promise<JobRequisition> => {
      if (!user || !isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة لإنشاء طلب احتياج وظيفي.");
      }
      const title = input.title.trim();
      if (!title) {
        throw new Error("المسمى الوظيفي مطلوب.");
      }
      if (!Number.isFinite(input.headcount_requested) || input.headcount_requested < 1) {
        throw new Error("يجب أن يكون العدد المطلوب 1 على الأقل.");
      }
      if (
        input.budget_min !== null &&
        input.budget_min !== undefined &&
        input.budget_max !== null &&
        input.budget_max !== undefined &&
        input.budget_max < input.budget_min
      ) {
        throw new Error("الحد الأقصى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى.");
      }

      const { data, error } = await requisitionDb()
        .from<JobRequisition>("job_requisitions")
        .insert({
          company_id: effectiveCompanyId,
          department_id: input.department_id || null,
          branch_name: input.branch_name?.trim() || null,
          title,
          employment_type: input.employment_type || "دوام كامل",
          headcount_requested: Math.round(input.headcount_requested),
          headcount_filled: 0,
          budget_min: input.budget_min ?? null,
          budget_max: input.budget_max ?? null,
          currency: input.currency || "SAR",
          priority: input.priority || "medium",
          target_start_date: input.target_start_date || null,
          justification: input.justification?.trim() || null,
          requirements: input.requirements?.trim() || null,
          status: "draft",
          requested_by: user.id,
        })
        .select("*")
        .single();

      if (error) {
        throw toDbError(error, "تعذر إنشاء طلب الاحتياج الوظيفي.");
      }
      if (!data) {
        throw new Error("لم يتم استلام بيانات الطلب المنشأ.");
      }

      if (input.submitImmediately) {
        const { error: submitError } = await requisitionDb().rpc("submit_job_requisition", {
          p_requisition_id: data.id,
        });
        if (submitError) {
          queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
          throw toDbError(submitError, "تم حفظ المسودة ولكن تعذر إرسالها للاعتماد.");
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["requisition-approvals", effectiveCompanyId] });
      toast({
        title: variables.submitImmediately
          ? "تم إنشاء طلب الاحتياج وإرساله للاعتماد"
          : "تم حفظ مسودة طلب الاحتياج بنجاح",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر حفظ طلب الاحتياج",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateRequisition(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (input: UpdateRequisitionInput): Promise<JobRequisition> => {
      if (!user || !isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة لتعديل طلب الاحتياج.");
      }
      const title = input.title.trim();
      if (!title) {
        throw new Error("المسمى الوظيفي مطلوب.");
      }
      if (!Number.isFinite(input.headcount_requested) || input.headcount_requested < 1) {
        throw new Error("يجب أن يكون العدد المطلوب 1 على الأقل.");
      }
      if (
        input.budget_min !== null &&
        input.budget_min !== undefined &&
        input.budget_max !== null &&
        input.budget_max !== undefined &&
        input.budget_max < input.budget_min
      ) {
        throw new Error("الحد الأقصى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى.");
      }

      const { data, error } = await requisitionDb()
        .from<JobRequisition>("job_requisitions")
        .update({
          department_id: input.department_id || null,
          branch_name: input.branch_name?.trim() || null,
          title,
          employment_type: input.employment_type || "دوام كامل",
          headcount_requested: Math.round(input.headcount_requested),
          budget_min: input.budget_min ?? null,
          budget_max: input.budget_max ?? null,
          currency: input.currency || "SAR",
          priority: input.priority || "medium",
          target_start_date: input.target_start_date || null,
          justification: input.justification?.trim() || null,
          requirements: input.requirements?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("company_id", effectiveCompanyId)
        .select("*")
        .single();

      if (error) {
        throw toDbError(error, "تعذر تحديث مسودة طلب الاحتياج.");
      }
      if (!data) {
        throw new Error("لم يتم العثور على طلب الاحتياج المطلوب تعديله.");
      }

      if (input.submitImmediately) {
        const { error: submitError } = await requisitionDb().rpc("submit_job_requisition", {
          p_requisition_id: data.id,
        });
        if (submitError) {
          queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
          throw toDbError(submitError, "تم تحديث المسودة ولكن تعذر إرسالها للاعتماد.");
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["requisition-approvals", effectiveCompanyId] });
      toast({
        title: variables.submitImmediately
          ? "تم تحديث طلب الاحتياج وإرساله للاعتماد"
          : "تم تحديث مسودة طلب الاحتياج بنجاح",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر تحديث طلب الاحتياج",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRequisition(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (requisitionId: string): Promise<void> => {
      if (!user || !isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة لحذف المسودة.");
      }
      const { error } = await requisitionDb()
        .from<JobRequisition>("job_requisitions")
        .delete()
        .eq("id", requisitionId)
        .eq("company_id", effectiveCompanyId);
      if (error) {
        throw toDbError(error, "تعذر حذف مسودة طلب الاحتياج.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      toast({ title: "تم حذف مسودة طلب الاحتياج" });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر حذف المسودة",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useSubmitRequisition(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (requisitionId: string): Promise<unknown> => {
      if (!isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة قبل إرسال الطلب للاعتماد.");
      }
      const { data, error } = await requisitionDb().rpc("submit_job_requisition", {
        p_requisition_id: requisitionId,
      });
      if (error) {
        throw toDbError(error, "تعذر إرسال طلب الاحتياج للاعتماد.");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["requisition-approvals", effectiveCompanyId] });
      toast({ title: "تم إرسال طلب الاحتياج للاعتماد بنجاح" });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر إرسال الطلب للاعتماد",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useDecideRequisition(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (params: {
      requisitionId: string;
      decision: "approved" | "rejected";
      notes?: string | null;
    }): Promise<unknown> => {
      if (!isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة قبل تنفيذ قرار الاعتماد.");
      }
      const cleanNotes = params.notes?.trim() || null;
      if (params.decision === "rejected" && !cleanNotes) {
        throw new Error("يرجى إدخال سبب الرفض قبل تأكيد رفض الطلب.");
      }
      const { data, error } = await requisitionDb().rpc("decide_job_requisition", {
        p_requisition_id: params.requisitionId,
        p_decision: params.decision,
        p_notes: cleanNotes,
      });
      if (error) {
        throw toDbError(error, "تعذر تسجيل قرار الاعتماد.");
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["requisition-approvals", effectiveCompanyId] });
      toast({
        title:
          variables.decision === "approved"
            ? "تم اعتماد طلب الاحتياج الوظيفي"
            : "تم رفض طلب الاحتياج الوظيفي",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر تنفيذ قرار الاعتماد",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}

export function useConvertRequisitionToJob(companyIdOverride?: string | null) {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = companyIdOverride !== undefined ? companyIdOverride : activeCompanyId;

  return useMutation({
    mutationFn: async (requisitionId: string): Promise<ConvertRequisitionResult> => {
      if (!isValidId(effectiveCompanyId)) {
        throw new Error("يجب اختيار شركة نشطة قبل تحويل الطلب إلى وظيفة.");
      }
      const { data, error } = await requisitionDb().rpc("convert_requisition_to_job", {
        p_requisition_id: requisitionId,
      });
      if (error) {
        throw toDbError(error, "تعذر تحويل طلب الاحتياج إلى وظيفة منشورة.");
      }
      return {
        jobId: extractConvertedJobId(data),
        raw: data,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requisitions", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["requisition-approvals", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      toast({
        title: "تم تحويل طلب الاحتياج إلى وظيفة منشورة بنجاح",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "تعذر التحويل إلى وظيفة",
        description: extractErrorMessage(error, "حدث خطأ غير متوقع."),
        variant: "destructive",
      });
    },
  });
}
