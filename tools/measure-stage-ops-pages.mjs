#!/usr/bin/env node
/**
 * .page 실 높이 vs A4 (1123px @96dpi) 비교. 넘침 감지용.
 */
import { chromium } from "playwright";
import path from "node:path";

const HTML_PATH = path.resolve(process.cwd(), "tools/onepager-stage-ops-guide.html");
const A4_HEIGHT_PX = 1123;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
const page = await ctx.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(`file://${HTML_PATH}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2000);

const measures = await page.evaluate((limit) => {
  const pages = Array.from(document.querySelectorAll(".page"));
  return pages.map((el, i) => {
    const rect = el.getBoundingClientRect();
    return {
      idx: i + 1,
      title: el.querySelector(".section-title,.cover-title")?.textContent?.slice(0, 30) ?? "?",
      height_px: Math.round(rect.height),
      overflow_px: Math.max(0, Math.round(rect.height) - limit),
      pages_needed: Math.ceil(rect.height / limit),
    };
  });
}, A4_HEIGHT_PX);

console.log("A4 target = 1123px @96dpi (297mm)");
console.log("Idx | height | overflow | A4p | title");
console.log("----+--------+----------+-----+------");
for (const m of measures) {
  console.log(
    `${String(m.idx).padStart(3)} | ${String(m.height_px).padStart(6)} | ${String(m.overflow_px).padStart(8)} | ${String(m.pages_needed).padStart(3)} | ${m.title.trim()}`,
  );
}
await browser.close();
