import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:4321";
const INIT_SCRIPT = `
  window.__gtagEvents = [];
  window.gtag = function () { window.__gtagEvents.push(Array.from(arguments)); };
`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 2,
});
await ctx.addInitScript(INIT_SCRIPT);
const page = await ctx.newPage();
await page.goto(`${BASE}/fan-to-pro`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < total; y += 350) {
  await page.evaluate((yy) => window.scrollTo({ top: yy }), y);
  await page.waitForTimeout(700);
}
await page.waitForTimeout(1000);

const events = await page.evaluate(() => window.__gtagEvents);
const fired = events.filter((e) => e[0] === "event" && e[1] === "section_view");
for (const ev of fired) {
  const p = ev[2];
  console.log(`mobile-sm: order=${p.section_order} id=${p.section_id}`);
}
console.log(`\nmobile-sm total: ${fired.length}/15`);
await browser.close();
