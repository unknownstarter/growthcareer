#!/usr/bin/env node
/**
 * B0069 Slice 2a verify.
 * cohorts.showcase_slug + hero_stat + thumbnail_path + storage bucket 확인.
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
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("URL", url);

// 1. cohorts 신규 컬럼 select
console.log("\n[1/4] cohorts 신규 컬럼 select");
const { data: cohorts, error: cohortsErr } = await supabase
  .from("cohorts")
  .select("id, slug, showcase_slug, hero_stat, thumbnail_path, program_id, course_id, status")
  .limit(20);
if (cohortsErr) {
  console.error("  FAIL SELECT:", cohortsErr.message);
  process.exit(1);
}
console.log(`  OK. row 수: ${cohorts?.length ?? 0}`);
if (cohorts) {
  for (const c of cohorts) {
    console.log(`    - slug=${c.slug} showcase_slug=${c.showcase_slug ?? "(null)"} status=${c.status} course_id=${c.course_id ? c.course_id.substring(0, 8) : "(null)"}`);
  }
}

// 2. Backfill: fan-to-pro-1
console.log("\n[2/4] Backfill fan-to-pro-1");
const { data: backfilled, error: bfErr } = await supabase
  .from("cohorts")
  .select("id, slug, showcase_slug, hero_stat, status")
  .eq("showcase_slug", "fan-to-pro-1")
  .maybeSingle();
if (bfErr) {
  console.error("  FAIL:", bfErr.message);
} else if (!backfilled) {
  console.log("  MISS. showcase_slug='fan-to-pro-1' 인 row 없음.");
  const { data: courses } = await supabase.from("courses").select("id, slug, program_id").eq("slug", "fan-to-pro-1");
  console.log("  courses(fan-to-pro-1):", courses);
} else {
  console.log(`  OK. slug=${backfilled.slug} status=${backfilled.status}`);
  console.log("  hero_stat:", backfilled.hero_stat);
}

// 3. Reserved word CHECK
console.log("\n[3/4] Reserved word CHECK");
if (cohorts && cohorts.length > 0) {
  const testId = cohorts[0].id;
  const originalSlug = cohorts[0].showcase_slug;
  const { error: reservedErr } = await supabase
    .from("cohorts")
    .update({ showcase_slug: "admin" })
    .eq("id", testId);
  if (reservedErr && reservedErr.message.includes("cohorts_showcase_slug_not_reserved")) {
    console.log("  OK CHECK 작동. admin 거부됨");
  } else if (reservedErr) {
    console.log("  ? UPDATE 실패이지만 다른 이유:", reservedErr.message);
  } else {
    console.log("  FAIL CHECK 미작동. 롤백 중...");
    await supabase.from("cohorts").update({ showcase_slug: originalSlug }).eq("id", testId);
  }
}

// 4. Storage bucket
console.log("\n[4/4] cohort-thumbnails Storage bucket");
const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
if (bucketErr) {
  console.error("  FAIL:", bucketErr.message);
} else {
  const found = buckets?.find((b) => b.id === "cohort-thumbnails");
  if (!found) {
    console.log("  FAIL bucket 없음");
  } else {
    console.log(`  OK. public=${found.public} file_size_limit=${found.file_size_limit}`);
  }
}

console.log("\nDone");
