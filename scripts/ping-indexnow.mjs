import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveAppBaseUrl } from "./seo-helpers.mjs";

export const INDEXNOW_KEY = "8b4c9e2a1f7d4036b9c5a2e8d1407f3a";

/** Extract <loc> URLs from live sitemap XML or fallback dist/sitemap.xml. */
export async function collectSitemapUrls(baseUrl = resolveAppBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/sitemap.xml`);
    if (res.ok) {
      const xml = await res.text();
      const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      if (matches.length > 0) return matches;
    }
  } catch {
    // Fallback to built dist/sitemap.xml below.
  }

  const distSitemap = path.resolve(process.cwd(), "dist", "sitemap.xml");
  if (!fs.existsSync(distSitemap)) {
    throw new Error("Unable to fetch live sitemap.xml and dist/sitemap.xml does not exist.");
  }
  const xml = fs.readFileSync(distSitemap, "utf-8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** Submit URL list to IndexNow (Bing, Yandex, Copilot, Seznam, Naver). */
export async function pingIndexNow(urlList, baseUrl = resolveAppBaseUrl()) {
  const host = new URL(baseUrl).host;
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${baseUrl}/${INDEXNOW_KEY}.txt`,
    urlList,
  };

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  return { status: response.status, ok: response.ok, count: urlList.length, body };
}

const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  (async () => {
    const baseUrl = resolveAppBaseUrl();
    const urls = await collectSitemapUrls(baseUrl);
    if (urls.length === 0) {
      console.warn("[IndexNow] No URLs found to submit.");
      return;
    }
    const result = await pingIndexNow(urls, baseUrl);
    console.log(`[IndexNow] Submitted ${result.count} URLs -> HTTP ${result.status} ${result.body}`);
    if (!result.ok) {
      process.exitCode = 1;
    }
  })();
}
