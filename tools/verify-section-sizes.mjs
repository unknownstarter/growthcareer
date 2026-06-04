import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:4321";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/fan-to-pro`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const sizes = await page.evaluate(() => {
  const ids = [
    "hero",
    "problem",
    "solution",
    "value",
    "outcome",
    "testimonials",
    "mentor",
    "program",
    "social-proof",
    "guarantees",
    "bonus",
    "recruitment",
    "pricing",
    "faq",
    "apply",
  ];
  return ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return { id, missing: true };
    const r = el.getBoundingClientRect();
    return { id, height: Math.round(r.height), viewportH: window.innerHeight };
  });
});

for (const s of sizes) {
  if (s.missing) {
    console.log(`${s.id}: MISSING`);
  } else {
    const ratio = (s.height / s.viewportH).toFixed(2);
    console.log(`${s.id}: ${s.height}px (${ratio}x viewport)`);
  }
}

await browser.close();
