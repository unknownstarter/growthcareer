#!/usr/bin/env node
/**
 * 공연 현장 실무 가이드 HTML -> PDF (Playwright A4).
 * Usage: node tools/pdf-stage-ops-guide.mjs
 * Output: docs/screenshots/onepager/stage-ops-guide-cohort-1.pdf
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/onepager-stage-ops-guide.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");
const OUT_FILE = path.join(OUT_DIR, "stage-ops-guide-cohort-1.pdf");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.pdf({
  path: OUT_FILE,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("PDF saved:", OUT_FILE);
