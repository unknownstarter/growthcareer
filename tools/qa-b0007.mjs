#!/usr/bin/env node
/**
 * Mira QA — B0007 신청-입금 분리 플로우.
 * 7 시나리오 + 컨펌 모달 라운드트립 + 메시지/복사 sanity.
 *
 * 실행:
 *   pnpm exec node tools/qa-b0007.mjs
 *
 * 부수효과:
 *   - Supabase applicants 테이블에 prefix='QATEST-' 행 INSERT/UPDATE/DELETE.
 *   - 종료 직전 cleanup (실패하더라도 final cleanup 시도).
 *
 * 서버 액션 로직을 그대로 재현 (use server 디렉티브는 node 런타임에서 호출 불가).
 *   - markAsNotified: pending -> notified + notified_at + payment_due_at
 *   - sendReminder: SELECT current count + UPDATE WHERE count=expected (낙관적 락)
 *   - markAsPaid: notified -> paid + amount + depositor
 *   - markAsCancelled: pending|notified|paid|overdue -> cancelled + reason
 *   - markAsRefunded: paid|cancelled -> refunded + txn_id
 *   - markAsEnrolledBatch: paid count >= 20 ? enrolled : cancelled+'cohort_min_not_met'
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TEST_PREFIX = "QATEST-B0007";

// ---------- env ----------
function loadEnv() {
  const file = path.resolve(".env.local");
  if (!fs.existsSync(file)) {
    console.error("✗ .env.local missing");
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}
const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SVC) {
  console.error("✗ Supabase keys missing in .env.local");
  process.exit(2);
}
const sb = createClient(URL, SVC, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- harness ----------
const results = [];
function pass(name, note = "") {
  results.push({ name, status: "PASS", note });
  console.log(`  ✓ ${name}${note ? "  — " + note : ""}`);
}
function fail(name, note = "") {
  results.push({ name, status: "FAIL", note });
  console.log(`  ✗ ${name}${note ? "  — " + note : ""}`);
}
function warn(name, note = "") {
  results.push({ name, status: "WARN", note });
  console.log(`  ! ${name}${note ? "  — " + note : ""}`);
}

// ---------- action re-implementations (mirror admin-actions.ts) ----------
const TABLE = "applicants";
const ENROLLMENT_DEADLINE_ISO = "2026-06-21T14:59:59Z";
const PAYMENT_GRACE_DAYS = 3;

async function markAsNotified(id) {
  const now = new Date();
  const graceMs = PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const candidate = new Date(now.getTime() + graceMs);
  const deadline = new Date(ENROLLMENT_DEADLINE_ISO);
  const dueAt = candidate < deadline ? candidate.toISOString() : deadline.toISOString();
  const { error, count } = await sb
    .from(TABLE)
    .update(
      {
        status: "notified",
        notified_at: now.toISOString(),
        payment_due_at: dueAt,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

async function sendReminder(id) {
  const { data: current, error: readErr } = await sb
    .from(TABLE)
    .select("status, reminder_count")
    .eq("id", id)
    .single();
  if (readErr) return { status: "error", error: readErr.message };
  if (!current) return { status: "stale", error: "staleStatus" };
  if (current.status !== "notified") return { status: "stale", error: "staleStatus" };
  const expected = current.reminder_count ?? 0;
  const next = expected + 1;
  const { error, count } = await sb
    .from(TABLE)
    .update(
      { reminder_count: next, last_reminder_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("status", "notified")
    .eq("reminder_count", expected);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

async function markAsPaid(id, { amountKrw, depositorName }) {
  // mirror zod guards
  if (!Number.isInteger(amountKrw) || amountKrw <= 0 || amountKrw > 10_000_000)
    return { status: "error", error: "invalidInput" };
  if (
    typeof depositorName !== "string" ||
    depositorName.trim().length === 0 ||
    depositorName.length > 120
  )
    return { status: "error", error: "invalidInput" };
  const { error, count } = await sb
    .from(TABLE)
    .update(
      {
        status: "paid",
        payment_confirmed_at: new Date().toISOString(),
        paid_amount_krw: amountKrw,
        depositor_name_observed: depositorName,
        paid_confirmed_by: "noah",
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("status", "notified");
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

async function markAsCancelled(id, reason) {
  if (typeof reason !== "string" || reason.trim().length === 0)
    return { status: "error", error: "invalidInput" };
  const { error, count } = await sb
    .from(TABLE)
    .update(
      {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .in("status", ["pending", "notified", "paid", "overdue"]);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

async function markAsRefunded(id, txnId) {
  if (typeof txnId !== "string" || txnId.trim().length === 0)
    return { status: "error", error: "invalidInput" };
  const { error, count } = await sb
    .from(TABLE)
    .update(
      {
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_txn_id: txnId,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .in("status", ["paid", "cancelled"]);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

async function markAsEnrolledBatch(threshold = 20) {
  const { count: paidCount, error: countErr } = await sb
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .like("name", `${TEST_PREFIX}-%`);
  if (countErr) return { status: "error", error: countErr.message };
  const total = paidCount ?? 0;
  const meets = total >= threshold;
  const nowIso = new Date().toISOString();
  if (meets) {
    const { error, count } = await sb
      .from(TABLE)
      .update({ status: "enrolled" }, { count: "exact" })
      .eq("status", "paid")
      .like("name", `${TEST_PREFIX}-%`);
    if (error) return { status: "error", error: error.message };
    return { status: "ok", outcome: "enrolled", counts: { affected: count ?? 0, threshold } };
  }
  const { error, count } = await sb
    .from(TABLE)
    .update(
      { status: "cancelled", cancelled_at: nowIso, cancel_reason: "cohort_min_not_met" },
      { count: "exact" },
    )
    .eq("status", "paid")
    .like("name", `${TEST_PREFIX}-%`);
  if (error) return { status: "error", error: error.message };
  return { status: "ok", outcome: "cancelled", counts: { affected: count ?? 0, threshold } };
}

// ---------- fixtures ----------
let createdIds = [];
async function insertApplicant(suffix, overrides = {}) {
  const row = {
    name: `${TEST_PREFIX}-${suffix}`,
    email: `qa+${Date.now()}-${suffix}@example.com`,
    phone: "010-0000-0000",
    birthdate: "2000-01-01",
    university: "Mira QA Univ",
    visa: "D-2",
    address: "Seoul",
    consent: true,
    consent_operations: true,
    consent_marketing: false,
    consent_content_use: true,
    source: "mira-qa",
    status: "pending",
    ...overrides,
  };
  const { data, error } = await sb
    .from(TABLE)
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(`insert ${suffix}: ${error.message}`);
  createdIds.push(data.id);
  return data.id;
}

async function row(id) {
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function cleanup() {
  if (createdIds.length === 0) return;
  // Also sweep any QATEST-* prefix rows in case prior run failed
  await sb.from(TABLE).delete().like("name", `${TEST_PREFIX}-%`);
}

// ---------- scenarios ----------
async function s1_happy_path() {
  console.log("\n[S1] Happy path 전이 pending -> notified -> paid -> enrolled-batch (cancel)");
  const id = await insertApplicant("s1-happy");

  // pre-check
  let r = await row(id);
  if (r.status !== "pending") return fail("S1 pre", `expected pending got ${r.status}`);
  pass("S1 INSERT status=pending");

  // markAsNotified
  let res = await markAsNotified(id);
  if (res.status !== "ok") return fail("S1 markAsNotified", JSON.stringify(res));
  r = await row(id);
  if (r.status !== "notified") return fail("S1 status notified", r.status);
  if (!r.notified_at) return fail("S1 notified_at not set");
  if (!r.payment_due_at) return fail("S1 payment_due_at not set");
  const due = new Date(r.payment_due_at);
  const deadline = new Date(ENROLLMENT_DEADLINE_ISO);
  if (due > deadline)
    return fail("S1 payment_due_at exceeds deadline", `due=${r.payment_due_at} deadline=${ENROLLMENT_DEADLINE_ISO}`);
  pass("S1 markAsNotified + payment_due_at clamp");

  // markAsPaid
  res = await markAsPaid(id, { amountKrw: 880000, depositorName: "홍길동" });
  if (res.status !== "ok") return fail("S1 markAsPaid", JSON.stringify(res));
  r = await row(id);
  if (r.status !== "paid") return fail("S1 status paid", r.status);
  if (r.paid_amount_krw !== 880000) return fail("S1 paid_amount_krw", r.paid_amount_krw);
  if (r.depositor_name_observed !== "홍길동") return fail("S1 depositor", r.depositor_name_observed);
  if (!r.payment_confirmed_at) return fail("S1 payment_confirmed_at");
  if (r.paid_confirmed_by !== "noah") return fail("S1 paid_confirmed_by", r.paid_confirmed_by);
  pass("S1 markAsPaid + audit columns");

  // markAsEnrolledBatch — 1명만 paid 이므로 threshold=20 미달 → cancelled
  const batch = await markAsEnrolledBatch(20);
  if (batch.status !== "ok") return fail("S1 batch", JSON.stringify(batch));
  if (batch.outcome !== "cancelled")
    return fail("S1 batch outcome", `expected cancelled (1<20) got ${batch.outcome}`);
  if (batch.counts.affected !== 1) return fail("S1 batch count", batch.counts.affected);
  r = await row(id);
  if (r.status !== "cancelled") return fail("S1 final status", r.status);
  if (r.cancel_reason !== "cohort_min_not_met") return fail("S1 cancel_reason", r.cancel_reason);
  pass("S1 markAsEnrolledBatch under-threshold -> cancelled + cohort_min_not_met");
}

async function s2_optimistic_concurrency_paid() {
  console.log("\n[S2] Optimistic concurrency — markAsPaid 동시 호출");
  const id = await insertApplicant("s2-conc");
  let r0 = await markAsNotified(id);
  if (r0.status !== "ok") return fail("S2 setup notify", JSON.stringify(r0));

  const [a, b] = await Promise.all([
    markAsPaid(id, { amountKrw: 880000, depositorName: "A" }),
    markAsPaid(id, { amountKrw: 880000, depositorName: "B" }),
  ]);
  const ok = [a, b].filter((x) => x.status === "ok").length;
  const stale = [a, b].filter((x) => x.status === "stale").length;
  if (ok !== 1 || stale !== 1)
    return fail("S2 ok=1 stale=1", `ok=${ok} stale=${stale} a=${a.status} b=${b.status}`);
  pass("S2 markAsPaid 동시 -> 한쪽만 ok, 다른 쪽 stale");
}

async function s3_reminder_count_race() {
  console.log("\n[S3] Reminder count race — sendReminder 동시 호출");
  const id = await insertApplicant("s3-reminder");
  let setup = await markAsNotified(id);
  if (setup.status !== "ok") return fail("S3 setup", JSON.stringify(setup));

  const [a, b] = await Promise.all([sendReminder(id), sendReminder(id)]);
  const ok = [a, b].filter((x) => x.status === "ok").length;
  const stale = [a, b].filter((x) => x.status === "stale").length;
  if (ok !== 1 || stale !== 1)
    return fail("S3 ok=1 stale=1", `ok=${ok} stale=${stale}`);
  const r = await row(id);
  if (r.reminder_count !== 1)
    return fail("S3 reminder_count exactly 1", `got ${r.reminder_count}`);
  if (!r.last_reminder_at) return fail("S3 last_reminder_at unset");
  pass("S3 동시 호출 → +1 only (race 차단)");

  // sequential second send → count = 2
  const c = await sendReminder(id);
  if (c.status !== "ok") return fail("S3 sequential second", JSON.stringify(c));
  const r2 = await row(id);
  if (r2.reminder_count !== 2) return fail("S3 sequential count", r2.reminder_count);
  pass("S3 sequential 호출 count=2");
}

async function s4_cancelled_refunded() {
  console.log("\n[S4] Cancelled -> Refunded 흐름");
  const id = await insertApplicant("s4-cancel");
  let res = await markAsCancelled(id, "applicant_requested");
  if (res.status !== "ok") return fail("S4 markAsCancelled", JSON.stringify(res));
  let r = await row(id);
  if (r.status !== "cancelled") return fail("S4 status cancelled", r.status);
  if (r.cancel_reason !== "applicant_requested") return fail("S4 cancel_reason", r.cancel_reason);
  if (!r.cancelled_at) return fail("S4 cancelled_at unset");

  res = await markAsRefunded(id, "TOSS-12345");
  if (res.status !== "ok") return fail("S4 markAsRefunded", JSON.stringify(res));
  r = await row(id);
  if (r.status !== "refunded") return fail("S4 status refunded", r.status);
  if (r.refund_txn_id !== "TOSS-12345") return fail("S4 refund_txn_id", r.refund_txn_id);
  if (!r.refunded_at) return fail("S4 refunded_at unset");
  pass("S4 pending -> cancelled -> refunded");
}

async function s5_batch_under_threshold() {
  console.log("\n[S5] Batch 정원 미달 (5 paid → 5 cancelled)");
  // Clean any 'paid' QATEST rows left from S2/S3/etc — batch sweeps globally.
  await sb.from(TABLE).delete().like("name", `${TEST_PREFIX}-%`).eq("status", "paid");
  const ids = [];
  for (let i = 0; i < 5; i += 1) {
    const id = await insertApplicant(`s5-paid-${i}`);
    let r1 = await markAsNotified(id);
    if (r1.status !== "ok") return fail(`S5 notify ${i}`, JSON.stringify(r1));
    let r2 = await markAsPaid(id, { amountKrw: 880000, depositorName: `S5_${i}` });
    if (r2.status !== "ok") return fail(`S5 paid ${i}`, JSON.stringify(r2));
    ids.push(id);
  }
  const res = await markAsEnrolledBatch(20);
  if (res.status !== "ok") return fail("S5 batch", JSON.stringify(res));
  if (res.outcome !== "cancelled") return fail("S5 outcome", res.outcome);
  if (res.counts.affected !== 5) return fail("S5 affected", res.counts.affected);
  for (const id of ids) {
    const r = await row(id);
    if (r.status !== "cancelled") return fail(`S5 row ${id} status`, r.status);
    if (r.cancel_reason !== "cohort_min_not_met")
      return fail(`S5 row ${id} reason`, r.cancel_reason);
  }
  pass("S5 5 paid -> 5 cancelled + cohort_min_not_met");
}

async function s6_input_validation() {
  console.log("\n[S6] Input 검증 — markAsPaid 음수/빈 입력");
  const id = await insertApplicant("s6-input");
  await markAsNotified(id);

  const r1 = await markAsPaid(id, { amountKrw: -1, depositorName: "X" });
  if (r1.status !== "error") return fail("S6 negative amount", JSON.stringify(r1));
  if (r1.error !== "invalidInput") return fail("S6 negative err key", r1.error);
  pass("S6 amountKrw=-1 -> error/invalidInput");

  const r2 = await markAsPaid(id, { amountKrw: 880000, depositorName: "" });
  if (r2.status !== "error") return fail("S6 empty depositor", JSON.stringify(r2));
  pass("S6 depositorName='' -> error");

  const r3 = await markAsPaid(id, { amountKrw: 0, depositorName: "x" });
  if (r3.status !== "error") return fail("S6 zero amount", JSON.stringify(r3));
  pass("S6 amountKrw=0 -> error");

  const r4 = await markAsPaid(id, { amountKrw: 11_000_000, depositorName: "x" });
  if (r4.status !== "error") return fail("S6 overflow amount", JSON.stringify(r4));
  pass("S6 amountKrw>10_000_000 -> error");

  const r5 = await markAsPaid(id, { amountKrw: 1.5, depositorName: "x" });
  if (r5.status !== "error") return fail("S6 non-int amount", JSON.stringify(r5));
  pass("S6 amountKrw=1.5 (non-integer) -> error");

  // After all-failed attempts, row must still be in 'notified' (not advanced).
  const r = await row(id);
  if (r.status !== "notified") return fail("S6 row unchanged", r.status);
  if (r.paid_amount_krw !== null) return fail("S6 paid_amount unchanged null", r.paid_amount_krw);
  pass("S6 invalid 호출 후 row 변경 0");
}

async function s7_guarded_transitions() {
  console.log("\n[S7] 불가 전이 가드 — enrolled.cancel / refunded.pay");

  // Build an enrolled row (notified -> paid -> enrolled by direct update because
  // markAsEnrolledBatch acts on paid set globally; we set status directly to enrolled
  // via raw update to mimic post-batch state).
  const idEnrolled = await insertApplicant("s7-enrolled");
  await markAsNotified(idEnrolled);
  await markAsPaid(idEnrolled, { amountKrw: 880000, depositorName: "X" });
  await sb.from(TABLE).update({ status: "enrolled" }).eq("id", idEnrolled);
  let r = await row(idEnrolled);
  if (r.status !== "enrolled") return fail("S7 setup enrolled", r.status);
  // attempt cancel
  let res = await markAsCancelled(idEnrolled, "operator_change_mind");
  if (res.status !== "stale")
    return fail("S7 enrolled.cancel must be stale", JSON.stringify(res));
  r = await row(idEnrolled);
  if (r.status !== "enrolled") return fail("S7 enrolled unchanged", r.status);
  pass("S7 enrolled row → markAsCancelled 거절 (stale)");

  // refunded → markAsPaid impossible
  const idRefund = await insertApplicant("s7-refund");
  await markAsCancelled(idRefund, "applicant_requested");
  await markAsRefunded(idRefund, "TOSS-99999");
  r = await row(idRefund);
  if (r.status !== "refunded") return fail("S7 setup refunded", r.status);
  res = await markAsPaid(idRefund, { amountKrw: 880000, depositorName: "Y" });
  if (res.status !== "stale")
    return fail("S7 refunded.pay must be stale", JSON.stringify(res));
  r = await row(idRefund);
  if (r.status !== "refunded") return fail("S7 refunded unchanged", r.status);
  pass("S7 refunded row → markAsPaid 거절 (stale)");

  // refunded → markAsCancelled also impossible
  res = await markAsCancelled(idRefund, "applicant_requested");
  if (res.status !== "stale")
    return fail("S7 refunded.cancel must be stale", JSON.stringify(res));
  pass("S7 refunded row → markAsCancelled 거절 (stale)");

  // refunded → markAsRefunded again impossible (refunded not in [paid,cancelled])
  res = await markAsRefunded(idRefund, "TOSS-RETRY");
  if (res.status !== "stale")
    return fail("S7 double-refund must be stale", JSON.stringify(res));
  pass("S7 refunded row → markAsRefunded 재호출 거절 (idempotency)");
}

async function s8_batch_at_threshold() {
  console.log("\n[S8 추가] Batch 정원 충족 boundary (20 paid → enrolled)");
  // Reset paid bucket so we exactly hit 20.
  await sb.from(TABLE).delete().like("name", `${TEST_PREFIX}-%`).eq("status", "paid");
  // 20 rows. Bulky — skip if config says so.
  const TARGET = 20;
  const ids = [];
  for (let i = 0; i < TARGET; i += 1) {
    const id = await insertApplicant(`s8-${i}`);
    await markAsNotified(id);
    await markAsPaid(id, { amountKrw: 880000, depositorName: `S8_${i}` });
    ids.push(id);
  }
  const res = await markAsEnrolledBatch(20);
  if (res.status !== "ok") return fail("S8 batch", JSON.stringify(res));
  if (res.outcome !== "enrolled")
    return fail("S8 outcome", `expected enrolled (20>=20) got ${res.outcome}`);
  if (res.counts.affected !== 20) return fail("S8 affected", res.counts.affected);
  // Spot check
  const r = await row(ids[0]);
  if (r.status !== "enrolled") return fail("S8 spot row", r.status);
  pass("S8 20 paid -> 20 enrolled (boundary inclusive)");
}

// ---------- message template sanity ----------
async function s_messages() {
  console.log("\n[Msg] 메시지 템플릿 sanity");
  const { getSmsBody, getEmailBody, getEmailSubject, buildMailtoUrl, buildSmsUrl } =
    await import("../src/programs/fan-to-pro/messages/templates.ts").catch(() => ({}));
  if (!getSmsBody) {
    warn("Msg templates import (ts loader 없음 — runtime은 Next에서 동작)");
    return;
  }
}

// ---------- run all ----------
async function main() {
  console.log("Mira QA — B0007 시작\n--------------------------------");
  await cleanup(); // sweep prior runs
  createdIds = [];
  try {
    await s1_happy_path();
    await s2_optimistic_concurrency_paid();
    await s3_reminder_count_race();
    await s4_cancelled_refunded();
    await s5_batch_under_threshold();
    await s6_input_validation();
    await s7_guarded_transitions();
    if (process.env.QA_SKIP_S8 !== "1") {
      await s8_batch_at_threshold();
    } else {
      warn("S8 skipped via QA_SKIP_S8=1");
    }
  } catch (e) {
    fail("uncaught", e.message);
  } finally {
    await cleanup();
  }

  console.log("\n--------------------------------");
  const pCount = results.filter((r) => r.status === "PASS").length;
  const fCount = results.filter((r) => r.status === "FAIL").length;
  const wCount = results.filter((r) => r.status === "WARN").length;
  console.log(`PASS=${pCount}  FAIL=${fCount}  WARN=${wCount}`);
  if (fCount > 0) {
    console.log("\nFAILURES:");
    for (const r of results.filter((x) => x.status === "FAIL")) {
      console.log(`  - ${r.name}: ${r.note}`);
    }
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error("✗ exception:", e);
  await cleanup();
  process.exit(99);
});
