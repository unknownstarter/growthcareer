#!/usr/bin/env node
/**
 * Unsplash 검색 페이지에서 고해상도 이미지 추출 + 다운로드.
 *
 * 사용:
 *   node tools/fetch-stock.mjs "concert stage" "k-pop performer back"
 *
 * 출력: public/images/stock/<slug>-N.jpg + public/images/stock/manifest.json
 *
 * Unsplash 라이선스: 상업·비상업 무료 사용 가능 (attribution 권장).
 * manifest.json 에 source URL 보존 — 추후 attribution 또는 사용자 자체 사진으로 swap.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const QUERIES = process.argv.slice(2);
if (QUERIES.length === 0) {
  console.error('Usage: node tools/fetch-stock.mjs "<query1>" "<query2>" ...');
  process.exit(1);
}

const PER_QUERY = 4;
const OUT_DIR = path.resolve("public/images/stock");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  for (const q of QUERIES) {
    const slug = q.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    console.log(`→ "${q}"`);
    const searchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(
      q,
    )}?orientation=landscape`;

    try {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await sleep(3000);

      // Scroll a bit to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 800));
      await sleep(1500);

      const urls = await page.evaluate(() => {
        const imgs = Array.from(
          document.querySelectorAll('img[srcset*="images.unsplash.com"]'),
        );
        const out = [];
        const seen = new Set();
        for (const img of imgs) {
          const srcset = img.getAttribute("srcset") || "";
          const matches =
            srcset.match(/(https:\/\/images\.unsplash\.com\/[^\s,]+)\s+(\d+)w/g) ||
            [];
          if (matches.length === 0) continue;
          // pick the highest-resolution variant
          let best = "";
          let bestW = 0;
          for (const m of matches) {
            const [u, w] = m.trim().split(/\s+/);
            const wn = parseInt(w);
            if (wn > bestW && wn <= 2400) {
              bestW = wn;
              best = u;
            }
          }
          if (best && !seen.has(best)) {
            seen.add(best);
            out.push(best);
          }
        }
        return out.slice(0, 12);
      });

      console.log(`  candidates: ${urls.length}`);
      let saved = 0;
      for (const u of urls) {
        if (saved >= PER_QUERY) break;
        try {
          const res = await ctx.request.get(u, { timeout: 30_000 });
          if (!res.ok()) continue;
          const buf = await res.body();
          const file = path.join(OUT_DIR, `${slug}-${saved + 1}.jpg`);
          await writeFile(file, buf);
          manifest.push({
            file: path.relative(path.resolve("public"), file).replace(/\\/g, "/"),
            query: q,
            sourceUrl: u,
          });
          console.log(`  ✓ ${file}`);
          saved++;
        } catch (err) {
          console.log(`  ✗ ${u} — ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`  ✗ search failed: ${err.message}`);
    }
  }

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nmanifest: ${manifestPath} (${manifest.length} entries)`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
