import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CompanyPortal from "@/pages/CompanyPortal";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        delete: vi.fn().mockReturnThis(),
      })),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logo.png" } }),
        })),
      },
    },
  };
});

// Mock Auth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@company.com" },
    profile: { full_name: "أحمد المسؤول" },
  }),
}));

// Mock CompanyContext
let mockActiveCompanyId = "comp-1";
vi.mock("@/contexts/CompanyContext", () => {
  const companyMock = () => ({
    activeCompanyId: mockActiveCompanyId,
    setActiveCompanyId: (id: string) => {
      mockActiveCompanyId = id;
    },
    activeCompany: mockPrimaryCompany,
    company: mockPrimaryCompany,
    myCompanies: [mockPrimaryCompany, ...mockBranches],
    isBranch: false,
    activeCompanyRole: "owner",
    isCompanyAdmin: true,
    isLoading: false,
    refetch: vi.fn(),
  });
  return {
    useCompanyContext: companyMock,
    useCompany: companyMock,
  };
});

// Mock hooks
const mockPrimaryCompany = {
  id: "comp-1",
  name: "شركة التقنية المتقدمة للتجارة",
  name_en: "Advanced Tech Co",
  city: "الرياض",
  country: "السعودية",
  industry: "تقنية المعلومات",
  contact_email: "info@advtech.sa",
  contact_phone: "0112345678",
  website: "https://advtech.sa",
  parent_company_id: null,
  member_role: "owner",
  logo_url: null,
  notes: "المقر الرئيسي في واحة المعرفة",
};

const mockBranches = [
  {
    id: "branch-1",
    name: "فرع الرياض - واحة التقنية",
    city: "الرياض",
    contact_email: "riyadh@advtech.sa",
    contact_phone: "0119876543",
    notes: "[فرع إداري] برج النخيل - طريق الملك فهد",
    parent_company_id: "comp-1",
    logo_url: null,
  },
  {
    id: "branch-2",
    name: "فرع جدة - الكورنيش",
    city: "جدة",
    contact_email: "jeddah@advtech.sa",
    contact_phone: "0123456789",
    notes: "[مركز تشغيلي] طريق الأمير سلطان",
    parent_company_id: "comp-1",
    logo_url: null,
  },
];

vi.mock("@/hooks/useCompanies", () => ({
  useMyCompanies: () => ({
    data: [mockPrimaryCompany, ...mockBranches],
    isLoading: false,
  }),
  useCompanyStats: () => ({
    data: { jobsTotal: 12, candidatesTotal: 84, offersTotal: 6 },
    isLoading: false,
  }),
  useMyCompanyRole: () => ({
    data: "owner",
    isLoading: false,
  }),
  useCompanyBranches: () => ({
    data: mockBranches,
    isLoading: false,
  }),
  useCreateCompanyBranch: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: "branch-3" }),
    isPending: false,
  }),
  useUpdateCompany: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDeleteCompany: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  prepareCompanyPayload: vi.fn((x) => x),
}));

vi.mock("@/hooks/useCompanyInvitations", () => ({
  useMyPendingInvitations: () => ({
    data: [],
    isLoading: false,
  }),
  useCompanyInvitations: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateCompanyInvitation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useCancelInvitation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useAcceptInvitation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeclineInvitation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const renderPortal = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CompanyPortal />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("CompanyPortal Modern Overhaul & Al-Andalus Removal", () => {
  beforeEach(() => {
    mockActiveCompanyId = "comp-1";
    vi.clearAllMocks();
  });

  it("renders portal header, active company, and company summary KPIs", () => {
    renderPortal();

    expect(screen.getByText("بوابة إدارة الشركات والفروع")).toBeInTheDocument();
    expect(screen.getAllByText("شركة التقنية المتقدمة للتجارة").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("بيئة العمل النشطة")).toBeInTheDocument();
    expect(screen.getByText("مالك المؤسسة")).toBeInTheDocument();

    // Verify KPIs
    expect(screen.getByText("الوظائف المتاحة")).toBeInTheDocument();
    expect(screen.getByText("المرشحون المتقدمون")).toBeInTheDocument();
    expect(screen.getByText("العروض الوظيفية")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("renders verified branches list with search and city filter options", () => {
    renderPortal();

    expect(screen.getByText(/فروع ومراكز الشركة المعتمدة \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("فرع الرياض - واحة التقنية")).toBeInTheDocument();
    expect(screen.getByText("فرع جدة - الكورنيش")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("بحث باسم الفرع أو المدينة...")).toBeInTheDocument();
  });

  it("filters branches accurately when searching", async () => {
    renderPortal();

    const searchInput = screen.getByPlaceholderText("بحث باسم الفرع أو المدينة...");
    fireEvent.change(searchInput, { target: { value: "جدة" } });

    await waitFor(() => {
      expect(screen.getByText("فرع جدة - الكورنيش")).toBeInTheDocument();
      expect(screen.queryByText("فرع الرياض - واحة التقنية")).not.toBeInTheDocument();
    });
  });

  it("STRICT CHECK: ensures NO hardcoded Al-Andalus references or import buttons exist", () => {
    renderPortal();

    // Check DOM does NOT contain Al-Andalus texts
    expect(screen.queryByText(/مدارس الأندلس/)).not.toBeInTheDocument();
    expect(screen.queryByText(/استيراد فروع مدارس الأندلس/)).not.toBeInTheDocument();
    expect(screen.queryByText(/فروع الأندلس الـ 13/)).not.toBeInTheDocument();
  });

  it("opens Add Branch dialog when clicking button", async () => {
    renderPortal();

    const addBtn = screen.getByText("إضافة فرع جديد");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText("إضافة فرع جديد للمؤسسة")).toBeInTheDocument();
      expect(screen.getByLabelText(/اسم الفرع \/ المركز/)).toBeInTheDocument();
      expect(screen.getByLabelText(/تصنيف الفرع/)).toBeInTheDocument();
    });
  });
});
