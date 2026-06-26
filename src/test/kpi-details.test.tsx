import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import KPIDetailsDialog from "@/components/KPIDetailsDialog";

// Mock Recharts ResponsiveContainer to prevent size calculation errors in JSDOM
vi.mock("recharts", async () => {
  const original = (await vi.importActual("recharts")) as any;
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe("KPIDetailsDialog Component", () => {
  const mockCandidates = [
    { id: "1", name: "Candidate A", status: "مقبول", stage: "تقديم الطلب", created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-05T00:00:00Z" },
    { id: "2", name: "Candidate B", status: "جديد", stage: "مراجعة السيرة", created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-02T00:00:00Z" }
  ];
  const mockInterviews = [];
  const mockJobs = [
    { id: "j1", title: "Frontend Engineer" }
  ];
  const mockOffers = [
    { id: "o1", status: "accepted" }
  ];

  it("does not render when closed", () => {
    const { container } = render(
      <KPIDetailsDialog
        isOpen={false}
        onClose={vi.fn()}
        type="conversion"
        candidates={mockCandidates}
        interviews={mockInterviews}
        jobs={mockJobs}
        offers={mockOffers}
        locale="en"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders conversion rate details in English", () => {
    render(
      <KPIDetailsDialog
        isOpen={true}
        onClose={vi.fn()}
        type="conversion"
        candidates={mockCandidates}
        interviews={mockInterviews}
        jobs={mockJobs}
        offers={mockOffers}
        locale="en"
      />
    );
    expect(screen.getByText("Conversion Rate Analysis")).toBeInTheDocument();
    expect(screen.getByText("Overall Acceptance Rate")).toBeInTheDocument();
  });

  it("renders conversion rate details in Arabic", () => {
    render(
      <KPIDetailsDialog
        isOpen={true}
        onClose={vi.fn()}
        type="conversion"
        candidates={mockCandidates}
        interviews={mockInterviews}
        jobs={mockJobs}
        offers={mockOffers}
        locale="ar"
      />
    );
    expect(screen.getByText("تحليل معدل التحويل")).toBeInTheDocument();
    expect(screen.getByText("معدل القبول الكلي")).toBeInTheDocument();
  });

  it("renders time to hire details with bottleneck alert", () => {
    render(
      <KPIDetailsDialog
        isOpen={true}
        onClose={vi.fn()}
        type="timeToHire"
        candidates={mockCandidates}
        interviews={mockInterviews}
        jobs={mockJobs}
        offers={mockOffers}
        locale="en"
      />
    );
    expect(screen.getByText("Average Time to Hire Analysis")).toBeInTheDocument();
    expect(screen.getByText("Current Bottleneck Stage")).toBeInTheDocument();
  });

  it("renders fill rate details", () => {
    render(
      <KPIDetailsDialog
        isOpen={true}
        onClose={vi.fn()}
        type="fillRate"
        candidates={mockCandidates}
        interviews={mockInterviews}
        jobs={mockJobs}
        offers={mockOffers}
        locale="en"
      />
    );
    expect(screen.getByText("Fill Rate Analysis")).toBeInTheDocument();
    expect(screen.getByText("Job Requisitions Fill Rate")).toBeInTheDocument();
  });

  it("renders offer acceptance details", () => {
    render(
      <KPIDetailsDialog
        isOpen={true}
        onClose={vi.fn()}
        type="offers"
        candidates={mockCandidates}
        interviews={mockInterviews}
        jobs={mockJobs}
        offers={mockOffers}
        locale="en"
      />
    );
    expect(screen.getByText("Offer Acceptance Rate Analysis")).toBeInTheDocument();
    expect(screen.getByText("Offer Acceptance Rate")).toBeInTheDocument();
  });
});
