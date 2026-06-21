#!/usr/bin/env node
/**
 * Onepager v2 (Paged.js 적용) HTML -> PDF.
 *
 * Paged.js 가 DOM 을 사전 fragment 한 후에 PDF 생성 시작.
 * 결과: flex/grid 안에서도 break-inside: avoid 가 정확히 적용됨.
 *
 * Usage: node tools/pdf-onepager-v2.mjs
 * Output: docs/screenshots/onepager/onepager-cohort-1-v2.pdf
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const HTML = `file://${path.resolve(process.cwd(), "tools/onepager-cohort-1-v2.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/onepager");
const OUT_FILE = path.join(OUT_DIR, "onepager-cohort-1-v2.pdf");

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });

// Paged.js 가 페이지 분할 끝낼 때까지 대기.
// pagedjs 가 끝나면 body 에 class 'pagedjs_pages' 가 부착되거나 PagedPolyfill.preview 가 완료.
await page.waitForFunction(
  () => !!document.querySelector(".pagedjs_pages") || !!window.PagedPolyfill,
  { timeout: 30000 },
);
// fragmenting 안정화 추가 대기
await page.waitForTimeout(2000);

await page.pdf({
  path: OUT_FILE,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("PDF saved:", OUT_FILE);
