import fontStyles from "@/styles/fonts.css?inline";

/** Bound the wait so offline exports can use the system fallback. */
export async function waitForDocumentFonts(doc: Document = document, fontQueries: string[] = []) {
  if (!doc.fonts) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Flush styles before observing fonts.ready, including offscreen PDF nodes.
    doc.body?.getBoundingClientRect();
    await Promise.race([
      Promise.all(fontQueries.map((font) => doc.fonts.load(font))).then(() => doc.fonts.ready).catch(() => undefined),
      new Promise<void>((resolve) => { timeout = setTimeout(resolve, 4000); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

/** Popup documents do not inherit the app stylesheet. Load fonts before printing. */
export async function printWithFonts(printWindow: Window) {
  const style = printWindow.document.createElement("style");
  style.textContent = `${fontStyles}\nbody { font-family: var(--font-ui); }
    h1, h2 { font-family: var(--font-display); line-height: 1.5; }`;
  printWindow.document.head.appendChild(style);
  await waitForDocumentFonts(printWindow.document);
  if (!printWindow.closed) {
    printWindow.focus();
    printWindow.print();
  }
}

/** Open a standalone printable HTML document in a popup and trigger font-ready print. */
export function openPrintableHtml(html: string): boolean {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  void printWithFonts(win);
  return true;
}
