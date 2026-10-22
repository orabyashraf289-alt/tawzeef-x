import { describe, expect, it } from "vitest";
import { analyzeApplicationEvidence } from "@/lib/applicationEvidence";

const form = {
  email: "applicant@example.com", phone: "+966501234567", currentTitle: "",
  experience: "", universityDegree: "", major: "", licenseNumber: "",
};

describe("applicant ATS evidence", () => {
  it("reports only evidence in the resume or form without a default score", () => {
    const result = analyzeApplicationEvidence({
      requirements: ["React", "Python", "3 years experience with SQL"],
      resumeText: "Worked with React and SQL on web applications.",
      skills: [], form: { ...form, experience: "2" },
    });
    expect(result.requirements.map(({ source }) => source)).toEqual(["resume", "unconfirmed", "unconfirmed"]);
    expect(result.confirmed).toBe(1);
    expect(result.total).toBe(3);
  });

  it("labels form-only experience and normalizes Arabic spelling", () => {
    const result = analyzeApplicationEvidence({
      requirements: ["خبرة ٣ سنوات في إدارة الصف", "رخصة مهنية"],
      resumeText: "", skills: ["إدارة الصف"],
      form: { ...form, experience: "3", licenseNumber: "ETEC-123" },
    });
    expect(result.requirements[0].source).toBe("form");
    expect(result.requirements[1].source).toBe("unconfirmed");
  });

  it("flags mismatched contact details and unreadable CV", () => {
    const result = analyzeApplicationEvidence({
      requirements: [], resumeText: "cv@example.com +966509999999",
      skills: [], form,
    });
    expect(result.discrepancies).toHaveLength(2);
    expect(result.resumeReadable).toBe(false);
  });

  it("flags a stated experience mismatch for manual review", () => {
    const result = analyzeApplicationEvidence({
      requirements: ["5 years experience with React"],
      resumeText: "React developer with 2 years experience.", skills: [],
      form: { ...form, experience: "5" },
    });
    expect(result.discrepancies).toContain("سنوات الخبرة في السيرة تختلف عن الرقم المدخل؛ راجع الصحيح منهما.");
  });
});
