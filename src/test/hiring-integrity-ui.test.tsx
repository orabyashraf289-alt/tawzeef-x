import { useInterviews } from "@/hooks/useJobs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TakeAssessment from "@/pages/TakeAssessment";
import BookInterview from "@/pages/BookInterview";
import { useAssessments, useQuestions } from "@/hooks/useQuestionBank";

const { rpc, invoke, from, tenant } = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn(), from: vi.fn(), tenant: { id:"company-a" } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase:{ rpc, from, functions:{ invoke } } }));
vi.mock("@/contexts/I18nContext", () => ({ useI18n:() => ({ locale:"en", t:(v:string) => v }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth:() => ({ user:{ id:"user-a" } }) }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompany:() => ({ activeCompanyId:tenant.id }) }));
vi.mock("@/hooks/use-toast", () => ({ toast:vi.fn() }));
const metadata = { title:"Evidence assessment",duration_minutes:10,passing_score:70,question_count:1 };
const attempt = { response_id:"attempt-a",access_token:"private-capability",expires_at:new Date(Date.now()+600000).toISOString(),server_time:new Date().toISOString(),revision:0,status:"in_progress",answers:[],questions:[{ id:"question-a",question_text:"Explain your approach",question_type:"open_ended",points:5,options:[],matching_choices:[] }] };
function mountAssessment() { render(<MemoryRouter initialEntries={["/assessment/test-token"]}><Routes><Route path="/assessment/:token" element={<TakeAssessment />} /></Routes></MemoryRouter>); }
async function start() {
  await screen.findByText("Evidence assessment");
  fireEvent.change(screen.getByLabelText("Application tracking code"),{ target:{ value:"TX-private-application" } });
  fireEvent.click(screen.getByRole("button",{ name:"Start or resume assessment" }));
  return screen.findByText("Explain your approach");
}
beforeEach(() => {
  vi.clearAllMocks();tenant.id="company-a";
  rpc.mockImplementation(async (name:string) => ({ error:null,data:name === "get_assessment_for_candidate" ? { assessment:metadata } : name === "begin_assessment_attempt" ? attempt : name === "save_assessment_attempt" ? { saved:true } : { status:"pending_review",total_score:0,max_score:5,percentage:0,passed:false,timed_out:false } }));
  invoke.mockResolvedValue({ data:null,error:new Error("Provider unavailable") });
});
afterEach(cleanup);

describe("assessment candidate journey",() => {
  it("requires application identity and hides questions until timed start",async () => {
    mountAssessment();await screen.findByText("Evidence assessment");
    expect(screen.queryByText("Explain your approach")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{ name:"Start or resume assessment" })).toBeDisabled();
    await start();
    expect(rpc).toHaveBeenCalledWith("begin_assessment_attempt",{ _token:"test-token",_tracking_code:"TX-private-application" });
    expect(from).not.toHaveBeenCalled();
  });
  it("retains pending review when AI fails and never sends browser marking criteria",async () => {
    mountAssessment();await start();
    fireEvent.change(screen.getByLabelText("Answer"),{ target:{ value:"A reasoned answer" } });
    fireEvent.click(screen.getByRole("button",{ name:"Submit assessment" }));
    await screen.findByText("Submitted — awaiting review");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("evaluate-assessment-answers",{ body:{ responseId:"attempt-a",accessToken:"private-capability" } }));
    expect(rpc.mock.calls.some(([name]) => name === "apply_ai_evaluations")).toBe(false);
    expect(rpc).toHaveBeenCalledWith("finish_assessment_attempt",expect.objectContaining({ _access_token:"private-capability",_answers:[{ question_id:"question-a",answer:"A reasoned answer" }] }));
  });
  it("shows the final server result after persisted grading",async () => {
    invoke.mockResolvedValue({ error:null,data:{ status:"completed",total_score:4,max_score:5,percentage:80,passed:true,timed_out:false } });
    mountAssessment();await start();fireEvent.click(screen.getByRole("button",{ name:"Submit assessment" }));
    await screen.findByText("Assessment passed");expect(screen.getByText("80%")).toBeInTheDocument();
  });
  it("lets an expired attempt retry a failed auto-submission from any question", async () => {
    let submissions = 0;
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_assessment_for_candidate") return { data: { assessment: metadata }, error: null };
      if (name === "begin_assessment_attempt") return { data: { ...attempt, expires_at: new Date(Date.now() - 60000).toISOString(), server_time: new Date().toISOString(), questions: [...attempt.questions, { ...attempt.questions[0], id: "question-b" }] }, error: null };
      if (name === "finish_assessment_attempt") return ++submissions === 1 ? { error: new Error("offline"), data: null } : { error: null, data: { status: "completed", total_score: 0, max_score: 10, percentage: 0, passed: false, timed_out: true } };
      return { error: null, data: { saved: true } };
    });
    mountAssessment(); await start();
    const retry = await screen.findByRole("button", { name: "Retry submission" });
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await screen.findByText("Assessment graded");
    expect(submissions).toBe(2);
  });
  it("does not open a test for a rejected tracking code",async () => {
    rpc.mockImplementation(async (name:string) => name === "get_assessment_for_candidate" ? { data:{ assessment:metadata },error:null } : { data:null,error:new Error("Forbidden") });
    mountAssessment();await screen.findByText("Evidence assessment");
    fireEvent.change(screen.getByLabelText("Application tracking code"),{ target:{ value:"wrong" } });
    fireEvent.click(screen.getByRole("button",{ name:"Start or resume assessment" }));
    await screen.findByRole("alert");expect(screen.queryByText("Explain your approach")).not.toBeInTheDocument();
  });
});

