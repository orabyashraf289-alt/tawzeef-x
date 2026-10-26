import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import PublicContactSettings from "@/components/PublicContactSettings";
import PublicFooter from "@/components/marketing/PublicFooter";
import { publicContactKey } from "@/hooks/usePublicContactSettings";

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), read: vi.fn(), write: vi.fn(), admin: true }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isPlatformSuperAdmin: mocks.admin, isLoading: false }) }));
vi.mock("@/contexts/I18nContext", () => ({ useI18n: () => ({ locale: "ar", t: (key: string) => key }) }));
const initial = { contact_email: "contact@example.test", support_email: "help@example.test", contact_phone: "", location_ar: "", location_en: "", hours_ar: "", hours_en: "" };
let client: QueryClient;
beforeEach(() => {
  mocks.admin = true;
  mocks.read.mockResolvedValue({ data: initial, error: null });
  mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.write }) }) });
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ single: mocks.read }) }), update: mocks.update });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } } });
});
afterEach(() => { cleanup(); client.clear(); vi.resetAllMocks(); });
function show(editor = true) {
  return render(<QueryClientProvider client={client}><MemoryRouter>{editor && <PublicContactSettings />}<PublicFooter /></MemoryRouter></QueryClientProvider>);
}

describe("public contact settings", () => {
  it("saves normalized fields and refreshes the public footer from the returned row", async () => {
    show();
    const email = await screen.findByLabelText("إيميل الدعم");
    expect(screen.queryByRole("link", { name: /966/ })).not.toBeInTheDocument();
    fireEvent.change(email, { target: { value: "NEW@example.test" } });
    fireEvent.change(screen.getByLabelText("رقم التواصل (اختياري)"), { target: { value: "+966 50 123 4567" } });
    mocks.write.mockResolvedValue({ data: { ...initial, support_email: "new@example.test", contact_phone: "+966 50 123 4567" }, error: null });
    fireEvent.click(screen.getByRole("button", { name: "حفظ بيانات التواصل" }));
    expect(await screen.findByText("تم الحفظ. الموقع يستخدم بيانات التواصل الجديدة الآن.")).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledWith({ ...initial, support_email: "new@example.test", contact_phone: "+966 50 123 4567" });
    expect(screen.getByRole("link", { name: "new@example.test" })).toHaveAttribute("href", "mailto:new@example.test");
    expect(screen.getByRole("link", { name: "+966 50 123 4567" })).toHaveAttribute("href", "tel:+966501234567");
  });
  it("retains the draft and published values after a denied or zero-row save", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("إيميل الدعم"), { target: { value: "draft@example.test" } });
    mocks.write.mockResolvedValue({ data: null, error: { message: "No rows returned" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ بيانات التواصل" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذّر الحفظ");
    expect(screen.getByLabelText("إيميل الدعم")).toHaveValue("draft@example.test");
    expect(screen.getByRole("link", { name: "help@example.test" })).toHaveAttribute("href", "mailto:help@example.test");
    expect(screen.queryByText(/تم الحفظ/)).not.toBeInTheDocument();
  });
  it("does not overwrite unsaved edits when background data refreshes", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("إيميل التواصل"), { target: { value: "draft@example.test" } });
    client.setQueryData(publicContactKey, { ...initial, contact_email: "remote@example.test" });
    await waitFor(() => expect(screen.getByLabelText("إيميل التواصل")).toHaveValue("draft@example.test"));
  });
  it("hides platform editing from tenant users while public data remains readable", async () => {
    mocks.admin = false;
    show();
    expect(await screen.findByRole("link", { name: "help@example.test" })).toBeInTheDocument();
    expect(screen.queryByLabelText("إيميل الدعم")).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("offers retry instead of fabricated defaults when loading fails", async () => {
    mocks.read.mockResolvedValue({ data: null, error: { message: "offline" } });
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذّر تحميل");
    expect(screen.queryByRole("link", { name: "help@example.test" })).not.toBeInTheDocument();
    mocks.read.mockResolvedValue({ data: initial, error: null });
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByLabelText("إيميل الدعم")).toHaveValue("help@example.test");
  });
});
