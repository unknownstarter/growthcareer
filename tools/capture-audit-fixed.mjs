import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/screenshots/design-audit/fixed");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, { url, width, height, action, fullPage = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  if (action) await action(page);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log("saved", name);
  await ctx.close();
}

// P0-1 mobile drawer open (light-clean home)
await shot("p0-drawer-open-home", {
  url: "/",
  width: 390,
  height: 844,
  action: async (page) => {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await page.waitForTimeout(400);
  },
});

// P0-1 mobile drawer open (2기 dark-ish header)
await shot("p0-drawer-open-cohort2", {
  url: "/fan-to-pro/2",
  width: 390,
  height: 844,
  action: async (page) => {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await page.waitForTimeout(400);
  },
});

// P0-1 header closed on mobile (shows hamburger, no nav loss)
await shot("p0-header-closed-mobile", { url: "/", width: 390, height: 844 });

// P1-3 2기 price card contrast (desktop crop via full section)
await shot("p1-price-cohort2", {
  url: "/fan-to-pro/2",
  width: 1200,
  height: 900,
  action: async (page) => {
    const el = page.locator("#courses, section:has-text('수강료')").first();
    try {
      await el.scrollIntoViewIfNeeded();
    } catch {}
    await page.waitForTimeout(400);
  },
});

// P2-1 home feature card vertical alignment
await shot("p2-home-feature-card", {
  url: "/",
  width: 1200,
  height: 900,
  action: async (page) => {
    await page.evaluate(() => window.scrollTo(0, 820));
    await page.waitForTimeout(400);
  },
});

// P2-2 home review pull-quote
await shot("p2-home-review-quote", {
  url: "/",
  width: 1200,
  height: 900,
  action: async (page) => {
    await page.evaluate(() => window.scrollTo(0, 3240));
    await page.waitForTimeout(400);
  },
});

await browser.close();
