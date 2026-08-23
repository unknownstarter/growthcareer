#!/usr/bin/env node
/**
 * 분석 이벤트 집계 — "지금 몇 명이 들어오는지" 를 한눈에.
 * analytics_events 테이블에서 퍼널/채널/일자별 카운트를 출력.
 *
 * 사용: node tools/analytics-summary.mjs [최근일수(기본 7)]
 * 전제: 20260823000000_analytics_events.sql 마이그레이션이 prod 에 적용돼 있어야 함.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } },
);

const days = Number(process.argv[2] || 7);
const sinceMs = Date.now() - days * 86400_000;
const since = new Date(sinceMs).toISOString();

const { data, error } = await sb
  .from("analytics_events")
  .select("event_name, session_id, utm_source, scroll_depth, created_at")
  .gte("created_at", since)
  .order("created_at", { ascending: true });

if (error) {
  console.error("조회 실패:", error.message);
  if (/does not exist|relation/.test(error.message))
    console.error("→ 마이그레이션(analytics_events) 이 아직 prod 에 적용 안 됨.");
  process.exit(1);
}

const rows = data || [];
const uniq = (arr) => new Set(arr.filter(Boolean)).size;
const evName = (n) => rows.filter((r) => r.event_name === n);
const sessionsOf = (n) => uniq(evName(n).map((r) => r.session_id));

const views = evName("view_recruit_2gi");
const viewSessions = sessionsOf("view_recruit_2gi");
const startSessions = sessionsOf("start_apply");
const doneSessions = sessionsOf("completed_apply");

console.log(`\n===== 분석 요약 (최근 ${days}일, ${rows.length} 이벤트) =====\n`);
console.log("퍼널 (고유 세션 기준):");
console.log(`  방문(view)      ${viewSessions}`);
console.log(`  신청시작(start) ${startSessions}  (${pct(startSessions, viewSessions)})`);
console.log(`  신청완료(done)  ${doneSessions}  (${pct(doneSessions, viewSessions)} of 방문 / ${pct(doneSessions, startSessions)} of 시작)`);

console.log("\n채널별 방문(utm_source):");
const bySrc = {};
for (const v of views) { const s = v.utm_source || "(direct)"; bySrc[s] = bySrc[s] || new Set(); bySrc[s].add(v.session_id); }
for (const s of Object.keys(bySrc).sort((a, b) => bySrc[b].size - bySrc[a].size))
  console.log(`  ${s.padEnd(16)} ${bySrc[s].size}`);

console.log("\n스크롤 깊이 도달(방문 세션 대비):");
for (const d of [25, 50, 75, 100]) {
  const reached = uniq(rows.filter((r) => r.event_name === "scroll_recruit_2gi" && r.scroll_depth >= d).map((r) => r.session_id));
  console.log(`  ${d}%  ${reached}  (${pct(reached, viewSessions)})`);
}

console.log("\n일자별 방문 세션:");
const byDay = {};
for (const v of views) { const d = v.created_at.slice(0, 10); byDay[d] = byDay[d] || new Set(); byDay[d].add(v.session_id); }
for (const d of Object.keys(byDay).sort()) console.log(`  ${d}  ${byDay[d].size}`);

console.log("");

function pct(a, b) {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}
