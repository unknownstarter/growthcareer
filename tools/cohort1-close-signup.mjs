#!/usr/bin/env node
// 1기 모집 마감 + 강의 시작 반영. 1회용 운영 script.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const COHORT_ID = "6fbeec9c-5a58-4cff-861d-4979710abc9e"; // 1기

console.log("BEFORE:");
const before = await sb.from("cohorts").select("id, name, status, accepts_signup_now").eq("id", COHORT_ID).single();
console.log(" ", before.data);

const { data, error } = await sb
  .from("cohorts")
  .update({
    accepts_signup_now: false,
    status: "in_progress",
    updated_at: new Date().toISOString(),
  })
  .eq("id", COHORT_ID)
  .select()
  .single();

if (error) {
  console.error("UPDATE FAIL", error);
  process.exit(1);
}

console.log("\nAFTER:");
console.log(" ", { id: data.id, name: data.name, status: data.status, accepts_signup_now: data.accepts_signup_now });
console.log("\n✓ 1기 모집 마감 + 강의 시작 반영 완료.");
