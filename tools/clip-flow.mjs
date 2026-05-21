// Capture section-by-section flow boundaries for regression review
import { chromium } from "playwright";

const URL = "http://localhost:4321/fan-to-pro";
const SECTIONS = [
  "#hero",
  "#problem",
  "#solution",
  "#value-cards",
  "#outcome",
  "#testimonials",
  "#mentor",
  "#program",
  "#social-proof",
  "#guarantees",
  "#bonus",
  "#pricing",
  "#recruitment",
  "#faq",
  "#apply",
];

const browser = await chromium.launch();

for (const [width, height, tag] of [
  [360, 800, "sm"],
  [1440, 900, "desktop"],
]) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  for (const sel of SECTIONS) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) {
      console.log(`miss ${sel}`);
      continue;
    }
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(250);
      const name = sel.replace("#", "");
      await loc.screenshot({
        path: `docs/screenshots/_flow-${tag}-${name}.png`,
      });
      console.log(`ok ${tag} ${sel}`);
    } catch (e) {
      console.log(`fail ${tag} ${sel}: ${e.message}`);
    }
  }

  // Sticky CTA visibility check: capture viewport at top, mid, and at #apply
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/screenshots/_sticky-${tag}-top.png` });

  await page.evaluate(() =>
    document.querySelector("#pricing")?.scrollIntoView({ block: "start" }),
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/screenshots/_sticky-${tag}-mid.png` });

  await page.evaluate(() =>
    document.querySelector("#apply")?.scrollIntoView({ block: "start" }),
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/screenshots/_sticky-${tag}-apply.png` });

  await ctx.close();
}

await browser.close();
console.log("done");
