#!/usr/bin/env node
/**
 * Certificate static preview capture.
 *
 * tools/certificate-preview.html 을 Playwright + chromium 으로 열어 A4 사이즈로
 * 캡처 → docs/screenshots/b0081/certificate-a4-preview-v2.png.
 *
 * 사용:
 *   node tools/certificate-capture.mjs
 *
 * viewport 는 A4 세로 (210mm x 297mm) 를 96dpi 기준 px 로 환산:
 *   210mm ≈ 794px, 297mm ≈ 1123px. deviceScaleFactor=2 로 retina.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_HTML = path.join(ROOT, "tools/certificate-preview.html");
const OUT_DIR = path.join(ROOT, "docs/screenshots/b0081");
const OUT_FILE = path.join(OUT_DIR, "certificate-a4-preview-v2.png");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 1273 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  const url = pathToFileURL(SRC_HTML).toString();
  console.log(`[capture] loading ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const certPage = await page.$(".cert-page");
  if (!certPage) throw new Error(".cert-page selector not found");

  await certPage.screenshot({ path: OUT_FILE });
  console.log(`[capture] ✓ ${OUT_FILE}`);

  await ctx.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
