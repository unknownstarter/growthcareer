// 분석 이벤트 E2E — 이벤트 발화 + 기존 클릭/스크롤 안 깨짐 동시 검증.
// sendBeacon 을 테스트 측에서 래핑해 payload 를 수집(prod 코드 무변경).
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3111";
const PATH = "/fan-to-pro/2?utm_source=kowork&utm_medium=instagram&utm_campaign=f2p_2gi&utm_content=bio";
const out = [];
const pass = (n, x = "") => { out.push([true, n]); console.log(`  PASS  ${n}${x ? " — " + x : ""}`); };
const fail = (n, x = "") => { out.push([false, n]); console.log(`  FAIL  ${n}${x ? " — " + x : ""}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "ko-KR" });

// sendBeacon + keepalive fetch 를 래핑 → /api/track payload 를 window.__beacons 로 수집.
// 원래 동작(실제 전송)은 그대로 호출 = 프로덕션 경로 왜곡 없음.
await ctx.addInitScript(() => {
  window.__beacons = [];
  const record = (t) => { try { window.__beacons.push(JSON.parse(t)); } catch { /* ignore */ } };
  const origBeacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) => {
    try {
      if (String(url).includes("/api/track")) {
        if (data instanceof Blob) data.text().then(record);
        else if (typeof data === "string") record(data);
      }
    } catch { /* ignore */ }
    return origBeacon ? origBeacon(url, data) : true;
  };
  const origFetch = window.fetch;
  window.fetch = (input, init) => {
    try {
      if (String(input).includes("/api/track") && init && typeof init.body === "string") record(init.body);
    } catch { /* ignore */ }
    return origFetch(input, init);
  };
});

const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const beacons = () => page.evaluate(() => window.__beacons || []);
async function names() { return (await beacons()).map((e) => e && e.event_name).filter(Boolean); }
async function has(n) { return (await names()).includes(n); }

console.log(`\n== 분석 이벤트 E2E: ${BASE}${PATH} ==\n`);

await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle", timeout: 60000 });
await wait(700);

// 1. view
(await has("view_recruit_2gi")) ? pass("view_recruit_2gi 발화") : fail("view 미발화", (await names()).join(","));
const viewEv = (await beacons()).find((e) => e.event_name === "view_recruit_2gi") || {};
viewEv.utm_source === "kowork" ? pass("view 에 utm_source=kowork 포함") : fail("utm 누락", JSON.stringify(viewEv));
viewEv.session_id ? pass("익명 session_id 포함", String(viewEv.session_id).slice(0, 12)) : fail("session_id 없음");
String(viewEv.path).endsWith("/fan-to-pro/2") ? pass("path 기록됨", viewEv.path) : fail("path 이상", String(viewEv.path));

// 2. 스크롤 — 실제 동작 + 이벤트
const before = await page.evaluate(() => window.scrollY);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
await wait(400);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(600);
const after = await page.evaluate(() => window.scrollY);
after > before ? pass("스크롤 동작 정상(안 깨짐)", `y ${before}->${after}`) : fail("스크롤 깨짐", `y ${before}->${after}`);
const scrollEvs = (await beacons()).filter((e) => e.event_name === "scroll_recruit_2gi");
scrollEvs.length > 0 ? pass("scroll 이벤트 발화", `${scrollEvs.length}건 depth=${scrollEvs.map((e) => e.scroll_depth).join(",")}`) : fail("scroll 미발화");

// 3. 클릭 — hero 신청 CTA. 앵커 이동(#apply) 안 깨짐 + click 이벤트.
await page.evaluate(() => window.scrollTo(0, 0));
await wait(300);
const applyCta = page.locator('[data-track="apply_cta_hero"]').first();
await applyCta.scrollIntoViewIfNeeded();
await applyCta.click();
await wait(500);
page.url().includes("#apply") ? pass("클릭 후 앵커 이동 정상(#apply, 안 깨짐)") : fail("앵커 이동 깨짐", page.url());
(await has("click_apply_cta_hero_in_recruit_2gi")) ? pass("click_apply_cta_hero_in_recruit_2gi 발화")
  : fail("click 이벤트 미발화", (await names()).filter((n) => n && n.startsWith("click")).join(","));

// 4. start_apply — 폼 첫 포커스, 1회만
const nameInput = page.locator('input[name="name"]');
await nameInput.scrollIntoViewIfNeeded();
await nameInput.click();
await wait(300);
(await has("start_apply")) ? pass("start_apply 발화(폼 첫 포커스)") : fail("start_apply 미발화");
await page.locator('input[name="email"]').click();
await wait(200);
((await beacons()).filter((e) => e.event_name === "start_apply").length === 1)
  ? pass("start_apply 1회만(중복 방지)") : fail("start_apply 중복");

// 5. 정상 제출 → completed_apply + 완료 뷰 (신청 동작 안 깨짐)
async function fill(name, val) { const el = page.locator(`input[name="${name}"]`); await el.scrollIntoViewIfNeeded(); await el.fill(val); }
await fill("name", "분석테스트");
await fill("email", "analytics-e2e@test.com");
await fill("phone", "010-3456-7890");
await fill("birthdate", "1997-05-05");
await fill("university", "테스트대");
await page.locator('select[name="nationality"]').selectOption({ index: 1 });
await page.locator('select[name="visa"]').selectOption({ index: 1 });
for (const c of ["consent", "consent_operations"]) { const cb = page.locator(`input[name="${c}"]`); await cb.scrollIntoViewIfNeeded(); await cb.check(); }
const submit = page.locator('button[type="submit"]');
await submit.scrollIntoViewIfNeeded();
await submit.click();
await wait(3000);
const bodyText = await page.locator("body").innerText();
/신청 완료|완료되었/.test(bodyText) ? pass("정상 제출 → 완료 뷰(신청 동작 안 깨짐)") : fail("완료 뷰 미도달", bodyText.slice(0, 100));
(await has("completed_apply")) ? pass("completed_apply 발화") : fail("completed_apply 미발화", (await names()).join(","));

console.log(`\n수집된 이벤트: ${JSON.stringify(await names())}`);
await browser.close();

const failed = out.filter(([ok]) => !ok);
console.log(`\n== 결과: ${out.length - failed.length}/${out.length} PASS ==`);
if (failed.length) { console.log("실패:", failed.map(([, n]) => n).join(", ")); process.exit(1); }
process.exit(0);
