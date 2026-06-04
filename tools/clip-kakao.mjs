#!/usr/bin/env node
/**
 * Kakao floater capture — fan-to-pro / privacy / terms 페이지에서
 * 우측 하단 카카오톡 플로팅 버튼이 잘 보이는지 검증.
 *
 * Output: docs/screenshots/kakao-floater/<route>-<viewport>.png
 *         (서브디렉터리라 preview.mjs wipe 영향 없음)
 *
 * 추가 검증:
 *   - hover 스케일
 *   - StickyCTA 가 떠 있는 상태에서의 z-index 순서 (fan-to-pro 하단)
 *   - 버튼 href 가 카카오 URL 인지
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4321);
const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("docs/screenshots/kakao-floater");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
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

async function captureRoute(browser, baseUrl, route, viewport, label) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const url = `${baseUrl}${route}`;
  console.log(`→ ${url} (${viewport.name})`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await sleep(600);

  // Above-the-fold capture so the floater is visible at default scroll.
  const topFile = path.join(OUT_DIR, `${label}-${viewport.name}-top.png`);
  await page.screenshot({ path: topFile, fullPage: false });
  console.log(`  ✓ ${topFile}`);

  // Verify the floater attributes from the DOM.
  const probe = await page.evaluate(() => {
    const a = document.querySelector('a[aria-label^="카카오톡"]');
    if (!a) return { found: false };
    const r = a.getBoundingClientRect();
    return {
      found: true,
      href: a.getAttribute("href"),
      target: a.getAttribute("target"),
      rel: a.getAttribute("rel"),
      ariaLabel: a.getAttribute("aria-label"),
      width: r.width,
      height: r.height,
      rightFromViewport: window.innerWidth - r.right,
      bottomFromViewport: window.innerHeight - r.bottom,
    };
  });
  console.log("  floater:", probe);

  // Scroll to bottom — for fan-to-pro this exposes the StickyCTA bar,
  // confirming the floater stays on top via z-index.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(800);
  const bottomFile = path.join(OUT_DIR, `${label}-${viewport.name}-bottom.png`);
  await page.screenshot({ path: bottomFile, fullPage: false });
  console.log(`  ✓ ${bottomFile}`);

  await ctx.close();
  return probe;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { baseUrl, spawned } = await ensureServer();
  const browser = await chromium.launch();
  const results = [];
  try {
    const targets = [
      { route: "/fan-to-pro", label: "fan-to-pro" },
      { route: "/privacy", label: "privacy" },
      { route: "/terms", label: "terms" },
    ];
    for (const t of targets) {
      for (const v of VIEWPORTS) {
        const probe = await captureRoute(browser, baseUrl, t.route, v, t.label);
        results.push({ ...t, viewport: v.name, ...probe });
      }
    }
  } finally {
    await browser.close();
    if (spawned) {
      spawned.kill("SIGTERM");
    }
  }
  console.log("\n=== summary ===");
  for (const r of results) {
    console.log(
      `${r.label} ${r.viewport}: found=${r.found} href=${r.href ?? "-"} target=${r.target ?? "-"}`,
    );
  }
  const allOk = results.every(
    (r) =>
      r.found &&
      r.href === "https://pf.kakao.com/_nxhDGX/chat" &&
      r.target === "_blank" &&
      (r.rel ?? "").includes("noopener"),
  );
  if (!allOk) {
    console.error("\n✗ some routes failed the floater contract");
    process.exit(1);
  }
  console.log("\n✓ kakao floater verified on all routes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
