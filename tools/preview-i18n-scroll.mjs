#!/usr/bin/env node
/**
 * Scroll-into-view captures for tricky sections.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4323);
const OUT_DIR = path.resolve("docs/screenshots/i18n/scroll");

const SCENARIOS = [
  // English qualification cards (longest English strings)
  {
    slug: "recruit-cards-en-mobile-sm",
    path: "/fan-to-pro",
    w: 360,
    h: 1800,
    scrollTo: "#recruitment",
    scrollOffset: 500,
  },
  {
    slug: "recruit-cards-en-mobile",
    path: "/fan-to-pro",
    w: 390,
    h: 1800,
    scrollTo: "#recruitment",
    scrollOffset: 500,
  },
  // PaymentNotice in apply form (long English copy)
  {
    slug: "payment-notice-en-mobile-sm",
    path: "/fan-to-pro",
    w: 360,
    h: 1400,
    scrollTo: "#apply",
    scrollOffset: 1800,
  },
  // FAQ details opened
  {
    slug: "faq-en-mobile-sm",
    path: "/fan-to-pro",
    w: 360,
    h: 1400,
    scrollTo: "#faq",
    scrollOffset: 0,
  },
  // Pricing card
  {
    slug: "pricing-en-mobile-sm",
    path: "/fan-to-pro",
    w: 360,
    h: 1800,
    scrollTo: "#enrollment-cap",
    scrollOffset: -400,
  },
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
  throw new Error(`server at ${url} not ready`);
}

async function ensureServer() {
  if (await reachable(DEFAULT_BASE)) {
    return { baseUrl: DEFAULT_BASE, spawned: null };
  }
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
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
      await sleep(400);
      if (s.scrollTo) {
        await page.evaluate(
          ({ sel, off }) => {
            const el = document.querySelector(sel);
            if (el) {
              const top =
                el.getBoundingClientRect().top + window.scrollY + (off || 0);
              window.scrollTo({ top, behavior: "instant" });
            }
          },
          { sel: s.scrollTo, off: s.scrollOffset || 0 },
        );
        await sleep(500);
      }
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
