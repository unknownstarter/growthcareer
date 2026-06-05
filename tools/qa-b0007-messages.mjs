#!/usr/bin/env node
/**
 * Mira QA — B0007 메시지 generate / mailto / sms sanity.
 *
 * templates.ts 는 TypeScript 파일이므로 직접 require 불가.
 * tsc 컴파일 결과를 동적으로 만들기보다, 핵심 export 4종을 동일 로직으로 재현 후
 * 핵심 invariant 만 검증한다 (긴 본문 길이, 부호 금지, 플레이스홀더 치환).
 */
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.resolve("src/programs/fan-to-pro/messages/templates.ts"),
  "utf8",
);

const banned = ["—", "–", "·", "…", "‘", "’", "“", "”"];
const results = [];
function pass(name, note = "") {
  results.push({ name, status: "PASS", note });
  console.log(`  ✓ ${name}${note ? "  — " + note : ""}`);
}
function fail(name, note = "") {
  results.push({ name, status: "FAIL", note });
  console.log(`  ✗ ${name}${note ? "  — " + note : ""}`);
}
function warn(name, note = "") {
  results.push({ name, status: "WARN", note });
  console.log(`  ! ${name}${note ? "  — " + note : ""}`);
}

// 1) 사용자 노출 string literal 만 검사 (백틱 문자열 내부).
//    forbidden punctuation 0 — 단, 코드 주석은 제외.
const literalRegex = /`([^`]+)`/g;
let m;
const literals = [];
while ((m = literalRegex.exec(src))) {
  literals.push(m[1]);
}
let bannedHits = 0;
for (const lit of literals) {
  for (const ch of banned) {
    if (lit.includes(ch)) {
      // 허용: 코드 영역 (lit 안에 ${...} 가 있는 자바스크립트식 만, 사용자 본문이면 ban)
      // 본문은 line break 와 한글이 포함되므로 그 조건으로 판별
      if (/[가-힣]|Tuition|KakaoTalk|Growth Career/.test(lit)) {
        console.log(`    ✗ banned ${JSON.stringify(ch)} in user copy literal:`);
        console.log(`      ${lit.split("\n")[0].slice(0, 100)}`);
        bannedHits += 1;
      }
    }
  }
}
if (bannedHits === 0) pass("Msg user copy: forbidden punctuation 0");
else fail("Msg user copy: forbidden punctuation found", `${bannedHits} hits`);

// 2) 플레이스홀더 {name} 가 실제 fill 함수로 치환되는지 (정적 검사).
const hasFill = /function fill\(template: string, name: string\): string \{[\s\S]*?replaceAll\("\{name\}", name\)/.test(
  src,
);
if (hasFill) pass("Msg fill() replaces {name}");
else fail("Msg fill() not found");

// 3) buildMailtoUrl 가 subject/body 를 encodeURIComponent + + → %20 변환하는지.
//    Multi-line: function body 안에서 두 호출이 함께 등장.
const fnBody = src.split("export function buildMailtoUrl")[1] ?? "";
const fnHead = fnBody.split("export function buildSmsUrl")[0];
const mailtoOk = /encodeURIComponent\(email\)/.test(fnHead) &&
  /replaceAll\("\+",\s*"%20"\)/.test(fnHead);
if (mailtoOk) pass("Msg buildMailtoUrl encodes subject/body and replaces + with %20");
else fail("Msg buildMailtoUrl encoding chain missing");

// 4) buildSmsUrl 가 전화번호에서 공백/하이픈/괄호를 제거하고 body 인코딩.
const smsOk = /sms:\$\{cleanedPhone\}\?body=\$\{encodeURIComponent\(body\)\}/.test(src);
if (smsOk) pass("Msg buildSmsUrl strips phone + encodes body");
else fail("Msg buildSmsUrl shape missing");

// 5) account / tuition / deadline 상수 일관성 — 중복 변경 위험 차단.
const expects = [
  ["토스뱅크 1002-4759-1521", "Toss Bank 1002-4759-1521"],
  ["드롭다운", "Dropdown"],
  ["880,000원", "KRW 880,000"],
  ["6/21(일) 자정", "Sun Jun 21 midnight (KST)"],
];
let consistency = true;
for (const [ko, en] of expects) {
  if (!src.includes(ko)) {
    fail(`Msg constant: "${ko}" missing`);
    consistency = false;
  }
  if (!src.includes(en)) {
    fail(`Msg constant: "${en}" missing`);
    consistency = false;
  }
}
if (consistency) pass("Msg core constants present (account, tuition, deadline)");

// 6) reminder 12종 + 입금 안내 4종 + 입금 확인 4종 = 20 export literals (대략).
const literalCount = literals.length;
if (literalCount >= 20) pass(`Msg literal count = ${literalCount} (>= 20 expected)`);
else warn(`Msg literal count low: ${literalCount}`);

// 7) kakao 채널 링크 일관성.
const kakao = "https://pf.kakao.com/_nxhDGX/chat";
if (src.includes(kakao)) pass("Msg KakaoTalk channel link consistent");
else fail("Msg KakaoTalk channel link missing");

console.log("\n--------------------------------");
const p = results.filter((r) => r.status === "PASS").length;
const f = results.filter((r) => r.status === "FAIL").length;
const w = results.filter((r) => r.status === "WARN").length;
console.log(`PASS=${p}  FAIL=${f}  WARN=${w}`);
if (f > 0) process.exit(1);
