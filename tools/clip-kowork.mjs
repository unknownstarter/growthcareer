import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const htmlUrl = pathToFileURL(resolve(root, "tools/kowork-banner-pc.html")).href;
const outDir = resolve(root, "docs/screenshots/kowork");

const TARGETS = [
  { id: "pc-ko",     scale: 3 },
  { id: "pc-en",     scale: 3 },
  { id: "mw-ko",     scale: 3 },
  { id: "mw-en",     scale: 3 },
  { id: "app-ko",    scale: 3 },
  { id: "app-en",    scale: 3 },
  { id: "mw-ko-v2",  scale: 3 },
  { id: "mw-en-v2",  scale: 3 },
  { id: "app-ko-v2", scale: 3 },
  { id: "app-en-v2", scale: 3 },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();
await page.goto(htmlUrl, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

for (const { id } of TARGETS) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${outDir}/${id}.png` });
  console.log(`wrote ${id}.png`);
}

await browser.close();
console.log("done");
