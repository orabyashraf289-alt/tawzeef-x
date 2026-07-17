import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

console.log("Rendering ai-detail video...");
const composition = await selectComposition({
  serveUrl: bundled,
  id: "ai-detail",
  puppeteerInstance: browser,
});

const destPath = path.resolve(__dirname, "../../public/videos/tawzeef-x-ai-guide.mp4");
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: destPath,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});

console.log(`Done: ai-detail video rendered and saved to ${destPath}`);
await browser.close({ silent: false });
