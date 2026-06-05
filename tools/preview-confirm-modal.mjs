#!/usr/bin/env node
/**
 * Apply confirmation modal captures (B0007 T3).
 *
 * Fills step 1 + step 2 of the apply form with valid placeholder data,
 * clicks "Submit application" to open the modal, and captures it for
 * en + ko x mobile + desktop = 4 PNGs.
 *
 * Output: docs/screenshots/i18n/confirm-modal/*.png
 *
 * Usage:
 *   pnpm exec node tools/preview-confirm-modal.mjs
 *   PREVIEW_BASE_URL=http://localhost:3000 pnpm exec node tools/preview-confirm-modal.mjs
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4324);
const OUT_DIR = path.resolve("docs/screenshots/i18n/confirm-modal");

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

async function openConfirmModal(page, baseUrl, localePath) {
  await page.goto(`${baseUrl}${localePath}#apply`, { waitUntil: "networkidle" });
  await page.waitForSelector('form input[name="name"]', { timeout: 15000 });

  // Step 1.
  await page.fill('input[name="name"]', "Jane Doe");
  await page.fill('input[name="email"]', "jane@example.com");
  await page.fill('input[name="phone"]', "010-1234-5678");
  await page.click('form button[type="submit"]');

  // Wait for step 2.
  await page.waitForSelector('input[name="birthdate"]', { timeout: 15000 });

  // Step 2 — valid values.
  await page.fill('input[name="birthdate"]', "1998-04-12");
  await page.fill('input[name="university"]', "Seoul National University");
  await page.selectOption('select[name="visa"]', { index: 1 });
  await page.fill('input[name="address"]', "Seoul, Mapo-gu");

  // Tick required consents.
  await page.check('input[name="consent"]');
  await page.check('input[name="consent_operations"]');

  // Click "submit application" to fire the confirmation modal.
  await page.click('form button[type="submit"]');

  // Modal appears.
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', {
    timeout: 8000,
  });
  await sleep(400);
}

async function captureModal(page, slug) {
  const out = path.join(OUT_DIR, `${slug}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✓ ${out}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { baseUrl, spawned } = await ensureServer();
  const cleanup = () => {
    if (spawned) {
      try {
        spawned.kill("SIGTERM");
      } catch {}
    }
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  let browser;
  try {
    browser = await chromium.launch();

    // Mobile EN.
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await openConfirmModal(page, baseUrl, "/fan-to-pro");
      await captureModal(page, "confirm-modal-en-mobile");
      await ctx.close();
    }

    // Mobile KO.
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await openConfirmModal(page, baseUrl, "/ko/fan-to-pro");
      await captureModal(page, "confirm-modal-ko-mobile");
      await ctx.close();
    }

    // Desktop EN.
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await openConfirmModal(page, baseUrl, "/fan-to-pro");
      await captureModal(page, "confirm-modal-en-desktop");
      await ctx.close();
    }

    // Desktop KO.
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await openConfirmModal(page, baseUrl, "/ko/fan-to-pro");
      await captureModal(page, "confirm-modal-ko-desktop");
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
