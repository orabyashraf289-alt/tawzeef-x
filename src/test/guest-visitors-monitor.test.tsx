import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GuestVisitorsMonitor from "@/components/security/GuestVisitorsMonitor";
import { trackGuestVisit, getOrCreateVisitorId } from "@/lib/visitorTracker";

// Mock Supabase
const mockVisitors = [
  {
    id: "guest-1",
    event_type: "visitor.entry",
    ip_address: "178.80.120.45",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    details: {
      visitor_id: "vis_101",
      is_guest: true,
      is_returning: false,
      path: "/jobs",
      full_url: "https://tawzeefx.com/jobs",
      referrer: "google.com",
      screen_resolution: "1920x1080",
      device_type: "Desktop",
      device_name: "كمبيوتر شخصي",
      browser_name: "Chrome",
      os_name: "Windows",
      language: "ar",
      time_zone: "Asia/Riyadh",
    },
  },
  {
    id: "guest-2",
    event_type: "visitor.page_view",
    ip_address: "212.118.140.22",
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    details: {
      visitor_id: "vis_102",
      is_guest: true,
      is_returning: true,
      path: "/auth",
      full_url: "https://tawzeefx.com/auth",
      referrer: "مباشر (Direct)",
      screen_resolution: "390x844",
      device_type: "Mobile",
      device_name: "Apple iPhone",
      browser_name: "Safari",
      os_name: "iOS",
      language: "ar",
      time_zone: "Asia/Riyadh",
    },
  },
];

vi.mock("@/integrations/supabase/client", () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockVisitors, error: null }),
        gte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/hooks/useAuditLog", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(true),
}));

const renderMonitor = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GuestVisitorsMonitor />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("GuestVisitorsMonitor & Unauthenticated Visitor Tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("renders monitor header, live status, and KPIs accurately", async () => {
    renderMonitor();

    expect(screen.getByText("شاشة رصد حركة الزوار والضيوف غير المسجلين")).toBeInTheDocument();
    expect(screen.getByText("المراقبة اللحظية نشطة")).toBeInTheDocument();

    // Verify KPI Cards
    await waitFor(() => {
      expect(screen.getByText("إجمالي زيارات الضيوف")).toBeInTheDocument();
      expect(screen.getByText("نشطون الآن (آخر 30 دقيقة)")).toBeInTheDocument();
      expect(screen.getByText("أعلى مسار استكشافاً")).toBeInTheDocument();
      expect(screen.getByText("توزيع أجهزة الزوار")).toBeInTheDocument();
    });
  });

  it("lists unauthenticated visitors with their visited path and devices", async () => {
    renderMonitor();

    await waitFor(() => {
      expect(screen.getByText("vis_101")).toBeInTheDocument();
      expect(screen.getByText("vis_102")).toBeInTheDocument();
      expect(screen.getAllByText("/jobs").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("/auth").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("ضيف غير مسجل 👤").length).toBe(2);
      expect(screen.getByText("زائر عائد 🔄")).toBeInTheDocument();
    });
  });

  it("filters visitors by search input", async () => {
    renderMonitor();

    await waitFor(() => {
      expect(screen.getByText("vis_101")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/بحث بالمسار المزار/);
    fireEvent.change(searchInput, { target: { value: "Safari" } });

    await waitFor(() => {
      expect(screen.getByText("vis_102")).toBeInTheDocument();
      expect(screen.queryByText("vis_101")).not.toBeInTheDocument();
    });
  });

  it("opens visitor full inspection dialog when clicking details", async () => {
    renderMonitor();

    await waitFor(() => {
      expect(screen.getByText("vis_101")).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByText("تفاصيل الجلسة");
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("تفاصيل جلسة الزائر غير المسجل")).toBeInTheDocument();
      expect(screen.getByText("1920x1080")).toBeInTheDocument();
    });
  });

  it("generates visitor id and tracks guest visits without errors", async () => {
    const { visitorId, isReturning } = getOrCreateVisitorId();
    expect(visitorId).toMatch(/^vis_/);
    expect(isReturning).toBe(false);

    // Second call should return the same visitorId and mark as returning
    const secondCall = getOrCreateVisitorId();
    expect(secondCall.visitorId).toBe(visitorId);
    expect(secondCall.isReturning).toBe(true);

    // Call trackGuestVisit
    await trackGuestVisit("/pricing", true);
  });
});
