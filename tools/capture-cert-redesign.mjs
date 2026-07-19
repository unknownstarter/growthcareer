import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const OUT_DIR = "/Users/noah/growthcareer/docs/screenshots/b0081";
const OUT_FILE = path.join(OUT_DIR, "certificate-a4-redesign-v3.png");
const SRC = "/tmp/cert-sample-preview.html";

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1273 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const url = pathToFileURL(SRC).toString();
console.log(`[capture] loading ${url}`);
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
// 폰트 렌더 안정화
await page.waitForTimeout(600);

const certPage = await page.$(".cert-page");
if (!certPage) throw new Error(".cert-page selector not found");

await certPage.screenshot({ path: OUT_FILE });
console.log(`[capture] ok ${OUT_FILE}`);

await ctx.close();
await browser.close();
