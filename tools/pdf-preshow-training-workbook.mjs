#!/usr/bin/env node
/**
 * Fan to Pro 1기 사전 교육 워크북 HTML -> PDF (Playwright A4).
 * CLAUDE.md §7.6 표준 파이프라인 준수 (부호 스캔 -> Playwright PDF).
 *
 * Usage: node tools/pdf-preshow-training-workbook.mjs
 * Output: docs/screenshots/onepager/preshow-training-workbook-cohort-1.pdf
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const HTML = path.resolve(ROOT, "tools/preshow-training-workbook.html");
const OUT_DIR = path.resolve(ROOT, "docs/screenshots/onepager");
const OUT_FILE = path.join(OUT_DIR, "preshow-training-workbook-cohort-1.pdf");

// 1. 부호 스캔 (§6.5). 실패 시 export 중단.
console.log("[1/2] 부호 스캔...");
const scan = spawnSync("node", ["tools/check-pdf-copy.mjs", HTML], {
  stdio: "inherit",
});
if (scan.status !== 0) {
  console.error("부호 스캔 실패. Export 중단.");
  process.exit(scan.status ?? 1);
}

// 2. Playwright PDF.
console.log("[2/2] PDF 렌더링...");
await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`file://${HTML}`, { waitUntil: "networkidle" });
// Pretendard 웹폰트 로드 대기.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
await page.pdf({
  path: OUT_FILE,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log(`\nPDF saved: ${OUT_FILE}`);
