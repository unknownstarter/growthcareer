#!/usr/bin/env node
/**
 * External URL capture — Playwright 헤드리스로 임의 URL 의 fullPage PNG + innerText 덤프.
 *
 * 1차 자료가 필요할 때, WebFetch 가 권한·sandbox 로 막힐 때 우회 경로.
 * 출력: docs/research/raw/<slug>.png, docs/research/raw/<slug>.txt
 *
 * Usage:
 *   node tools/capture-url.mjs https://example.com https://example.com/foo
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const URLS = process.argv.slice(2).filter((a) => a.startsWith("http"));
const OUT_DIR = path.resolve("docs/research/raw");

if (URLS.length === 0) {
  console.error("Usage: node tools/capture-url.mjs <url> [url2] ...");
  process.exit(1);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  for (const url of URLS) {
    try {
      const ctx = await browser.newContext({
        viewport: { width: 800, height: 1200 },
        deviceScaleFactor: 1,
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      });
      const page = await ctx.newPage();
      console.log(`→ ${url}`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });

      // trigger lazy-loaded content
      await page.evaluate(async () => {
        const step = 800;
        while (
          window.scrollY + window.innerHeight <
          document.body.scrollHeight
        ) {
          window.scrollBy(0, step);
          await new Promise((r) => setTimeout(r, 250));
        }
        window.scrollTo(0, 0);
      });
      await sleep(1200);

      const slug =
        new URL(url).pathname.replace(/\//g, "_").replace(/^_/, "") || "root";
      const imgFile = path.join(OUT_DIR, `${slug}.png`);
      const textFile = path.join(OUT_DIR, `${slug}.txt`);

      await page.screenshot({ path: imgFile, fullPage: true, type: "png" });
      const text = await page.evaluate(() => document.body.innerText);
      await writeFile(textFile, text, "utf8");

      console.log(`  ✓ ${imgFile}`);
      console.log(`  ✓ ${textFile} (${text.length} chars)`);
      await ctx.close();
    } catch (err) {
      console.error(`  ✗ ${url} — ${err.message}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
