// 인스타 인앱웹뷰 → 영문 랜딩 → 최소 정보만(생일/학교 없이) → 수강신청 완료.
// 모바일 + 데스크탑(웹) 양쪽. 영어 유학생 시나리오 재현(locale en-US → /fan-to-pro/2 영문 유지).
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3111";
const EN_URL = `${BASE}/fan-to-pro/2?utm_source=kowork&utm_medium=instagram&utm_campaign=f2p_2gi`;
const IG_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0.0.28.105";
const IG_UA_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Instagram 340.0.0";

const out = [];
const P = (n, x = "") => { out.push([true, n]); console.log(`  PASS  ${n}${x ? " — " + x : ""}`); };
const F = (n, x = "") => { out.push([false, n]); console.log(`  FAIL  ${n}${x ? " — " + x : ""}`); };

const browser = await chromium.launch();

async function scenario(label, deviceOpts, ua, email) {
  console.log(`\n=== ${label} ===`);
  const ctx = await browser.newContext({ ...deviceOpts, userAgent: ua, locale: "en-US" });
  const page = await ctx.newPage();
  const perr = [];
  page.on("pageerror", (e) => perr.push(e.message));
  const resp = await page.goto(EN_URL, { waitUntil: "networkidle", timeout: 60000 });

  // 영문 유지 확인 (ko 로 리다이렉트 안 됨)
  const url = page.url();
  url.includes("/ko/") ? F("영문 페이지 유지", "ko 로 리다이렉트됨: " + url) : P("영문 페이지 유지", url.replace(BASE, ""));
  const title = await page.title();
  /Fan to Pro|K-pop|career/i.test(title) && !/모집|신청/.test(title) ? P("영문 타이틀", title.slice(0, 50)) : F("타이틀 이상", title);

  // 영문 설명/폼 라벨 확인
  const bodyTop = await page.locator("body").innerText();
  /A&R|K-pop|career|instructor/i.test(bodyTop) ? P("영문 설명 렌더") : F("영문 설명 안 보임");

  // 폼으로 이동 + 영문 라벨 + (optional) 표기 확인
  await page.locator('input[name="birthdate"]').scrollIntoViewIfNeeded();
  const bdLabel = await page.locator('label:has(input[name="birthdate"]) span').first().innerText().catch(() => "?");
  const uniLabel = await page.locator('label:has(input[name="university"]) span').first().innerText().catch(() => "?");
  /optional/i.test(bdLabel) ? P("생일 = optional 표기", bdLabel) : F("생일 optional 아님", bdLabel);
  /optional/i.test(uniLabel) ? P("학교 = optional 표기", uniLabel) : F("학교 optional 아님", uniLabel);
  // birthdate/university 에 required 속성 없어야
  const bdReq = await page.locator('input[name="birthdate"]').getAttribute("required");
  const uniReq = await page.locator('input[name="university"]').getAttribute("required");
  bdReq === null && uniReq === null ? P("생일/학교 required 속성 없음") : F("아직 required", `bd=${bdReq} uni=${uniReq}`);

  // 가로 오버플로 (모바일 병목)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  over <= 1 ? P("가로 오버플로 없음") : F("가로 스크롤", `+${over}px`);

  // 최소 정보만 입력 (생일/학교/주소/추천코드 전부 빈칸)
  async function fill(n, v) { const e = page.locator(`input[name="${n}"]`); await e.scrollIntoViewIfNeeded(); await e.fill(v); }
  await fill("name", "Minimal Test");
  await fill("email", email);
  await fill("phone", "010-7777-8888");
  await page.locator('select[name="nationality"]').selectOption({ index: 1 });
  await page.locator('select[name="visa"]').selectOption({ index: 1 });
  // 참여 가능 게이트(필수) + 동의 2개
  for (const c of ["can_attend_offline", "consent", "consent_operations"]) { const cb = page.locator(`input[name="${c}"]`); await cb.scrollIntoViewIfNeeded(); await cb.check(); }

  const submit = page.locator('button[type="submit"]');
  await submit.scrollIntoViewIfNeeded();
  await submit.click();
  await page.waitForTimeout(3000);
  const done = await page.locator("body").innerText();
  const ok = /Application complete|complete|received/i.test(done);
  ok ? P("최소 정보만으로 신청 완료 (영문 완료 뷰)") : F("완료 실패", done.slice(0, 120).replace(/\n/g, " "));
  if (ok) await page.screenshot({ path: `docs/screenshots/f2p-cro/en-done-${label.includes("모바일") ? "mobile" : "web"}.png` });

  perr.length === 0 ? P("페이지 throw 없음") : F("throw", perr.slice(0, 2).join(" | "));
  await ctx.close();
}

await scenario("① 모바일 인앱웹뷰 (iPhone 13)", devices["iPhone 13"], IG_UA, "en-mobile-min@test.com");
await scenario("② 웹 데스크탑 (1440x900)", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }, IG_UA_DESKTOP, "en-web-min@test.com");

await browser.close();
const failed = out.filter(([o]) => !o);
console.log(`\n== 결과: ${out.length - failed.length}/${out.length} PASS ==`);
if (failed.length) { console.log("실패:", failed.map(([, n]) => n).join(", ")); process.exit(1); }
process.exit(0);
