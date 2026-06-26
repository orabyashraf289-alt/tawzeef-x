/**
 * Lazy-route prefetch registry.
 * On link hover/focus we trigger the chunk import so navigation feels instant.
 * Each entry returns a Promise; React's chunk cache makes repeated calls free.
 */

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/jobs": () => import("@/pages/Jobs"),
  "/candidates": () => import("@/pages/Candidates"),
  "/pipeline": () => import("@/pages/Pipeline"),
  "/interviews": () => import("@/pages/Interviews"),
  "/offers": () => import("@/pages/Offers"),
  "/reports": () => import("@/pages/Reports"),
  "/hiring-plan": () => import("@/pages/HiringPlan"),
  "/notifications": () => import("@/pages/Notifications"),
  "/ai-assistant": () => import("@/pages/AIAssistant"),
  "/talent-pool": () => import("@/pages/TalentPool"),
  "/question-bank": () => import("@/pages/QuestionBank"),
  "/workflow": () => import("@/pages/WorkflowEditor"),
  "/team": () => import("@/pages/TeamManagement"),
  "/audit-log": () => import("@/pages/AuditLog"),
  "/roadmap": () => import("@/pages/Roadmap"),
  "/tutorial": () => import("@/pages/Tutorial"),
  "/install": () => import("@/pages/Install"),
  "/settings": () => import("@/pages/Settings"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const loader = loaders[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire and forget; don't block rendering on errors
  loader().catch(() => prefetched.delete(path));
}

/**
 * Track recent navigations in localStorage so the next session can warm
 * up the most-used routes immediately (true history-aware prefetch).
 */
const HISTORY_KEY = "tx-route-history";
const MAX_HISTORY = 30;

export function recordNavigation(path: string): void {
  if (typeof window === "undefined") return;
  if (!loaders[path]) return;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    list.push(path);
    if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

export function getTopRoutes(limit = 4): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list: string[] = JSON.parse(raw);
    const counts = new Map<string, number>();
    for (const p of list) counts.set(p, (counts.get(p) || 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([p]) => p);
  } catch {
    return [];
  }
}

export function prefetchTopRoutes(): void {
  for (const p of getTopRoutes()) prefetchRoute(p);
}
