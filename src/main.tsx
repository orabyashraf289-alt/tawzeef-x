import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { prefetchRoute, getTopRoutes, prefetchTopRoutes } from "@/lib/routePrefetch";
import { autoPreloadFonts, watchLangChange } from "@/lib/fontPreload";

// Detect <html lang/dir> and preload only the relevant font subset (Arabic vs Latin).
autoPreloadFonts();
watchLangChange();

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

