#!/usr/bin/env node
import { chromium } from "playwright";
import path from "node:path";
const HTML = `file://${path.resolve("/Users/noah/growthcareer/tools/preshow-training-workbook.html")}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 794, height: 1123 } });
const page = await context.newPage();
await page.emulateMedia({ media: "print" });
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const items = await page.evaluate(() => {
  const results = [];
  const containers = document.querySelectorAll(".page");
  for (const c of containers) {
    const children = Array.from(c.children);
    for (const ch of children) {
      const r = ch.getBoundingClientRect();
      const tag = ch.tagName.toLowerCase();
      const cls = ch.className;
      let hint = "";
      const t = ch.querySelector(".sub-title, .section-title, .diagram-title, .diag-group h4, h3");
      if (t) hint = t.textContent.trim().slice(0, 30);
      else hint = ch.textContent.trim().slice(0, 30);
      results.push({ tag, cls, height: Math.round(r.height), hint });
    }
  }
  return results;
});

for (const it of items) {
  console.log(`  ${String(it.height).padStart(4)}px  ${it.cls.padEnd(24)}  ${it.hint}`);
}
await browser.close();
