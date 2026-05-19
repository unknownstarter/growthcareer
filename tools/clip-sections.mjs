import { chromium } from "playwright";

const URL = "http://localhost:4321/fan-to-pro";
const browser = await chromium.launch();

async function clipSection(width, height, name, selector, afterNav) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (afterNav) await afterNav(page);
  const el = page.locator(selector);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await el.screenshot({ path: `docs/screenshots/_${name}.png` });
  await ctx.close();
}

async function fillStep1AndAdvance(page) {
  await page.locator("#recruitment").scrollIntoViewIfNeeded();
  await page.getByLabel("이름").fill("테스트");
  await page.getByLabel("이메일").fill("test@example.com");
  await page.getByLabel("연락처").fill("010-1234-5678");
  await page.getByRole("button", { name: /다음 단계/ }).click();
  await page.waitForSelector("text=수강신청 완료 기준", { timeout: 5000 });
}

for (const [width, height, tag] of [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
]) {
  await clipSection(width, height, `recruitment-${tag}`, "#recruitment");
  await clipSection(width, height, `apply-${tag}`, "#apply", fillStep1AndAdvance);
}

await browser.close();
console.log("done");
