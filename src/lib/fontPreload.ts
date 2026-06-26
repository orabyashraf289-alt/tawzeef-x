/**
 * Auto-detect the page language/direction and preload only the relevant font subset.
 * - Arabic page  → preload IBM Plex Sans Arabic + Tajawal (already in index.html, kept warm)
 * - LTR / English → preload Inter regular+bold (skip Arabic fonts to save bandwidth)
 *
 * Runs once at startup (called from main.tsx). Safe in SSR-less Vite app.
 */

const INTER_REGULAR =
  "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuLyfMZg.woff2";
const INTER_BOLD =
  "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuFuYMZg.woff2";

const ARABIC_BODY =
  "https://fonts.gstatic.com/s/ibmplexsansarabic/v12/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6ZNmsmcwSA.woff2";
const ARABIC_DISPLAY =
  "https://fonts.gstatic.com/s/tajawal/v11/Iurf6YBj_oCad4k1l_6gLrZjiLlJ-G0.woff2";

function injectPreload(href: string, id: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

export function autoPreloadFonts() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const lang = (html.lang || "ar").toLowerCase();
  const dir = (html.dir || "rtl").toLowerCase();
  const isArabic = lang.startsWith("ar") || dir === "rtl";

  if (isArabic) {
    // Already preloaded in index.html, but keep call idempotent for SPA lang switch.
    injectPreload(ARABIC_BODY, "preload-ar-body");
    injectPreload(ARABIC_DISPLAY, "preload-ar-display");
  } else {
    injectPreload(INTER_REGULAR, "preload-inter-regular");
    injectPreload(INTER_BOLD, "preload-inter-bold");
  }
}

/** Re-run when the user toggles language at runtime. */
export function watchLangChange() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  const obs = new MutationObserver(() => autoPreloadFonts());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
}
