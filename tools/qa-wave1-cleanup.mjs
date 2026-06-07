#!/usr/bin/env node
/**
 * B0018 Wave 1 - preview seed 잔여 row 일괄 정리.
 *
 * preview-broadcast.mjs 가 SIGINT / 에러로 빠지면 cleanup 이 실행되지 못해
 * `notes = '__preview_seed__'` row 가 누적됨. 본 스크립트는 그 row 를 식별해
 * 관련 messages_log + cash_receipts + applicants 를 삭제한다.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvLocal() {
  try {
    const text = fs.readFileSync(path.resolve(".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
  } catch {}
}
loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Supabase env 없음. NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요.");
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false } });

const MARKER = "__preview_seed__";

const { data: rows, error } = await client
  .from("applicants")
  .select("id, name, email, notes")
  .eq("notes", MARKER);

if (error) {
  console.error("SELECT 실패:", error.message);
  process.exit(1);
}

if (!rows || rows.length === 0) {
  console.log("정리할 seed row 0건.");
  process.exit(0);
}

const ids = rows.map((r) => r.id);
console.log(`발견 ${ids.length}건:`);
for (const r of rows) console.log(`  ${r.name} <${r.email}>`);

// 자식 테이블 삭제 (FK on delete restrict 이므로 순서 중요).
const tables = ["messages_log", "cash_receipts", "applicant_notes", "attendance", "performances", "certificates"];
for (const t of tables) {
  const { error: e } = await client.from(t).delete().in("applicant_id", ids);
  if (e) console.warn(`[cleanup] ${t}:`, e.message);
  else console.log(`[cleanup] ${t} 삭제 완료`);
}

const { error: aErr } = await client.from("applicants").delete().in("id", ids);
if (aErr) {
  console.error("applicants 삭제 실패:", aErr.message);
  process.exit(1);
}
console.log(`[cleanup] applicants ${ids.length}건 삭제 완료.`);
