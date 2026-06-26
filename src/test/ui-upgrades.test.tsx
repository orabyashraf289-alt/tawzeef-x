import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import PerformanceEvaluation from "@/pages/PerformanceEvaluation";
import TaskBoard from "@/pages/TaskBoard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock DashboardLayout to isolate the pages from routing, auth, and DB queries
vi.mock("@/components/DashboardLayout", () => {
  return {
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dashboard-layout">{children}</div>
    ),
  };
});

// Mock i18n Context
let mockLocale = "ar";
let mockDir = "rtl";

vi.mock("@/contexts/I18nContext", () => {
  return {
    useI18n: () => ({
      locale: mockLocale,
      dir: mockDir,
      t: (key: string) => key,
    }),
  };
});

// Mock Auth Context
vi.mock("@/contexts/AuthContext", () => {
  return {
    useAuth: () => ({
      user: { id: "test-user-id" },
      loading: false,
      signOut: vi.fn(),
    }),
  };
});

// Mock database datasets
let mockTasksData: any[] = [];
let mockEvaluationsData: any[] = [];

const resetMockData = () => {
  mockTasksData = [
    {
      id: "task-1",
      title: "تصميم واجهة لوحة تحكم التقييم الشامل",
      title_en: "Design 360-Evaluation dashboard UI",
      description: "إعداد التصميم والتجربة التفاعلية لتقييم الـ 360 درجة ليتناسب مع أجهزة الجوال.",
      description_en: "Setup design and interactive experience for 360 evaluation to fit mobile devices.",
      assignee: "أحمد الحربي",
      assignee_en: "Ahmad Al-Harbi",
      due_date: "2026-06-20",
      priority: "high",
      column_status: "in_progress",
    },
    {
      id: "task-2",
      title: "ربط بوابة الدفع للاشتراكات",
      title_en: "Integrate subscription payment gateway",
      description: "إعداد بوابة دفع تابي وسبلا لتناسب السوق السعودية والخليجية.",
      description_en: "Configure Tabby and Stc Pay gateways for Saudi and Gulf markets.",
      assignee: "خالد منصور",
      assignee_en: "Khaled Mansour",
      due_date: "2026-06-25",
      priority: "high",
      column_status: "todo",
    }
  ];

  mockEvaluationsData = [
    {
      id: "1",
      evalee_name: "أحمد الحربي",
      evalee_name_en: "Ahmad Al-Harbi",
      evalee_role: "مهندس واجهات أمامية أول",
      evalee_role_en: "Senior Frontend Engineer",
      reviewer_name: "محمد العتيبي",
      reviewer_name_en: "Mohammed Al-Otaibi",
      relationship: "manager",
      productivity: 8.5,
      leadership: 8,
      teamwork: 9,
      technical: 9,
      communication: 8.5,
      comment: "قيادي رائع في المبادرات التقنية ويسلم المهام بجودة عالية وتفاصيل دقيقة.",
    },
    {
      id: "2",
      evalee_name: "سارة العتيبي",
      evalee_name_en: "Sarah Al-Otaibi",
      evalee_role: "منسقة موارد بشرية",
      evalee_role_en: "HR Coordinator",
      reviewer_name: "ريما السديري",
      reviewer_name_en: "Rema Al-Sudairy",
      relationship: "peers",
      productivity: 8.2,
      leadership: 8,
      teamwork: 9.8,
      technical: 7.5,
      communication: 9.2,
      comment: "سارة هي روح الفريق، تواصلها ممتاز وتعمل دائماً على حل أي خلافات بروح طيبة.",
    }
  ];
};

