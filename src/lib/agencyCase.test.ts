import { describe, expect, it } from "vitest";
import { AGENCY_STAGES, nextAgencyStage } from "./agencyCase";

describe("agency case stages", () => {
  it("moves through every stage in order and requires its document", () => {
    const supplied: string[] = [];
    for (let index = 0; index < AGENCY_STAGES.length - 1; index++) {
      const required = AGENCY_STAGES[index + 1].evidence;
      const next = nextAgencyStage(index, "in_progress", supplied);
      expect(next?.index).toBe(index + 1);
      expect(next?.canAdvance).toBe(!required);
      if (required) {
        supplied.push(required);
        expect(nextAgencyStage(index, "in_progress", supplied)?.canAdvance).toBe(true);
      }
    }
  });

  it("stops after handoff or while a file is returned", () => {
    expect(nextAgencyStage(7, "awaiting_admin", ["visa"])).toBeNull();
    expect(nextAgencyStage(7, "file_accepted", ["visa"])).toBeNull();
    expect(nextAgencyStage(6, "needs_changes", ["visa"])).toBeNull();
  });
});
