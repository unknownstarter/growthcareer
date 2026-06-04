#!/usr/bin/env node
/**
 * Viewport-only captures (no fullPage) of the i18n landing page at the
 * critical narrow widths so we can spot overflow on the hero and the
 * apply form quickly.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4322);
const OUT_DIR = path.resolve("docs/screenshots/i18n/viewport");

const SCENARIOS = [
  // hero
  { slug: "hero-en-mobile-sm", path: "/fan-to-pro", w: 360, h: 780, scroll: 0 },
  { slug: "hero-en-mobile", path: "/fan-to-pro", w: 390, h: 844, scroll: 0 },
  { slug: "hero-ko-mobile-sm", path: "/ko/fan-to-pro", w: 360, h: 780, scroll: 0 },
  // recruitment (longest English block — visa list, eligibility)
  { slug: "recruitment-en-mobile-sm", path: "/fan-to-pro#recruitment", w: 360, h: 780 },
  { slug: "recruitment-en-mobile", path: "/fan-to-pro#recruitment", w: 390, h: 844 },
  // apply form payment notice
  { slug: "apply-en-mobile-sm", path: "/fan-to-pro#apply", w: 360, h: 780 },
  { slug: "apply-en-mobile", path: "/fan-to-pro#apply", w: 390, h: 844 },
  { slug: "apply-ko-mobile-sm", path: "/ko/fan-to-pro#apply", w: 360, h: 780 },
  // toggle area
  { slug: "switcher-en-mobile-sm", path: "/fan-to-pro", w: 360, h: 240, scroll: 0 },
  { slug: "switcher-ko-mobile-sm", path: "/ko/fan-to-pro", w: 360, h: 240, scroll: 0 },
];

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
    await sleep(500);
  }
  throw new Error(`server at ${url} not ready in ${timeoutMs}ms`);
}

async function ensureServer() {
  if (await reachable(DEFAULT_BASE)) {
    console.log(`▲ reusing existing server at ${DEFAULT_BASE}`);
    return { baseUrl: DEFAULT_BASE, spawned: null };
  }
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
  console.log(`▲ spawning next start on :${SPAWN_PORT}`);
  const proc = spawn(
    "pnpm",
    ["exec", "next", "start", "--port", String(SPAWN_PORT)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitFor(`${baseUrl}/`);
  return { baseUrl, spawned: proc };
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
  try {
    const browser = await chromium.launch();
    for (const s of SCENARIOS) {
      const ctx = await browser.newContext({
        viewport: { width: s.w, height: s.h },
        deviceScaleFactor: 2,
        colorScheme: "dark",
      });
      const page = await ctx.newPage();
      const url = `${baseUrl}${s.path}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await sleep(700);
      const file = path.join(OUT_DIR, `${s.slug}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`✓ ${s.slug}`);
      await ctx.close();
    }
    await browser.close();
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
