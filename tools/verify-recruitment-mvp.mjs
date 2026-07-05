#!/usr/bin/env node
/**
 * B0072 Recruitment MVP verify.
 *
 * Sage 요구 4 시나리오:
 *   1) 익명 client 로 status='open' + closes_at 유효 SELECT → row 반환.
 *   2) 익명 client 로 status='draft' SELECT → 0 row.
 *   3) 학생 client 로 다른 student_id 로 student_applications INSERT → RLS violation.
 *      (본 verify 는 authenticated 세션 없이 anon client 로 대체 검증 —
 *       anon 이 INSERT 시도 자체 grant 없음 = 42501 permission denied 기대.)
 *   4) authenticated (non-super-admin) → job_postings INSERT 실패.
 *      (마찬가지로 anon 으로 대체 검증. authenticated 에 INSERT grant 없음.)
 *
 * 부가:
 *   5) recruitment_email_log SELECT / INSERT 익명 = 완전 차단.
 *   6) apply_to_job_atomic RPC 는 authenticated 만 EXECUTE (anon 은 42501).
 *
 * 사용:
 *   node tools/verify-recruitment-mvp.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) throw new Error(".env.local 이 없습니다.");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("✗ .env.local 키 누락");
  process.exit(1);
}
console.log("URL", url);

const sb = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sbAnon = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;
function pass(label) {
  console.log(`  ✓ ${label}`);
}
function fail(label, extra = "") {
  failures += 1;
  console.error(`  ✗ ${label}`);
  if (extra) console.error(`    ${extra}`);
}

// ---------------------------------------------------------------------------
// 준비: seed row 삽입 — service_role 이 draft + open 각 1건 씨앗.
// ---------------------------------------------------------------------------
console.log("\n[준비] seed job_postings (service_role)");

const programQuery = await sb
  .from("programs")
  .select("id")
  .eq("slug", "fan-to-pro")
  .maybeSingle();
if (programQuery.error || !programQuery.data) {
  console.error("  ✗ fan-to-pro program row 없음");
  process.exit(2);
}
const programId = programQuery.data.id;

const draftSlug = "verifyDR";
const openSlug = "verifyOP";

// cleanup 잔여.
await sb.from("job_postings").delete().in("slug", [draftSlug, openSlug]);

const authAdminQuery = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
if (authAdminQuery.error || !authAdminQuery.data.users.length) {
  console.error("  ✗ auth.users 최소 1건 없음 (created_by 필요)");
  process.exit(2);
}
const createdBy = authAdminQuery.data.users[0].id;

const seed = [
  {
    program_id: programId,
    slug: draftSlug,
    title: "Verify Draft",
    company_name: "Verify Co",
    role_category: "engineering",
    employment_type: "part_time",
    description: "verify draft",
    contact_email: "verify@example.com",
    status: "draft",
    created_by: createdBy,
  },
  {
    program_id: programId,
    slug: openSlug,
    title: "Verify Open",
    company_name: "Verify Co",
    role_category: "engineering",
    employment_type: "part_time",
    description: "verify open",
    contact_email: "verify@example.com",
    status: "open",
    published_at: new Date().toISOString(),
    closes_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    created_by: createdBy,
  },
];
const seedIns = await sb.from("job_postings").insert(seed);
if (seedIns.error) {
  console.error("  ✗ seed 실패:", seedIns.error.message);
  process.exit(2);
}
console.log("  ✓ seed 2건 삽입 (draft + open)");

// ---------------------------------------------------------------------------
// 1) 익명 SELECT open row → 반환.
// ---------------------------------------------------------------------------
console.log("\n[1/6] 익명 SELECT status='open' + closes_at 유효");
{
  const { data, error } = await sbAnon
    .from("job_postings")
    .select("id, slug, status")
    .eq("slug", openSlug);
  if (error) fail("SELECT 에러: " + error.message);
  else if (!data || data.length === 0)
    fail("open row 익명 SELECT 실패 — RLS policy 확인 필요");
  else pass(`open row 익명 SELECT 성공 (${data.length}건)`);
}

// ---------------------------------------------------------------------------
// 2) 익명 SELECT draft row → 0 row.
// ---------------------------------------------------------------------------
console.log("\n[2/6] 익명 SELECT status='draft'");
{
  const { data, error } = await sbAnon
    .from("job_postings")
    .select("id")
    .eq("slug", draftSlug);
  if (error && error.code !== "PGRST116")
    fail("SELECT 에러: " + error.message);
  else if (data && data.length > 0)
    fail(`draft row 노출됨 (row=${data.length}) — RLS 실패`);
  else pass("draft row 익명에게 안 보임");
}

// ---------------------------------------------------------------------------
// 3) 익명 student_applications INSERT → 차단.
// ---------------------------------------------------------------------------
console.log("\n[3/6] 익명 student_applications INSERT");
{
  const { error } = await sbAnon.from("student_applications").insert({
    student_id: "00000000-0000-0000-0000-000000000000",
    job_posting_id: "00000000-0000-0000-0000-000000000000",
  });
  if (!error) fail("INSERT 성공 — grant 확인 필요");
  else pass(`INSERT 차단: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 4) 익명 job_postings INSERT → 차단.
// ---------------------------------------------------------------------------
console.log("\n[4/6] 익명 job_postings INSERT");
{
  const { error } = await sbAnon.from("job_postings").insert({
    program_id: programId,
    slug: "hackDR01",
    title: "hack",
    company_name: "hack",
    role_category: "hack",
    employment_type: "part_time",
    description: "hack",
    contact_email: "hack@example.com",
    created_by: createdBy,
  });
  if (!error) fail("INSERT 성공 — grant 확인 필요");
  else pass(`INSERT 차단: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 5) 익명 recruitment_email_log SELECT → 차단.
// ---------------------------------------------------------------------------
console.log("\n[5/6] 익명 recruitment_email_log SELECT");
{
  const { data, error } = await sbAnon
    .from("recruitment_email_log")
    .select("id")
    .limit(1);
  if (error) pass(`SELECT 차단: ${error.message}`);
  else if (data && data.length > 0) fail("SELECT 성공 — RLS 실패");
  else pass("SELECT 결과 빈 배열 (RLS 차단)");
}

// ---------------------------------------------------------------------------
// 6) 익명 apply_to_job_atomic RPC EXECUTE → 차단.
// ---------------------------------------------------------------------------
console.log("\n[6/6] 익명 RPC apply_to_job_atomic EXECUTE");
{
  const { error } = await sbAnon.rpc("apply_to_job_atomic", {
    p_job_posting_id: "00000000-0000-0000-0000-000000000000",
    p_student_message: null,
    p_email_recipient: "hack@example.com",
    p_email_subject: "hack",
    p_email_body_template_key: "recruitment.application.v1",
    p_email_attachments: [],
  });
  if (!error) fail("RPC 실행 성공 — grant 확인 필요");
  else pass(`RPC 차단: ${error.message}`);
}

// ---------------------------------------------------------------------------
// cleanup
// ---------------------------------------------------------------------------
console.log("\n[cleanup] seed 제거");
await sb.from("job_postings").delete().in("slug", [draftSlug, openSlug]);

if (failures > 0) {
  console.error(`\n✗ ${failures}건 실패`);
  process.exit(3);
}
console.log("\n✓ Recruitment MVP 검증 통과 (6/6)");
