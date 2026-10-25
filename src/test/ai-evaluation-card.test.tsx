import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AIEvaluationCard from "@/components/AIEvaluationCard";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
const report = {
  score: 70, summary: "تقرير المرشح الأول", strengths: ["React"], weaknesses: [], recommendation: "مراجعة بشرية",
  cvAnalyzed: true, evidenceVersion: 1, evaluatedAt: "2026-10-22T10:00:00.000Z", requestedBy: "staff-a",
  requirementEvidence: [
    { requirement: "React experience", status: "supported", evidence: "Built React apps", source: "profile" },
    { requirement: "SQL experience", status: "supported", evidence: "Built SQL reports", source: "resume" },
    { requirement: "Python experience", status: "unconfirmed", evidence: "", source: "unconfirmed" },
  ],
};
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });
const card = (id = "candidate-a", evaluation: string | null = null) =>
  <QueryClientProvider client={client}><AIEvaluationCard candidateId={id} candidateName={id}
    jobId="job-a" existingEvaluation={evaluation} /></QueryClientProvider>;

describe("recruiter ATS report", () => {
  it("shows evidence sources, omitted requirements and the recorded evaluation time without starting analysis", () => {
    const view = render(card("candidate-a", JSON.stringify(report)));
    expect(screen.getByText("المصدر: بيانات المرشح المدخلة")).toBeInTheDocument();
    expect(screen.getByText("المصدر: مقتطف السيرة بموافقة المتقدم")).toBeInTheDocument();
    expect(screen.getByText(/Python experience/)).toHaveTextContent("يحتاج تحققًا");
    expect(screen.getByText("2 من 3 له اقتباس")).toBeInTheDocument();
    expect(view.container.querySelector("time")).toHaveAttribute("datetime", report.evaluatedAt);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("marks a legacy report for re-evaluation instead of claiming verified sources or CV consent", () => {
    const { cvAnalyzed, evidenceVersion, evaluatedAt, ...legacy } = report;
    render(card("candidate-a", JSON.stringify(legacy)));
    expect(screen.getByRole("status")).toHaveTextContent("دون تحقق من مصادر الأدلة");
    expect(screen.getByText("لم يُسجل مصدر البيانات لهذا التقييم السابق.")).toBeInTheDocument();
    expect(screen.queryByText("المصدر: مقتطف السيرة بموافقة المتقدم")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "له اقتباس (0)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "يحتاج مراجعة (3)" })).toBeInTheDocument();
  });

  it("filters evidence without sending a new evaluation and retains the omitted-requirements notice", () => {
    render(card("candidate-a", JSON.stringify({ ...report, requirementsTotal: 5 })));
    fireEvent.click(screen.getByRole("button", { name: "يحتاج مراجعة (1)" }));
    expect(screen.getByRole("button", { name: "يحتاج مراجعة (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Python experience/)).toBeInTheDocument();
    expect(screen.queryByText(/React experience/)).not.toBeInTheDocument();
    expect(screen.getByText(/هناك 2 متطلبات إضافية/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "له اقتباس (2)" }));
    expect(screen.queryByText(/Python experience/)).not.toBeInTheDocument();
    expect(screen.getByText(/React experience/)).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("does not call a supported row verified without a known source and a nonempty quote", () => {
    render(card("candidate-a", JSON.stringify({ ...report, requirementEvidence: [
      { requirement: "Missing source", status: "supported", evidence: "React" },
      { requirement: "Empty quote", status: "supported", evidence: "", source: "profile" },
    ] })));
    expect(screen.getByRole("button", { name: "له اقتباس (0)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "له اقتباس (0)" }));
    expect(screen.getByText("لا توجد متطلبات ضمن هذا العرض.")).toBeInTheDocument();
  });

  it("resets the evidence filter when the candidate changes", () => {
    const view = render(card("candidate-a", JSON.stringify(report)));
    fireEvent.click(screen.getByRole("button", { name: "يحتاج مراجعة (1)" }));
    view.rerender(card("candidate-b", JSON.stringify(report)));
    expect(screen.getByRole("button", { name: "الكل (3)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/React experience/)).toBeInTheDocument();
  });

  it("distinguishes missing evidence rows from missing published requirements", () => {
    render(card("candidate-a", JSON.stringify({ ...report, requirementEvidence: [], requirementsTotal: 5 })));
    expect(screen.getByText(/يوجد 5 متطلبًا لم يشملها التقرير/)).toBeInTheDocument();
    expect(screen.queryByText(/لم تُنشر متطلبات/)).not.toBeInTheDocument();
  });

  it("rejects malformed stored reports and refreshes when a new persisted result arrives", () => {
    const view = render(card("candidate-a", JSON.stringify({ score: 99, strengths: "wrong shape" })));
    expect(screen.getByRole("button", { name: "تشغيل تحليل ATS" })).toBeEnabled();
    view.rerender(card("candidate-a", JSON.stringify(report)));
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    view.rerender(card("candidate-b"));
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
  });

  it("runs only on request, prevents duplicate submissions and refreshes the list and candidate profile", async () => {
    let resolve!: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise(r => { resolve = r; }));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    render(card());
    const button = screen.getByRole("button", { name: "تشغيل تحليل ATS" });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith("evaluate-candidate", { body: { candidateId: "candidate-a", jobId: "job-a" } });
    await act(async () => resolve({ data: report, error: null }));
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["candidates"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["candidate-detail-direct", "candidate-a"] });
  });

  it("ignores a late result after switching to a different candidate", async () => {
    let resolve!: (value: unknown) => void;
    mocks.invoke.mockReturnValue(new Promise(r => { resolve = r; }));
    const view = render(card());
    fireEvent.click(screen.getByRole("button", { name: "تشغيل تحليل ATS" }));
    view.rerender(card("candidate-b"));
    await act(async () => resolve({ data: report, error: null }));
    expect(screen.queryByText(report.summary)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تشغيل تحليل ATS" })).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("keeps the previous report and allows retry when a provider returns an invalid result", async () => {
    mocks.invoke.mockResolvedValue({ data: { score: 150 }, error: null });
    render(card("candidate-a", JSON.stringify(report)));
    fireEvent.click(screen.getByRole("button", { name: "إعادة التقييم" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إعادة التقييم" })).toBeEnabled();
  });
});
