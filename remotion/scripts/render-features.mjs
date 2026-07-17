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

const features = ["jobs", "candidates", "pipeline", "interviews", "offers", "ai", "reports", "hiring", "share", "settings"];

for (const feat of features) {
  console.log(`Rendering ${feat}...`);
  const composition = await selectComposition({
    serveUrl: bundled,
    id: feat,
    puppeteerInstance: browser,
  });

  const destPath = path.resolve(__dirname, "../../public/videos/tawzeef-x-" + feat + ".mp4");
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: destPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
  console.log(`Done: ${feat} -> saved to ${destPath}`);
}

await browser.close({ silent: false });
console.log("All feature videos rendered!");
