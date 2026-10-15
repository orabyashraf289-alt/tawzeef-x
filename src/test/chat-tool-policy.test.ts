import { describe, expect, it } from "vitest";
import { allowedChatTools } from "../../supabase/functions/chat/toolPolicy";

const definitions = [
  "search_candidates", "get_stats", "create_job", "update_job", "delete_job",
  "move_candidate_stage", "bulk_move_candidates", "schedule_interview",
  "create_offer", "send_email_to_candidate", "evaluate_candidate_ai",
].map(name => ({ function: { name } }));

describe("assistant tool permissions", () => {
  it("limits staff to reads and a job preview", () => {
    expect(allowedChatTools(definitions, "staff").map(tool => tool.function.name))
      .toEqual(["search_candidates", "get_stats", "create_job"]);
  });

  it("limits reviewers to read-only tools", () => {
    expect(allowedChatTools(definitions, "reviewer").map(tool => tool.function.name))
      .toEqual(["search_candidates", "get_stats"]);
  });
});
