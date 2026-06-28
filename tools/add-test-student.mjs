#!/usr/bin/env node
/**
 * 테스트 학생 추가 — applicants + students + Supabase Auth + user_profiles + cohort_memberships.
 *
 * 노아 요청 (2026-06-28): whatisgoingonbaby@gmail.com / "test noah" / 1기.
 *
 * 사용: node tools/add-test-student.mjs
 * 멱등: 이미 존재하면 skip (재실행 OK).
 *
 * 결과 = 학생 본인 surface (/[cohortSlug]/student/profile) 접근 가능한 계정.
 * 노아가 super_admin 계정 (hello@dropdown.xyz) 와 별도로 student role 테스트.
 */
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

const COHORT_ID = "6fbeec9c-5a58-4cff-861d-4979710abc9e"; // 1기
const COHORT_SLUG = "b628b909";
const TEST_EMAIL = "whatisgoingonbaby@gmail.com";
const TEST_NAME = "test noah";
const TEMP_PASSWORD = "TestNoah2026!"; // 노아한테만 알려줌, 첫 로그인 후 변경

console.log("=== 테스트 학생 추가 ===\n");

// 1. applicants row — 멱등 check
let { data: existingApplicant } = await sb
  .from("applicants")
  .select("id, name, email, status")
  .eq("email", TEST_EMAIL)
  .maybeSingle();

let applicantId;
if (existingApplicant) {
  console.log(`[1] applicants: 이미 존재 — id=${existingApplicant.id}, status=${existingApplicant.status}`);
  applicantId = existingApplicant.id;
} else {
  const { data: newApplicant, error: appErr } = await sb
    .from("applicants")
    .insert({
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: "010-0000-0000",
      birthdate: "1990-01-01",
      visa: "기타/없음",
      address: "테스트 주소",
      university: "테스트 대학",
      nationality: "Korea",
      consent: true,
      consent_operations: true,
      consent_content_use: true,
      status: "paid",
      cohort_id: COHORT_ID,
      paid_amount_krw: 0, // 테스트 — 매출 안 잡힘
      payment_confirmed_at: new Date().toISOString(),
      depositor_name_observed: TEST_NAME,
    })
    .select("id")
    .single();
  if (appErr) {
    console.error("[1] applicants INSERT 실패:", appErr.message);
    process.exit(1);
  }
  applicantId = newApplicant.id;
  console.log(`[1] applicants 신규 INSERT — id=${applicantId}`);
}

// 2. students row — 멱등
let { data: existingStudent } = await sb
  .from("students")
  .select("id, display_name")
  .eq("applicant_id", applicantId)
  .maybeSingle();

let studentId;
if (existingStudent) {
  console.log(`[2] students: 이미 존재 — id=${existingStudent.id}`);
  studentId = existingStudent.id;
} else {
  const { data: newStudent, error: stuErr } = await sb
    .from("students")
    .insert({
      applicant_id: applicantId,
      cohort_id: COHORT_ID,
      display_name: TEST_NAME,
      status: "active",
      promoted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (stuErr) {
    console.error("[2] students INSERT 실패:", stuErr.message);
    process.exit(1);
  }
  studentId = newStudent.id;
  console.log(`[2] students 신규 INSERT — id=${studentId}`);
}

// 3. Supabase Auth user — 멱등 (listUsers 로 검색)
const { data: usersList } = await sb.auth.admin.listUsers({ page: 1, perPage: 100 });
let authUserId;
const existingAuth = usersList.users.find((u) => (u.email ?? "").toLowerCase() === TEST_EMAIL);
if (existingAuth) {
  console.log(`[3] Supabase Auth: 이미 존재 — id=${existingAuth.id}`);
  authUserId = existingAuth.id;
} else {
  const { data: newAuth, error: authErr } = await sb.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEMP_PASSWORD,
    email_confirm: true,
  });
  if (authErr) {
    console.error("[3] Auth createUser 실패:", authErr.message);
    process.exit(1);
  }
  authUserId = newAuth.user.id;
  console.log(`[3] Supabase Auth 신규 — id=${authUserId}`);
  console.log(`    초기 PW: ${TEMP_PASSWORD} (첫 로그인 후 변경 강제)`);
}

// 4. user_profiles row — 멱등 upsert
const { error: profErr } = await sb
  .from("user_profiles")
  .upsert({
    id: authUserId,
    email: TEST_EMAIL,
    display_name: TEST_NAME,
    role: "student",
    student_id: studentId,
    is_super_admin: false,
    must_change_password: true,
  }, { onConflict: "id" });
if (profErr) {
  console.error("[4] user_profiles upsert 실패:", profErr.message);
  process.exit(1);
}
console.log(`[4] user_profiles upsert OK — student_id 연결`);

// 5. cohort_memberships row — 멱등
const { data: existingCm } = await sb
  .from("cohort_memberships")
  .select("user_id")
  .eq("user_id", authUserId)
  .eq("cohort_id", COHORT_ID)
  .maybeSingle();

if (existingCm) {
  console.log(`[5] cohort_memberships: 이미 존재`);
} else {
  const { error: cmErr } = await sb
    .from("cohort_memberships")
    .insert({
      user_id: authUserId,
      cohort_id: COHORT_ID,
      role: "student",
    });
  if (cmErr) {
    console.error("[5] cohort_memberships INSERT 실패:", cmErr.message);
    process.exit(1);
  }
  console.log(`[5] cohort_memberships 신규 INSERT (role=student)`);
}

console.log(`
=== ✓ 테스트 학생 셋업 완료 ===

이메일:       ${TEST_EMAIL}
이름:         ${TEST_NAME}
초기 PW:      ${TEMP_PASSWORD}
applicant_id: ${applicantId}
student_id:   ${studentId}
auth user id: ${authUserId}
cohort:       1기 (${COHORT_SLUG})

로그인 URL:   https://growthcareer.xyz/ko/auth/login
첫 로그인 시 PW 변경 강제 (must_change_password=true)
변경 후 학생 본인 surface: https://growthcareer.xyz/ko/fan-to-pro/${COHORT_SLUG}/student/profile

⚠ 노아 본인 super_admin 계정 (hello@dropdown.xyz) 과 cookie 충돌 위험.
   incognito (시크릿) 모드 또는 다른 브라우저에서 테스트 권장.
`);
