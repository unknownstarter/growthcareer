#!/usr/bin/env node
/**
 * Cohort 1 강의장 포스터 (A4 portrait) HTML -> PDF.
 *
 * Usage: node tools/pdf-poster.mjs
 * Output: docs/screenshots/onepager/poster-cohort-1.pdf
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/poster-cohort-1.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");
const OUT_FILE = path.join(OUT_DIR, "poster-cohort-1.pdf");

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
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
console.log("PDF saved:", OUT_FILE);
