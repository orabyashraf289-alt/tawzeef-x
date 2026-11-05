import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AssessmentActivityLog from "@/components/question-bank/AssessmentActivityLog";
afterEach(cleanup);
describe("assessment activity evidence", () => {
  it("shows recorded events without converting a legacy score into a cheating verdict", () => {
    render(<AssessmentActivityLog tabSwitches={3} log={{ cheat_score: 90, cheat_level: "high", events: [{ time: "2026-11-05T10:00:00Z", type: "visibility_hidden" }] }} />);
    expect(screen.getByText("مغادرات التبويب المسجلة: 3")).toBeInTheDocument();
    expect(screen.queryByText(/90|شبهة غش|نزاهة ممتازة/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "عرض الأحداث المسجلة" }));
    expect(screen.getByText(/— مغادرة التبويب/)).toBeInTheDocument();
  });
  it("does not invent a timeline from an aggregate count", () => {
    render(<AssessmentActivityLog tabSwitches={5} log={null} />);
    fireEvent.click(screen.getByRole("button", { name: "عرض الأحداث المسجلة" }));
    expect(screen.getByText("لا توجد تفاصيل أحداث مسجلة.")).toBeInTheDocument();
  });
});
