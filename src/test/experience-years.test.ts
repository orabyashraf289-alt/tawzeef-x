import { describe, expect, it } from "vitest";
import { extractStatedExperience, parseEnteredExperience } from "@/lib/experienceYears";
import { analyzeApplicationEvidence } from "@/lib/applicationEvidence";

const form = { email: "", phone: "", currentTitle: "", experience: "", universityDegree: "", major: "", licenseNumber: "" };
const source = (requirement: string, experience: string, resumeText = "تدريس اللغة الألمانية SQL") =>
  analyzeApplicationEvidence({ requirements: [requirement], resumeText, skills: [], form: { ...form, experience } }).requirements[0].source;

describe("numeric experience requirements", () => {
  it.each(["خبرة من 3 إلى 5 سنوات في تدريس اللغة الألمانية", "خبرة من ٣ إلى ٥ سنوات في تدريس اللغة الألمانية",
    "3–5 years experience with SQL", "between 3 and 5 years experience with SQL", "3 to 5 years experience with SQL"])("respects both boundaries: %s", requirement => {
    expect(source(requirement, "3")).toBe("form");
    expect(source(requirement, "4")).toBe("form");
    expect(source(requirement, "5")).toBe("form");
    expect(source(requirement, "2")).toBe("unconfirmed");
    expect(source(requirement, "6")).toBe("unconfirmed");
  });

  it.each(["٣ سنوات خبرة", "3+ years experience", "at least 3 years experience", "minimum of 3 years experience",
    "خبرة 3 سنوات على الأقل", "خبرة بحد أدنى 3 سنوات"])("keeps minimum requirements open-ended: %s", requirement => {
    expect(source(requirement, "٢٫٥")).toBe("unconfirmed");
    expect(source(requirement, "3")).toBe("form");
    expect(source(requirement, "6")).toBe("form");
  });

  it.each([
    ["more than 3 years experience", "3", "unconfirmed"],
    ["more than 3 years experience", "3.5", "form"],
    ["خبرة أكثر من 3 سنوات", "3", "unconfirmed"],
    ["up to 3 years experience", "2.5", "form"],
    ["up to 3 years experience", "4", "unconfirmed"],
    ["less than 3 years experience", "3", "unconfirmed"],
    ["خبرة 3 سنوات على الأكثر", "4", "unconfirmed"],
    ["2.5 years experience", "٢٫٥", "form"],
    ["2.5 years experience", "2", "unconfirmed"],
  ])("handles explicit thresholds: %s / %s", (requirement, years, expected) => {
    expect(source(requirement, years)).toBe(expected);
  });

  it("does not promote the numeric range alone without the required field", () => {
    expect(source("خبرة من 3 إلى 5 سنوات في تدريس اللغة الألمانية", "4", "خدمة عملاء")).toBe("unconfirmed");
  });

  it.each(["5–3 years experience", "130 years experience", "3 years SQL and 2 years Python"])("leaves ambiguous requirements for review: %s", requirement => {
    expect(source(requirement, "4", "SQL Python")).toBe("unconfirmed");
  });

  it.each(["", "3–5", "4+", "unknown", "-4", "130", "2 years and 5 months"])("does not guess entered experience: %s", value => {
    expect(source("3 years experience", value)).toBe("unconfirmed");
    expect(parseEnteredExperience(value)).toBeNull();
  });
});

describe("experience extraction from local CV text", () => {
  it.each([["خبرة ٤ سنوات", 4], ["خبرة ۲٫۵ سنة", 2.5], ["4 years experience; 4 years teaching", 4], ["0 years experience", 0]])("reads explicit years: %s", (text, expected) => {
    expect(extractStatedExperience(String(text))).toBe(expected);
  });
  it.each(["3–5 years", "at least 3 years", "5+ years", "3 years SQL and 2 years Python", "130 years", "Age: 30 years", "30 years old", "خبرة واسعة"])("leaves ambiguous or non-experience values editable: %s", text => {
    expect(extractStatedExperience(text)).toBeNull();
  });
  it("does not claim a discrepancy from multiple different durations", () => {
    const result = analyzeApplicationEvidence({ requirements: [], resumeText: "3 years SQL and 2 years Python", skills: [], form: { ...form, experience: "5" } });
    expect(result.discrepancies).toEqual([]);
  });
});
