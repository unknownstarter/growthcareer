#!/usr/bin/env node
// B0018 Wave 1 unit-level QA (pure functions, no DB).
//   T2: RecordCashReceiptSchema edge cases (음수, 0, 백데이트, 60자, etc.)
//   T4: buildBroadcastMailtoUrl + BroadcastSendSchema (CRLF, encoding, limits)
//
// 실행: pnpm exec tsx tools/qa-wave1-unit.mjs   (or: node --import tsx tools/qa-wave1-unit.mjs)

import {
  buildBroadcastMailtoUrl,
  BROADCAST_LIMITS,
} from "../src/programs/fan-to-pro/messages/templates.ts";
import {
  RecordCashReceiptSchema,
  BroadcastSendSchema,
} from "../src/programs/fan-to-pro/domain/application.ts";

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
  }
}
function eq(a, b, msg) {
  if (a !== b)
    throw new Error(
      `${msg ?? "expected equal"}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`,
    );
}
function truthy(v, msg) {
  if (!v) throw new Error(msg ?? "expected truthy");
}

const FAKE_UUID = "11111111-2222-3333-4444-555555555555";

// ============ T2: RecordCashReceiptSchema ============

check("T2.5 negative amount rejected", () => {
  const r = RecordCashReceiptSchema.safeParse({ id: FAKE_UUID, amountKrw: -1 });
  truthy(!r.success, "negative should fail");
});
check("T2.5b zero amount rejected", () => {
  const r = RecordCashReceiptSchema.safeParse({ id: FAKE_UUID, amountKrw: 0 });
  truthy(!r.success);
});
check("T2.5c float amount rejected", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 100.5,
  });
  truthy(!r.success);
});
check("T2.5d 10M+ amount rejected", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 10_000_001,
  });
  truthy(!r.success);
});
check("T2.4 empty hometax no coerces undefined", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 880_000,
    hometaxReceiptNo: "",
  });
  truthy(r.success);
  eq(r.data.hometaxReceiptNo, undefined);
});
check("T2.4b 61 char hometax rejected", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 880_000,
    hometaxReceiptNo: "x".repeat(61),
  });
  truthy(!r.success);
});
check("T2.2 backdate YYYY-MM-DD accepted", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 880_000,
    issuedAt: "2024-01-15",
  });
  truthy(r.success);
});
check("T2.2b YYYY/MM/DD rejected", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 880_000,
    issuedAt: "2024/01/15",
  });
  truthy(!r.success);
});
check("T2.1 happy path 880000", () => {
  const r = RecordCashReceiptSchema.safeParse({
    id: FAKE_UUID,
    amountKrw: 880_000,
  });
  truthy(r.success);
});

// ============ T4: buildBroadcastMailtoUrl ============

check("T4.5 mailto:?bcc= form (no TO)", () => {
  const url = buildBroadcastMailtoUrl(
    ["a@x.com", "b@x.com"],
    "안녕하세요",
    "본문",
  );
  truthy(url.startsWith("mailto:?"));
  truthy(url.includes("bcc=a%40x.com%2Cb%40x.com"));
  truthy(
    url.includes("subject=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94"),
  );
  truthy(!url.includes("&to=") && !url.includes("?to="));
});
check("T4.5b CRLF subject -> %0D%0A encoded literal (no raw)", () => {
  const url = buildBroadcastMailtoUrl(
    ["a@x.com"],
    "hi\r\nBcc: evil@x.com",
    "body",
  );
  truthy(url.includes("%0D%0A") || url.includes("%0A"));
  truthy(!url.includes("\r"));
  truthy(!url.includes("\n"));
});
check("T4.5c spaces encoded as %20 (Apple Mail compat, no +)", () => {
  const url = buildBroadcastMailtoUrl(["a@x.com"], "hello world", "body");
  truthy(url.includes("%20"));
  truthy(!/[?&]subject=hello\+world/.test(url));
});
check("T4 limits constant", () => {
  eq(BROADCAST_LIMITS.safe, 50);
  eq(BROADCAST_LIMITS.warn, 100);
});

// ============ T4: BroadcastSendSchema ============

check("T4 whitespace subject rejected (trim+min1)", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [FAKE_UUID],
    channel: "email",
    subject: "   ",
    body: "ok",
  });
  truthy(!r.success);
});
check("T4 empty body rejected", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [FAKE_UUID],
    channel: "email",
    subject: "ok",
    body: "",
  });
  truthy(!r.success);
});
check("T4 101 ids rejected", () => {
  const ids = Array.from(
    { length: 101 },
    (_, i) => `11111111-2222-3333-4444-${String(i).padStart(12, "0")}`,
  );
  const r = BroadcastSendSchema.safeParse({
    applicantIds: ids,
    channel: "email",
    subject: "ok",
    body: "ok",
  });
  truthy(!r.success);
});
check("T4 0 ids rejected", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [],
    channel: "email",
    subject: "ok",
    body: "ok",
  });
  truthy(!r.success);
});
check("T4 non-UUID id rejected", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: ["not-uuid"],
    channel: "email",
    subject: "ok",
    body: "ok",
  });
  truthy(!r.success);
});
check("T4 channel must be 'email'", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [FAKE_UUID],
    channel: "kakao_channel",
    subject: "ok",
    body: "ok",
  });
  truthy(!r.success);
});
check("T4 subject 201 chars rejected", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [FAKE_UUID],
    channel: "email",
    subject: "x".repeat(201),
    body: "ok",
  });
  truthy(!r.success);
});
check("T4 body 5001 chars rejected", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [FAKE_UUID],
    channel: "email",
    subject: "ok",
    body: "x".repeat(5001),
  });
  truthy(!r.success);
});
check("T4 happy path full", () => {
  const r = BroadcastSendSchema.safeParse({
    applicantIds: [FAKE_UUID],
    channel: "email",
    subject: "[Growth Career] 안녕",
    body: "본문\n줄바꿈\n포함",
  });
  truthy(r.success);
});

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log("\n=== B0018 Wave 1 unit QA ===");
for (const r of results) {
  console.log(
    `  ${r.ok ? "PASS" : "FAIL"} ${r.name}${r.err ? " :: " + r.err : ""}`,
  );
}
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
