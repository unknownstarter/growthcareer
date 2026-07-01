#!/usr/bin/env node
// test noah 취소 처리 — applicants cancelled + students withdrawn.
// cohort_memberships / Supabase Auth 는 유지 (학생 surface 테스트 계속 위함).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const EMAIL = "whatisgoingonbaby@gmail.com";
const APPLICANT_ID = "39c76675-e17a-479b-bbba-16d6eafd19a9";
const STUDENT_ID = "0539882c-431e-4184-bd26-187f8bc4eb3c";

console.log("=== test noah 취소 처리 ===");

// 1. applicants: paid → cancelled
const { error: aErr } = await sb
  .from("applicants")
  .update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancel_reason: "테스트 계정 — 실 신청 아님 (개발자 테스트용)",
    paid_amount_krw: 0,
    updated_at: new Date().toISOString(),
  })
  .eq("id", APPLICANT_ID);
if (aErr) {
  console.error("applicants 실패:", aErr.message);
  process.exit(1);
}
console.log("[1] applicants → cancelled");

// 2. students: active → withdrawn
const { error: sErr } = await sb
  .from("students")
  .update({
    status: "withdrawn",
    withdrawn_at: new Date().toISOString(),
    notes: "테스트 계정 (개발자 테스트용, 실 학생 아님)",
    updated_at: new Date().toISOString(),
  })
  .eq("id", STUDENT_ID);
if (sErr) {
  console.error("students 실패:", sErr.message);
  process.exit(1);
}
console.log("[2] students → withdrawn");

// 3. 확인
const { data: a } = await sb
  .from("applicants")
  .select("status, cancelled_at, cancel_reason, paid_amount_krw")
  .eq("id", APPLICANT_ID)
  .single();
const { data: s } = await sb
  .from("students")
  .select("status, withdrawn_at")
  .eq("id", STUDENT_ID)
  .single();

console.log("\n=== 결과 ===");
console.log("applicants:", a);
console.log("students:", s);
console.log("\n✓ 취소 처리 완료. cohort_memberships / Auth 는 유지 (학생 surface 테스트 계속).");
console.log("\n손익/재무 dashboard 에서 자동 제외됨:");
console.log("- fetchCohortRevenue: status IN (paid, enrolled) 만 카운트 → cancelled 제외");
console.log("- 학생 count: students.status = active 만 (withdrawn 제외)");
