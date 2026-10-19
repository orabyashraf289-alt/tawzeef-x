import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CompanySettingsManager from "@/components/CompanySettingsManager";
import { supabase } from "@/integrations/supabase/client";

const mocks = vi.hoisted(() => ({
  companyId: "company-b",
  toast: vi.fn(),
  from: vi.fn(),
  saveBrandSettings: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompanyContext: () => ({
  activeCompanyId: mocks.companyId,
  activeCompany: { id: mocks.companyId, member_role: "owner" },
  isLoading: false,
  refetchCompanies: vi.fn(),
}) }));
vi.mock("@/contexts/I18nContext", () => ({ useI18n: () => ({ t: (key: string) => key, locale: "ar" }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ primaryColor: "160 84% 25%", setPrimaryColor: vi.fn() }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "admin", isAdmin: true }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/posterBrandSettings", () => ({ saveBrandSettings: mocks.saveBrandSettings }));
vi.mock("@/hooks/useCompanies", () => ({
  useCompanyMembers: () => ({ data: [], isLoading: false }),
  useRemoveCompanyMember: () => ({ mutateAsync: vi.fn() }),
  useCompanyBranches: () => ({ data: [], isLoading: false }),
  useCreateCompanyBranch: () => ({ mutateAsync: vi.fn() }),
  useUpdateCompany: () => ({ mutateAsync: vi.fn() }),
  useDeleteCompany: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useCompanyInvitations", () => ({
  useCompanyInvitations: () => ({ data: [], refetch: vi.fn() }),
  useCreateCompanyInvitation: () => ({ mutateAsync: vi.fn() }),
  useCancelInvitation: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.companyId = "company-b";
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      update: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data: table === "companies" ? {
          id: mocks.companyId, name: `Selected ${mocks.companyId}`,
          website: "", industry: "", city: "", country: "SA", notes: "", brand_settings: null,
        } : null,
        error: null,
      })),
      single: vi.fn(async () => ({ data: null, error: null })),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: null })),
    };
    return query;
  });
});
afterEach(() => { cleanup(); client.clear(); });

it("loads and saves the selected company rather than the first membership", async () => {
  const { rerender } = render(<QueryClientProvider client={client}><CompanySettingsManager /></QueryClientProvider>);
  expect(await screen.findByDisplayValue("Selected company-b")).toBeInTheDocument();
  expect(mocks.from.mock.calls.some(([table]) => table === "company_members")).toBe(false);

  mocks.companyId = "company-c";
  rerender(<QueryClientProvider client={client}><CompanySettingsManager /></QueryClientProvider>);
  expect(await screen.findByDisplayValue("Selected company-c")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /حفظ التغييرات/ }));

  await waitFor(() => expect(mocks.from.mock.results.some((result, i) =>
    mocks.from.mock.calls[i][0] === "companies" && result.value.update.mock.calls.length > 0)).toBe(true));
  const updateCall = mocks.from.mock.results.find((result, i) =>
    mocks.from.mock.calls[i][0] === "companies" && result.value.update.mock.calls.length > 0);
  expect(updateCall?.value.eq).toHaveBeenCalledWith("id", "company-c");
  expect(supabase.from).not.toHaveBeenCalledWith("company_members");
});
