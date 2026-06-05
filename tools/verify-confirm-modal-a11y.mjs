#!/usr/bin/env node
/**
 * Confirm modal a11y verification (B0007 T3).
 *
 * Drives the apply form to open the confirmation modal, then verifies:
 *   1. role="dialog" + aria-modal="true" present
 *   2. Initial focus lands on the primary confirm button
 *   3. ESC closes the modal
 *   4. Backdrop click closes the modal
 *   5. Cancel button closes the modal and form data is preserved on return
 *   6. Tab cycles within the dialog (focus trap)
 *
 * Output: stdout PASS/FAIL summary. Non-zero exit on any FAIL.
 *
 * Usage:
 *   pnpm exec node tools/verify-confirm-modal-a11y.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4325);

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

async function fillFormToConfirm(page, baseUrl) {
  await page.goto(`${baseUrl}/fan-to-pro#apply`, { waitUntil: "networkidle" });
  await page.waitForSelector('form input[name="name"]', { timeout: 15000 });

  await page.fill('input[name="name"]', "Jane Doe");
  await page.fill('input[name="email"]', "jane@example.com");
  await page.fill('input[name="phone"]', "010-1234-5678");
  await page.click('form button[type="submit"]');

  await page.waitForSelector('input[name="birthdate"]', { timeout: 15000 });

  await page.fill('input[name="birthdate"]', "1998-04-12");
  await page.fill('input[name="university"]', "Seoul National University");
  await page.selectOption('select[name="visa"]', { index: 1 });
  await page.fill('input[name="address"]', "Seoul, Mapo-gu");

  await page.check('input[name="consent"]');
  await page.check('input[name="consent_operations"]');

  await page.click('form button[type="submit"]');
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', {
    timeout: 8000,
  });
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
}

async function main() {
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

    // ── Test 1: dialog attrs + initial focus ────────────────────────────
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await ctx.newPage();
      await fillFormToConfirm(page, baseUrl);

      const dialogAttrs = await page.$eval(
        '[role="dialog"]',
        (el) => ({
          ariaModal: el.getAttribute("aria-modal"),
          ariaLabelledby: el.getAttribute("aria-labelledby"),
        }),
      );
      check(
        "dialog has role + aria-modal=true",
        dialogAttrs.ariaModal === "true",
        JSON.stringify(dialogAttrs),
      );
      check(
        "dialog has aria-labelledby",
        Boolean(dialogAttrs.ariaLabelledby),
        dialogAttrs.ariaLabelledby || "",
      );

      // Wait for the focus shift inside the modal.
      await sleep(200);
      const focusedText = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? (el.textContent || "").trim().slice(0, 40) : null;
      });
      check(
        "initial focus moves into modal primary button",
        Boolean(focusedText && /confirm|apply/i.test(focusedText)),
        focusedText || "no focus",
      );

      await ctx.close();
    }

    // ── Test 2: ESC closes the modal ─────────────────────────────────────
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await ctx.newPage();
      await fillFormToConfirm(page, baseUrl);
      await page.keyboard.press("Escape");
      await sleep(300);
      const stillOpen = await page.$('[role="dialog"][aria-modal="true"]');
      check("ESC closes modal", !stillOpen);
      await ctx.close();
    }

    // ── Test 3: Backdrop click closes the modal ─────────────────────────
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await ctx.newPage();
      await fillFormToConfirm(page, baseUrl);
      // Click in the top-left corner of viewport — outside the centered dialog.
      await page.mouse.click(5, 5);
      await sleep(300);
      const stillOpen = await page.$('[role="dialog"][aria-modal="true"]');
      check("Backdrop click closes modal", !stillOpen);
      await ctx.close();
    }

    // ── Test 4: Cancel button closes + form data preserved ─────────────
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await ctx.newPage();
      await fillFormToConfirm(page, baseUrl);
      // Click cancel.
      await page.click('[role="dialog"] button:has-text("Cancel")');
      await sleep(300);
      const stillOpen = await page.$('[role="dialog"][aria-modal="true"]');
      check("Cancel button closes modal", !stillOpen);

      // Check that step 2 form data survives.
      const universityVal = await page.$eval(
        'input[name="university"]',
        (el) => el.value,
      );
      check(
        "step 2 data preserved after cancel",
        universityVal === "Seoul National University",
        universityVal,
      );
      await ctx.close();
    }

    // ── Test 5: Tab traps focus inside the dialog ────────────────────────
    {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await ctx.newPage();
      await fillFormToConfirm(page, baseUrl);

      // Tab a number of times — focused element should always be inside dialog.
      let allInside = true;
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
        await sleep(50);
        const inside = await page.evaluate(() => {
          const el = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog && el ? dialog.contains(el) : false;
        });
        if (!inside) {
          allInside = false;
          break;
        }
      }
      check("Tab focus stays inside dialog", allInside);
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n========================================");
  console.log(`Summary: ${results.length - failed.length}/${results.length} pass`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
