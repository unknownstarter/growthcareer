#!/usr/bin/env node
/**
 * PDF 페이지별 PNG 캡처 (실 A4 렌더 결과 확인용).
 * Playwright chromium 의 embedded PDF viewer 로 페이지별 screenshot.
 *
 * Usage: node tools/preview-stage-ops-pdf.mjs
 * Output: docs/screenshots/stage-ops-preview/p01.png ~ pNN.png
 */
import { chromium } from "playwright";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const PDF_PATH = path.resolve(
  process.cwd(),
  "docs/screenshots/onepager/stage-ops-guide-cohort-1.pdf",
);
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/stage-ops-preview");

// Clean out dir
await mkdir(OUT_DIR, { recursive: true });
const existing = await readdir(OUT_DIR);
for (const f of existing) {
  if (f.endsWith(".png")) await rm(path.join(OUT_DIR, f));
}

// HTML 을 직접 페이지별로 캡처 (A4 print media 시뮬레이션)
const HTML_PATH = path.resolve(process.cwd(), "tools/onepager-stage-ops-guide.html");

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 794, height: 1123 }, // A4 96dpi
});
const page = await ctx.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(`file://${HTML_PATH}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2000);

// 각 .page div 별 screenshot
const pages = await page.$$(".page");
console.log(`Found ${pages.length} .page div(s).`);

for (let i = 0; i < pages.length; i++) {
  const num = String(i + 1).padStart(2, "0");
  const outFile = path.join(OUT_DIR, `p${num}.png`);
  await pages[i].screenshot({ path: outFile });
  console.log(`saved ${outFile}`);
}

await browser.close();
console.log("Preview saved.");
