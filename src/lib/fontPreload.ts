/** Both Arabic and Latin use the same Thmanyah face; warm only the body weight. */
export function autoPreloadFonts() {
  if (typeof document === "undefined" || document.getElementById("preload-thmanyah-body")) return;
  const link = document.createElement("link");
  link.id = "preload-thmanyah-body";
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.href = "https://framerusercontent.com/assets/x6EBzvXf1Fi35XhsRoHxePDVo.woff2";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}
