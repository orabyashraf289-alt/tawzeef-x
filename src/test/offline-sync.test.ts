import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueOfflineAction,
  getPendingOfflineActions,
  removeOfflineAction,
  clearOfflineQueue,
  cacheOfflineSnapshot,
  getOfflineSnapshot,
  isOnline,
} from "../lib/offlineSyncEngine";

describe("PWA Offline Sync Engine (p4-offline)", () => {
  beforeEach(() => {
    clearOfflineQueue();
  });

  it("checks online status accurately", () => {
    expect(typeof isOnline()).toBe("boolean");
  });

  it("enqueues offline candidate update actions with unique IDs", () => {
    const action1 = enqueueOfflineAction({
      type: "candidate_update",
      table: "candidates",
      recordId: "cand-123",
      payload: { stage: "مقابلة تقنية", status: "مقبول" },
    });

    const action2 = enqueueOfflineAction({
      type: "interview_note",
      table: "interviews",
      recordId: "int-456",
      payload: { notes: "مرشح متميز جداً بالمهارات التقنية" },
    });

    expect(action1.id.startsWith("offline-")).toBe(true);
    expect(action2.id.startsWith("offline-")).toBe(true);
    expect(action1.id).not.toBe(action2.id);

    const pending = getPendingOfflineActions();
    expect(pending.length).toBe(2);
    expect(pending[0].recordId).toBe("cand-123");
    expect(pending[1].payload.notes).toContain("مرشح متميز");
  });

  it("removes processed action from the queue", () => {
    const action = enqueueOfflineAction({
      type: "stage_move",
      table: "candidates",
      recordId: "cand-789",
      payload: { stage: "العرض الوظيفي" },
    });

    expect(getPendingOfflineActions().length).toBe(1);

    removeOfflineAction(action.id);
    expect(getPendingOfflineActions().length).toBe(0);
  });

  it("caches and retrieves offline data snapshots", () => {
    const sampleCandidates = [
      { id: "c1", name: "عبد الله الشهري" },
      { id: "c2", name: "مريم الغامدي" },
    ];

    cacheOfflineSnapshot("recent_candidates", sampleCandidates);

    const cached = getOfflineSnapshot<typeof sampleCandidates>("recent_candidates");
    expect(cached).toBeDefined();
    expect(cached?.length).toBe(2);
    expect(cached?.[0].name).toBe("عبد الله الشهري");
  });
});