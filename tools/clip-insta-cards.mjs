import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

const root = resolve(import.meta.dirname, "..");
const htmlUrl = pathToFileURL(resolve(root, "tools/insta-cards.html")).href;
const outDir = resolve(root, "docs/screenshots/insta-cards");
mkdirSync(outDir, { recursive: true });

const TARGETS = [
  "card-01-en",
  "card-01-ko",
  "card-02-en",
  "card-02-ko",
  "card-03-en",
  "card-03-ko",
  "card-04-en",
  "card-04-ko",
];

const browser = await chromium.launch();
// deviceScaleFactor 1 because the card is already 1080x1080 in CSS pixels.
// We want the PNG to be EXACTLY 1080x1080 (Instagram square standard).
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1200 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto(htmlUrl, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

for (const id of TARGETS) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${outDir}/${id}.png` });
  console.log(`wrote ${id}.png`);
}

await browser.close();
console.log("done");
