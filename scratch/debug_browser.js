import puppeteer from "puppeteer-core";
import fs from "fs";

async function run() {
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  
  let executablePath = "";
  for (const path of chromePaths) {
    if (fs.existsSync(path)) {
      executablePath = path;
      break;
    }
  }

  if (!executablePath) {
    console.error("No suitable browser executable found (Chrome or Edge).");
    return;
  }

  console.log(`Launching browser using executable: ${executablePath}...`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true
  });

  const page = await browser.newPage();
  
  page.on("console", msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on("pageerror", err => {
    console.error(`[BROWSER RUNTIME ERROR]:`, err.message);
    if (err.stack) console.error(err.stack);
  });

  try {
    console.log("Navigating to http://localhost:8080/ ...");
    await page.goto("http://localhost:8080/", { waitUntil: "networkidle0", timeout: 10000 });
    console.log("Navigation complete. Checking page contents...");
    const content = await page.content();
    console.log(`HTML length: ${content.length}`);
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("Body text snippet:", bodyText.slice(0, 500));
  } catch (e) {
    console.error("Navigation failed:", e.message);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
