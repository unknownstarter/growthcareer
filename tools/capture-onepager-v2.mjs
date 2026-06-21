#!/usr/bin/env node
/**
 * Onepager v2 (Paged.js 적용) 시각 검증용 PNG 캡처.
 *
 * Paged.js fragmenting 후의 페이지 박스를 그대로 캡처해 v1 과 비교 가능.
 *
 * Usage: node tools/capture-onepager-v2.mjs
 * Output: docs/screenshots/onepager/onepager-cohort-1-v2.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/onepager-cohort-1-v2.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1200 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
await page.waitForFunction(
  () => !!document.querySelector(".pagedjs_pages") || !!window.PagedPolyfill,
  { timeout: 30000 },
);
await page.waitForTimeout(2000);
const file = path.join(OUT_DIR, "onepager-cohort-1-v2.png");
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log("captured:", file);
