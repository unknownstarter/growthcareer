/**
 * Multi-viewport audit — capture #recruitment + full-page hero across breakpoints
 * to verify Korean word-wrap and headline scaling.
 */
import { chromium } from "playwright";

const URL = "http://localhost:4321/fan-to-pro";
const VIEWPORTS = [
  { w: 360, h: 800, tag: "vp-360" },
  { w: 390, h: 844, tag: "vp-390" },
  { w: 640, h: 900, tag: "vp-640" },
  { w: 768, h: 1024, tag: "vp-768" },
  { w: 1024, h: 768, tag: "vp-1024" },
  { w: 1280, h: 800, tag: "vp-1280" },
  { w: 1440, h: 900, tag: "vp-1440" },
];

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const el = page.locator("#recruitment");
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({
    path: `docs/screenshots/_recruit-${v.tag}.png`,
  });
  await ctx.close();
}

await browser.close();
console.log("done");
