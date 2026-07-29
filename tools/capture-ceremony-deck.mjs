#!/usr/bin/env node
/**
 * 수료식 덱 캡처: 슬라이드별 PNG (1920x1080) + 전체 16:9 PDF.
 * 출력: docs/screenshots/ceremony/
 *
 * 실행: node tools/gen-ceremony-deck.mjs && node tools/capture-ceremony-deck.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const HTML = path.join(__dirname, "ceremony-deck.html");
const OUT_DIR = path.join(root, "docs/screenshots/ceremony");

// §7.6 부호 스캔 (실패 시 중단)
const scan = spawnSync("node", [path.join(__dirname, "check-pdf-copy.mjs"), HTML], {
  stdio: "inherit",
});
if (scan.status !== 0) {
  console.error("[copy-check] 부호 검사 실패 - 중단");
  process.exit(scan.status ?? 1);
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);

const slides = await page.$$(".slide");
console.log(`[capture] ${slides.length} slides`);
let i = 0;
for (const s of slides) {
  i += 1;
  const out = path.join(OUT_DIR, `slide-${String(i).padStart(2, "0")}.png`);
  await s.screenshot({ path: out });
  console.log(`[capture] ${out}`);
}

// 전체 PDF (16:9, 슬라이드당 1페이지)
const pdfOut = path.join(OUT_DIR, "fan-to-pro-1기-수료식.pdf");
await page.pdf({ path: pdfOut, width: "1920px", height: "1080px", printBackground: true, pageRanges: "" });
console.log(`[capture] ${pdfOut}`);

await ctx.close();
await browser.close();
console.log(`\n총 ${slides.length}장 + PDF: ${OUT_DIR}`);
