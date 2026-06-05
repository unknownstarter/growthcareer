#!/usr/bin/env node
/**
 * Admin 페이지 캡처. Basic Auth 헤더 포함.
 *
 * 사용: ADMIN_BASIC_AUTH_USER, ADMIN_BASIC_AUTH_PASS 환경에 있어야 함.
 * 출력: docs/screenshots/admin-{viewport}.png + modal/drawer 변형.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PREVIEW_BASE_URL ?? "http://localhost:4321";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4321);
const OUT_DIR = path.resolve("docs/screenshots/admin");

// .env.local fallback — preview script can be invoked without process.env exported.
function loadDotEnvLocal() {
  try {
    const text = fs.readFileSync(path.resolve(".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
  } catch {}
}
loadDotEnvLocal();

const USER = process.env.ADMIN_BASIC_AUTH_USER;
const PASS = process.env.ADMIN_BASIC_AUTH_PASS;
if (!USER || !PASS) {
  console.error(
    "ADMIN_BASIC_AUTH_USER + ADMIN_BASIC_AUTH_PASS must be set in env.",
  );
  process.exit(1);
}

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

async function reachable(url, timeoutMs = 1500) {
  try {
    const res = await fetch(url, {
      headers: {
        authorization:
          "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64"),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.status < 500 && res.status !== 401;
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
  if (await reachable(`${BASE_URL}/admin/applicants`)) {
    return { baseUrl: BASE_URL, spawned: null };
  }
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
  const proc = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(SPAWN_PORT)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitFor(`${baseUrl}/admin/applicants`);
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
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: "dark",
        httpCredentials: { username: USER, password: PASS },
      });
      const page = await ctx.newPage();
      await page.goto(`${baseUrl}/admin/applicants`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      await sleep(500);

      // Base list view
      await page.screenshot({
        path: path.join(OUT_DIR, `admin-list-${vp.name}.png`),
        fullPage: true,
      });
      console.log(`✓ list @ ${vp.name}`);

      // Try open message drawer for first row
      const msgBtn = await page.locator('button:has-text("메시지")').first();
      if (await msgBtn.count()) {
        await msgBtn.click();
        await sleep(400);
        await page.screenshot({
          path: path.join(OUT_DIR, `admin-drawer-${vp.name}.png`),
          fullPage: true,
        });
        console.log(`✓ drawer @ ${vp.name}`);
        // Close
        await page.keyboard.press("Escape");
        await sleep(200);
      }

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
