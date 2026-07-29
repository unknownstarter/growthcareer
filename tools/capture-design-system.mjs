#!/usr/bin/env node
/**
 * 임시 캡처 스크립트 — LMS 라이트 디자인 시스템 프리뷰.
 * 출력: docs/screenshots/design-system/*.png (서브디렉터리 — preview wipe 회피).
 * 라이트 페이지라 colorScheme: light 로 캡처.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const PORT = 4399;
const BASE = `http://localhost:${PORT}`;
const ROUTE = "/ko/design-system";
const OUT = path.resolve("docs/screenshots/design-system");
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function reachable(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return r.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log(`spawning next dev on :${PORT}`);
  const proc = spawn("pnpm", ["exec", "next", "dev", "--port", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));

  const start = Date.now();
  while (Date.now() - start < 90_000) {
    if (await reachable(`${BASE}${ROUTE}`)) break;
    await sleep(600);
  }

  try {
    const browser = await chromium.launch();
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: "light",
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await sleep(1200);
      const file = path.join(OUT, `preview-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`captured ${file}`);
      await ctx.close();
    }
    await browser.close();
  } finally {
    try {
      proc.kill("SIGTERM");
    } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
