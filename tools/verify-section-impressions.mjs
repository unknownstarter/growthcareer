#!/usr/bin/env node
/**
 * Phase D: Section impression GA4 event verification.
 *
 * Loads /fan-to-pro and /ko/fan-to-pro, intercepts window.gtag at page-init,
 * scrolls the page slowly to trigger each section's 50%-visible + 500ms
 * debounced impression, then prints emitted events.
 *
 * Validates:
 *   - section_view fires for each section once
 *   - dedup: scrolling back to a previously-seen section does NOT re-fire
 *   - debounce: a fast full-page scroll fires very few events (because most
 *     sections are not in view for 500ms continuously)
 *   - locale parameter matches the route
 */
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:4321";

const INIT_SCRIPT = `
  window.__gtagEvents = [];
  window.gtag = function () {
    window.__gtagEvents.push(Array.from(arguments));
  };
`;

async function slowScroll(page) {
  // Scroll in steps. Each step holds for 700ms so the 500ms debounce fires.
  const total = await page.evaluate(() => document.body.scrollHeight);
  const step = 400;
  for (let y = 0; y < total; y += step) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "auto" }), y);
    await page.waitForTimeout(700);
  }
  // Settle at bottom.
  await page.waitForTimeout(1000);
}

async function fastScroll(page) {
  const total = await page.evaluate(() => document.body.scrollHeight);
  const step = 2000;
  for (let y = 0; y < total; y += step) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "auto" }), y);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(200);
}

async function scrollBackToTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.waitForTimeout(800);
}

async function readEvents(page) {
  return await page.evaluate(() => window.__gtagEvents ?? []);
}

async function runRoute(browser, route) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  await ctx.addInitScript(INIT_SCRIPT);
  const page = await ctx.newPage();
  const url = `${BASE}${route}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  console.log(`\n=== ${route} : slow scroll (impressions should fire) ===`);
  await slowScroll(page);
  const slowEvents = await readEvents(page);
  const sectionViews = slowEvents.filter((e) => e[0] === "event" && e[1] === "section_view");
  for (const ev of sectionViews) {
    const p = ev[2] ?? {};
    console.log(
      `  section_view: order=${p.section_order} id=${p.section_id} name="${p.section_name}" locale=${p.locale}`,
    );
  }
  console.log(`  total fired: ${sectionViews.length}`);

  console.log(`\n=== ${route} : scroll back to top (dedup: should NOT re-fire) ===`);
  await scrollBackToTop(page);
  await slowScroll(page);
  const after = await readEvents(page);
  const afterCount = after.filter((e) => e[0] === "event" && e[1] === "section_view").length;
  console.log(`  total fired after 2nd pass: ${afterCount} (expected = ${sectionViews.length})`);
  const dedupOk = afterCount === sectionViews.length;
  console.log(`  dedup: ${dedupOk ? "OK" : "BROKEN"}`);

  await ctx.close();

  return {
    route,
    fired: sectionViews,
    dedupOk,
  };
}

async function runFastScrollDebounceCheck(browser, route) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  await ctx.addInitScript(INIT_SCRIPT);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  console.log(`\n=== ${route} : fast scroll (debounce: should fire few/none) ===`);
  await fastScroll(page);
  const events = await readEvents(page);
  const count = events.filter((e) => e[0] === "event" && e[1] === "section_view").length;
  console.log(`  total fired during fast scroll: ${count}`);
  await ctx.close();
  return count;
}

async function main() {
  const browser = await chromium.launch();

  const r1 = await runRoute(browser, "/fan-to-pro");
  const r2 = await runRoute(browser, "/ko/fan-to-pro");
  const fastCount = await runFastScrollDebounceCheck(browser, "/fan-to-pro");

  await browser.close();

  console.log("\n=== SUMMARY ===");
  console.log(`/fan-to-pro: fired=${r1.fired.length} dedupOk=${r1.dedupOk}`);
  console.log(`/ko/fan-to-pro: fired=${r2.fired.length} dedupOk=${r2.dedupOk}`);
  console.log(`fast-scroll debounce: fired=${fastCount} (lower is better; ideally < 5)`);

  const localeOk1 = r1.fired.every((ev) => ev[2]?.locale === "en");
  const localeOk2 = r2.fired.every((ev) => ev[2]?.locale === "ko");
  console.log(`/fan-to-pro all locale=en? ${localeOk1}`);
  console.log(`/ko/fan-to-pro all locale=ko? ${localeOk2}`);

  const pass =
    r1.fired.length >= 8 &&
    r2.fired.length >= 8 &&
    r1.dedupOk &&
    r2.dedupOk &&
    localeOk1 &&
    localeOk2;
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