// Mock Supabase JS client
const mockFrom = vi.fn().mockImplementation((table: string) => {
  return {
    select: vi.fn().mockImplementation(() => {
      const promise = Promise.resolve({
        data: table === "tasks" ? mockTasksData : mockEvaluationsData,
        error: null,
      });
      (promise as any).order = vi.fn().mockResolvedValue({
        data: table === "tasks" ? mockTasksData : mockEvaluationsData,
        error: null
      });
      return promise;
    }),
    insert: vi.fn().mockImplementation((payload: any) => {
      const dataPayload = Array.isArray(payload) ? payload : [payload];
      
      // Mutate the mock database dataset in memory so queries return the new item
      dataPayload.forEach(item => {
        if (table === "tasks") {
          if (!mockTasksData.find(t => t.title === item.title)) {
            mockTasksData.push({
              id: `task-${Date.now()}`,
              title: item.title,
              title_en: item.title_en || item.title,
              description: item.description || "",
              description_en: item.description_en || "",
              assignee: item.assignee,
              assignee_en: item.assignee_en || "",
              due_date: item.due_date,
              priority: item.priority || "medium",
              column_status: item.column_status || "todo",
            });
          }
        } else if (table === "performance_evaluations") {
          mockEvaluationsData.push({
            id: `eval-${Date.now()}`,
            evalee_name: item.evalee_name,
            evalee_name_en: item.evalee_name_en,
            evalee_role: item.evalee_role,
            evalee_role_en: item.evalee_role_en,
            reviewer_name: item.reviewer_name,
            reviewer_name_en: item.reviewer_name_en,
            relationship: item.relationship,
            productivity: item.productivity,
            leadership: item.leadership,
            teamwork: item.teamwork,
            technical: item.technical,
            communication: item.communication,
            comment: item.comment,
          });
        }
      });

      return {
        select: vi.fn().mockImplementation(() => {
          const promise = Promise.resolve({
            data: dataPayload,
            error: null,
          });
          (promise as any).single = vi.fn().mockResolvedValue({
            data: dataPayload[0],
            error: null
          });
          return promise;
        })
      };
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => mockFrom(table),
    },
  };
});

// Mock toast hook
const mockToastFn = vi.fn();
vi.mock("@/hooks/use-toast", () => {
  return {
    useToast: () => ({
      toast: mockToastFn,
    }),
  };
});

// Mock Recharts ResponsiveContainer to avoid size errors under JSDOM
vi.mock("recharts", async () => {
  const original = (await vi.importActual("recharts")) as any;
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

// Test wrapper with QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQuery = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>
  );
};

describe("UI upgrades - PerformanceEvaluation Page", () => {
  beforeEach(() => {
    mockLocale = "ar";
    mockDir = "rtl";
    resetMockData();
    vi.clearAllMocks();
  });

  it("renders successfully in Arabic RTL", async () => {
    renderWithQuery(<PerformanceEvaluation />);
    
    // Wait for the query to resolve and seed components to render
    await waitFor(() => {
      expect(screen.getAllByText("أحمد الحربي").length).toBeGreaterThan(0);
    });
    
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(screen.getByText("تقييم الأداء الشامل (360 درجة)")).toBeInTheDocument();
    expect(screen.getAllByText("مهندس واجهات أمامية أول").length).toBeGreaterThan(0);
  });

  it("allows switching between team members to display details", async () => {
    renderWithQuery(<PerformanceEvaluation />);
    
    await waitFor(() => {
      expect(screen.getAllByText("سارة العتيبي").length).toBeGreaterThan(0);
    });

    // Select Sarah Al-Otaibi from the list
    const sarahBtn = screen.getAllByText("سارة العتيبي")[0];
    fireEvent.click(sarahBtn);

    // Sarah's details should be displayed as active header
    await waitFor(() => {
      const activeHeaders = screen.getAllByText("سارة العتيبي");
      expect(activeHeaders.length).toBeGreaterThan(1);
    });
    expect(screen.getAllByText("منسقة موارد بشرية").length).toBeGreaterThan(0);
  });

  it("opens the Add Evaluation drawer upon button click", async () => {
    renderWithQuery(<PerformanceEvaluation />);
    
    await waitFor(() => {
      expect(screen.getByText("إضافة تقييم جديد")).toBeInTheDocument();
    });

    // The "Add Evaluation" button
    const addBtn = screen.getByText("إضافة تقييم جديد");
    fireEvent.click(addBtn);

    // Drawer header should be visible
    expect(screen.getByText("تقديم تقييم أداء جديد")).toBeInTheDocument();
    expect(screen.getByLabelText("اسم المقيِّم بالكامل *")).toBeInTheDocument();
  });

  it("submits new evaluation successfully and triggers toast feedback", async () => {
    renderWithQuery(<PerformanceEvaluation />);
    
    await waitFor(() => {
      expect(screen.getByText("إضافة تقييم جديد")).toBeInTheDocument();
    });

    // Open drawer
    fireEvent.click(screen.getByText("إضافة تقييم جديد"));

    // Enter reviewer name
    const nameInput = screen.getByLabelText("اسم المقيِّم بالكامل *");
    fireEvent.change(nameInput, { target: { value: "عبدالمحسن المقرن" } });

    // Enter comment
    const commentInput = screen.getByLabelText("ملاحظات تعليقات عامة");
    fireEvent.change(commentInput, { target: { value: "أداء ممتاز وتطور مستمر" } });

    // Submit form
    const submitBtn = screen.getByText("حفظ وإضافة التقييم");
    fireEvent.click(submitBtn);

    // Toast should be fired
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "تم التقييم بنجاح",
        })
      );
    });
  });
});

