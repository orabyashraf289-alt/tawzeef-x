import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Auth from "@/pages/Auth";

const { signIn, signUp, signOut, rpc, toast, auth } = vi.hoisted(() => ({
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), rpc: vi.fn(), toast: vi.fn(), auth: { user: null as any },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user, signOut }) }));
vi.mock("@/hooks/useBrandSettings", () => ({ useBrandSettings: () => ({ data: null }) }));
vi.mock("@/components/marketing/SEO", () => ({ SEO: () => null }));
vi.mock("@/hooks/useAuditLog", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, auth: { signInWithPassword: signIn, signUp, signOut } } }));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/auth" element={<Auth />} /><Route path="/dashboard" element={<p>Employer workspace</p>} /><Route path="/applicant-dashboard" element={<p>Applicant workspace</p>} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  auth.user = null;
  signOut.mockImplementation(async () => { auth.user = null; return { error: null }; });
  signIn.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
});

describe("applicant login entry", () => {
  it("moves the applicant entry out of signup and into login", async () => {
    open("/auth?mode=signup");
    expect(screen.getByLabelText("اسم الشركة أو المؤسسة")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حساب متقدم" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "قدمت على وظيفة؟ سجّل دخولك كمتقدم" }));
    expect(await screen.findByRole("heading", { name: "تسجيل دخول المتقدمين" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText("اسم الشركة أو المؤسسة")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "إنشاء حساب" })).not.toBeInTheDocument();
  });

  it.each(["type=applicant", "role=candidate"])("treats legacy signup with %s as login and never creates an account", async query => {
    open(`/auth?mode=signup&${query}`);
    expect(screen.getByRole("heading", { name: "تسجيل دخول المتقدمين" })).toBeInTheDocument();
    expect(screen.queryByLabelText("الاسم الكامل")).not.toBeInTheDocument();
    expect(screen.queryByText("أو المتابعة عبر")).not.toBeInTheDocument();
    expect(screen.getByText(/رسالة التفعيل/)).toBeInTheDocument();
    expect(screen.queryByText(/رقم جوالك ككلمة مرور|كلمة المرور الخاصة بك هي/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), { target: { value: "Applicant@example.com" } });
    fireEvent.change(screen.getByLabelText("كلمة المرور", { exact: true }), { target: { value: "Private-password-27" } });
    fireEvent.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ email: "applicant@example.com", password: "Private-password-27" }));
    expect(signUp).not.toHaveBeenCalled();
  });

  it("offers applicant login alongside employer login", () => {
    open("/auth?mode=login");
    expect(screen.getByRole("link", { name: "تسجيل دخول المتقدم" })).toHaveAttribute("href", "/auth?mode=login&type=applicant");
    expect(screen.getByRole("button", { name: "إنشاء حساب جهة توظيف" })).toBeInTheDocument();
  });
});


describe("login account category enforcement", () => {
  async function submit(path: string, email: string, flags: Record<string, boolean>) {
    const user = { id: "account", email, user_metadata: { account_type: "job_seeker" } };
    rpc.mockResolvedValue({ data: { access_state: "ALLOWED", ...flags } });
    signIn.mockImplementation(async () => {
      auth.user = user; // Simulate SIGNED_IN arriving before the authorization RPC.
      return { data: { user, session: { user } }, error: null };
    });
    open(path);
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText("كلمة المرور", { exact: true }), { target: { value: "Private-password-27" } });
    fireEvent.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
  }

  it.each([
    ["company", {}], ["platform-admin", { is_platform_admin: true }], ["agency", { is_agency: true }],
  ])("rejects %s credentials at applicant login despite forged metadata", async (name, flags) => {
    await submit("/auth?mode=login&type=applicant", `${name}@example.test`, flags as Record<string, boolean>);
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("هذا الحساب تابع لجهة توظيف") }));
    expect(screen.queryByText(/Applicant workspace|Employer workspace/)).not.toBeInTheDocument();
  });

  it("rejects applicant credentials at employer login", async () => {
    await submit("/auth?mode=login", "wrong-portal@example.test", { is_candidate: true });
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("هذا حساب متقدم للوظائف") }));
    expect(screen.queryByText(/Applicant workspace|Employer workspace/)).not.toBeInTheDocument();
  });

  it.each([
    ["/auth?mode=login&type=applicant", { is_candidate: true }, "Applicant workspace"],
    ["/auth?mode=login", { is_platform_admin: true }, "Employer workspace"],
  ])("allows matching credentials at %s", async (path, flags, destination) => {
    await submit(path, `${destination.split(" ")[0]}@example.test`, flags as Record<string, boolean>);
    expect(await screen.findByText(destination)).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it.each([
    ["/auth?mode=login&type=applicant", { is_platform_admin: true }, "هذا الحساب تابع لجهة توظيف"],
    ["/auth?mode=login", { is_candidate: true }, "هذا حساب متقدم للوظائف"],
  ])("checks an existing session at %s instead of redirecting silently", async (path, flags, message) => {
    auth.user = { id: "already-signed-in", email: "session@example.test" };
    rpc.mockResolvedValue({ data: { access_state: "ALLOWED", ...flags } });
    open(path);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText(/Applicant workspace|Employer workspace/)).not.toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
});
