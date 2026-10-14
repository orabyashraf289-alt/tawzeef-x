import { describe, expect, it } from "vitest";
import { detectCopilotActionFromText } from "@/lib/copilotActionEngine";

const context = {
  jobs: [],
  candidates: [{ id: "c1", name: "أحمد", role: "مصمم", stage: "جديد", phone: "" }],
  stages: [],
} as Parameters<typeof detectCopilotActionFromText>[1];

describe("assistant action previews", () => {
  it("does not invent candidate match scores", () => {
    const action = detectCopilotActionFromText("ابحث عن مرشحين", context);
    expect(action?.filterPayload?.matched_candidates?.[0]).not.toHaveProperty("match_score");
  });

  it("does not create a WhatsApp action without a verified candidate phone", () => {
    expect(detectCopilotActionFromText("راسل أحمد واتساب", context)).toBeNull();
  });

  it("does not invent a salary range for a new job", () => {
    const action = detectCopilotActionFromText("أنشئ وظيفة مصمم", context);
    expect(action?.jobPayload).not.toHaveProperty("salary_min");
    expect(action?.jobPayload).not.toHaveProperty("salary_max");
  });
});
