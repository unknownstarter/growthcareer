#!/usr/bin/env node
/**
 * Phase A: Hash anchor scroll essential verification.
 *
 * Cold-loads /fan-to-pro#apply (and /ko/fan-to-pro#apply) at multiple viewports,
 * waits for network idle + fonts, then reports:
 *   - applyExists: section element present in DOM
 *   - scrollY: window scroll position after load
 *   - applyTop: bounding rect top of #apply
 *   - bodyHeight: total document height (sanity check for SSR completeness)
 *
 * Interpretation:
 *   applyExists=false        → section not in initial render. broken.
 *   scrollY=0 + applyTop>>0  → browser did NOT auto-jump. broken.
 *   scrollY>0 + applyTop~=0  → jump worked.
 */
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:4321";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile-sm", width: 360, height: 780 },
];
const ROUTES = ["/fan-to-pro#apply", "/ko/fan-to-pro#apply"];

async function measure(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // Give the browser a chance to perform default hash scroll on initial paint.
  await page.waitForTimeout(800);
  return await page.evaluate(() => {
    const el = document.getElementById("apply");
    return {
      hash: location.hash,
      scrollY: Math.round(window.scrollY),
      applyExists: !!el,
      applyTop: el ? Math.round(el.getBoundingClientRect().top) : null,
      bodyHeight: Math.round(document.body.scrollHeight),
      viewportHeight: window.innerHeight,
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        colorScheme: "dark",
      });
      const page = await ctx.newPage();
      const url = `${BASE}${route}`;
      const m = await measure(page, url);
      results.push({ route, viewport: vp.name, ...m });
      await ctx.close();
    }
  }

  await browser.close();

  for (const r of results) {
    const jumpOk = r.scrollY > 200 && r.applyTop !== null && Math.abs(r.applyTop) < 200;
    const verdict = !r.applyExists
      ? "BROKEN: #apply missing in SSR"
      : jumpOk
        ? "OK: jump worked"
        : "BROKEN: no auto-jump";
    console.log(
      `${r.route} @ ${r.viewport}: scrollY=${r.scrollY} applyTop=${r.applyTop} applyExists=${r.applyExists} bodyHeight=${r.bodyHeight} → ${verdict}`,
    );
  }

  const anyBroken = results.some((r) => {
    if (!r.applyExists) return true;
    const jumpOk = r.scrollY > 200 && r.applyTop !== null && Math.abs(r.applyTop) < 200;
    return !jumpOk;
  });
  process.exit(anyBroken ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
