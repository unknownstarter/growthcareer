#!/usr/bin/env node
/**
 * Preshow workbook 시각 검증용 스크린샷 생성.
 * Output: docs/screenshots/preshow-workbook/p{N}.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const HTML = `file://${path.resolve(ROOT, "tools/preshow-training-workbook.html")}`;
const OUT_DIR = path.resolve(ROOT, "docs/screenshots/preshow-workbook");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const pages = await page.$$(".page");
console.log(`Found ${pages.length} .page blocks.`);
for (let i = 0; i < pages.length; i++) {
  const file = path.join(OUT_DIR, `p${String(i + 1).padStart(2, "0")}.png`);
  await pages[i].screenshot({ path: file });
  console.log(`saved ${file}`);
}
await browser.close();