describe("UI upgrades - TaskBoard Page", () => {
  beforeEach(() => {
    mockLocale = "ar";
    mockDir = "rtl";
    resetMockData();
    vi.clearAllMocks();
  });

  it("renders successfully in Arabic RTL", async () => {
    renderWithQuery(<TaskBoard />);
    await waitFor(() => {
      expect(screen.getByText("المتأخرات")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(screen.getByText("لوحة المهام (كانبان)")).toBeInTheDocument();
    expect(screen.getByText("قيد التنفيذ")).toBeInTheDocument();
  });

  it("renders mock task cards correctly", async () => {
    renderWithQuery(<TaskBoard />);
    await waitFor(() => {
      expect(screen.getByText("تصميم واجهة لوحة تحكم التقييم الشامل")).toBeInTheDocument();
    });
    expect(screen.getByText("ربط بوابة الدفع للاشتراكات")).toBeInTheDocument();
  });

  it("allows moving tasks using transition buttons", async () => {
    renderWithQuery(<TaskBoard />);
    
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "الحالة التالية" }).length).toBeGreaterThan(0);
    });

    // Let's find Next Stage buttons on the cards
    const moveButtons = screen.getAllByRole("button", { name: "الحالة التالية" });
    // Click the first one to trigger move
    fireEvent.click(moveButtons[0]);

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "تم تحديث حالة المهمة",
        })
      );
    });
  });

  it("opens the Add Task drawer and submits a new task", async () => {
    renderWithQuery(<TaskBoard />);
    
    await waitFor(() => {
      expect(screen.getByText("إنشاء مهمة جديدة")).toBeInTheDocument();
    });

    // Open drawer
    fireEvent.click(screen.getByText("إنشاء مهمة جديدة"));
    expect(screen.getByText("عنوان المهمة بالعربية *")).toBeInTheDocument();

    // Fill title
    const titleInput = screen.getByLabelText("عنوان المهمة بالعربية *");
    fireEvent.change(titleInput, { target: { value: "اختبار الكود الجديد" } });

    // Fill description
    const descInput = screen.getByLabelText("تفاصيل ووصف المهمة بالعربية *");
    fireEvent.change(descInput, { target: { value: "كتابة واختبار كافة سيناريوهات لوحة التحكم" } });

    // Fill assignee
    const assigneeInput = screen.getByLabelText("المسؤول عن المهمة بالعربية *");
    fireEvent.change(assigneeInput, { target: { value: "صالح الماجد" } });

    // Fill due date
    const dateInput = screen.getByLabelText("تاريخ الاستحقاق والتسليم *");
    fireEvent.change(dateInput, { target: { value: "2026-06-25" } });

    // Submit
    fireEvent.click(screen.getByText("إنشاء المهمة وحفظها"));

    // Toast check
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "تمت إضافة المهمة",
        })
      );
    });

    // New task should appear in the document
    await waitFor(() => {
      expect(screen.getByText("اختبار الكود الجديد")).toBeInTheDocument();
    });
  });
});
