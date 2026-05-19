import { chromium } from "playwright";
const browser = await chromium.launch();
async function shoot(width, height, name) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4321/fan-to-pro", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const el = page.locator("#mentor");
  await el.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll("#mentor img"));
    return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalHeight > 0);
  }, { timeout: 15000 });
  await page.waitForTimeout(800);
  await el.screenshot({ path: `docs/screenshots/_mentor-${name}.png` });
  await ctx.close();
}
await shoot(1440, 900, "desktop");
await shoot(390, 844, "mobile");
await browser.close();
console.log("done");
