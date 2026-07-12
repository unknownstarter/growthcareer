#!/usr/bin/env node
/**
 * Measure per-page rendered heights when print media is emulated.
 * Detects overflow beyond A4 content budget.
 */
import { chromium } from "playwright";
import path from "node:path";
const HTML = `file://${path.resolve("/Users/noah/growthcareer/tools/preshow-training-workbook.html")}`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 794, height: 1123 },
});
const page = await context.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

// A4 = 297mm, minus 10mm+10mm top/bottom margin = 277mm.
// 277mm * 96 / 25.4 = ~1047px content height per A4 page.
const A4_CONTENT_PX = 1047;

const measures = await page.evaluate((A4) => {
  const pages = Array.from(document.querySelectorAll(".page"));
  return pages.map((p, i) => {
    const r = p.getBoundingClientRect();
    const firstSub = p.querySelector(".sub-title, .section-title");
    const hint = firstSub ? firstSub.textContent.trim().slice(0, 40) : "";
    return {
      idx: i + 1,
      height_px: Math.round(r.height),
      over_A4_pct: Math.round((r.height / A4) * 100),
      overflows: r.height > A4,
      hint,
    };
  });
}, A4_CONTENT_PX);

console.log(`A4 content budget: ${A4_CONTENT_PX}px (297mm - 20mm margins)`);
console.log();
for (const m of measures) {
  const flag = m.overflows ? "  OVERFLOW" : "  OK";
  console.log(
    `p${String(m.idx).padStart(2, "0")}: ${m.height_px}px  (${m.over_A4_pct}%)${flag}  ${m.hint}`,
  );
}

await browser.close();
