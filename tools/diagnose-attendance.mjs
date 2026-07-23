#!/usr/bin/env node
/** 출석률 0% 진단 (읽기 전용). node tools/diagnose-attendance.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const cid = "6fbeec9c-5a58-4cff-861d-4979710abc9e"; // 1기

// 실제 컬럼 파악
const s = await sb.from("sessions").select("*").eq("cohort_id", cid).limit(20);
console.log("SESSIONS error:", s.error?.message || "none");
console.log("SESSIONS cols:", s.data?.[0] ? Object.keys(s.data[0]).join(", ") : "(no rows)");
const statusKey = s.data?.[0] && "status" in s.data[0] ? "status" : null;
const dist = {};
for (const r of s.data ?? []) dist[r.status ?? "(null)"] = (dist[r.status ?? "(null)"] ?? 0) + 1;
console.log("SESSIONS status 분포:", JSON.stringify(dist), "| total fetched:", s.data?.length);
console.log("SESSION sample:", JSON.stringify(s.data?.[0], null, 1));

const a = await sb.from("attendance").select("*").limit(3);
console.log("\nATTENDANCE error:", a.error?.message || "none");
console.log("ATTENDANCE cols:", a.data?.[0] ? Object.keys(a.data[0]).join(", ") : "(no rows)");
const ac = await sb.from("attendance").select("id", { count: "exact", head: true });
console.log("ATTENDANCE total rows (전체 cohort):", ac.count, ac.error?.message || "");

// 이 cohort session 들에 붙은 attendance
const sessIds = (s.data ?? []).map((r) => r.id);
if (sessIds.length) {
  const at = await sb.from("attendance").select("student_id,session_id,status").in("session_id", sessIds);
  console.log("이 cohort attendance 행:", at.data?.length, at.error?.message || "");
  const ad = {};
  for (const r of at.data ?? []) ad[r.status] = (ad[r.status] ?? 0) + 1;
  console.log("이 cohort attendance status 분포:", JSON.stringify(ad));
}
console.log("\n[done]");

// === 새 로직(hasSessionElapsed) 시뮬레이션 검증 ===
console.log("\n=== FIX 검증: elapsed 기준 출석률 재계산 ===");
{
  const now = Date.now();
  const elapsed = (s) => s.status !== "cancelled" && (s.status === "ended" || new Date(s.ends_at).getTime() < now);
  const elapsedIds = new Set((s.data ?? []).filter(elapsed).map((r) => r.id));
  console.log(`elapsed 회차 수: ${elapsedIds.size} / ${s.data?.length}`);
  const at2 = await sb.from("attendance").select("student_id,session_id,status").in("session_id", (s.data ?? []).map((r) => r.id));
  const st2 = await sb.from("students").select("id,display_name,status").eq("cohort_id", cid);
  for (const st of st2.data ?? []) {
    const rows = (at2.data ?? []).filter((a) => a.student_id === st.id);
    const attended = rows.filter((a) => elapsedIds.has(a.session_id) && (a.status === "present" || a.status === "late")).length;
    const rate = elapsedIds.size ? Math.round((attended / elapsedIds.size) * 100) : null;
    console.log(`  ${st.display_name} | attended=${attended}/${elapsedIds.size} | NEW rate=${rate}% | student.status=${st.status}`);
  }
}
