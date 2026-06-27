#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(path.resolve(".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log("\n=== auth.users ===");
const { data: users, error: e1 } = await sb.auth.admin.listUsers();
if (e1) console.log("ERROR", e1);
else
  for (const u of users.users) {
    console.log(`  ${u.id}  ${u.email}  confirmed=${!!u.email_confirmed_at}  last_sign_in=${u.last_sign_in_at ?? "never"}`);
  }

console.log("\n=== user_profiles ===");
const { data: profs, error: e2 } = await sb
  .from("user_profiles")
  .select("id, email, display_name, is_super_admin, must_change_password, role, company_id, student_id, instructor_id");
if (e2) console.log("ERROR", e2);
else for (const p of profs) console.log("  ", p);

console.log("\n=== program_memberships ===");
const { data: pm, error: e3 } = await sb.from("program_memberships").select("*");
if (e3) console.log("ERROR", e3);
else for (const m of pm) console.log("  ", m);

console.log("\n=== cohort_memberships ===");
const { data: cm, error: e4 } = await sb.from("cohort_memberships").select("*");
if (e4) console.log("ERROR", e4);
else for (const m of cm) console.log("  ", m);

console.log("\n=== cohorts ===");
const { data: cohorts, error: e5 } = await sb.from("cohorts").select("id, slug, name, status, starts_on, ends_on, accepts_signup_now");
if (e5) console.log("ERROR", e5);
else for (const c of cohorts) console.log("  ", c);

console.log("\n=== programs ===");
const { data: progs, error: e6 } = await sb.from("programs").select("*");
if (e6) console.log("ERROR", e6);
else for (const p of progs) console.log("  ", p);

console.log("\n=== students count ===");
const { count: studentCount, error: e7 } = await sb.from("students").select("*", { count: "exact", head: true });
if (e7) console.log("ERROR", e7);
else console.log("  students rows:", studentCount);

console.log("\n=== applicants count by status ===");
const { data: apps, error: e8 } = await sb.from("applicants").select("status");
if (e8) console.log("ERROR", e8);
else {
  const counts = {};
  for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;
  console.log("  ", counts, "TOTAL =", apps.length);
}
