#!/usr/bin/env node
/**
 * 실 PDF 를 페이지별 PNG 로 변환. Playwright chromium 의 embedded PDF viewer.
 * HTML `.page` div 캡처가 아니라 진짜 최종 PDF 결과.
 *
 * Usage: node tools/pdf-to-png-stage.mjs
 * Output: docs/screenshots/stage-ops-pdf/p01.png ~ pNN.png
 */
import { chromium } from "playwright";
import { mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";

const PDF_PATH = path.resolve(
  process.cwd(),
  "docs/screenshots/onepager/stage-ops-guide-cohort-1.pdf",
);
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/stage-ops-pdf");

await mkdir(OUT_DIR, { recursive: true });
for (const f of await readdir(OUT_DIR)) {
  if (f.endsWith(".png")) await rm(path.join(OUT_DIR, f));
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1273 },
});
const page = await ctx.newPage();
await page.goto(`file://${PDF_PATH}`);
// PDF viewer needs time to render
await page.waitForTimeout(3000);

// chromium PDF viewer 는 각 페이지가 개별 <embed> 로 렌더됨. scroll + screenshot.
// 각 A4 페이지 높이 ≈ 1123px, 페이지 간 gap 약 8px.
const A4_H = 1123;
const GAP = 8;
const totalPages = 9;

for (let i = 0; i < totalPages; i++) {
  const scrollY = i * (A4_H + GAP);
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(400);
  const num = String(i + 1).padStart(2, "0");
  const outFile = path.join(OUT_DIR, `p${num}.png`);
  await page.screenshot({
    path: outFile,
    clip: { x: 0, y: 0, width: 900, height: 1200 },
  });
  console.log(`saved ${outFile}`);
}

await browser.close();
