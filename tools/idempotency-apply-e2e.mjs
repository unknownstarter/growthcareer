// 멱등성 E2E — 같은 email 재신청 시:
//  1) 중복 행 안 생김 (2기 cohort 내 1행 유지)
//  2) 프로필(전화 등)만 갱신
//  3) 운영자가 진행한 status/notified_at 은 재제출로 덮어쓰지 않음
//  4) 다른 email 은 새 행 (dedup 키 = email+cohort 정확)
import { chromium, devices } from "playwright";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE || "http://localhost:3111";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const EMAIL_X = "idem-x@test.com";
const EMAIL_Y = "idem-y@test.com";
const out = [];
const P = (n, x = "") => { out.push([true, n]); console.log(`  PASS  ${n}${x ? " — " + x : ""}`); };
const F = (n, x = "") => { out.push([false, n]); console.log(`  FAIL  ${n}${x ? " — " + x : ""}`); };
const rows = async (email) => (await sb.from("applicants").select("id,phone,status,notified_at,cohort_id").ilike("email", email)).data || [];

async function cleanup() { await sb.from("applicants").delete().in("email", [EMAIL_X, EMAIL_Y]); }
await cleanup(); // 이전 잔여 제거

const browser = await chromium.launch();
async function apply(email, phone) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "en-US" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fan-to-pro/2`, { waitUntil: "networkidle", timeout: 60000 });
  async function fill(n, v) { const e = p.locator(`input[name="${n}"]`); await e.scrollIntoViewIfNeeded(); await e.fill(v); }
  await fill("name", "Idem Test"); await fill("email", email); await fill("phone", phone);
  await p.locator('select[name="nationality"]').selectOption({ index: 1 });
  await p.locator('select[name="visa"]').selectOption({ index: 1 });
  for (const c of ["consent", "consent_operations"]) { const cb = p.locator(`input[name="${c}"]`); await cb.scrollIntoViewIfNeeded(); await cb.check(); }
  const s = p.locator('button[type="submit"]'); await s.scrollIntoViewIfNeeded(); await s.click();
  await p.waitForTimeout(2800);
  const done = /complete|received/i.test(await p.locator("body").innerText());
  await ctx.close();
  return done;
}

console.log("\n== 멱등성 E2E ==\n");

// 1) 최초 신청
(await apply(EMAIL_X, "010-1111-1111")) ? P("최초 신청 완료") : F("최초 신청 실패");
let rx = await rows(EMAIL_X);
rx.length === 1 ? P("최초: 1행 생성", `phone=${rx[0].phone} status=${rx[0].status}`) : F("최초 행수 이상", String(rx.length));

// 2) 운영자 처리 시뮬 — status=notified + notified_at 세팅
const stampAt = "2026-08-23T01:00:00Z";
await sb.from("applicants").update({ status: "notified", notified_at: stampAt }).eq("id", rx[0].id);
console.log("  (운영자 처리 시뮬: status=notified, notified_at 세팅)");

// 3) 같은 email 재신청 (전화 변경)
(await apply(EMAIL_X, "010-2222-2222")) ? P("재신청 완료") : F("재신청 실패");
rx = await rows(EMAIL_X);
rx.length === 1 ? P("재신청: 중복 행 안 생김 (여전히 1행)", `id=${rx[0].id}`) : F("중복 행 생성됨!", `${rx.length}행`);
rx[0]?.phone === "010-2222-2222" ? P("프로필(전화) 갱신됨", rx[0].phone) : F("전화 갱신 안 됨", rx[0]?.phone);
rx[0]?.status === "notified" ? P("status 보존 (재제출이 pending 으로 안 되돌림)", rx[0].status) : F("status 덮어써짐!", rx[0]?.status);
(rx[0]?.notified_at && rx[0].notified_at.startsWith("2026-08-23T01:00")) ? P("notified_at 보존 (발송시각 안 지워짐)", rx[0].notified_at) : F("notified_at 덮어써짐!", String(rx[0]?.notified_at));

// 4) 다른 email = 새 행
(await apply(EMAIL_Y, "010-3333-3333")) ? P("다른 email 신청 완료") : F("실패");
const ry = await rows(EMAIL_Y);
ry.length === 1 ? P("다른 email = 새 행 (dedup 키 정확)", `id=${ry[0].id}`) : F("다른 email 행수 이상", String(ry.length));

await browser.close();
await cleanup();
console.log("  (테스트 행 정리 완료)");

const failed = out.filter(([o]) => !o);
console.log(`\n== 결과: ${out.length - failed.length}/${out.length} PASS ==`);
if (failed.length) { console.log("실패:", failed.map(([, n]) => n).join(", ")); process.exit(1); }
process.exit(0);
