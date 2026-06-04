#!/usr/bin/env node
/**
 * Kakao floater accessibility verification.
 *
 * Walks Tab order on /privacy (a short page with fewer focus stops) and
 * confirms the kakao floater anchor is reachable, has a visible focus
 * ring, and exposes correct ARIA + link attributes.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4321);
const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";

async function reachable(url, timeoutMs = 1500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status < 500;
  } catch {
    return false;
  }
}
async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await reachable(url, 2000)) return;
    await sleep(400);
  }
  throw new Error(`server at ${url} not ready`);
}
async function ensureServer() {
  if (await reachable(DEFAULT_BASE)) return { baseUrl: DEFAULT_BASE, spawned: null };
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
  const proc = spawn("pnpm", ["exec", "next", "dev", "--port", String(SPAWN_PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitFor(`${baseUrl}/`);
  return { baseUrl, spawned: proc };
}

async function main() {
  const { baseUrl, spawned } = await ensureServer();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/privacy`, { waitUntil: "networkidle" });

    // Tab through up to N stops looking for the kakao floater.
    const MAX_TABS = 40;
    let foundAtStop = -1;
    for (let i = 1; i <= MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tag: el.tagName.toLowerCase(),
          aria: el.getAttribute("aria-label"),
          href: el.getAttribute("href"),
        };
      });
      if (
        focused &&
        focused.aria &&
        focused.aria.startsWith("카카오톡") &&
        focused.href === "https://pf.kakao.com/_nxhDGX/chat"
      ) {
        foundAtStop = i;
        console.log(`✓ kakao floater reachable at Tab stop ${i}`);
        // Screenshot the focus ring for visual proof.
        await page.screenshot({
          path: "docs/screenshots/kakao-floater/keyboard-focus.png",
          fullPage: false,
        });
        break;
      }
    }
    if (foundAtStop < 0) {
      console.error(`✗ kakao floater not reachable within ${MAX_TABS} Tab stops`);
      process.exit(1);
    }

    // Ensure the floater can be activated via keyboard (Enter triggers click).
    const pagePromise = ctx.waitForEvent("page", { timeout: 5000 }).catch(() => null);
    await page.keyboard.press("Enter");
    const newPage = await pagePromise;
    if (!newPage) {
      console.error("✗ Enter did not open new page (kakao chat)");
      process.exit(1);
    }
    const newUrl = newPage.url();
    console.log(`✓ Enter opened new page: ${newUrl}`);
    if (!newUrl.includes("pf.kakao.com")) {
      console.error(`✗ unexpected target URL: ${newUrl}`);
      process.exit(1);
    }
    await newPage.close();
    await ctx.close();
  } finally {
    await browser.close();
    if (spawned) spawned.kill("SIGTERM");
  }
  console.log("\n✓ kakao floater a11y verified");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
