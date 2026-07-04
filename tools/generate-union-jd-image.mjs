#!/usr/bin/env node
/**
 * Union Pictures JD 공고 이미지 생성.
 *
 * 가로형 A4 (297mm × 210mm, landscape) 를 300 DPI PNG 로 렌더.
 * 96dpi 기준 viewport 1123×794 + deviceScaleFactor 3.125 → 3509×2481 최종 픽셀.
 *
 * Usage: node tools/generate-union-jd-image.mjs
 * Output: docs/share/union-jd-part-time-2026-07.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { stat } from "node:fs/promises";

const HTML = `file://${path.resolve(process.cwd(), "tools/union-jd-poster.html")}`;
const OUT_DIR = path.resolve(process.cwd(), "docs/share");
const OUT_FILE = path.join(OUT_DIR, "union-jd-part-time-2026-07.png");

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
// 300 DPI 인쇄 품질: 96dpi × 3.125 = 300dpi
const ctx = await browser.newContext({
  viewport: { width: 1123, height: 794 },
  deviceScaleFactor: 3.125,
});
const page = await ctx.newPage();
await page.goto(HTML, { waitUntil: "networkidle" });
// 폰트 + 배경 이미지 로드 안정화
await page.waitForTimeout(2500);

await page.screenshot({
  path: OUT_FILE,
  fullPage: false,
  omitBackground: false,
  clip: { x: 0, y: 0, width: 1123, height: 794 },
});

await browser.close();

const s = await stat(OUT_FILE);
const kb = (s.size / 1024).toFixed(1);
console.log(`saved: ${OUT_FILE}`);
console.log(`size: ${kb} KB (${(s.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`dimensions: 3509 × 2481 px @ 300 DPI (A4 landscape 297×210mm)`);
