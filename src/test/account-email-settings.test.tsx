import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AccountEmailSettings from "@/components/AccountEmailSettings";

const mocks = vi.hoisted(() => ({ updateUser: vi.fn(), user: { id: "master-user", email: "current@example.test", new_email: "" } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { updateUser: mocks.updateUser } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/contexts/I18nContext", () => ({ useI18n: () => ({ locale: "ar" }) }));
beforeEach(() => { mocks.user = { id: "master-user", email: "current@example.test", new_email: "" }; });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function fill(email = "NEW@example.test", confirmation = "new@example.test") {
  fireEvent.change(screen.getByLabelText("إيميل الدخول الجديد"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("تأكيد الإيميل الجديد"), { target: { value: confirmation } });
}
describe("account email change", () => {
  it("requires a matching new email and does not submit automatically", () => {
    render(<AccountEmailSettings />);
    fill("current@example.test", "current@example.test");
    expect(screen.getByRole("button")).toBeDisabled();
    fill("new@example.test", "different@example.test");
    expect(screen.getByRole("button")).toBeDisabled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("uses Auth for the current identity and reports confirmation pending, not completion", async () => {
    mocks.updateUser.mockResolvedValue({ data: { user: { ...mocks.user, new_email: "new@example.test" } }, error: null });
    render(<AccountEmailSettings />); fill(); fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("status")).toHaveTextContent("بانتظار التأكيد");
    expect(mocks.updateUser).toHaveBeenCalledWith({ email: "new@example.test" }, { emailRedirectTo: `${window.location.origin}/settings?tab=account` });
    expect(screen.queryByText("تم تحديث إيميل تسجيل الدخول.")).not.toBeInTheDocument();
  });
  it("keeps the entered email for retry on Auth failure", async () => {
    mocks.updateUser.mockResolvedValue({ data: { user: null }, error: { message: "already registered" } });
    render(<AccountEmailSettings />); fill(); fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذّر طلب");
    expect(screen.getByLabelText("إيميل الدخول الجديد")).toHaveValue("NEW@example.test");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("announces completion only when Auth returns the same user with the new email", async () => {
    mocks.updateUser.mockResolvedValue({ data: { user: { ...mocks.user, email: "new@example.test" } }, error: null });
    render(<AccountEmailSettings />); fill(); fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("status")).toHaveTextContent("تم تحديث إيميل تسجيل الدخول.");
  });
  it("shows an existing pending change after reloading settings", () => {
    mocks.user.new_email = "pending@example.test";
    render(<AccountEmailSettings />);
    expect(screen.getByRole("status")).toHaveTextContent("pending@example.test");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
