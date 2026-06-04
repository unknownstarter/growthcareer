import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const root = resolve(import.meta.dirname, "..");
const svgDir = resolve(root, "docs/screenshots/kowork");
const outDir = resolve(root, "docs/screenshots/kowork");

const TARGETS = [
  { id: "pc-ko",     w: 1080, h: 136 },
  { id: "pc-en",     w: 1080, h: 136 },
  { id: "mw-ko",     w: 328,  h: 122 },
  { id: "mw-en",     w: 328,  h: 122 },
  { id: "app-ko",    w: 328,  h: 180 },
  { id: "app-en",    w: 328,  h: 180 },
  { id: "mw-ko-v2",  w: 328,  h: 122 },
  { id: "mw-en-v2",  w: 328,  h: 122 },
  { id: "app-ko-v2", w: 328,  h: 180 },
  { id: "app-en-v2", w: 328,  h: 180 },
];

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"/>
<style>body{margin:0;padding:40px;background:#1f1f24;display:flex;flex-direction:column;gap:24px;align-items:flex-start;font-family:system-ui;}img{display:block;}</style>
</head><body>
${TARGETS.map(t => `<div id="wrap-${t.id}"><img id="${t.id}" src="${pathToFileURL(resolve(svgDir, t.id + ".svg")).href}" width="${t.w}" height="${t.h}"/></div>`).join("\n")}
</body></html>`;

const tmpHtml = resolve(root, "tools/.kowork-svg-verify.html");
writeFileSync(tmpHtml, html);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1200 },
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();
await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

for (const { id } of TARGETS) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${outDir}/${id}-from-svg.png` });
  console.log(`wrote ${id}-from-svg.png`);
}

await browser.close();
console.log("done");
