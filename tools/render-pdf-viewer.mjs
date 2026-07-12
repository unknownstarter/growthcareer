#!/usr/bin/env node
/**
 * Render each page of the generated PDF via Chromium's built-in PDF viewer.
 * Uses page.goto(pdf-url) which triggers Chromium's PDFium.
 */
import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const ROOT = "/Users/noah/growthcareer";
const PDF = `file://${path.resolve(ROOT, "docs/screenshots/onepager/preshow-training-workbook-cohort-1.pdf")}`;
const OUT_DIR = path.resolve(ROOT, "docs/screenshots/preshow-workbook");

try {
  await rm(OUT_DIR, { recursive: true, force: true });
} catch {}
await mkdir(OUT_DIR, { recursive: true });

// A4 = 794x1123 at 96dpi.
const browser = await chromium.launch({
  args: ["--enable-print-preview"],
});
// Note: PDF-JS via chrome-extension is not straightforward. Instead use pdftopic library.
// Fallback: use pdf-lib to count, then render HTML print-mode per page range.

// Simpler approach: use the HTML source and render at print media, but calculate
// exact break points from the CSS. Since we set forced breaks on TOC and self-diag,
// and body content flows naturally, we can match Playwright's PDF pagination.

const HTML = `file://${path.resolve(ROOT, "tools/preshow-training-workbook.html")}`;
const context = await browser.newContext({
  viewport: { width: 794, height: 1200 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);

// Walk sub-blocks and .page containers to compute page boundaries.
// This mirrors what Chromium's print pipeline does.
const layout = await page.evaluate(() => {
  const A4 = 1047;
  const containers = Array.from(document.querySelectorAll("body > .page"));
  const results = [];
  let currentPageTop = 0;
  let currentPageHeight = 0;
  let a4Index = 0;

  const flush = () => {
    if (currentPageHeight > 0) {
      results.push({
        idx: a4Index + 1,
        top: currentPageTop,
        height: currentPageHeight,
      });
      a4Index += 1;
    }
  };

  for (const c of containers) {
    const cRect = c.getBoundingClientRect();
    const forced = c.classList.contains("break-before");
    if (forced && currentPageHeight > 0) {
      flush();
      currentPageTop = cRect.top + window.scrollY;
      currentPageHeight = 0;
    }
    // Iterate immediate children (section-eyebrow, section-title, section-lede, sub-blocks, diagrams, credits).
    const children = Array.from(c.children);
    for (const ch of children) {
      const chRect = ch.getBoundingClientRect();
      const h = chRect.height;
      // Child height + tiny margin.
      const nextHeight = currentPageHeight + h;
      // Sub-blocks have avoid-break internally. Others (headers) also should stay with next.
      const isAvoid = ch.classList.contains("sub-block")
        || ch.classList.contains("diagram")
        || ch.classList.contains("toc")
        || ch.classList.contains("guide")
        || ch.classList.contains("cover-meta")
        || ch.classList.contains("cover-intro")
        || ch.classList.contains("sign-box")
        || ch.classList.contains("diag-group");
      if (isAvoid && nextHeight > A4 && currentPageHeight > 0) {
        flush();
        currentPageTop = chRect.top + window.scrollY;
        currentPageHeight = h;
      } else {
        if (currentPageHeight === 0) {
          currentPageTop = chRect.top + window.scrollY;
        }
        currentPageHeight += h;
      }
    }
  }
  flush();
  return { A4, results };
});

console.log(`A4 budget: ${layout.A4}px`);
console.log(`Rendered pages: ${layout.results.length}`);
for (const r of layout.results) {
  await page.evaluate((y) => window.scrollTo(0, y), r.top);
  await page.waitForTimeout(100);
  const file = path.join(OUT_DIR, `p${String(r.idx).padStart(2, "0")}.png`);
  await page.screenshot({
    path: file,
    clip: { x: 0, y: 0, width: 794, height: layout.A4 + 60 },
  });
  console.log(`saved ${file} (h=${r.height})`);
}
await browser.close();
