import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { prefetchRoute, getTopRoutes, prefetchTopRoutes } from "@/lib/routePrefetch";
import { autoPreloadFonts } from "@/lib/fontPreload";

// Thmanyah supports both interface languages.
autoPreloadFonts();

// Clear pre-hydration boot guard right before React mounts into #root.
if (typeof document !== "undefined") {
  document.documentElement.classList.remove("tx-js-booting");
  const fallbackTimer = (window as Window & { __txBootFallback?: number }).__txBootFallback;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    delete (window as Window & { __txBootFallback?: number }).__txBootFallback;
  }
  document.getElementById("tx-boot-style")?.remove();
}

createRoot(document.getElementById("root")!).render(<App />);

// Prefetch routes when browser is idle.
// History-aware: prefer user's most-visited routes; fall back to sensible defaults.
const prefetch = () => {
  const top = getTopRoutes();
  if (top.length > 0) {
    prefetchTopRoutes();
  } else {
    prefetchRoute("/dashboard");
    prefetchRoute("/jobs");
    prefetchRoute("/candidates");
  }
};

if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 4000 });
  } else {
    setTimeout(prefetch, 2500);
  }
}