describe("question bank real data only",() => {
  const wrapper = () => {
    const client = new QueryClient({ defaultOptions:{ queries:{ retry:false } } });
    return ({ children }: { children:React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
  function queryResult(data:unknown,error:unknown=null) {
    const query:any={ select:vi.fn(() => query),eq:vi.fn(() => query),order:vi.fn(() => query),in:vi.fn(() => query),then:(resolve:any) => Promise.resolve({ data,error }).then(resolve) };
    from.mockReturnValue(query);return query;
  }
  it("an empty bank stays empty without inserting sample questions",async () => {
    const q=queryResult([]);const { result }=renderHook(() => useQuestions(),{ wrapper:wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));expect(result.current.data).toEqual([]);
    expect(q.eq).toHaveBeenCalledWith("company_id","company-a");expect(from.mock.calls).toEqual([["question_bank"]]);
  });
  it("an error is an error, not fabricated assessments",async () => {
    queryResult(null,new Error("Permission denied"));const { result }=renderHook(() => useAssessments(),{ wrapper:wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));expect(result.current.data).toBeUndefined();
    expect(from.mock.calls).toEqual([["assessments"]]);
  });
  it("switching companies requests and caches the newly selected bank",async () => {
    const q=queryResult([]);const { result,rerender }=renderHook(() => useQuestions(),{ wrapper:wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));tenant.id="company-b";rerender();
    await waitFor(() => expect(q.eq).toHaveBeenCalledWith("company_id","company-b"));
  });
});

it("booking offers server availability and does not invent fixed slots",async () => {
  invoke.mockResolvedValue({ error:null,data:{ slots:[],booking:null } });
  render(<MemoryRouter initialEntries={["/book-interview/TX-code"]}><Routes><Route path="/book-interview/:candidateId" element={<BookInterview />} /></Routes></MemoryRouter>);
  await screen.findByText(/لا توجد مواعيد متاحة الآن/);
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.getByRole("button",{ name:"تأكيد الحجز" })).toBeDisabled();
  expect(invoke).toHaveBeenCalledWith("book-interview",{ body:{ trackingCode:"TX-code",action:"list",slotId:undefined } });
});

it("shows a recruiter-rescheduled interview without offering an invalid self-cancel", async () => {
  invoke.mockResolvedValue({ error: null, data: { slots: [], booking: { id: null, interview_id: "interview-a", starts_at: "2026-11-07T10:00:00Z", time_zone: "Asia/Riyadh", duration_minutes: 45 } } });
  render(<MemoryRouter initialEntries={["/book-interview/TX-code"]}><Routes><Route path="/book-interview/:candidateId" element={<BookInterview />} /></Routes></MemoryRouter>);
  await screen.findByText("موعدك المؤكد");
  expect(screen.getByText(/رتّب فريق التوظيف هذا الموعد/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "إلغاء هذا الحجز" })).not.toBeInTheDocument();
});

it("scopes the interview list to the selected company rather than every row created by its user", async () => {
  localStorage.setItem("tx_active_company_id", "company-a");
  const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), in: vi.fn(() => query), order: vi.fn(() => query), then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve) };
  from.mockReturnValue(query);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  try {
    const { result } = renderHook(() => useInterviews(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(query.in).toHaveBeenCalledWith("company_id", ["company-a"]);
    expect(from.mock.calls).toEqual([["companies"], ["interviews"]]);
  } finally { localStorage.removeItem("tx_active_company_id"); }
});
