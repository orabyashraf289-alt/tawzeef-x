import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ApplyJob from "@/pages/ApplyJob";

const mock = vi.hoisted(() => ({
  job: vi.fn(), employer: vi.fn(), from: vi.fn(), rpc: vi.fn(),
  insert: vi.fn(), upload: vi.fn(), invoke: vi.fn(), extract: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: mock.from, rpc: mock.rpc, functions: { invoke: mock.invoke },
  storage: { from: () => ({ upload: mock.upload }) },
} }));
vi.mock("@/hooks/use-toast", () => ({ toast: mock.toast }));
vi.mock("@/lib/fileParser", () => ({ extractTextFromPDF: mock.extract, extractTextFromDocx: mock.extract }));
vi.mock("@/lib/googleIndexingService", () => ({ notifyGoogleIndexing: vi.fn() }));
vi.mock("@/components/marketing/SEO", () => ({ SEO: () => null }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));
vi.mock("@/components/apply/ApplyJobSidebar", () => ({ default: ({ schoolDisplayName }: any) => <aside>{schoolDisplayName}</aside> }));
vi.mock("@/components/apply/ApplyStepProfile", () => ({ default: ({ onChange, onNext }: any) => <button onClick={() => {
  onChange("name", "سارة"); onChange("email", " Sara@Example.com "); onChange("phone", "0551234567"); onNext();
}}>profile next</button> }));
vi.mock("@/components/apply/ApplyStepSkills", () => ({ default: ({ onNext }: any) => <button onClick={onNext}>skills next</button> }));
vi.mock("@/components/apply/ApplyStepPreferences", () => ({ default: ({ onNext }: any) => <button onClick={onNext}>preferences next</button> }));
vi.mock("@/components/apply/ApplyStepReview", () => ({ default: ({ onSubmit }: any) => <button onClick={() => { onSubmit(); onSubmit(); }}>submit</button> }));
vi.mock("@/components/apply/ApplySuccessPass", () => ({ default: ({ trackingCode, accountStatus, onRetryAccount }: any) => <div>
  <span>receipt {trackingCode}</span><span>{accountStatus}</span><button onClick={onRetryAccount}>retry account</button>
</div> }));

function openPage() {
  return render(<MemoryRouter initialEntries={["/apply/job-1"]}><Routes><Route path="/apply/:id" element={<ApplyJob />} /></Routes></MemoryRouter>);
}
async function proceedToReview() {
  const next = await screen.findByRole("button", { name: "متابعة مراجعة البيانات" });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
  fireEvent.click(screen.getByText("profile next"));
  fireEvent.click(screen.getByText("skills next"));
  fireEvent.click(screen.getByText("preferences next"));
}

beforeEach(() => {
  vi.resetAllMocks();
  mock.job.mockResolvedValue({ data: { id: "job-1", company_id: "company-1", title: "معلم", status: "نشطة", created_at: new Date().toISOString() }, error: null });
  mock.employer.mockResolvedValue({ data: { name: "مدرسة الثقافة الرقمية", logo_url: null }, error: null });
  mock.rpc.mockReturnValue({ maybeSingle: mock.employer });
  mock.from.mockImplementation((table: string) => table === "jobs"
    ? { select: () => ({ eq: () => ({ maybeSingle: mock.job }) }) }
    : { insert: mock.insert });
  mock.insert.mockResolvedValue({ error: null });
  mock.upload.mockResolvedValue({ error: null });
  mock.extract.mockResolvedValue("");
  mock.invoke.mockResolvedValue({ data: { status: "invited" }, error: null });
});

describe("public application journey", () => {
  it("loads public branding by job without querying private company records", async () => {
    openPage();
    expect(await screen.findByRole("complementary")).toHaveTextContent("مدرسة الثقافة الرقمية");
    expect(mock.rpc).toHaveBeenCalledWith("get_public_job_employer", { _job_id: "job-1" });
    expect(mock.from).not.toHaveBeenCalledWith("companies");
    expect(screen.getByText(/ندعم ملفات/)).toHaveTextContent("5 ميجابايت");
  });
  it("keeps the form usable when branding is unavailable", async () => {
    mock.employer.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    openPage();
    expect(await screen.findByRole("complementary")).toHaveTextContent("جهة التوظيف");
    expect(screen.queryByText("TawzeefX Partner")).not.toBeInTheDocument();
  });
  it("shows the saved receipt before account provisioning and retries without duplicating the application", async () => {
    let resolveAccount!: (value: unknown) => void;
    mock.invoke.mockReturnValueOnce(new Promise(resolve => { resolveAccount = resolve; }));
    openPage(); await proceedToReview();
    fireEvent.click(screen.getByText("submit"));
    expect(await screen.findByText(/^receipt TX-/)).toBeInTheDocument();
    expect(screen.getByText("preparing")).toBeInTheDocument();
    expect(mock.insert).toHaveBeenCalledTimes(1);
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ company_id: "company-1", email: "sara@example.com", resume_url: null, tracking_code: expect.stringMatching(/^TX-[A-F0-9]{32}$/) }));
    await act(async () => resolveAccount({ data: null, error: new Error("Invitation unavailable") }));
    expect(screen.getByText("error")).toBeInTheDocument();
    fireEvent.click(screen.getByText("retry account"));
    expect(await screen.findByText("invited")).toBeInTheDocument();
    expect(mock.insert).toHaveBeenCalledTimes(1);
  });
  it("does not create an application or invite an account if CV upload fails", async () => {
    openPage(); await screen.findByRole("complementary");
    fireEvent.change(document.getElementById("resume-input")!, { target: { files: [new File(["cv"], "cv.doc", { type: "application/msword" })] } });
    expect(await screen.findByText("جاهز للإرسال مع الطلب")).toBeInTheDocument();
    expect(mock.extract).not.toHaveBeenCalled();
    mock.upload.mockResolvedValue({ error: new Error("Upload failed") });
    await proceedToReview(); fireEvent.click(screen.getByText("submit"));
    await waitFor(() => expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "فشل إرسال الطلب" })));
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
    expect(screen.queryByText(/^receipt/)).not.toBeInTheDocument();
  });
  it("stores a private CV path when upload succeeds", async () => {
    openPage(); await screen.findByRole("complementary");
    fireEvent.change(document.getElementById("resume-input")!, { target: { files: [new File(["cv"], "cv.doc")] } });
    await proceedToReview(); fireEvent.click(screen.getByText("submit"));
    await screen.findByText(/^receipt/);
    expect(mock.upload).toHaveBeenCalledTimes(1);
    expect(mock.insert.mock.calls[0][0].resume_url).toMatch(/^applications\/job-1\/[a-f0-9-]+\.doc$/);
    expect(mock.insert.mock.calls[0][0].resume_url).toBe(mock.upload.mock.calls[0][0]);
  });
  it("ignores analysis results for a removed resume", async () => {
    let resolveText!: (value: string) => void;
    mock.extract.mockReturnValueOnce(new Promise<string>(resolve => { resolveText = resolve; }));
    openPage(); await screen.findByRole("complementary");
    fireEvent.change(document.getElementById("resume-input")!, { target: { files: [new File(["cv"], "cv.pdf")] } });
    fireEvent.click(screen.getByTitle("إلغاء الملف"));
    await act(async () => resolveText("old@example.com"));
    expect(mock.invoke).not.toHaveBeenCalled();
    expect(screen.queryByText("تمت قراءة السيرة الذاتية. راجع البيانات وأكمل الناقص.")).not.toBeInTheDocument();
  });
});
