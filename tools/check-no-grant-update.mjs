#!/usr/bin/env node
/**
 * B0072 Recruitment MVP CI check.
 *
 * `student_applications` 에 대한 `GRANT UPDATE ... TO authenticated` 가
 * migration 파일에 절대 존재하지 않도록 방어. Sage 요구 (S-9b 방어선 유지) —
 * withdrawn 전이는 반드시 service_role server action 을 거쳐야 하며,
 * authenticated 클라이언트가 raw UPDATE 로 status 를 조작할 수 없어야 한다.
 *
 * 사용:
 *   node tools/check-no-grant-update.mjs
 *
 * 실패 조건:
 *   supabase/migrations/*.sql 안에 다음 패턴이 매치되면 실패:
 *     - `grant update ... on ... student_applications ... to ... authenticated`
 *     - `grant ..., update, ... on ... student_applications ... to ... authenticated`
 *     - `grant all ... on ... student_applications ... to ... authenticated`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

if (!fs.existsSync(migrationsDir)) {
  console.error("✗ supabase/migrations 디렉터리 없음:", migrationsDir);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let violations = 0;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, "utf8").toLowerCase();

  // GRANT statement 를 개별 statement 로 분리 (semicolon 기준).
  const statements = content.split(";");
  for (const rawStmt of statements) {
    const stmt = rawStmt.replace(/\s+/g, " ").trim();
    if (!stmt.startsWith("grant ")) continue;
    // student_applications 참조?
    if (!stmt.includes("student_applications")) continue;
    // authenticated 대상?
    if (!/\bto\b[^;]*\bauthenticated\b/.test(stmt)) continue;

    // UPDATE 또는 ALL 이면 위반.
    // grant select, insert on X to Y — OK
    // grant update on X to Y — FAIL
    // grant all on X to Y — FAIL
    // grant select, insert, update on X to Y — FAIL
    const privMatch = stmt.match(/^grant\s+([^\s].*?)\s+on\b/);
    if (!privMatch) continue;
    const privs = privMatch[1].split(",").map((p) => p.trim());
    for (const priv of privs) {
      if (priv === "update" || priv === "all" || priv === "all privileges") {
        violations += 1;
        console.error(
          `✗ ${file}: FORBIDDEN grant '${priv}' on student_applications to authenticated`,
        );
        console.error(`  statement: ${stmt.substring(0, 200)}`);
      }
    }
  }
}

if (violations > 0) {
  console.error(
    `\n✗ ${violations}건 위반. student_applications 는 authenticated 에게 UPDATE grant 를 주면 안 됩니다.`,
  );
  console.error(
    "   withdrawn 전이는 반드시 service_role server action 을 거쳐야 합니다 (S-9b 방어선).",
  );
  process.exit(2);
}

console.log(
  `✓ ${files.length} 파일 검사 완료. student_applications 에 UPDATE grant 위반 없음.`,
);
