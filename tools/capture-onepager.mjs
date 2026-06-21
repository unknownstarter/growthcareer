#!/usr/bin/env node
/**
 * Onepager (cohort 1) 자체 캡처 / Toss 톤 라이트 디자인 검증용.
 *
 * Usage: node tools/capture-onepager.mjs
 * Output: docs/screenshots/onepager/onepager-cohort-1.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/onepager-cohort-1.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1200 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const file = path.join(OUT_DIR, "onepager-cohort-1.png");
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log("captured:", file);
