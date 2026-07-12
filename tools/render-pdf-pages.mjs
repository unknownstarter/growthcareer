#!/usr/bin/env node
/**
 * Use Playwright PDF export then re-render each page as PNG via headless Chromium.
 * Since we don't have poppler, we open the HTML in print media emulation and
 * step through by scrolling in A4 chunks. This is a preview approximation.
 */
import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const ROOT = "/Users/noah/growthcareer";
const HTML = `file://${path.resolve(ROOT, "tools/preshow-training-workbook.html")}`;
const OUT_DIR = path.resolve(ROOT, "docs/screenshots/preshow-workbook");

// Clean previous.
try {
  await rm(OUT_DIR, { recursive: true, force: true });
} catch {}
await mkdir(OUT_DIR, { recursive: true });

// Approach: use Chromium's built-in print preview by exporting PDF and reading page ranges
// via a second load with `page.goto(pdf-url)`. But Playwright can only render HTML.
// Instead, load HTML at exact A4 print viewport, emulate print, and paginate by walking
// through .page divs, but this time we know pages can span multiple A4 physical pages.
//
// Simplest reliable approach: after rendering the HTML print-mode, use CSS transforms to
// clip each A4 slice.

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 794, height: 1123 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);

// Find all forced break points, then measure each block region and paginate.
const blocks = await page.evaluate(() => {
  const pages = Array.from(document.querySelectorAll(".page"));
  return pages.map((p) => {
    const r = p.getBoundingClientRect();
    return {
      top: Math.round(r.top + window.scrollY),
      bottom: Math.round(r.bottom + window.scrollY),
      height: Math.round(r.height),
      forced: p.classList.contains("break-before"),
    };
  });
});

// A4 content = 1047px. Content pages are packed sequentially, but block boundaries respect avoid-break.
// Simulate: track current A4-page cursor. When a block would overflow, jump to next A4 page.
const A4 = 1047;
const pageBreaks = [0]; // array of yOffsets where each A4 page starts
let cursor = 0;
for (const b of blocks) {
  if (b.forced && cursor !== 0) {
    // Force new A4 page.
    pageBreaks.push(b.top);
    cursor = 0;
  }
  const wouldEnd = cursor + b.height;
  if (wouldEnd > A4 && cursor > 0) {
    // Break before this block.
    pageBreaks.push(b.top);
    cursor = b.height;
  } else {
    cursor = wouldEnd;
  }
}
pageBreaks.push(Number.MAX_SAFE_INTEGER);

console.log(`Simulated A4 pages: ${pageBreaks.length - 1}`);
for (let i = 0; i < pageBreaks.length - 1; i++) {
  const y = pageBreaks[i];
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(150);
  const file = path.join(OUT_DIR, `p${String(i + 1).padStart(2, "0")}.png`);
  await page.screenshot({
    path: file,
    clip: { x: 0, y: 0, width: 794, height: 1123 },
  });
  console.log(`saved ${file}`);
}
await browser.close();
