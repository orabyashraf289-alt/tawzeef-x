import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStageMutations } from "@/hooks/usePipelineStages";
const mocks = vi.hoisted(() => ({ company: "company-a" as string | null, insert: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner-a" } }) }));
vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({ activeCompanyId: mocks.company }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
const stage = { name: "Screening", color: "#ffffff", icon: "circle", sort_order: 1 };
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
beforeEach(() => { mocks.company = "company-a"; mocks.insert.mockReset().mockResolvedValue({ error: null }); });
afterEach(cleanup);
it("creates an automation target in the selected company", async () => {
  const { result } = renderHook(() => useStageMutations(), { wrapper });
  await act(async () => { await result.current.addStage.mutateAsync(stage); });
  expect(mocks.insert).toHaveBeenCalledWith({ ...stage, company_id: "company-a", user_id: "owner-a" });
});
it("does not create an unscoped stage without a selected company", async () => {
  mocks.company = null;
  const { result } = renderHook(() => useStageMutations(), { wrapper });
  await act(async () => { await expect(result.current.addStage.mutateAsync(stage)).rejects.toThrow("اختر شركة"); });
  expect(mocks.insert).not.toHaveBeenCalled();
});
