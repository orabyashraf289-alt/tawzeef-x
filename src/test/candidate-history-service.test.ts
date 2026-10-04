import { beforeEach, expect, it, vi } from "vitest";
import { recordStageTransition } from "@/services/candidateHistoryService";
import { supabase } from "@/integrations/supabase/client";
const mocks = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => ({ insert: mocks.insert })) } }));
const input = { candidateId: "candidate-a", userId: "actor-a", fromStage: "Applied", toStage: "Final stored stage", movedByName: "Actor" };
beforeEach(() => { vi.clearAllMocks(); mocks.insert.mockResolvedValue({ error: null }); });
it("records the real actor and final stage in the deployed history table", async () => {
  await recordStageTransition(input);
  expect(supabase.from).toHaveBeenCalledWith("stage_transitions");
  expect(mocks.insert).toHaveBeenCalledWith({ candidate_id: "candidate-a", user_id: "actor-a", from_stage: "Applied", to_stage: "Final stored stage", moved_by_name: "Actor", notes: null });
});
it("propagates Supabase's returned error rather than reporting a saved history", async () => {
  mocks.insert.mockResolvedValue({ error: { message: "permission denied" } });
  await expect(recordStageTransition(input)).rejects.toMatchObject({ message: "permission denied" });
});
it("does not submit history with a missing authenticated actor", async () => {
  await expect(recordStageTransition({ ...input, userId: undefined })).rejects.toThrow("تسجيل الدخول");
  expect(mocks.insert).not.toHaveBeenCalled();
});
