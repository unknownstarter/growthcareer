#!/usr/bin/env node
/**
 * Mira QA — /admin/applicants Basic Auth gate sanity (B0007 §7 + Sage T12 surface).
 *
 * 검증:
 *  - 자격 없음 → 401 + WWW-Authenticate basic + noindex 헤더
 *  - 잘못된 자격 → 401
 *  - 올바른 자격 → 200 + Cache-Control no-store + X-Robots-Tag noindex
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4328);
const DEFAULT_BASE = process.env.PREVIEW_BASE_URL ?? `http://localhost:${SPAWN_PORT}`;

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
const USER = process.env.ADMIN_BASIC_AUTH_USER;
const PASS = process.env.ADMIN_BASIC_AUTH_PASS;
if (!USER || !PASS) {
  console.error("missing ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASS");
  process.exit(1);
}

const results = [];
const pass = (n, note = "") => (console.log(`  ✓ ${n}${note ? " — " + note : ""}`), results.push({ n, s: "PASS" }));
const fail = (n, note = "") => (console.log(`  ✗ ${n}${note ? " — " + note : ""}`), results.push({ n, s: "FAIL", note }));

async function reachable(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return r.status < 500 || r.status === 401 || r.status === 503;
  } catch {
    return false;
  }
}
async function waitFor(url, ms = 60_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await reachable(url)) return;
    await sleep(400);
  }
  throw new Error(`server not ready`);
}
async function ensure() {
  if (await reachable(`${DEFAULT_BASE}/admin/applicants`)) return null;
  const proc = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(SPAWN_PORT)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitFor(`${DEFAULT_BASE}/admin/applicants`);
  return proc;
}

async function main() {
  console.log("Mira QA — /admin/applicants Basic Auth gate\n--------------------------------");
  const proc = await ensure();
  const cleanup = () => proc && proc.kill("SIGTERM");
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  try {
    // No creds
    const r1 = await fetch(`${DEFAULT_BASE}/admin/applicants`);
    if (r1.status !== 401) fail("자격 없음 → 401", `got ${r1.status}`);
    else pass("자격 없음 → 401");
    const wwwAuth = r1.headers.get("www-authenticate") ?? "";
    if (/^Basic /i.test(wwwAuth)) pass("WWW-Authenticate: Basic 헤더");
    else fail("WWW-Authenticate basic", wwwAuth);
    if (r1.headers.get("x-robots-tag")?.includes("noindex"))
      pass("X-Robots-Tag noindex on 401");
    else fail("X-Robots-Tag noindex missing on 401");
    if (r1.headers.get("cache-control")?.includes("no-store"))
      pass("Cache-Control no-store on 401");
    else fail("Cache-Control no-store missing on 401");

    // Wrong creds
    const wrong = Buffer.from(`${USER}:wrong-${Date.now()}`).toString("base64");
    const r2 = await fetch(`${DEFAULT_BASE}/admin/applicants`, {
      headers: { authorization: `Basic ${wrong}` },
    });
    if (r2.status !== 401) fail("잘못된 자격 → 401", `got ${r2.status}`);
    else pass("잘못된 자격 → 401");

    // Right creds
    const ok = Buffer.from(`${USER}:${PASS}`).toString("base64");
    const r3 = await fetch(`${DEFAULT_BASE}/admin/applicants`, {
      headers: { authorization: `Basic ${ok}` },
    });
    if (r3.status !== 200) fail("올바른 자격 → 200", `got ${r3.status}`);
    else pass("올바른 자격 → 200");
    if (r3.headers.get("x-robots-tag")?.includes("noindex"))
      pass("X-Robots-Tag noindex on 200");
    else fail("X-Robots-Tag noindex missing on 200");
    const cc200 = r3.headers.get("cache-control") ?? "";
    if (cc200.includes("no-store"))
      pass("Cache-Control no-store on 200");
    else fail("Cache-Control no-store missing on 200", `got: "${cc200}"`);

    // /admin (parent) — should also be gated
    const r4 = await fetch(`${DEFAULT_BASE}/admin`);
    if (r4.status === 401) pass("/admin 부모 경로도 401 (자격 없음)");
    else fail("/admin parent 401", `got ${r4.status}`);
  } finally {
    cleanup();
  }
  const f = results.filter((r) => r.s === "FAIL").length;
  console.log("\n--------------------------------");
  console.log(`PASS=${results.filter((r) => r.s === "PASS").length}  FAIL=${f}`);
  if (f > 0) process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(99);
});
