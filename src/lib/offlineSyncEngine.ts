/**
 * Offline Sync Engine & Local Queue Management (p4-offline)
 * Enables seamless offline candidate evaluations, note-taking, and auto-sync when online.
 */

export interface OfflineAction {
  id: string;
  type: "candidate_update" | "candidate_create" | "interview_note" | "stage_move" | "rating_submit";
  table: "candidates" | "interviews" | "applications";
  recordId?: string;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
}

const STORAGE_QUEUE_KEY = "tx_offline_action_queue_v1";
const STORAGE_SNAPSHOT_PREFIX = "tx_offline_snapshot_";

/**
 * Checks if browser has network connection
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Retrieves pending actions from local storage
 */
export function getPendingOfflineActions(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves actions queue to local storage
 */
function saveQueue(queue: OfflineAction[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to save offline action queue:", err);
  }
}

/**
 * Adds an action to the offline sync outbox
 */
export function enqueueOfflineAction(
  action: Omit<OfflineAction, "id" | "timestamp" | "retryCount" | "status">
): OfflineAction {
  const newAction: OfflineAction = {
    ...action,
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
    status: "pending",
  };

  const queue = getPendingOfflineActions();
  queue.push(newAction);
  saveQueue(queue);

  return newAction;
}

/**
 * Removes an action from the queue by ID
 */
export function removeOfflineAction(actionId: string): void {
  const queue = getPendingOfflineActions().filter((a) => a.id !== actionId);
  saveQueue(queue);
}

/**
 * Clears the offline queue
 */
export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_QUEUE_KEY);
}

/**
 * Caches a data snapshot for offline browsing
 */
export function cacheOfflineSnapshot(key: string, data: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_SNAPSHOT_PREFIX}${key}`,
      JSON.stringify({ cachedAt: Date.now(), data })
    );
  } catch (err) {
    console.warn("Offline snapshot cache quota reached or disabled:", err);
  }
}

/**
 * Reads a cached data snapshot
 */
export function getOfflineSnapshot<T = any>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_SNAPSHOT_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data as T;
  } catch {
    return null;
  }
}

/**
 * Processes and synchronizes all pending offline actions with Supabase
 */
export async function processOfflineSyncQueue(supabaseClient: any): Promise<{
  syncedCount: number;
  failedCount: number;
  errors: any[];
}> {
  const queue = getPendingOfflineActions();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0, errors: [] };

  let syncedCount = 0;
  let failedCount = 0;
  const errors: any[] = [];
  const remainingQueue: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === "candidate_update" && action.recordId) {
        const { error } = await supabaseClient
          .from("candidates")
          .update(action.payload)
          .eq("id", action.recordId);
        if (error) throw error;
      } else if (action.type === "candidate_create") {
        const { error } = await supabaseClient
          .from("candidates")
          .insert(action.payload);
        if (error) throw error;
      } else if (action.type === "stage_move" && action.recordId) {
        const { error } = await supabaseClient
          .from("candidates")
          .update({ stage: action.payload.stage, status: action.payload.status || "قيد المراجعة" })
          .eq("id", action.recordId);
        if (error) throw error;
      } else if (action.type === "interview_note" && action.recordId) {
        const { error } = await supabaseClient
          .from("interviews")
          .update({ notes: action.payload.notes })
          .eq("id", action.recordId);
        if (error) throw error;
      }

      syncedCount++;
    } catch (err) {
      failedCount++;
      errors.push({ actionId: action.id, error: err });
      if (action.retryCount < 3) {
        remainingQueue.push({
          ...action,
          retryCount: action.retryCount + 1,
          status: "failed",
        });
      }
    }
  }

  saveQueue(remainingQueue);
  return { syncedCount, failedCount, errors };
}

/**
 * Listens to online / offline network changes
 */
export function subscribeToConnectivity(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}