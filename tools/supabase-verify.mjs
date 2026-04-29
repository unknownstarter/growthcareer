#!/usr/bin/env node
/**
 * Supabase 검증 스크립트.
 *  1. .env.local 의 service_role 로 connect
 *  2. applicants 테이블 존재 여부 확인
 *  3. 더미 row INSERT → SELECT → DELETE
 *  4. RLS 가 anon 키를 차단하는지 확인
 *
 * 사용:
 *   node tools/supabase-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) {
    throw new Error(".env.local 이 없습니다. 먼저 생성하세요.");
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

function log(label, value) {
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";
  console.log(`${label}  ${dim}${value}${reset}`);
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    console.error("✗ .env.local 키 누락");
    process.exit(1);
  }
  log("URL", url);

  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sbAnon = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Step 1: 테이블 존재 확인 (HEAD count)
  console.log("\n[1/4] applicants 테이블 존재 확인");
  const head = await sb
    .from("applicants")
    .select("*", { count: "exact", head: true });
  if (head.error) {
    console.error("  ✗ 테이블 접근 실패:", head.error.message);
    console.error("\n  → Dashboard SQL 에디터에 마이그레이션을 먼저 적용하세요:");
    console.error(
      `    https://supabase.com/dashboard/project/rykqzenbjcggzrruryeq/sql/new`,
    );
    console.error(
      `    파일: supabase/migrations/20260429000000_applicants.sql`,
    );
    process.exit(2);
  }
  console.log(`  ✓ 테이블 존재. 현재 row 수: ${head.count}`);

  // Step 2: 더미 INSERT (service_role)
  console.log("\n[2/4] service_role 더미 INSERT");
  const dummy = {
    name: "VERIFY_TEST",
    email: `verify+${Date.now()}@example.com`,
    phone: "010-0000-0000",
    birthdate: "2000-01-01",
    university: "Test University",
    visa: "D-2",
    address: "서울시 마포구",
    consent: true,
    source: "verify-script",
  };
  const ins = await sb.from("applicants").insert(dummy).select("id").single();
  if (ins.error) {
    console.error("  ✗ INSERT 실패:", ins.error.message);
    process.exit(3);
  }
  console.log("  ✓ INSERT 성공. id:", ins.data.id);

  // Step 3: anon 키로 SELECT 시도 → RLS 차단 확인
  console.log("\n[3/4] anon 키로 SELECT 시도 (RLS 차단 확인)");
  const anonRead = await sbAnon
    .from("applicants")
    .select("id")
    .eq("id", ins.data.id);
  if (anonRead.error) {
    console.log("  ✓ anon SELECT 거부됨:", anonRead.error.message);
  } else if (!anonRead.data || anonRead.data.length === 0) {
    console.log("  ✓ anon SELECT 빈 배열 (RLS 정책 없음 → 차단됨)");
  } else {
    console.error("  ✗ 위험: anon 이 row 를 읽음:", anonRead.data);
    process.exit(4);
  }

  // Step 4: cleanup
  console.log("\n[4/4] 더미 row 삭제");
  const del = await sb.from("applicants").delete().eq("id", ins.data.id);
  if (del.error) {
    console.error("  ✗ DELETE 실패:", del.error.message);
    process.exit(5);
  }
  console.log("  ✓ DELETE 성공");

  console.log(
    "\n✓ Supabase 검증 통과. applicants 테이블 + RLS + service_role 인서트 모두 정상.",
  );
}

main().catch((err) => {
  console.error("✗ 예외:", err.message);
  process.exit(99);
});
