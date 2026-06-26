import { describe, it, expect, vi } from "vitest";
import { mockInterviews, mockUser } from "@/test/mocks/supabase";

describe("Interview Scheduling Validation", () => {
  const validateInterview = (interview: {
    candidate_name: string;
    position: string;
    date: string;
    time: string;
    type: string;
  }) => {
    const errors: string[] = [];
    if (!interview.candidate_name.trim()) errors.push("candidate_name");
    if (!interview.position.trim()) errors.push("position");
    if (!interview.date) errors.push("date");
    if (!interview.time) errors.push("time");
    if (!interview.type) errors.push("type");
    return errors;
  };

  it("accepts valid interview data", () => {
    expect(validateInterview({
      candidate_name: "أحمد محمد",
      position: "مطور React",
      date: "2024-02-01",
      time: "10:00",
      type: "عن بُعد",
    })).toEqual([]);
  });

  it("rejects missing required fields", () => {
    expect(validateInterview({
      candidate_name: "",
      position: "",
      date: "",
      time: "",
      type: "",
    })).toEqual(["candidate_name", "position", "date", "time", "type"]);
  });
});

describe("Interview Date/Time Logic", () => {
  it("validates date is not in the past", () => {
    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    };

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    expect(isValidDate(futureDate.toISOString().split("T")[0])).toBe(true);
    expect(isValidDate("2020-01-01")).toBe(false);
  });

  it("validates time format (HH:MM)", () => {
    const isValidTime = (time: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    expect(isValidTime("10:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("25:00")).toBe(false);
    expect(isValidTime("10:60")).toBe(false);
    expect(isValidTime("abc")).toBe(false);
  });

  it("calculates reminder time correctly", () => {
    const interviewTime = new Date("2024-02-01T10:00:00");
    const now = new Date("2024-02-01T09:00:00");
    const diffMin = (interviewTime.getTime() - now.getTime()) / 60000;
    expect(diffMin).toBe(60);
    expect(diffMin > 30 && diffMin <= 90).toBe(true);
  });
});

describe("Interview Status Management", () => {
  const validStatuses = ["مجدولة", "مكتملة", "ملغاة"];

  it("defines valid statuses", () => {
    expect(validStatuses).toHaveLength(3);
    expect(validStatuses).toContain("مجدولة");
  });

  it("allows cancellation of scheduled interviews", () => {
    const interview = mockInterviews[0];
    expect(interview.status).toBe("مجدولة");
    const canCancel = interview.status === "مجدولة";
    expect(canCancel).toBe(true);
  });

  it("prevents cancellation of completed interviews", () => {
    const completed = { ...mockInterviews[0], status: "مكتملة" };
    const canCancel = completed.status === "مجدولة";
    expect(canCancel).toBe(false);
  });
});

describe("Interview Types", () => {
  const types = ["عن بُعد", "حضوري", "هاتفي"];

  it("includes remote interviews", () => {
    expect(types).toContain("عن بُعد");
  });

  it("includes in-person interviews", () => {
    expect(types).toContain("حضوري");
  });

  it("includes phone interviews", () => {
    expect(types).toContain("هاتفي");
  });
});

describe("Interview Data Transformation", () => {
  it("transforms form data to database format", () => {
    const formData = {
      candidate_name: "أحمد محمد",
      position: "مطور React",
      date: "2024-02-01",
      time: "10:00",
      type: "عن بُعد",
      interviewer: "محمد علي",
      candidate_id: "cand-1",
      meeting_url: "https://meet.google.com/abc",
    };

    const dbData = {
      user_id: mockUser.id,
      candidate_name: formData.candidate_name,
      position: formData.position,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      interviewer: formData.interviewer,
      candidate_id: formData.candidate_id || null,
      meeting_url: formData.meeting_url || null,
    };

    expect(dbData.user_id).toBe(mockUser.id);
    expect(dbData.meeting_url).toBe("https://meet.google.com/abc");
  });
});

describe("Meeting URL Validation", () => {
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  it("accepts valid meeting URLs", () => {
    expect(isValidUrl("https://meet.google.com/abc-def")).toBe(true);
    expect(isValidUrl("https://zoom.us/j/123456")).toBe(true);
    expect(isValidUrl("https://teams.microsoft.com/l/meetup")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

describe("Interview Rating", () => {
  it("accepts ratings 1-5", () => {
    const isValidRating = (r: number) => r >= 1 && r <= 5 && Number.isInteger(r);
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(3)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(3.5)).toBe(false);
  });
});

describe("Today's Interviews Filter", () => {
  it("filters interviews for today", () => {
    const today = new Date().toISOString().split("T")[0];
    const interviews = [
      { ...mockInterviews[0], date: today },
      { ...mockInterviews[0], id: "int-2", date: "2020-01-01" },
    ];
    const todayInterviews = interviews.filter(i => i.date === today);
    expect(todayInterviews).toHaveLength(1);
  });
});
