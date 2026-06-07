#!/usr/bin/env node
/**
 * B0018 Wave 2 admin 페이지 캡처.
 *
 * /admin/applicants (nav 포함) + /admin/instructors + /admin/finance
 * 3개 페이지 x 3개 viewport = 9 캡처. 추가로 instructors 의 form modal 도 캡처.
 *
 * 사용: ADMIN_BASIC_AUTH_USER, ADMIN_BASIC_AUTH_PASS 환경 필요.
 * 출력: docs/screenshots/admin/wave2-{page}-{viewport}.png
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

// 우선순위: PREVIEW_BASE_URL env > 기존 4327 next start > 신규 4322 spawn.
const BASE_URL = process.env.PREVIEW_BASE_URL ?? "http://localhost:4328";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4322);
const OUT_DIR = path.resolve("docs/screenshots/admin");

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

const PAGES = [
  { slug: "applicants", path: "/admin/applicants" },
  { slug: "instructors", path: "/admin/instructors" },
  { slug: "finance", path: "/admin/finance" },
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

async function waitFor(url, timeoutMs = 90_000) {
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

      for (const p of PAGES) {
        await page.goto(`${baseUrl}${p.path}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await sleep(500);
        await page.screenshot({
          path: path.join(OUT_DIR, `wave2-${p.slug}-${vp.name}.png`),
          fullPage: true,
        });
        console.log(`✓ ${p.slug} @ ${vp.name}`);
      }

      // 강사 form modal 캡처 (desktop only - 모달 디자인 검증용).
      if (vp.name === "desktop") {
        await page.goto(`${baseUrl}/admin/instructors`, {
          waitUntil: "networkidle",
        });
        await sleep(300);
        const newBtn = page.locator('button:has-text("+ 새 강사")').first();
        if (await newBtn.count()) {
          await newBtn.click();
          await sleep(400);
          await page.screenshot({
            path: path.join(OUT_DIR, `wave2-instructor-form-${vp.name}.png`),
            fullPage: true,
          });
          console.log(`✓ instructor-form @ ${vp.name}`);
          await page.keyboard.press("Escape");
          await sleep(200);
        }

        // 정산 confirm 캡처
        const recBtn = page
          .locator('button:has-text("1기 정산 기록")')
          .first();
        if (await recBtn.count()) {
          await recBtn.click();
          await sleep(400);
          await page.screenshot({
            path: path.join(OUT_DIR, `wave2-payout-confirm-${vp.name}.png`),
            fullPage: true,
          });
          console.log(`✓ payout-confirm @ ${vp.name}`);
          await page.keyboard.press("Escape");
          await sleep(200);
        }
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
