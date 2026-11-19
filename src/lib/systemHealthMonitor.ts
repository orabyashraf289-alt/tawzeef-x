/**
 * Real-Time System Health, DB Latency & Error Telemetry Monitor
 * (maint-monitoring & maint-db)
 */

import { supabase } from "@/integrations/supabase/client";
import { getPendingOfflineActions } from "./offlineSyncEngine";

export type HealthGrade = "healthy" | "degraded" | "critical";

export interface RuntimeErrorEvent {
  id: string;
  message: string;
  source: string;
  timestamp: string;
  path: string;
}

export interface NavigationVitals {
  ttfbMs: number | null;
  domInteractiveMs: number | null;
  loadCompleteMs: number | null;
}

export interface DbLatencyProbeResult {
  latencyMs: number;
  status: HealthGrade;
  reachable: boolean;
  checkedAt: string;
  error?: string;
}

export interface StorageFootprint {
  localStorageKeys: number;
  estimatedBytes: number;
  offlinePendingActions: number;
}

const ERROR_RING_STORAGE_KEY = "tx_runtime_error_ring_v1";
const MAX_STORED_ERRORS = 40;

export function recordRuntimeError(message: string, source = "runtime"): RuntimeErrorEvent {
  const event: RuntimeErrorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    message: String(message || "Unknown error").slice(0, 320),
    source,
    timestamp: new Date().toISOString(),
    path: typeof window !== "undefined" ? window.location.pathname : "/",
  };
  if (typeof window !== "undefined") {
    try {
      const existing = getRecordedRuntimeErrors();
      const next = [event, ...existing].slice(0, MAX_STORED_ERRORS);
      localStorage.setItem(ERROR_RING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return event;
}

export function getRecordedRuntimeErrors(): RuntimeErrorEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ERROR_RING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RuntimeErrorEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearRecordedRuntimeErrors(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ERROR_RING_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function collectNavigationTiming(): NavigationVitals {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return { ttfbMs: null, domInteractiveMs: null, loadCompleteMs: null };
  }
  const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  const nav = entries?.[0];
  if (!nav) {
    return { ttfbMs: null, domInteractiveMs: null, loadCompleteMs: null };
  }
  return {
    ttfbMs: nav.responseStart > 0 ? Math.round(nav.responseStart - nav.requestStart) : null,
    domInteractiveMs: nav.domInteractive > 0 ? Math.round(nav.domInteractive) : null,
    loadCompleteMs: nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : null,
  };
}

export function inspectClientStorageFootprint(): StorageFootprint {
  if (typeof window === "undefined") {
    return { localStorageKeys: 0, estimatedBytes: 0, offlinePendingActions: 0 };
  }
  let keys = 0;
  let bytes = 0;
  try {
    keys = localStorage.length;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      const v = localStorage.getItem(k) || "";
      bytes += (k.length + v.length) * 2;
    }
  } catch {
    // Ignore storage access errors
  }
  return {
    localStorageKeys: keys,
    estimatedBytes: bytes,
    offlinePendingActions: getPendingOfflineActions().length,
  };
}

export function classifyLatency(latencyMs: number, reachable: boolean): HealthGrade {
  if (!reachable) return "critical";
  if (latencyMs <= 350) return "healthy";
  if (latencyMs <= 900) return "degraded";
  return "critical";
}

/**
 * Lightweight Supabase round-trip latency probe (HEAD count query with zero row payload).
 */
export async function probeDatabaseLatency(): Promise<DbLatencyProbeResult> {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const { error } = await supabase
      .from("subscription_plans")
      .select("id", { head: true, count: "estimated" })
      .limit(1);

    const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(ended - started));

    if (error) {
      return {
        latencyMs,
        status: "degraded",
        reachable: true,
        checkedAt: new Date().toISOString(),
        error: error.message,
      };
    }

    return {
      latencyMs,
      status: classifyLatency(latencyMs, true),
      reachable: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      latencyMs: Math.max(1, Math.round(ended - started)),
      status: "critical",
      reachable: false,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
