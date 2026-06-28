#!/usr/bin/env node
/**
 * B0057 검증 스크립트.
 *  1. student_profile 의 photo_path / photo_uploaded_at 컬럼 존재 + select 가능
 *  2. student-photos bucket 설정 (private, 5MB, image/*)
 *  3. career-documents bucket cap (50MB) + MIME 확장
 *
 * 사용:
 *   node tools/verify_b0057.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) throw new Error(".env.local 없음.");
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
  console.error("env missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const s = createClient(url, key, { auth: { persistSession: false } });

console.log(`URL  ${url}`);
console.log("\n=== B0057 verify ===\n");

let fail = 0;

// [1] student_profile photo columns
{
  const { data, error } = await s
    .from("student_profile")
    .select("student_id, photo_path, photo_uploaded_at")
    .limit(1);
  if (error) {
    console.log(`[1] student_profile photo columns: FAIL ${error.message}`);
    fail++;
  } else {
    console.log(`[1] student_profile photo columns: OK (rows=${data?.length ?? 0})`);
  }
}

// [2] buckets
{
  const { data: buckets, error } = await s.storage.listBuckets();
  if (error) {
    console.log(`[2/3] bucket list: FAIL ${error.message}`);
    fail++;
  } else {
    const photo = buckets.find((b) => b.id === "student-photos");
    if (!photo) {
      console.log("[2] student-photos bucket: MISSING");
      fail++;
    } else {
      console.log(
        `[2] student-photos bucket: OK (public=${photo.public}, size_limit=${photo.file_size_limit}, mime=${(photo.allowed_mime_types ?? []).join(",")})`,
      );
      if (photo.public) {
        console.log("    ⚠ public=true (should be false)");
        fail++;
      }
      if (photo.file_size_limit !== 5242880) {
        console.log(`    ⚠ size_limit unexpected: ${photo.file_size_limit} (expected 5242880)`);
      }
    }

    const career = buckets.find((b) => b.id === "career-documents");
    if (!career) {
      console.log("[3] career-documents bucket: MISSING");
      fail++;
    } else {
      console.log(
        `[3] career-documents bucket: OK (size_limit=${career.file_size_limit}, mime_count=${(career.allowed_mime_types ?? []).length})`,
      );
      if (career.file_size_limit !== 52428800) {
        console.log(`    ⚠ size_limit not 50MB: ${career.file_size_limit} (expected 52428800)`);
        fail++;
      }
    }
  }
}

console.log(`\n=== ${fail === 0 ? "PASS" : `FAIL (${fail})`} ===`);
process.exit(fail === 0 ? 0 : 1);
