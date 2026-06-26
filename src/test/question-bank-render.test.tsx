import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import QuestionBank from "@/pages/QuestionBank";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock DashboardLayout to isolate the page
vi.mock("@/components/DashboardLayout", () => {
  return {
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dashboard-layout">{children}</div>
    ),
  };
});

// Mock i18n Context
vi.mock("@/contexts/I18nContext", () => {
  return {
    useI18n: () => ({
      locale: "ar",
      dir: "rtl",
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

// Mock useJobs
vi.mock("@/hooks/useJobs", () => {
  return {
    useJobs: () => ({
      data: [{ id: "job-1", title: "مطور ويب" }],
      isLoading: false,
    }),
  };
});

// Mock usePipelineStages
vi.mock("@/hooks/usePipelineStages", () => {
  return {
    usePipelineStages: () => ({
      data: [],
      isLoading: false,
    }),
  };
});

describe("QuestionBank Page Render Test", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders QuestionBank page successfully", () => {
    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <QuestionBank />
      </QueryClientProvider>
    );
    expect(getByTestId("dashboard-layout")).toBeDefined();
  });
});
