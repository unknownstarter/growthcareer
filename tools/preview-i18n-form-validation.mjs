#!/usr/bin/env node
/**
 * Form validation round-trip captures.
 *
 * Drives the apply form's step-1 submit with empty / invalid values and
 * captures the resulting error messages on both /fan-to-pro (en, default)
 * and /ko/fan-to-pro. Also covers step-2 consent failures.
 *
 * Output: docs/screenshots/i18n/form-validation/*.png
 *
 * Usage:
 *   pnpm exec node tools/preview-i18n-form-validation.mjs
 *   PREVIEW_BASE_URL=http://localhost:3000 pnpm exec node tools/preview-i18n-form-validation.mjs
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4323);
const OUT_DIR = path.resolve("docs/screenshots/i18n/form-validation");

async function reachable(url, timeoutMs = 1500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitFor(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await reachable(url, 2000)) return;
    await sleep(400);
  }
  throw new Error(`server at ${url} not ready in ${timeoutMs}ms`);
}

async function ensureServer() {
  if (await reachable(DEFAULT_BASE)) {
    console.log(`▲ reusing existing server at ${DEFAULT_BASE}`);
    return { baseUrl: DEFAULT_BASE, spawned: null };
  }
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
  console.log(`▲ spawning next dev on :${SPAWN_PORT}`);
  const proc = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(SPAWN_PORT)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitFor(`${baseUrl}/`);
  return { baseUrl, spawned: proc };
}

/**
 * Step 1: type invalid values into name (1 char), email (no @), phone (too short).
 * Click "Next step" — should keep us on step 1 with 3 localized errors.
 */
async function step1InvalidScenario(page, baseUrl, localePath, slug) {
  await page.goto(`${baseUrl}${localePath}#apply`, { waitUntil: "networkidle" });
  await page.waitForSelector('form input[name="name"]', { timeout: 15000 });

  await page.fill('input[name="name"]', "A"); // too short
  await page.fill('input[name="email"]', "not-an-email");
  await page.fill('input[name="phone"]', "12");

  // submit step 1
  await page.click('button[type="submit"]');
  await sleep(400);

  // capture the form region — find it by section id and screenshot the area below the form heading
  const formEl = await page.$("#apply");
  if (!formEl) throw new Error(`#apply not found at ${localePath}`);
  await formEl.scrollIntoViewIfNeeded();
  await sleep(300);

  const out = path.join(OUT_DIR, `${slug}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✓ ${out}`);
}

/**
 * Step 1: leave all 3 fields blank, click Next. Expect 3 localized errors.
 */
async function step1EmptyScenario(page, baseUrl, localePath, slug) {
  await page.goto(`${baseUrl}${localePath}#apply`, { waitUntil: "networkidle" });
  await page.waitForSelector('form input[name="name"]', { timeout: 15000 });

  // clear (defaultValue could be empty already, but ensure)
  await page.fill('input[name="name"]', "");
  await page.fill('input[name="email"]', "");
  await page.fill('input[name="phone"]', "");

  await page.click('button[type="submit"]');
  await sleep(400);

  const out = path.join(OUT_DIR, `${slug}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✓ ${out}`);
}

/**
 * Inspect DOM: collect text content of [data-error] or error-styled spans
 * and return their text. We use a wide selector net since the exact selector
 * varies; we look for anything inside the apply form that visibly says "error".
 */
async function dumpFormErrors(page) {
  return await page.evaluate(() => {
    const form = document.querySelector("#apply");
    if (!form) return null;
    // Collect every short text node inside the form that has a red-ish color
    // (this is heuristic — also includes any <p>/<span> with role=alert).
    const out = [];
    const alerts = form.querySelectorAll('[role="alert"], [data-error], [aria-invalid="true"] ~ *');
    for (const el of alerts) {
      const text = (el.textContent || "").trim();
      if (text) out.push({ tag: el.tagName, text });
    }
    // Also capture any visible error-styled span by class match
    const possibleErr = form.querySelectorAll("span, p");
    for (const el of possibleErr) {
      const text = (el.textContent || "").trim();
      if (!text || text.length > 200) continue;
      // Heuristic: error messages typically start with capital or hangul and contain certain phrases
      const isErrorLike =
        /please|valid|must|입력|선택|동의|유효|적어/i.test(text) && text.length < 120;
      if (isErrorLike) out.push({ tag: el.tagName, text });
    }
    return out;
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { baseUrl, spawned } = await ensureServer();
  const cleanup = () => {
    if (spawned) {
      try { spawned.kill("SIGTERM"); } catch {}
    }
  };
  process.on("SIGINT", () => { cleanup(); process.exit(130); });

  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    // EN (default — no /en prefix per as-needed)
    await step1InvalidScenario(page, baseUrl, "/fan-to-pro", "step1-invalid-en-mobile");
    const enInvalidErrors = await dumpFormErrors(page);
    console.log("EN invalid errors:", JSON.stringify(enInvalidErrors, null, 2));

    await step1EmptyScenario(page, baseUrl, "/fan-to-pro", "step1-empty-en-mobile");
    const enEmptyErrors = await dumpFormErrors(page);
    console.log("EN empty errors:", JSON.stringify(enEmptyErrors, null, 2));

    // KO
    await step1InvalidScenario(page, baseUrl, "/ko/fan-to-pro", "step1-invalid-ko-mobile");
    const koInvalidErrors = await dumpFormErrors(page);
    console.log("KO invalid errors:", JSON.stringify(koInvalidErrors, null, 2));

    await step1EmptyScenario(page, baseUrl, "/ko/fan-to-pro", "step1-empty-ko-mobile");
    const koEmptyErrors = await dumpFormErrors(page);
    console.log("KO empty errors:", JSON.stringify(koEmptyErrors, null, 2));

    // Desktop EN — confirm desktop also localized
    const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const dpage = await dctx.newPage();
    await step1InvalidScenario(dpage, baseUrl, "/fan-to-pro", "step1-invalid-en-desktop");
    await dctx.close();

    await ctx.close();
  } finally {
    if (browser) await browser.close();
    cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
