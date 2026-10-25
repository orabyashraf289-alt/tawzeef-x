import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Candidates from "@/pages/Candidates";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(), fetch: vi.fn(), getSession: vi.fn(), toast: vi.fn(), removeChannel: vi.fn(),
  isError: false, refetch: vi.fn(),
  candidates: ["a", "b"].map(id => ({
    id: `candidate-${id}`, name: `Applicant ${id}`, email: `${id}@example.test`, phone: "",
    job_id: "job-a", company_id: "company-a", user_id: "staff-a", role: "Developer", skills: ["React"],
    stage: "تقديم الطلب", status: "قيد المراجعة", ai_score: null, created_at: "2026-10-22T10:00:00Z",
  })),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mocks.invoke }, auth: { getSession: mocks.getSession }, removeChannel: mocks.removeChannel,
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
} }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/candidates/CompareDialog", () => ({ default: () => null }));
vi.mock("@/hooks/useJobs", () => ({
  useCandidates: () => ({ data: mocks.candidates, isLoading: false, isError: mocks.isError, isFetching: false, refetch: mocks.refetch }),
  useJobs: () => ({ data: [] }),
}));
vi.mock("@/hooks/useCollectionMotion", () => ({ useCollectionMotion: () => ({ entry: () => ({}), hover: {} }) }));
vi.mock("@/hooks/useScreenPermissions", () => ({ useScreenPermissions: () => ({ hasActionPermission: () => true }) }));
vi.mock("@/hooks/useCompactView", () => ({ useCompactView: () => ({ isCompact: true, toggleCompact: vi.fn() }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "staff-a" } }) }));
vi.mock("@/contexts/I18nContext", () => ({ useI18n: () => ({ t: (key: string) => key, locale: "ar", dir: "rtl" }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.isError = false;
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal("scrollTo", vi.fn());
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "synthetic-test-token" } } });
  mocks.fetch.mockResolvedValue({ ok: true });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
function open() { return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><QueryClientProvider client={client}><Candidates /></QueryClientProvider></MemoryRouter>); }

describe("candidate list ATS requests", () => {
  it("shows a retryable load error instead of reporting no candidates or enabling screening", () => {
    mocks.isError = true;
    open();
    expect(screen.getByRole("alert")).toHaveTextContent("تعذر تحميل المرشحين");
    expect(screen.queryByText("لا يوجد مرشحين مطابقين")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "الفرز الذكي" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not evaluate candidates when the recruiter opens or filters the list", () => {
    open();
    expect(screen.getByText("Applicant a")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("بحث باسم المرشح، البريد، الوظيفة، أو المهارات..."), { target: { value: "Applicant a" } });
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("evaluates only the selected candidate when the selection action is clicked", async () => {
    open();
    // The first checkbox is Select All; the following two belong to the compact rows.
    fireEvent.click(screen.getAllByRole("checkbox", { hidden: true })[1]);
    fireEvent.click(screen.getByText("فرز AI"));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ candidateId: "candidate-a", jobId: "job-a" });
  });
});
