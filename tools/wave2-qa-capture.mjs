#!/usr/bin/env node
/**
 * Mira Wave 2 QA capture — /admin/instructors + /admin/finance
 *
 * Reuses already-running dev server at PREVIEW_BASE_URL (default :4321).
 * Sends HTTP Basic Auth via env (ADMIN_BASIC_AUTH_USER/PASS).
 * Writes to docs/screenshots/wave2-qa/ (subdir = survives `pnpm preview` wipe).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:4321";
const USER = process.env.ADMIN_BASIC_AUTH_USER ?? "admin";
const PASS = process.env.ADMIN_BASIC_AUTH_PASS ?? "preview-local-pass-do-not-ship";
const OUT = path.resolve("docs/screenshots/wave2-qa");

const ROUTES = [
  { slug: "instructors", path: "/admin/instructors" },
  { slug: "finance", path: "/admin/finance" },
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const r of ROUTES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: "dark",
        httpCredentials: { username: USER, password: PASS },
      });
      const page = await ctx.newPage();
      const url = `${BASE}${r.path}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      } catch (e) {
        console.warn(`! ${r.path} @ ${vp.name} navigation: ${e.message}`);
      }
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(800);
      const file = path.join(OUT, `${r.slug}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${r.path} @ ${vp.name} → ${file}`);
      await ctx.close();
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
