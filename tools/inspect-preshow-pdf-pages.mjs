#!/usr/bin/env node
/**
 * Render the workbook HTML at A4 print size and paginate to see actual PDF page breaks.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = "/Users/noah/growthcareer";
const HTML = `file://${path.resolve(ROOT, "tools/preshow-training-workbook.html")}`;
const OUT_DIR = path.resolve(ROOT, "docs/screenshots/preshow-workbook-pdf");

await mkdir(OUT_DIR, { recursive: true });

// A4 at 96dpi = 794 x 1123 px
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 794, height: 1123 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// Emulate print media so @media print rules apply.
await page.emulateMedia({ media: "print" });
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2000);

// Full page screenshot to see total flowed height.
const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`Full flowed height: ${fullHeight}px`);
console.log(`Estimated pages @1123px each: ${Math.ceil(fullHeight / 1123)}`);

// Screenshot each virtual A4 page.
const A4_HEIGHT = 1123;
const numPages = Math.ceil(fullHeight / A4_HEIGHT);
for (let i = 0; i < numPages; i++) {
  const y = i * A4_HEIGHT;
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(200);
  const file = path.join(OUT_DIR, `pdf-p${String(i + 1).padStart(2, "0")}.png`);
  await page.screenshot({
    path: file,
    clip: { x: 0, y: 0, width: 794, height: A4_HEIGHT },
  });
  console.log(`saved ${file}`);
}

await browser.close();
