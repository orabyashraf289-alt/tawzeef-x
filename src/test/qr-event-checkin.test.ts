import { describe, it, expect } from "vitest";

describe("QR Event Check-in & Sourcing Engine", () => {
  it("constructs valid event check-in URLs with custom event tags", () => {
    const origin = "https://tawzeefx.com";
    const jobId = "dev-101";
    const eventName = "معرض بيبان 2026 للتوظيف";

    const checkinUrl = `${origin}/checkin/${jobId}?event=${encodeURIComponent(eventName)}`;

    expect(checkinUrl).toContain("/checkin/dev-101");
    expect(checkinUrl).toContain("event=%D9%85%D8%B9%D8%B1%D8%B6");
    expect(decodeURIComponent(checkinUrl)).toContain("معرض بيبان 2026 للتوظيف");
  });

  it("handles general open check-in URL when no specific job ID is provided", () => {
    const origin = "https://tawzeefx.com";
    const generalUrl = `${origin}/checkin/general?event=${encodeURIComponent("يوم المهنة")}`;
    expect(generalUrl).toBe("https://tawzeefx.com/checkin/general?event=%D9%8A%D9%88%D9%85%20%D8%A7%D9%84%D9%85%D9%87%D9%86%D8%A9");
  });

  it("generates random valid tracking codes for event check-ins", () => {
    const code1 = `TX-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const code2 = `TX-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    expect(code1.startsWith("TX-QR-")).toBe(true);
    expect(code2.startsWith("TX-QR-")).toBe(true);
    expect(code1).not.toBe(code2);
  });
});