import { describe, expect, it } from "vitest";
import { interviewCalendarUrl } from "@/lib/interviewCalendar";
const base = { title: "Interview", description: "Details", location: "Online", date: "2026-11-05", time: "23:45:00", timeZone: "Africa/Cairo", durationMinutes: 30 };
describe("interview calendar handoff", () => {
  it("keeps the saved UTC instant and actual duration across midnight", () => {
    const params = new URL(interviewCalendarUrl({ ...base, startsAt: "2026-11-05T23:45:00Z" })).searchParams;
    expect(params.get("dates")).toBe("20261105T234500Z/20261106T001500Z");
    expect(params.get("ctz")).toBe("Africa/Cairo");
  });
  it("retains the declared local zone for a legacy date/time row", () => {
    const params = new URL(interviewCalendarUrl({ ...base, timeZone: "Asia/Riyadh" })).searchParams;
    expect(params.get("dates")).toBe("20261105T234500/20261106T001500");
    expect(params.get("ctz")).toBe("Asia/Riyadh");
  });
});
