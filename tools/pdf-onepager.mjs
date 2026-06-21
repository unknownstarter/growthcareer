#!/usr/bin/env node
/**
 * Onepager (cohort 1) HTML -> PDF 직접 변환.
 *
 * 브라우저 Cmd+P 보다 안정적 (페이지 분할 / 배경 / 폰트 일관).
 *
 * Usage: node tools/pdf-onepager.mjs
 * Output: docs/screenshots/onepager/onepager-cohort-1.pdf
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/onepager-cohort-1.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");
const OUT_FILE = path.join(OUT_DIR, "onepager-cohort-1.pdf");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
// 폰트 / 이미지 로드 안정화
await page.waitForTimeout(1000);
await page.pdf({
  path: OUT_FILE,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("PDF saved:", OUT_FILE);
