// Quick visual sanity check: render an SVG and screenshot it,
// so we know Figma/Instagram-ready SVGs render correctly.
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const targets = [
  "card-01-en",
  "card-03-ko",
  "card-04-en",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 1200 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

for (const name of targets) {
  const svgPath = resolve(root, `docs/screenshots/insta-cards/${name}.svg`);
  const url = pathToFileURL(svgPath).href;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const out = resolve(root, `docs/screenshots/insta-cards/_svg-preview-${name}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1080 } });
  console.log(`previewed ${name} -> ${out}`);
}
await browser.close();
