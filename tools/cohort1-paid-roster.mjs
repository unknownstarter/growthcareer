#!/usr/bin/env node
// paid 신청자 → MD 표 (docs/private/, gitignore). 1회용 운영 script.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await sb
  .from("applicants")
  .select("name, nationality, birthdate, visa, created_at")
  .eq("status", "paid")
  .is("redacted_at", null)
  .order("created_at", { ascending: true });

if (error) {
  console.error(error);
  process.exit(1);
}

const today = new Date("2026-06-27");
function ageFromBirth(bd) {
  if (!bd) return "-";
  const b = new Date(bd);
  let a = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) a--;
  return a;
}
function koreanAge(bd) {
  if (!bd) return "-";
  return today.getFullYear() - new Date(bd).getFullYear() + 1;
}

const header = `# Fan to Pro 1기 paid 명단 (10명)

> 생성: 2026-06-27 · script: \`tools/cohort1-paid-roster.mjs\` · gitignore (PII).
> ⚠️ \`gender\` 컬럼은 applicants 신청 폼에 없음 → 운영자 수동 입력 또는 학생 본인 입력 후 채워짐.

| # | 이름 | 국적 | 생년월일 | 만 나이 | 한국 나이 | 비자 | 성별 |
|---|---|---|---|---|---|---|---|
`;
const rows = data
  .map((a, i) => `| ${i + 1} | ${a.name} | ${a.nationality ?? "-"} | ${a.birthdate ?? "-"} | ${ageFromBirth(a.birthdate)} | ${koreanAge(a.birthdate)} | ${a.visa ?? "-"} | (미입력) |`)
  .join("\n");

const outDir = path.resolve("docs/private");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "cohort-1-paid-roster.md");
fs.writeFileSync(out, header + rows + "\n");

console.log(`✓ ${data.length}명 → ${out}`);
console.log("\n--- preview ---");
console.log(header + rows);
