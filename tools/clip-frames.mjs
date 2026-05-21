// Scroll the page in viewport-sized frames so each PNG is reasonable to inspect.
import { chromium } from "playwright";

const URL = "http://localhost:4321/fan-to-pro";
const browser = await chromium.launch();

async function frames(width, height, tag) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = height; // non-overlapping viewport-sized frames
  let i = 0;
  for (let y = 0; y < total; y += step) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
    const name = `docs/screenshots/_frame-${tag}-${String(i).padStart(2, "0")}.png`;
    await page.screenshot({ path: name, fullPage: false });
    console.log(`ok ${name}`);
    i += 1;
  }
  await ctx.close();
}

await frames(360, 800, "sm");
await frames(1440, 900, "desktop");

await browser.close();
console.log("done");
