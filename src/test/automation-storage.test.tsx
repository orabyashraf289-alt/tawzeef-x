import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAutomationRules } from "@/hooks/useAutomation";

const mocks = vi.hoisted(() => ({
  companyId: "company-a",
  createError: null as null | { message: string },
  rows: {} as Record<string, Array<Record<string, unknown>>>,
  toast: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({ activeCompanyId: mocks.companyId }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: vi.fn(() => {
      let company = "";
      let payload: Record<string, unknown> = {};
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((key: string, value: string) => {
          if (key === "company_id") company = value;
          return builder;
        }),
        order: vi.fn(async () => ({ data: mocks.rows[company] || [], error: null })),
        insert: vi.fn((value: Record<string, unknown>) => {
          payload = value;
          return builder;
        }),
        single: vi.fn(async () => ({
          data: mocks.createError ? null : { ...payload, id: "43000000-0000-0000-0000-000000000001", is_active: false },
          error: mocks.createError,
        })),
      };
      return builder;
    }),
  },
}));

const draft = {
  title: "Welcome draft",
  trigger_event: "application.created" as const,
  conditions: [],
  actions: [],
};

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.companyId = "company-a";
  mocks.createError = null;
  mocks.rows = {
    "company-a": [{ id: "rule-a", company_id: "company-a", title: "A draft" }],
    "company-b": [{ id: "rule-b", company_id: "company-b", title: "B draft" }],
  };
  mocks.toast.mockClear();
  localStorage.clear();
});
afterEach(cleanup);

describe("Automation storage", () => {
  it("switches rule lists with the active company and excludes old local rules", async () => {
    localStorage.setItem("tx:automation-rules:v1", JSON.stringify([{ id: "local-a", company_id: "company-a", title: "Old local draft" }]));
    const { result, rerender } = renderHook(() => useAutomationRules(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rules.map(rule => rule.id)).toEqual(["rule-a"]));
    mocks.companyId = "company-b";
    rerender();
    await waitFor(() => expect(result.current.rules.map(rule => rule.id)).toEqual(["rule-b"]));
  });

  it("returns the server UUID for a saved inactive draft", async () => {
    const { result } = renderHook(() => useAutomationRules(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.canManage).toBe(true));
    await act(async () => {
      const saved = await result.current.createRule(draft);
      expect(saved.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(saved.company_id).toBe("company-a");
      expect(saved.is_active).toBe(false);
    });
    expect(localStorage.getItem("tx:automation-rules:v1")).toBeNull();
  });

  it("reports a rejected database write instead of saving a successful local fallback", async () => {
    mocks.createError = { message: "permission denied" };
    const { result } = renderHook(() => useAutomationRules(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.canManage).toBe(true));
    await act(async () => {
      await expect(result.current.createRule(draft)).rejects.toMatchObject({ message: "permission denied" });
    });
    expect(localStorage.getItem("tx:automation-rules:v1")).toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});
