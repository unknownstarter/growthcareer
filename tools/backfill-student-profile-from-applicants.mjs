#!/usr/bin/env node
/**
 * B0052 backfill: applicants.birthdate → student_profile.birth_date (+ birth_year).
 *
 * 1회용. paid 학생 (또는 모든 학생) 의 applicants.birthdate 를 student_profile 에 채움.
 *
 * 동작:
 *   1) students 테이블에서 applicant_id 있는 모든 row 조회
 *   2) 각 student.applicant_id → applicants.birthdate 조회
 *   3) student_profile upsert (birth_date + birth_year 채움)
 *   4) gender / months_in_korea 는 그대로 (수동 입력 대기)
 *
 * 보호:
 *   - 기존 student_profile 의 birth_date 가 이미 있으면 skip (덮어쓰기 X)
 *   - applicants.birthdate 없으면 skip
 *   - dry-run 옵션 (--dry) 으로 미리 검증
 *
 * PII 로그 마스킹:
 *   - 이름: 첫 글자 + ** (예: 류** / J***)
 *   - birth_date: 연도만 표시 (예: 1998-**-**)
 *
 * 실행:
 *   node tools/backfill-student-profile-from-applicants.mjs --dry
 *   node tools/backfill-student-profile-from-applicants.mjs
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const isDry = process.argv.includes("--dry");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function maskName(name) {
  if (!name) return "(none)";
  const trimmed = String(name).trim();
  if (trimmed.length === 0) return "(empty)";
  return trimmed.slice(0, 1) + "**";
}
function maskBirth(bd) {
  if (!bd) return "-";
  const m = /^(\d{4})-/.exec(String(bd));
  return m ? `${m[1]}-**-**` : "****";
}

const { data: students, error: sErr } = await sb
  .from("students")
  .select("id, applicant_id")
  .not("applicant_id", "is", null);

if (sErr) {
  console.error("students fetch failed:", sErr);
  process.exit(1);
}

console.log(`[backfill] ${students.length}명의 student 조회됨${isDry ? " (DRY-RUN)" : ""}`);

let filled = 0;
let skippedAlreadyFilled = 0;
let skippedNoBirthdate = 0;
let failed = 0;

for (const student of students) {
  // 1) 기존 profile 의 birth_date 확인
  const { data: existingProfile, error: pErr } = await sb
    .from("student_profile")
    .select("birth_date, birth_year")
    .eq("student_id", student.id)
    .maybeSingle();

  if (pErr) {
    console.error(`  [fail] student ${student.id}: profile fetch error`, pErr.message);
    failed += 1;
    continue;
  }

  if (existingProfile?.birth_date) {
    skippedAlreadyFilled += 1;
    continue;
  }

  // 2) applicants.birthdate 조회
  const { data: applicant, error: aErr } = await sb
    .from("applicants")
    .select("name, birthdate")
    .eq("id", student.applicant_id)
    .maybeSingle();

  if (aErr) {
    console.error(`  [fail] applicant ${student.applicant_id} fetch error`, aErr.message);
    failed += 1;
    continue;
  }

  if (!applicant?.birthdate) {
    skippedNoBirthdate += 1;
    console.log(
      `  [skip] ${maskName(applicant?.name)} — applicants.birthdate 없음`,
    );
    continue;
  }

  // 3) birth_year derive (YYYY-MM-DD → YYYY)
  const yearMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(String(applicant.birthdate));
  const birthYear = yearMatch ? Number(yearMatch[1]) : null;

  console.log(
    `  [fill] ${maskName(applicant.name)} ← birth_date=${maskBirth(applicant.birthdate)}${birthYear ? ` (year ${birthYear})` : ""}`,
  );

  if (isDry) {
    filled += 1;
    continue;
  }

  // 4) upsert — birth_date + birth_year 둘 다 채움. 기존 다른 컬럼은 건드리지 않음.
  //    Supabase upsert 는 미지정 컬럼을 default 로 reset 하므로, 전체 row merge 후 upsert.
  const { data: full, error: fErr } = await sb
    .from("student_profile")
    .select("*")
    .eq("student_id", student.id)
    .maybeSingle();

  if (fErr) {
    console.error(`  [fail] full profile fetch error`, fErr.message);
    failed += 1;
    continue;
  }

  const merged = {
    ...(full ?? {}),
    student_id: student.id,
    birth_date: applicant.birthdate,
    birth_year: existingProfile?.birth_year ?? birthYear,
  };

  const { error: uErr } = await sb
    .from("student_profile")
    .upsert(merged, { onConflict: "student_id" });

  if (uErr) {
    console.error(`  [fail] upsert error`, uErr.message);
    failed += 1;
    continue;
  }

  filled += 1;
}

console.log("\n--- 결과 ---");
console.log(`  채움          : ${filled}명`);
console.log(`  skip (이미 채워짐) : ${skippedAlreadyFilled}명`);
console.log(`  skip (birthdate 없음) : ${skippedNoBirthdate}명`);
console.log(`  실패          : ${failed}명`);
if (isDry) {
  console.log("\n(DRY-RUN — 실제 변경 없음. --dry 제거 후 실행)");
}
