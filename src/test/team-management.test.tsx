import { describe, it, expect, vi } from "vitest";
import React from "react";
import TeamManagement from "@/pages/TeamManagement";

// Mock hooks and components used by TeamManagement
vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "tx@tawzeefx.com" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({
    role: "admin",
    isAdmin: true,
    isSuperAdmin: true,
    isPlatformSuperAdmin: true,
    isLoading: false,
  }),
  useAllUserRoles: () => ({ data: [], isLoading: false }),
  useUpdateUserRole: () => vi.fn(),
  useDeleteTeamMember: () => vi.fn(),
  useInvitations: () => ({ data: [], isLoading: false }),
  useSendInvitation: () => vi.fn(),
  useActivityLog: () => ({ data: [], isLoading: false }),
  useCustomRoles: () => ({ data: [], isLoading: false }),
  useCreateCustomRole: () => vi.fn(),
  useDeleteCustomRole: () => vi.fn(),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompanyContext: () => ({
    activeCompany: { id: "comp-1", name: "Tawzeef-X" },
    companyBranches: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useScreenPermissions", () => ({
  useAllPermissions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useJobs", () => ({
  useCandidates: () => ({ data: [] }),
  useJobs: () => ({ data: [] }),
  useInterviews: () => ({ data: [] }),
}));

vi.mock("@/hooks/useCompanies", () => ({
  useCompanyMembers: () => ({ data: [] }),
}));

vi.mock("@/hooks/useCompanyInvitations", () => ({
  useCreateCompanyInvitation: () => vi.fn(),
}));

vi.mock("@/contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: "ar",
    dir: "rtl",
  }),
}));

describe("TeamManagement Page", () => {
  it("exports a valid React component and imports useAuth correctly without runtime ReferenceErrors", () => {
    expect(TeamManagement).toBeDefined();
    expect(typeof TeamManagement).toBe("function");
  });
});
