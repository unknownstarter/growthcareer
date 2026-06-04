#!/usr/bin/env node
/**
 * Self-contained visual preview tool.
 *
 * Behaviour:
 *   1. Try to reuse an existing dev server (PREVIEW_BASE_URL, default http://localhost:3000).
 *   2. If unreachable, spawn `next dev` on PREVIEW_PORT (default 4321) and wait for ready.
 *   3. Capture Playwright screenshots of every route × viewport.
 *   4. Only kill the server we ourselves spawned. Never touch a server the user runs.
 *
 * Output: docs/screenshots/<route>-<viewport>.png
 *
 * Usage:
 *   pnpm preview
 *   pnpm preview --routes=/fan-to-pro
 *   PREVIEW_BASE_URL=http://localhost:3000 pnpm preview
 */
import { spawn } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4321);
const ROUTES = (parseFlag("routes") ?? "/,/fan-to-pro").split(",");
const VIEWPORTS = [
  { name: "mobile-sm", width: 360, height: 780 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];
const OUT_DIR = path.resolve("docs/screenshots");

function parseFlag(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

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

async function clearOutDirFiles(dir) {
  // Only delete top-level files; preserve subdirectories so curated
  // artifacts (e.g. docs/screenshots/kowork) survive preview runs.
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  await Promise.all(
    entries.map(async (name) => {
      const full = path.join(dir, name);
      const st = await stat(full);
      if (st.isFile()) await rm(full, { force: true });
    }),
  );
}

async function main() {
  await clearOutDirFiles(OUT_DIR);

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
    console.log("▲ launching chromium");
    const browser = await chromium.launch();

    for (const route of ROUTES) {
      for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          colorScheme: "dark",
        });
        const page = await ctx.newPage();
        const url = `${baseUrl}${route}`;
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await sleep(500);
        const slug =
          route.replace(/\//g, "_").replace(/^_/, "") || "home";
        const file = path.join(OUT_DIR, `${slug}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`✓ ${route} @ ${vp.name} → ${file}`);
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
