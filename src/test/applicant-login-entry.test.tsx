import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "@/pages/Auth";

const { signIn, signUp } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useBrandSettings", () => ({ useBrandSettings: () => ({ data: null }) }));
vi.mock("@/components/marketing/SEO", () => ({ SEO: () => null }));
vi.mock("@/hooks/useAuditLog", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithPassword: signIn, signUp } } }));

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Auth /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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
