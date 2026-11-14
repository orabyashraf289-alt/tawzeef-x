import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import HiringPlan from "@/pages/HiringPlan";
import { RequisitionsWorkspace } from "@/components/requisitions/RequisitionsWorkspace";
import {
  computeRequisitionKpis,
  getRequisitionPermissions,
  type CompanyDepartment,
  type JobRequisition,
  type RequisitionApproval,
} from "@/hooks/useRequisitions";

interface MockQueryResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface TableStore {
  company_departments: CompanyDepartment[];
  job_requisitions: JobRequisition[];
  requisition_approvals: RequisitionApproval[];
  hiring_goals: Array<Record<string, unknown>>;
}

const {
  mockFrom,
  mockRpc,
  mockToast,
  mockRefetchCompanies,
  mockCompanyState,
  mockRoleState,
  mockStore,
  mockErrors,
  recordedMutations,
} = vi.hoisted(() => {
  const store: TableStore = {
    company_departments: [],
    job_requisitions: [],
    requisition_approvals: [],
    hiring_goals: [],
  };

  const errors: Partial<Record<keyof TableStore, { message: string } | null>> = {};

  const mutations: Array<{
    table: string;
    op: "insert" | "update" | "delete";
    payload?: unknown;
    filters: Array<[string, unknown]>;
  }> = [];

  const createQueryBuilder = (table: keyof TableStore) => {
    const filters: Array<[string, unknown]> = [];
    let pendingOp: "select" | "insert" | "update" | "delete" = "select";
    let pendingPayload: unknown = undefined;

    const execute = async (): Promise<MockQueryResponse<unknown>> => {
      const configuredError = errors[table];
      if (configuredError) {
        return { data: null, error: configuredError };
      }

      if (pendingOp === "insert") {
        mutations.push({ table, op: "insert", payload: pendingPayload, filters: [...filters] });
        const rawRow = (Array.isArray(pendingPayload) ? pendingPayload[0] : pendingPayload) as Record<
          string,
          unknown
        >;
        const created: Record<string, unknown> = {
          id: `${table}-new-1`,
          created_at: "2026-11-13T10:00:00Z",
          updated_at: "2026-11-13T10:00:00Z",
          ...rawRow,
        };
        if (table === "company_departments") {
          store.company_departments = [
            ...store.company_departments,
            created as unknown as CompanyDepartment,
          ];
        } else if (table === "job_requisitions") {
          store.job_requisitions = [
            created as unknown as JobRequisition,
            ...store.job_requisitions,
          ];
        }
        return { data: [created], error: null };
      }

      if (pendingOp === "update") {
        mutations.push({ table, op: "update", payload: pendingPayload, filters: [...filters] });
        const patch = pendingPayload as Record<string, unknown>;
        if (table === "job_requisitions") {
          store.job_requisitions = store.job_requisitions.map((row) =>
            filters.every(([k, v]) => (row as unknown as Record<string, unknown>)[k] === v)
              ? { ...row, ...patch }
              : row,
          );
          const matched = store.job_requisitions.filter((row) =>
            filters.every(([k, v]) => (row as unknown as Record<string, unknown>)[k] === v),
          );
          return { data: matched, error: null };
        }
        return { data: [patch], error: null };
      }

      if (pendingOp === "delete") {
        mutations.push({ table, op: "delete", filters: [...filters] });
        if (table === "job_requisitions") {
          store.job_requisitions = store.job_requisitions.filter(
            (row) => !filters.every(([k, v]) => (row as unknown as Record<string, unknown>)[k] === v),
          );
        }
        return { data: [], error: null };
      }

      const rows = (store[table] as Array<Record<string, unknown>>).filter((row) =>
        filters.every(([col, val]) => row[col] === val),
      );
      return { data: rows, error: null };
    };

    const builder = {
      select: () => builder,
      insert: (payload: unknown) => {
        pendingOp = "insert";
        pendingPayload = payload;
        return builder;
      },
      update: (payload: unknown) => {
        pendingOp = "update";
        pendingPayload = payload;
        return builder;
      },
      delete: () => {
        pendingOp = "delete";
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      neq: () => builder,
      in: () => builder,
      order: () => builder,
      single: async () => {
        const res = await execute();
        if (res.error) return res;
        const arr = Array.isArray(res.data) ? res.data : [res.data];
        return { data: arr[0] ?? null, error: null };
      },
      maybeSingle: async () => {
        const res = await execute();
        if (res.error) return res;
        const arr = Array.isArray(res.data) ? res.data : [res.data];
        return { data: arr[0] ?? null, error: null };
      },
      then: (
        onFulfilled?: (val: MockQueryResponse<unknown>) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => execute().then(onFulfilled, onRejected),
    };

    return builder;
  };

  return {
    mockFrom: vi.fn((table: string) => createQueryBuilder(table as keyof TableStore)),
    mockRpc: vi.fn(),
    mockToast: vi.fn(),
    mockRefetchCompanies: vi.fn(),
    mockCompanyState: {
      activeCompanyId: "company-1" as string | null,
      activeCompany: { id: "company-1", name: "شركة التقنية الحديثة" } as {
        id: string;
        name: string;
      } | null,
      companyBranches: [],
      companyRole: "hr" as "owner" | "hr" | "viewer" | "admin" | null,
      isLoading: false,
    },
    mockRoleState: {
      role: "admin" as "admin" | "recruiter" | "reviewer" | "job_seeker",
      isAdmin: true,
      isSuperAdmin: false,
      isRecruiter: false,
      isReviewer: false,
      isLoading: false,
    },
    mockStore: store,
    mockErrors: errors,
    recordedMutations: mutations,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "hr@company.com" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    ...mockCompanyState,
    myCompanies: [],
    isBranch: false,
    setActiveCompanyId: vi.fn(),
    refetchCompanies: mockRefetchCompanies,
  }),
  useCompanyContext: () => ({
    ...mockCompanyState,
    myCompanies: [],
    isBranch: false,
    setActiveCompanyId: vi.fn(),
    refetchCompanies: mockRefetchCompanies,
  }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => mockRoleState,
}));

vi.mock("@/hooks/useCompanies", () => ({
  useCompanyMembers: () => ({
    data: [
      {
        id: "mem-1",
        company_id: "company-1",
        user_id: "user-1",
        member_role: "hr",
        created_at: "2026-01-01T00:00:00Z",
        profiles: {
          user_id: "user-1",
          full_name: "أحمد السعيد",
          job_title: "مدير الموارد البشرية",
          avatar_url: null,
        },
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/AnimatedBackground", () => ({
  AnimatedDashboardBackground: () => null,
}));

vi.mock("@/hooks/useJobs", () => ({
  useCandidates: () => ({ data: [], isLoading: false }),
  useInterviews: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useOffers", () => ({
  useOffers: () => ({ data: [], isLoading: false }),
}));

function makeDepartment(overrides: Partial<CompanyDepartment> = {}): CompanyDepartment {
  return {
    id: "dept-1",
    company_id: "company-1",
    name: "التقنية والهندسة",
    branch_name: "الرياض - الرئيسي",
    cost_center: "CC-101",
    manager_user_id: "user-1",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

function makeRequisition(overrides: Partial<JobRequisition> = {}): JobRequisition {
  return {
    id: "req-1",
    company_id: "company-1",
    department_id: "dept-1",
    branch_name: "الرياض - الرئيسي",
    title: "مطور واجهات أمامية",
    employment_type: "دوام كامل",
    headcount_requested: 2,
    headcount_filled: 0,
    budget_min: 10000,
    budget_max: 14000,
    currency: "SAR",
    priority: "high",
    target_start_date: "2026-12-01",
    justification: "توسيع فريق المنتج الرقمي",
    requirements: "React\nTypeScript",
    status: "draft",
    requested_by: "user-1",
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    linked_job_id: null,
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
    ...overrides,
  };
}

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCompanyState.activeCompanyId = "company-1";
  mockCompanyState.activeCompany = { id: "company-1", name: "شركة التقنية الحديثة" };
  mockCompanyState.companyRole = "hr";
  mockCompanyState.isLoading = false;
  mockRoleState.role = "admin";
  mockRoleState.isAdmin = true;
  mockRoleState.isSuperAdmin = false;
  mockRoleState.isLoading = false;

  mockStore.company_departments = [makeDepartment()];
  mockStore.job_requisitions = [];
  mockStore.requisition_approvals = [];
  mockStore.hiring_goals = [];

  delete mockErrors.company_departments;
  delete mockErrors.job_requisitions;
  delete mockErrors.requisition_approvals;
  recordedMutations.length = 0;

  mockRpc.mockResolvedValue({ data: null, error: null });
});

afterEach(() => {
  cleanup();
});

describe("requisitions helpers", () => {
  it("computes headcount and multi-currency budget KPIs accurately", () => {
    const items: JobRequisition[] = [
      makeRequisition({
        id: "r1",
        status: "approved",
        headcount_requested: 3,
        headcount_filled: 1,
        budget_min: 10000,
        budget_max: 14000,
        currency: "SAR",
      }),
      makeRequisition({
        id: "r2",
        status: "pending_approval",
        headcount_requested: 2,
        headcount_filled: 0,
        budget_min: 20000,
        budget_max: 20000,
        currency: "EGP",
      }),
      makeRequisition({
        id: "r3",
        status: "rejected",
        headcount_requested: 5,
        headcount_filled: 0,
        budget_min: 9000,
        budget_max: 11000,
        currency: "SAR",
      }),
    ];

    const kpis = computeRequisitionKpis(items);
    expect(kpis.totalRequestedHeadcount).toBe(5);
    expect(kpis.filledHeadcount).toBe(1);
    expect(kpis.openHeadcount).toBe(4);
    expect(kpis.pendingApprovalCount).toBe(1);
    expect(kpis.pendingApprovalHeadcount).toBe(2);
    expect(kpis.estimatedBudgetByCurrency).toEqual([
      { currency: "SAR", total: 36000 },
      { currency: "EGP", total: 40000 },
    ]);
  });

  it("evaluates fail-closed permissions while loading or for viewer roles", () => {
    expect(
      getRequisitionPermissions({ appRole: "admin", companyRole: "owner", isLoading: true }),
    ).toEqual({
      canCreate: false,
      canApprove: false,
      canConvert: false,
      canManageDepartments: false,
      isViewerOnly: true,
    });

    expect(
      getRequisitionPermissions({ appRole: "recruiter", companyRole: "viewer", isLoading: false }),
    ).toEqual({
      canCreate: false,
      canApprove: false,
      canConvert: false,
      canManageDepartments: false,
      isViewerOnly: true,
    });

    expect(
      getRequisitionPermissions({ appRole: "recruiter", companyRole: "hr", isLoading: false }),
    ).toEqual({
      canCreate: true,
      canApprove: true,
      canConvert: true,
      canManageDepartments: true,
      isViewerOnly: false,
    });
  });
});

describe("RequisitionsWorkspace fail-closed states & CRUD lifecycle", () => {
  it("fails closed when activeCompanyId is missing and allows retry", () => {
    mockCompanyState.activeCompanyId = null;
    mockCompanyState.activeCompany = null;

    renderWithProviders(<RequisitionsWorkspace />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("لم يتم تحديد شركة نشطة");
    expect(mockFrom).not.toHaveBeenCalledWith("job_requisitions");

    fireEvent.click(within(alert).getByRole("button", { name: /إعادة المحاولة/ }));
    expect(mockRefetchCompanies).toHaveBeenCalledTimes(1);
  });

  it("displays explicit fail-closed error and retries when requisitions query errors", async () => {
    mockErrors.job_requisitions = { message: "RLS permission denied on job_requisitions" };

    renderWithProviders(<RequisitionsWorkspace />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر تحميل بيانات الاحتياج الوظيفي");
    expect(alert).toHaveTextContent("RLS permission denied on job_requisitions");

    delete mockErrors.job_requisitions;
    mockStore.job_requisitions = [makeRequisition({ title: "مهندس سحابة" })];

    fireEvent.click(within(alert).getByRole("button", { name: /إعادة المحاولة/ }));
    expect(await screen.findByText("مهندس سحابة")).toBeInTheDocument();
  });

  it("creates a department and a draft requisition scoped to activeCompanyId with budget validation", async () => {
    renderWithProviders(<RequisitionsWorkspace />);

    // Open Departments Manager and create a department
    fireEvent.click(await screen.findByRole("button", { name: /الإدارات والفروع/ }));
    const deptDialog = await screen.findByRole("dialog");
    fireEvent.click(within(deptDialog).getByRole("button", { name: /إضافة إدارة جديدة/ }));

    fireEvent.change(within(deptDialog).getByLabelText(/اسم الإدارة \/ القسم/), {
      target: { value: "إدارة البيانات" },
    });
    fireEvent.change(within(deptDialog).getByLabelText(/مركز التكلفة/), {
      target: { value: "CC-404" },
    });
    fireEvent.click(within(deptDialog).getByRole("button", { name: "حفظ الإدارة" }));

    await waitFor(() =>
      expect(recordedMutations).toContainEqual(
        expect.objectContaining({
          table: "company_departments",
          op: "insert",
          payload: expect.objectContaining({
            company_id: "company-1",
            name: "إدارة البيانات",
            cost_center: "CC-404",
          }),
        }),
      ),
    );

    // Close department dialog and open New Requisition dialog
    fireEvent.keyDown(deptDialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /طلب احتياج جديد/ }));
    const reqDialog = await screen.findByRole("dialog");

    fireEvent.change(within(reqDialog).getByLabelText(/المسمى الوظيفي المطلوب/), {
      target: { value: "مهندس بيانات أول" },
    });
    fireEvent.change(within(reqDialog).getByLabelText(/الفرع \/ الموقع/), {
      target: { value: "جدة" },
    });
    fireEvent.change(within(reqDialog).getByLabelText(/العدد المطلوب/), {
      target: { value: "3" },
    });
    // Trigger budget validation error first (max < min)
    fireEvent.change(within(reqDialog).getByLabelText(/الحد الأدنى للميزانية/), {
      target: { value: "18000" },
    });
    fireEvent.change(within(reqDialog).getByLabelText(/الحد الأقصى للميزانية/), {
      target: { value: "12000" },
    });
    fireEvent.click(within(reqDialog).getByRole("button", { name: /حفظ كمسودة/ }));

    expect(
      await within(reqDialog).findByText(/الحد الأقصى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى/),
    ).toBeInTheDocument();

    // Fix budget max and submit draft
    fireEvent.change(within(reqDialog).getByLabelText(/الحد الأقصى للميزانية/), {
      target: { value: "22000" },
    });
    fireEvent.change(within(reqDialog).getByLabelText(/مبرر الاحتياج الوظيفي/), {
      target: { value: "بناء منصة التحليلات المؤسسية" },
    });
    fireEvent.change(within(reqDialog).getByLabelText(/المتطلبات والمؤهلات الرئيسية/), {
      target: { value: "SQL\nPython" },
    });

    fireEvent.click(within(reqDialog).getByRole("button", { name: /حفظ كمسودة/ }));

    await waitFor(() =>
      expect(recordedMutations).toContainEqual(
        expect.objectContaining({
          table: "job_requisitions",
          op: "insert",
          payload: expect.objectContaining({
            company_id: "company-1",
            title: "مهندس بيانات أول",
            branch_name: "جدة",
            headcount_requested: 3,
            budget_min: 18000,
            budget_max: 22000,
            currency: "SAR",
            status: "draft",
          }),
        }),
      ),
    );
  });

  it("handles draft submission, approval, and rejection with required reason", async () => {
    mockStore.job_requisitions = [
      makeRequisition({ id: "req-draft", title: "محلل أعمال", status: "draft" }),
      makeRequisition({ id: "req-pending", title: "مصمم تجربة مستخدم", status: "pending_approval" }),
    ];

    renderWithProviders(<RequisitionsWorkspace />);

    expect(await screen.findByText("محلل أعمال")).toBeInTheDocument();
    expect(screen.getByText("مصمم تجربة مستخدم")).toBeInTheDocument();

    // Submit draft for approval
    fireEvent.click(screen.getByRole("button", { name: /إرسال للاعتماد/ }));
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith("submit_job_requisition", {
        p_requisition_id: "req-draft",
      }),
    );

    // Reject pending requisition (requires reason)
    fireEvent.click(screen.getByRole("button", { name: "رفض" }));
    const rejectDialog = await screen.findByRole("dialog");
    const confirmRejectBtn = within(rejectDialog).getByRole("button", { name: "تأكيد الرفض" });
    expect(confirmRejectBtn).toBeDisabled();

    fireEvent.change(within(rejectDialog).getByLabelText(/سبب الرفض/), {
      target: { value: "الميزانية تتجاوز سقف الإدارة" },
    });
    expect(confirmRejectBtn).toBeEnabled();
    fireEvent.click(confirmRejectBtn);

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith("decide_job_requisition", {
        p_requisition_id: "req-pending",
        p_decision: "rejected",
        p_notes: "الميزانية تتجاوز سقف الإدارة",
      }),
    );

    // Approve pending requisition
    fireEvent.click(screen.getByRole("button", { name: "اعتماد" }));
    const approveDialog = await screen.findByRole("dialog");
    fireEvent.change(within(approveDialog).getByLabelText(/ملاحظات الاعتماد/), {
      target: { value: "معتمد للبدء الفوري" },
    });
    fireEvent.click(within(approveDialog).getByRole("button", { name: "تأكيد الاعتماد" }));

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith("decide_job_requisition", {
        p_requisition_id: "req-pending",
        p_decision: "approved",
        p_notes: "معتمد للبدء الفوري",
      }),
    );
  });

  it("converts an approved requisition to a published job in one click", async () => {
    mockStore.job_requisitions = [
      makeRequisition({
        id: "req-approved",
        title: "مدير منتج رقمي",
        status: "approved",
      }),
      makeRequisition({
        id: "req-converted",
        title: "مهندس ضمان جودة",
        status: "converted",
        linked_job_id: "job-777",
      }),
    ];
    mockRpc.mockResolvedValueOnce({ data: { job_id: "job-888" }, error: null });

    renderWithProviders(<RequisitionsWorkspace />);

    const convertBtn = await screen.findByRole("button", { name: "تحويل إلى وظيفة منشورة" });
    fireEvent.click(convertBtn);

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith("convert_requisition_to_job", {
        p_requisition_id: "req-approved",
      }),
    );

    const jobLink = screen.getByRole("link", { name: /عرض الوظيفة المنشورة/ });
    expect(jobLink).toHaveAttribute("href", "/jobs/job-777");
  });

  it("edits a draft requisition and views approval timeline details", async () => {
    mockStore.job_requisitions = [
      makeRequisition({
        id: "req-edit-1",
        title: "محاسب مالي",
        status: "draft",
        headcount_requested: 1,
      }),
    ];
    mockStore.requisition_approvals = [
      {
        id: "app-1",
        company_id: "company-1",
        requisition_id: "req-edit-1",
        step_order: 1,
        approver_user_id: "user-1",
        decision: "approved",
        notes: "تمت المراجعة المالية",
        decided_at: "2026-11-12T09:00:00Z",
        created_at: "2026-11-11T09:00:00Z",
      },
    ];

    renderWithProviders(<RequisitionsWorkspace />);

    expect(await screen.findByText("محاسب مالي")).toBeInTheDocument();

    // Open details & approvals dialog
    fireEvent.click(screen.getByRole("button", { name: /التفاصيل وسجل الاعتماد/ }));
    const detailsDialog = await screen.findByRole("dialog");
    expect(await within(detailsDialog).findByText("تمت المراجعة المالية")).toBeInTheDocument();
    fireEvent.keyDown(detailsDialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Edit draft requisition
    fireEvent.click(screen.getByRole("button", { name: /تعديل المسودة/ }));
    const editDialog = await screen.findByRole("dialog");
    fireEvent.change(within(editDialog).getByLabelText(/المسمى الوظيفي المطلوب/), {
      target: { value: "محاسب مالي أول" },
    });
    fireEvent.change(within(editDialog).getByLabelText(/العدد المطلوب/), {
      target: { value: "2" },
    });
    fireEvent.click(within(editDialog).getByRole("button", { name: /حفظ كمسودة/ }));

    await waitFor(() =>
      expect(recordedMutations).toContainEqual(
        expect.objectContaining({
          table: "job_requisitions",
          op: "update",
          filters: [
            ["id", "req-edit-1"],
            ["company_id", "company-1"],
          ],
          payload: expect.objectContaining({
            title: "محاسب مالي أول",
            headcount_requested: 2,
          }),
        }),
      ),
    );
  });
});

describe("HiringPlan page tabs integration", () => {
  it("renders Job Requisitions as primary tab and preserves Monthly Hiring Goals tab", async () => {
    mockStore.job_requisitions = [
      makeRequisition({ id: "req-hp-1", title: "مهندس شبكات", status: "approved" }),
    ];

    renderWithProviders(<HiringPlan />);

    const requisitionsTab = screen.getByRole("tab", {
      name: /الاحتياج الوظيفي وطلبات التوظيف/,
    });
    const goalsTab = screen.getByRole("tab", {
      name: /خطة التوظيف الشهرية/,
    });

    expect(requisitionsTab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("مهندس شبكات")).toBeInTheDocument();

    // Switch to existing Monthly Hiring Goals tab and confirm no regression
    fireEvent.mouseDown(goalsTab);
    fireEvent.click(goalsTab);

    await waitFor(() => expect(goalsTab).toHaveAttribute("aria-selected", "true"));
    expect(await screen.findByText(/الأداء العام لـ/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تصدير PDF/ })).toBeInTheDocument();
  });
});
