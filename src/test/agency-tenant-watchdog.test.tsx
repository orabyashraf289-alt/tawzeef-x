import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyProvider } from "@/contexts/CompanyContext";

const { signOut, rpc } = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue({ error: null }),
  rpc: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "agency-user", user_metadata: { user_type: "agency" } } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signOut },
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

describe("agency invitation tenant watchdog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/dashboard");
    rpc.mockImplementation((name: string) => Promise.resolve({
      data: name === "is_super_admin" ? false : {
        access_state: "ALLOWED", is_agency: true,
      },
      error: null,
    }));
  });

  afterEach(() => window.history.replaceState({}, "", "/"));

  it("keeps a server-verified agency session without a company_members row", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CompanyProvider><div>حساب المكتب</div></CompanyProvider></QueryClientProvider>);

    expect(screen.getByText("حساب المكتب")).toBeInTheDocument();
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("validate_tenant_status"));
    await act(async () => { await Promise.resolve(); });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("does not eject an invited user while setting a password", async () => {
    window.history.replaceState({}, "", "/reset-password?invite=agency");
    rpc.mockImplementation((name: string) => Promise.resolve({
      data: name === "is_super_admin" ? false : { access_state: "DENIED" },
      error: null,
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CompanyProvider><div>تعيين كلمة المرور</div></CompanyProvider></QueryClientProvider>);

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("validate_tenant_status"));
    await act(async () => { await Promise.resolve(); });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("still blocks an agency without an active assignment", async () => {
    signOut.mockImplementationOnce(() => new Promise(() => {}));
    rpc.mockImplementation((name: string) => Promise.resolve({
      data: name === "is_super_admin" ? false : { access_state: "DENIED", denial_reason: "NO_COMPANY_MEMBERSHIP" },
      error: null,
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CompanyProvider><div>حساب غير نشط</div></CompanyProvider></QueryClientProvider>);

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
  });
});
