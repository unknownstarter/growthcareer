#!/usr/bin/env node
/**
 * Cohort 1 강의장 포스터 시각 검증용 PNG.
 *
 * Usage: node tools/capture-poster.mjs
 * Output: docs/screenshots/onepager/poster-cohort-1.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/poster-cohort-1.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1300 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const file = path.join(OUT_DIR, "poster-cohort-1.png");
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log("captured:", file);
