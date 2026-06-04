#!/usr/bin/env node
/**
 * i18n-focused visual capture.
 *
 * Captures every locale × page × viewport combination into
 * docs/screenshots/i18n/ so we can verify English overflow does not break
 * any layout. Subdirectory output keeps existing curated screenshots safe.
 *
 *   pnpm exec node tools/preview-i18n.mjs
 *
 * Optional env:
 *   PREVIEW_BASE_URL  reuse a running server (default http://localhost:3000)
 *   PREVIEW_PORT      port for spawned `next start` (default 4321)
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4321);
const OUT_DIR = path.resolve("docs/screenshots/i18n");

const ROUTES = [
  { slug: "fan-to-pro--en", path: "/fan-to-pro" },
  { slug: "fan-to-pro--ko", path: "/ko/fan-to-pro" },
  { slug: "privacy--en", path: "/privacy" },
  { slug: "privacy--ko", path: "/ko/privacy" },
  { slug: "terms--en", path: "/terms" },
  { slug: "terms--ko", path: "/ko/terms" },
];

const VIEWPORTS = [
  { name: "mobile-sm", width: 360, height: 780 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
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
    for (const route of ROUTES) {
      for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          colorScheme: "dark",
        });
        const page = await ctx.newPage();
        const url = `${baseUrl}${route.path}`;
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await sleep(500);
        const file = path.join(OUT_DIR, `${route.slug}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`✓ ${route.path} @ ${vp.name}`);
        await ctx.close();
      }
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
