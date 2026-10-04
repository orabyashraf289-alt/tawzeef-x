import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import StageActions from "@/components/StageActions";
import NotificationTemplatesSection from "@/components/NotificationTemplatesSection";
import { usePaginatedCandidates } from "@/hooks/useJobs";
import { supabase } from "@/integrations/supabase/client";

const mocks = vi.hoisted(() => ({
  canEdit: true, templateError: null as { message: string } | null,
  writeError: null as Error | null,
  updateStage: vi.fn(), updateStatus: vi.fn(), recordTransition: vi.fn(), toast: vi.fn(), upsert: vi.fn(),
  filters: [] as [string, string, string][],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "actor-a", email: "actor@example.test" } }) }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompanyContext: () => ({ activeCompanyId: "branch-a" }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/hooks/usePipelineStages", () => ({ useActiveStages: () => [
  { name: "تقديم الطلب" }, { name: "فحص السيرة" }, { name: "المرحلة النهائية" },
] }));
vi.mock("@/hooks/useOffers", () => ({ useOffers: () => ({ data: [] }), useCreateOffer: () => ({}), useSendOffer: () => ({}) }));
vi.mock("@/hooks/useQuestionBank", () => ({ useAssessments: () => ({ data: [] }) }));
vi.mock("@/hooks/useJobs", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/hooks/useJobs")>(),
  useInterviews: () => ({ data: [] }), useAddInterview: () => ({}), useUpdateInterview: () => ({}), useCancelInterview: () => ({}),
}));
vi.mock("@/services/candidateStageService", () => ({ updateCandidateStage: mocks.updateStage, updateCandidateStatus: mocks.updateStatus }));
vi.mock("@/services/candidateHistoryService", () => ({ recordStageTransition: mocks.recordTransition }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "actor-a", email: "actor@example.test" } } }), getSession: async () => ({ data: { session: null } }) },
  functions: { invoke: vi.fn(async () => ({ error: null })) },
  rpc: vi.fn(async () => ({ data: mocks.canEdit, error: null })),
  from: vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder), order: vi.fn(() => builder), range: vi.fn(() => builder),
      update: vi.fn(() => builder), insert: vi.fn(() => builder), upsert: mocks.upsert,
      eq: vi.fn((key: string, value: string) => { mocks.filters.push([table, key, value]); return builder; }),
      ilike: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({
        data: table === "notification_templates"
          ? [{ company_id: "branch-a", type: "approval", subject: "Active branch template", body_html: "<p>Branch</p>" }]
          : table === "candidates" ? [{ id: "legacy-a", company_id: "branch-a", user_id: null, name: "Legacy candidate" }] : [],
        count: 1, error: table === "notification_templates" ? mocks.templateError : null,
      })),
    };
    return builder;
  }),
} }));

let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
beforeEach(() => {
  vi.clearAllMocks(); mocks.filters = []; mocks.canEdit = true; mocks.templateError = null; mocks.writeError = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mocks.recordTransition.mockResolvedValue(undefined);
  mocks.updateStatus.mockResolvedValue({ id: "candidate-a", company_id: "branch-a", stage: "المرحلة النهائية", status: "مرفوض" });
  mocks.updateStage.mockImplementation(async () => {
    if (mocks.writeError) throw mocks.writeError;
    return { id: "candidate-a", company_id: "branch-a", stage: "المرحلة النهائية", status: "قيد المراجعة" };
  });
});
afterEach(() => { cleanup(); client.clear(); });

it("reading the candidate list leaves a missing owner unchanged and submits no ownership repair", async () => {
  const { result } = renderHook(() => usePaginatedCandidates(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.data[0].user_id).toBeNull();
  expect(supabase.from).toHaveBeenCalledTimes(2);
  expect(mocks.upsert).not.toHaveBeenCalled();
});

const candidate = { id: "candidate-a", company_id: "branch-a", user_id: "original-owner", name: "Applicant", stage: "تقديم الطلب", status: "قيد المراجعة" };
async function confirmStageMove() {
  fireEvent.click(screen.getByRole("button", { name: /نقل إلى: فحص السيرة/ }));
  fireEvent.click(await screen.findByRole("button", { name: "تأكيد النقل" }));
}
it("stage buttons use one scoped write and the final automation result in the UI and history", async () => {
  const changed = vi.fn();
  render(<StageActions candidate={candidate} onStageChange={changed} />, { wrapper });
  await confirmStageMove();
  await waitFor(() => expect(mocks.recordTransition).toHaveBeenCalled());
  expect(mocks.updateStage).toHaveBeenCalledWith({ candidateId: "candidate-a", companyId: "branch-a", stage: "فحص السيرة", status: "قيد المراجعة" });
  expect(mocks.updateStage).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledWith("المرحلة النهائية", "قيد المراجعة");
  expect(mocks.recordTransition).toHaveBeenCalledWith(expect.objectContaining({ toStage: "المرحلة النهائية", userId: "actor-a" }));
  expect(vi.mocked(supabase.from).mock.calls.some(([table]) => table === "candidates")).toBe(false);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("a rejected stage write does not show success or overwrite the candidate owner", async () => {
  mocks.writeError = new Error("permission denied");
  const changed = vi.fn();
  render(<StageActions candidate={candidate} onStageChange={changed} />, { wrapper });
  await confirmStageMove();
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
  expect(changed).not.toHaveBeenCalled();
  expect(mocks.recordTransition).not.toHaveBeenCalled();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("the reject button changes status while keeping the final stored stage", async () => {
  const changed = vi.fn();
  render(<StageActions candidate={candidate} onStageChange={changed} />, { wrapper });
  fireEvent.click(screen.getByRole("button", { name: "رفض" }));
  fireEvent.click(await screen.findByRole("button", { name: "تأكيد الرفض" }));
  await waitFor(() => expect(changed).toHaveBeenCalledWith("المرحلة النهائية", "مرفوض"));
  expect(mocks.updateStatus).toHaveBeenCalledWith({ candidateId: "candidate-a", companyId: "branch-a", status: "مرفوض" });
  expect(mocks.updateStage).not.toHaveBeenCalled();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("loads notification templates for the active branch", async () => {
  render(<NotificationTemplatesSection />, { wrapper });
  expect(await screen.findByDisplayValue("Active branch template")).toBeInTheDocument();
  expect(mocks.filters).toContainEqual(["notification_templates", "company_id", "branch-a"]);
  expect(supabase.rpc).toHaveBeenCalledWith("can_manage_notification_templates", { _company_id: "branch-a" });
});
it("keeps template saving disabled for a viewer", async () => {
  mocks.canEdit = false;
  render(<NotificationTemplatesSection />, { wrapper });
  await screen.findByDisplayValue("Active branch template");
  const save = screen.getByRole("button", { name: "حفظ قالب الرسالة النشط" });
  expect(save).toBeDisabled(); fireEvent.click(save);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("does not overwrite saved templates with defaults after a failed read", async () => {
  mocks.templateError = { message: "network unavailable" };
  render(<NotificationTemplatesSection />, { wrapper });
  expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحميل القوالب المحفوظة");
  expect(screen.getByRole("button", { name: "حفظ قالب الرسالة النشط" })).toBeDisabled();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
