#!/usr/bin/env node
/**
 * 공연 현장 실무 가이드 HTML -> PDF (Playwright A4).
 *
 * CLAUDE.md §7.6 표준 파이프라인:
 *   1. 부호 스캔 (check-pdf-copy.mjs) — 실패 시 export 중단
 *   2. Playwright + document.fonts.ready + 2.5s wait
 *   3. A4 preferCSSPageSize
 *
 * Usage: node tools/pdf-stage-ops-guide.mjs
 * Output: docs/screenshots/onepager/stage-ops-guide-cohort-1.pdf
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const HTML_PATH = path.resolve(process.cwd(), "tools/onepager-stage-ops-guide.html");
const HTML = `file://${HTML_PATH}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");
const OUT_FILE = path.join(OUT_DIR, "stage-ops-guide-cohort-1.pdf");

// 1. 부호 스캔
const scan = spawnSync("node", ["tools/check-pdf-copy.mjs", HTML_PATH], {
  stdio: "inherit",
});
if (scan.status !== 0) {
  console.error("부호 스캔 실패. Export 중단.");
  process.exit(scan.status ?? 1);
}

// 2. 렌더
await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
await page.pdf({
  path: OUT_FILE,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("PDF saved:", OUT_FILE);
