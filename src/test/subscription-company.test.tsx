import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCompanyInvoices, useCreateUpgradeRequest, useMySubscription } from "@/hooks/useSubscription";
import BillingHistory from "@/components/BillingHistory";

const mocks = vi.hoisted(() => ({
  active: { id: "b", name: "B", parent_company_id: null } as null | { id: string; name: string; parent_company_id: string | null },
  loading: false,
  rows: {} as Record<string, Array<Record<string, unknown>>>,
  error: null as null | { code: string; message: string },
  requests: [] as Array<{ table: string; filters: Record<string, unknown> }>,
  insert: vi.fn(),
  upsert: vi.fn(),
  invoke: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({
  activeCompany: mocks.active, isLoading: mocks.loading,
  myCompanies: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
}) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: (table: string) => {
    const filters: Record<string, unknown> = {};
    const response = () => {
      mocks.requests.push({ table, filters: { ...filters } });
      return { data: (mocks.rows[table] || []).filter(row => Object.entries(filters).every(([key, value]) =>
        Array.isArray(value) ? value.includes(row[key]) : row[key] === value)), error: mocks.error };
    };
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { filters[key] = value; return builder; },
      in: (key: string, value: unknown[]) => { filters[key] = value; return builder; },
      order: () => builder,
      limit: () => builder,
      insert: (payload: unknown) => { mocks.insert(table, payload); return builder; },
      upsert: mocks.upsert,
      single: async () => ({ ...response(), data: response().data[0] || null }),
      maybeSingle: async () => { const r = response(); return { ...r, data: r.data[0] || null }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(response()).then(resolve),
    };
    return builder;
  },
} }));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  mocks.active = { id: "b", name: "B", parent_company_id: null };
  mocks.loading = false;
  mocks.error = null;
  mocks.requests = [];
  mocks.insert.mockReset(); mocks.upsert.mockReset(); mocks.invoke.mockReset();
  mocks.rows = {
    company_subscriptions: [{ id: "sub-a", company_id: "a", user_id: "owner" }, { id: "sub-b", company_id: "b", user_id: "owner" }],
    companies: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    company_invoices: [{ id: "invoice-a", company_id: "a" }, { id: "invoice-b", company_id: "b" }],
  };
});
afterEach(cleanup);

it("loads the selected company and switches cache scope when selection changes", async () => {
  const { result, rerender } = renderHook(useMySubscription, { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data?.id).toBe("sub-b"));
  mocks.active = { id: "a", name: "A", parent_company_id: null };
  rerender();
  await waitFor(() => expect(result.current.data?.id).toBe("sub-a"));
  expect(mocks.requests.every(r => r.table === "company_subscriptions")).toBe(true);
});
it("uses the parent subscription for a selected branch", async () => {
  mocks.active = { id: "branch", name: "Branch", parent_company_id: "b" };
  const { result } = renderHook(useMySubscription, { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data?.id).toBe("sub-b"));
});
it("does not substitute another owned subscription or activate from an invoice", async () => {
  mocks.rows.company_subscriptions = [mocks.rows.company_subscriptions[0]];
  mocks.rows.company_invoices = [{ company_id: "b", status: "paid", plan_id: "other-plan" }];
  const { result } = renderHook(useMySubscription, { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
  expect(mocks.upsert).not.toHaveBeenCalled();
  expect(mocks.requests).toEqual([{ table: "company_subscriptions", filters: { company_id: "b" } }]);
});
it.each(["missing", "loading"])("does not query subscriptions without resolved company context: %s", async state => {
  if (state === "missing") mocks.active = null; else mocks.loading = true;
  const { result } = renderHook(useMySubscription, { wrapper: wrapper() });
  expect(result.current.fetchStatus).toBe("idle");
  expect(mocks.requests).toEqual([]);
});
it("propagates subscription read errors instead of returning a different account", async () => {
  mocks.error = { code: "42501", message: "Access denied" };
  const { result } = renderHook(useMySubscription, { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("scopes tenant invoices and keeps the explicit admin listing available", async () => {
  const { result } = renderHook(() => ({ tenant: useCompanyInvoices(), admin: useCompanyInvoices({ allCompanies: true }) }), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.tenant.data?.map(i => i.id)).toEqual(["invoice-b"]));
  await waitFor(() => expect(result.current.admin.data).toHaveLength(2));
});
it("rejects an upgrade request without a company before writing or notifying", async () => {
  mocks.active = null;
  const { result } = renderHook(useCreateUpgradeRequest, { wrapper: wrapper() });
  await act(async () => { await expect(result.current.mutateAsync({ targetPlanId: "plan", targetPlanName: "Plan" })).rejects.toThrow("اختر شركة"); });
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it("targets the selected billing company and does not hide a permission failure as a queued request", async () => {
  mocks.active = { id: "branch", name: "Branch", parent_company_id: "b" };
  mocks.error = { code: "42501", message: "permission denied for subscription_upgrade_requests" };
  const { result } = renderHook(useCreateUpgradeRequest, { wrapper: wrapper() });
  await act(async () => { await expect(result.current.mutateAsync({ targetPlanId: "plan", targetPlanName: "Plan" })).rejects.toEqual(mocks.error); });
  expect(mocks.insert).toHaveBeenCalledWith("subscription_upgrade_requests", expect.objectContaining({ company_id: "b" }));
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it("does not manufacture paid invoices when the company has no recorded invoices", async () => {
  mocks.rows.company_invoices = [];
  render(<BillingHistory />, { wrapper: wrapper() });
  await screen.findByText("لا يوجد سجل مدفوعات حالياً لهذه الشركة.");
  expect(screen.queryByText(/INV-/)).not.toBeInTheDocument();
  expect(mocks.requests.some(r => r.table === "company_subscriptions")).toBe(false);
});
it("shows an invoice loading error rather than an empty payment history", async () => {
  mocks.error = { code: "42501", message: "Access denied" };
  render(<BillingHistory />, { wrapper: wrapper() });
  expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحميل الفواتير");
});
