/**
 * backfill-student-name-en.mjs — 2026-07-11 (노아 지시).
 *
 * 학생 원본 이름 = applicants.name (입금 시 적은 공식 이름) → students.display_name → 자동으로 student_profile.name_en 에 populate.
 *
 * 로직:
 *   - display_name 이 영문 (Latin) → student_profile.name_en 채움
 *   - display_name 이 한글 → student_profile.name_ko 채움 (기존 name_ko 없을 때만)
 *   - 이미 name_en / name_ko 있으면 override 안 함 (안전)
 *
 * 실행:
 *   node tools/backfill-student-name-en.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 한글 문자 포함 여부
function containsKorean(str) {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(str);
}

// Latin (영문) 만인지
function isLatinOnly(str) {
  return /^[A-Za-z\s.'\-]+$/.test(str.trim());
}

async function main() {
  console.log("Fetching students + applicants...");
  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, applicant_id, display_name");
  if (sErr) throw sErr;
  console.log(`Found ${students?.length ?? 0} students`);

  const applicantIds = students.map((s) => s.applicant_id).filter(Boolean);
  const { data: applicants, error: aErr } = await supabase
    .from("applicants")
    .select("id, name")
    .in("id", applicantIds);
  if (aErr) throw aErr;
  const applicantMap = new Map(applicants.map((a) => [a.id, a.name]));

  const { data: profiles, error: pErr } = await supabase
    .from("student_profile")
    .select("student_id, name_ko, name_en");
  if (pErr) throw pErr;
  const profileMap = new Map(profiles.map((p) => [p.student_id, p]));

  let enFilled = 0;
  let koFilled = 0;
  let skipped = 0;

  for (const student of students) {
    // 원본 이름 우선순위: applicants.name > students.display_name
    const originalName =
      applicantMap.get(student.applicant_id) || student.display_name;
    if (!originalName || !originalName.trim()) {
      skipped++;
      continue;
    }

    const existing = profileMap.get(student.id) ?? {
      student_id: student.id,
      name_ko: null,
      name_en: null,
    };

    const hasKorean = containsKorean(originalName);
    const isLatin = isLatinOnly(originalName);

    let patch = null;

    if (isLatin && !existing.name_en) {
      patch = { name_en: originalName.trim() };
      enFilled++;
      console.log(`  [EN] ${student.display_name} → name_en = "${originalName.trim()}"`);
    } else if (hasKorean && !existing.name_ko) {
      patch = { name_ko: originalName.trim() };
      koFilled++;
      console.log(`  [KO] ${student.display_name} → name_ko = "${originalName.trim()}"`);
    } else {
      skipped++;
      continue;
    }

    const { error: upErr } = await supabase
      .from("student_profile")
      .upsert(
        { student_id: student.id, ...patch },
        { onConflict: "student_id" },
      );
    if (upErr) {
      console.error(`  ! ${student.display_name} upsert 실패: ${upErr.message}`);
    }
  }

  console.log("\n=== 완료 ===");
  console.log(`  name_en 채움: ${enFilled}`);
  console.log(`  name_ko 채움: ${koFilled}`);
  console.log(`  skip (이미 있음 or 판정 불가): ${skipped}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
