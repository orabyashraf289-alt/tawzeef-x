import fs from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CandidatePortal from "@/pages/CandidatePortal";
import { findInterviewTimeConflict } from "@/pages/Interviews";
import IntegrationRealitySummary from "@/components/roadmap/IntegrationRealitySummary";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/marketing/SEO", () => ({ SEO: () => null }));
vi.mock("@/components/candidate-portal/CandidateChatbot", () => ({ default: () => null }));

const fetchMock = vi.fn();

describe("Phase 3-5 roadmap completion features", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("detects overlapping interview times per interviewer and ignores cancelled or excluded slots", () => {
    const existing = [
      { id: "int-1", date: "2026-12-01", time: "10:00", duration_minutes: 30, interviewer_id: "u1", candidate_name: "سارة", status: "مجدولة" },
      { id: "int-2", date: "2026-12-01", time: "11:00", duration_minutes: 30, interviewer_id: "u1", candidate_name: "أحمد", status: "ملغاة" },
      { id: "int-3", date: "2026-12-01", time: "12:00", duration_minutes: 45, interviewer_id: "u2", candidate_name: "محمد", status: "مجدولة" },
    ];

    expect(
      findInterviewTimeConflict(existing, { date: "2026-12-01", time: "10:15", durationMinutes: 30, interviewerId: "u1" })?.id,
    ).toBe("int-1");

    expect(
      findInterviewTimeConflict(existing, { date: "2026-12-01", time: "10:30", durationMinutes: 30, interviewerId: "u1" }),
    ).toBeNull();

    expect(
      findInterviewTimeConflict(existing, { date: "2026-12-01", time: "10:15", durationMinutes: 30, interviewerId: "u1", excludeInterviewId: "int-1" }),
    ).toBeNull();

    expect(
      findInterviewTimeConflict(existing, { date: "2026-12-01", time: "11:00", durationMinutes: 30, interviewerId: "u1" }),
    ).toBeNull();

    expect(
      findInterviewTimeConflict(existing, { date: "2026-12-01", time: "12:10", durationMinutes: 30, interviewerId: "u1" }),
    ).toBeNull();
  });

  it("allows candidates to submit an experience review in CandidatePortal", async () => {
    const code = "TX-" + "B".repeat(32);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              id: "cand-1",
              name: "خالد العتيبي",
              role: "معلم رياضيات",
              stage: "مقابلة تقنية",
              status: "قيد المراجعة",
              trackingCode: code,
              appliedAt: "2026-11-10T10:00:00Z",
              jobTitle: "معلم رياضيات",
              aiScore: null,
              companyReview: null,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          review: {
            id: "rev-1",
            overall_rating: 4,
            communication_rating: 5,
            fairness_rating: 4,
            comment: "تجربة منظمة وسريعة",
            is_anonymous: true,
          },
        }),
      });

    render(
      <MemoryRouter initialEntries={[`/portal?code=${code}`]}>
        <CandidatePortal />
      </MemoryRouter>,
    );

    expect(await screen.findByText("خالد العتيبي")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /تقييم تجربة التوظيف/ }));
    fireEvent.click(screen.getByRole("button", { name: "تقييم عام 4 نجوم" }));
    fireEvent.change(screen.getByLabelText(/ملاحظاتك واقتراحاتك/), {
      target: { value: "تجربة منظمة وسريعة" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "إرسال تقييم التجربة" }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const submitPayload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(submitPayload.action).toBe("submitReview");
    expect(submitPayload.trackingCode).toBe(code);
    expect(submitPayload.overallRating).toBe(4);
    expect(submitPayload.comment).toBe("تجربة منظمة وسريعة");
    expect(await screen.findByText(/تقييمك المسجل: 4 \/ 5 نجوم/)).toBeInTheDocument();
  });

  it("renders updated verified integrations while keeping unbuilt external connectors honest", () => {
    render(<IntegrationRealitySummary isAr={true} />);
    expect(screen.getByText(/مزامنة التقويم وحماية التعارض/)).toBeInTheDocument();
    expect(screen.getByText(/أتمتة WhatsApp Cloud API ورسائل SMS/)).toBeInTheDocument();
    expect(screen.getByText("Slack و Microsoft Teams")).toBeInTheDocument();
    expect(screen.getByText("Indeed و Bayt.com")).toBeInTheDocument();
  });

  it("verifies Phase 3-5 completion migration enforces RLS, search_path, send_sms checks, and no blanket policies", () => {
    const sqlPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261114200000_phase3_4_5_roadmap_completion.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.calendar_sync_connections");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.candidate_company_reviews");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.user_push_subscriptions");
    expect(sql).toContain("ALTER TABLE public.calendar_sync_connections ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.candidate_company_reviews ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("action_type IN ('send_email', 'send_whatsapp', 'send_sms', 'trigger_webhook')");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.execute_company_data_retention");
    expect(sql).toContain("public.can_manage_company_retention(_company_id)");
    expect(sql).toContain("SET search_path = pg_catalog, pg_temp");
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)|WITH\s+CHECK\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\s+auth\.users\b/i);
  });
});
