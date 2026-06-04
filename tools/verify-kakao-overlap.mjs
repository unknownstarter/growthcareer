#!/usr/bin/env node
/**
 * Verify kakao floater visually sits above StickyCTA bar without colliding
 * with its "지금 신청" CTA button.
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
  throw new Error("server not ready");
}
async function ensureServer() {
  if (await reachable(DEFAULT_BASE)) return { baseUrl: DEFAULT_BASE, spawned: null };
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
  const proc = spawn("pnpm", ["exec", "next", "dev", "--port", String(SPAWN_PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  await waitFor(`${baseUrl}/`);
  return { baseUrl, spawned: proc };
}

async function probe(page, label) {
  const data = await page.evaluate(() => {
    const kakao = document.querySelector('a[aria-label^="카카오톡"]');
    // StickyCTA bar wraps the apply button; pick the slide-up container
    const ctaBar = document.querySelector('div[class*="fixed inset-x-0 bottom-0"]');
    const applyBtn = ctaBar
      ? ctaBar.querySelector('a[href="#apply"]')
      : document.querySelector('a[href="#apply"]');
    return {
      kakao: kakao && {
        rect: kakao.getBoundingClientRect().toJSON(),
        z: getComputedStyle(kakao).zIndex,
      },
      ctaBar: ctaBar && {
        rect: ctaBar.getBoundingClientRect().toJSON(),
        z: getComputedStyle(ctaBar).zIndex,
        transform: getComputedStyle(ctaBar).transform,
      },
      applyBtn: applyBtn && {
        rect: applyBtn.getBoundingClientRect().toJSON(),
      },
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(data, null, 2));
  // Overlap check: kakao vs apply button
  if (data.kakao && data.applyBtn) {
    const k = data.kakao.rect;
    const a = data.applyBtn.rect;
    const overlap =
      k.right > a.left && k.left < a.right && k.bottom > a.top && k.top < a.bottom;
    console.log(`overlap kakao ∩ applyBtn: ${overlap}`);
    return overlap;
  }
  return false;
}

async function main() {
  const { baseUrl, spawned } = await ensureServer();
  const browser = await chromium.launch();
  try {
    // Mobile viewport — the tightest case.
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/fan-to-pro`, { waitUntil: "networkidle" });
    await sleep(500);

    // Case A: top of page — StickyCTA should be hidden (translateY 100%).
    await probe(page, "top of page");
    await page.screenshot({ path: "docs/screenshots/kakao-floater/overlap-top.png" });

    // Case B: scrolled past 600px but apply section not yet inView — StickyCTA shows.
    await page.evaluate(() => window.scrollTo(0, 1200));
    await sleep(600);
    const mid = await probe(page, "mid scroll (sticky cta visible)");
    await page.screenshot({ path: "docs/screenshots/kakao-floater/overlap-mid.png" });

    // Case C: apply section in view — StickyCTA hides.
    const applyEl = await page.$("#apply");
    if (applyEl) await applyEl.scrollIntoViewIfNeeded();
    await sleep(800);
    await probe(page, "apply in view");
    await page.screenshot({ path: "docs/screenshots/kakao-floater/overlap-apply.png" });

    if (mid) {
      console.error(
        "\n✗ FAIL: kakao floater overlaps StickyCTA apply button on mobile",
      );
      process.exit(1);
    }
    console.log("\n✓ no overlap with apply CTA in any state");
    await ctx.close();
  } finally {
    await browser.close();
    if (spawned) spawned.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
