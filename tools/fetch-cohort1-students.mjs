#!/usr/bin/env node
/**
 * 1기 cohort 실 학생 명단 조회 (applicants.created_at ASC).
 * capture-cert-batch-10.mjs 에 실 이름 · seq 부여용.
 */
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

// 1기 cohort 조회
const { data: cohorts, error: cErr } = await supabase
  .from("cohorts")
  .select("id, name, slug, starts_on, ends_on")
  .ilike("name", "%1기%");
if (cErr) throw cErr;
console.log(`\n[cohorts]`, cohorts);

const cohort1 = cohorts?.[0];
if (!cohort1) {
  console.error("1기 cohort not found");
  process.exit(1);
}

// students 조회
const { data: students, error: sErr } = await supabase
  .from("students")
  .select("id, display_name, applicant_id, status, created_at")
  .eq("cohort_id", cohort1.id)
  .in("status", ["active", "completed"]);
if (sErr) throw sErr;
console.log(`\n[students ${students?.length}명]`);

// applicants join → created_at ASC 정렬
const rows = [];
for (const s of students ?? []) {
  const { data: app } = await supabase
    .from("applicants")
    .select("name, created_at")
    .eq("id", s.applicant_id)
    .maybeSingle();
  rows.push({
    applicant_created_at: app?.created_at ?? s.created_at,
    applicant_name: app?.name ?? s.display_name,
    student_display_name: s.display_name,
    student_id: s.id,
    student_status: s.status,
  });
}
rows.sort(
  (a, b) =>
    new Date(a.applicant_created_at).getTime() -
    new Date(b.applicant_created_at).getTime(),
);

console.log(`\n[신청등록순 학생 명단]`);
rows.forEach((r, i) => {
  const seq = String(i + 1).padStart(3, "0");
  console.log(
    `${seq} | ${r.applicant_created_at.slice(0, 10)} | ${r.student_status.padEnd(9)} | ${r.applicant_name} (display: ${r.student_display_name})`,
  );
});

console.log(`\n[JSON for capture-cert-batch.mjs]`);
console.log(
  JSON.stringify(
    rows.map((r, i) => ({
      seq: String(i + 1).padStart(3, "0"),
      name: r.student_display_name,
    })),
    null,
    2,
  ),
);
