#!/usr/bin/env node
/**
 * B0018 Wave 1 T4 - broadcast 모달 + 발송 이력 drawer 캡처.
 *
 * Admin Basic Auth 사용. 다음을 캡처:
 *   1) admin 페이지 (체크박스 + 다중 발송 버튼)
 *   2) 체크박스 일부 선택 후 헤더 카운트
 *   3) 다중 발송 모달
 *
 * 출력: docs/screenshots/broadcast/*.png
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.PREVIEW_BASE_URL ?? "http://localhost:4327";
const SPAWN_PORT = Number(process.env.PREVIEW_PORT ?? 4327);
const OUT_DIR = path.resolve("docs/screenshots/broadcast");

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
  console.error(
    "ADMIN_BASIC_AUTH_USER + ADMIN_BASIC_AUTH_PASS must be set in env.",
  );
  process.exit(1);
}

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

async function reachable(url, timeoutMs = 1500) {
  try {
    const res = await fetch(url, {
      headers: {
        authorization:
          "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64"),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.status < 500 && res.status !== 401;
  } catch {
    return false;
  }
}

async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await reachable(url, 2000)) return;
    await sleep(400);
  }
  throw new Error(`server at ${url} not ready in ${timeoutMs}ms`);
}

async function ensureServer() {
  if (await reachable(`${BASE_URL}/admin/applicants`)) {
    return { baseUrl: BASE_URL, spawned: null };
  }
  const baseUrl = `http://localhost:${SPAWN_PORT}`;
  // PREVIEW_USE_START=1 → `next start` (필요: 사전 빌드). dev lock 경쟁 회피용.
  const useStart = process.env.PREVIEW_USE_START === "1";
  const cmd = useStart
    ? ["exec", "next", "start", "--port", String(SPAWN_PORT)]
    : ["exec", "next", "dev", "--port", String(SPAWN_PORT)];
  const proc = spawn("pnpm", cmd, { stdio: ["ignore", "pipe", "pipe"] });
  proc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  await waitFor(`${baseUrl}/admin/applicants`);
  return { baseUrl, spawned: proc };
}

/**
 * Supabase 에 임시 신청자 3명 + messages_log 2개 INSERT.
 * 각 row 의 notes 에 `__preview_seed__` 마커를 박아 cleanup 시 식별.
 */
async function seedTestData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[seed] Supabase env 없음. 데이터 seed 생략.");
    return { client: null, ids: [] };
  }
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const SEED_MARKER = "__preview_seed__";
  const rows = [
    {
      name: "강현주",
      email: "preview1@example.com",
      phone: "01011110001",
      birthdate: "2000-03-15",
      university: "서울대학교",
      visa: "F-4",
      address: "서울시 강남구",
      status: "notified",
      notes: SEED_MARKER,
      consent: true,
      consent_operations: true,
      consent_content_use: true,
    },
    {
      name: "Park Min",
      email: "preview2@example.com",
      phone: "+821022220002",
      birthdate: "1999-07-08",
      university: "연세대학교",
      visa: "D-2",
      address: "서울시 서대문구",
      status: "paid",
      notes: SEED_MARKER,
      payment_confirmed_at: new Date().toISOString(),
      paid_amount_krw: 880000,
      depositor_name_observed: "Park Min",
      consent: true,
      consent_operations: true,
      consent_content_use: true,
    },
    {
      name: "Sato Yui",
      email: "preview3@example.com",
      phone: "01033330003",
      birthdate: "2001-11-21",
      university: "고려대학교",
      visa: "D-2",
      address: "서울시 성북구",
      status: "notified",
      notes: SEED_MARKER,
      consent: true,
      consent_operations: true,
      consent_content_use: true,
    },
    // T3.3 - cancelled_at 7개월 전 (PII anonymize 적격 row).
    {
      name: "Old Cancelled",
      email: "preview-old@example.com",
      phone: "01099990004",
      birthdate: "1998-05-10",
      university: "한양대학교",
      visa: "F-4",
      address: "서울시 마포구",
      status: "cancelled",
      cancelled_at: new Date(
        Date.now() - 7 * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      cancel_reason: "preview_seed_old",
      notes: SEED_MARKER,
      consent: true,
      consent_operations: true,
      consent_content_use: true,
    },
  ];
  const { data, error } = await client
    .from("applicants")
    .insert(rows)
    .select("id");
  if (error) {
    console.warn("[seed] applicants INSERT 실패:", error.message);
    return { client, ids: [] };
  }
  const ids = (data ?? []).map((r) => r.id);
  console.log(`[seed] applicants ${ids.length}건 INSERT`);

  // messages_log 2건 (preview1 신청자에게).
  if (ids[0]) {
    const messages = [
      {
        applicant_id: ids[0],
        channel: "email",
        direction: "individual",
        subject: "[Growth Career] 입금 안내",
        body_excerpt:
          "강현주 님, 신청 감사해요. 수강료 880,000원을 토스뱅크로 입금 부탁드려요.",
        sent_by: "noah",
        recipient_count: 1,
      },
      {
        applicant_id: ids[0],
        channel: "email",
        direction: "broadcast",
        subject: "[Growth Career] 마감 D-3 리마인드",
        body_excerpt: "마감 3일 전 리마인드. 입금 부탁드려요.",
        sent_by: "noah",
        recipient_count: 1,
      },
    ];
    const { error: mErr } = await client.from("messages_log").insert(messages);
    if (mErr) {
      console.warn("[seed] messages_log INSERT 실패:", mErr.message);
    } else {
      console.log("[seed] messages_log 2건 INSERT");
    }
  }
  return { client, ids };
}

async function cleanupTestData(client, ids) {
  if (!client || ids.length === 0) return;
  const { error: mErr } = await client
    .from("messages_log")
    .delete()
    .in("applicant_id", ids);
  if (mErr) console.warn("[cleanup] messages_log:", mErr.message);

  const { error: aErr } = await client
    .from("applicants")
    .delete()
    .in("id", ids);
  if (aErr) console.warn("[cleanup] applicants:", aErr.message);
  console.log(`[cleanup] preview seed ${ids.length}건 삭제`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const seed = await seedTestData();
  const { baseUrl, spawned } = await ensureServer();
  const cleanup = async () => {
    await cleanupTestData(seed.client, seed.ids);
    if (spawned) {
      try {
        spawned.kill("SIGTERM");
      } catch {}
    }
  };
  process.on("SIGINT", () => {
    void cleanup();
    process.exit(130);
  });

  try {
    const browser = await chromium.launch();
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: "dark",
        httpCredentials: { username: USER, password: PASS },
      });
      const page = await ctx.newPage();
      // 기본 locator timeout 단축 (HMR networkidle 무한 대기 방지).
      page.setDefaultTimeout(10_000);
      // mailto: 클릭 시 다이얼로그 자동 dismiss (실제 메일 앱 안 띄움).
      page.on("dialog", (d) => d.dismiss().catch(() => {}));

      // 첫 페이지 진입은 dev 컴파일 때문에 길어질 수 있어 90s 허용.
      await page.goto(`${baseUrl}/admin/applicants`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.evaluate(() => document.fonts.ready);
      await sleep(1500);

      // 1) Base list with checkbox column.
      await page.screenshot({
        path: path.join(OUT_DIR, `list-${vp.name}.png`),
        fullPage: true,
      });
      console.log(`✓ list @ ${vp.name}`);

      // 2) 체크박스 선택 (개별 row + master 분기).
      //    desktop 은 table 의 checkbox, mobile 은 card 의 checkbox. md: breakpoint
      //    에서 다른 노드를 숨기므로 :visible 로 필터해야 클릭 가능.
      const rowCheckboxes = page.locator(
        'input[type="checkbox"][aria-label*="선택"]:not([aria-label*="전체"]):not([disabled]):visible',
      );
      const count = await rowCheckboxes.count();
      console.log(`  rows selectable: ${count}`);
      if (count >= 2) {
        await rowCheckboxes.nth(0).check();
        await rowCheckboxes.nth(1).check();
        if (count >= 3) await rowCheckboxes.nth(2).check();
        await sleep(300);
        await page.screenshot({
          path: path.join(OUT_DIR, `selected-${vp.name}.png`),
          fullPage: true,
        });
        console.log(`✓ selected @ ${vp.name}`);

        // 3) Broadcast 모달 열기.
        const broadcastBtn = page
          .locator('button:has-text("다중 발송"):visible')
          .first();
        if (await broadcastBtn.isEnabled()) {
          await broadcastBtn.click();
          await sleep(500);
          await page.screenshot({
            path: path.join(OUT_DIR, `dialog-empty-${vp.name}.png`),
            fullPage: true,
          });
          console.log(`✓ dialog empty @ ${vp.name}`);

          // 4) 본문 입력 후 캡처.
          const subjectInput = page.locator(
            'input[type="text"][maxlength="200"]',
          );
          const bodyTextarea = page.locator('textarea[maxlength="5000"]');
          if ((await subjectInput.count()) > 0) {
            await subjectInput.fill("[Growth Career] 6/27 첫 강의 안내");
            await bodyTextarea.fill(
              "안녕하세요.\n\nFan to Pro 1기 첫 강의 일정 안내 드려요.\n\n날짜: 2026년 6월 27일 (토)\n장소: 추후 공지\n\n드롭다운 / Growth Career 운영팀",
            );
            await sleep(300);
            await page.screenshot({
              path: path.join(OUT_DIR, `dialog-filled-${vp.name}.png`),
              fullPage: true,
            });
            console.log(`✓ dialog filled @ ${vp.name}`);
          }

          // 모달 닫기.
          await page.keyboard.press("Escape");
          await sleep(300);
        }
      } else {
        console.warn(
          `  skip selected/dialog @ ${vp.name} (need >=2 selectable rows)`,
        );
      }

      // 4b) PII 파기 다이얼로그 - 1단계 (warning) + 2단계 (typed confirm) 캡처.
      //     eligibleCount=0 시에도 dialog 자체는 열림 (계속 버튼만 비활성).
      const piiBtn = page.locator('button:has-text("PII 파기"):visible').first();
      if ((await piiBtn.count()) > 0) {
        await piiBtn.click();
        await sleep(400);
        await page.screenshot({
          path: path.join(OUT_DIR, `pii-warning-${vp.name}.png`),
          fullPage: true,
        });
        console.log(`✓ pii warning @ ${vp.name}`);

        // 2단계로 진입 (eligibleCount=0 이면 [계속] disabled — 직접 step 전환은
        // setState 가 부모에서 일어나므로 dialog 가 자체 step 토글 함수 보유.
        // disabled 면 클릭 자체가 안 됨 — 우회: dialog 안의 textbox 가 있는지 확인).
        const continueBtn = page
          .locator('button:has-text("계속"):visible')
          .first();
        const continueEnabled =
          (await continueBtn.count()) > 0 && (await continueBtn.isEnabled());
        if (continueEnabled) {
          await continueBtn.click();
          await sleep(300);
          const confirmInput = page
            .locator('input[placeholder="ANONYMIZE"]:visible')
            .first();
          if ((await confirmInput.count()) > 0) {
            await confirmInput.fill("ANONYMIZE");
            await sleep(300);
            await page.screenshot({
              path: path.join(OUT_DIR, `pii-confirm-${vp.name}.png`),
              fullPage: true,
            });
            console.log(`✓ pii confirm @ ${vp.name}`);
          }
        } else {
          console.log(`  pii 2단계 skip @ ${vp.name} (eligibleCount=0)`);
        }
        await page.keyboard.press("Escape");
        await sleep(200);
      }

      // 4c) 현금영수증 drawer (paid row) 캡처.
      const receiptBtn = page
        .locator('button:has-text("현금영수증"):visible')
        .first();
      if ((await receiptBtn.count()) > 0) {
        await receiptBtn.click();
        await sleep(400);
        await page.screenshot({
          path: path.join(OUT_DIR, `cash-receipt-${vp.name}.png`),
          fullPage: true,
        });
        console.log(`✓ cash-receipt @ ${vp.name}`);
        await page.keyboard.press("Escape");
        await sleep(200);
      }

      // 5) 발송 이력 drawer 가능 시 캡처.
      const historyBtn = page
        .locator('button[title*="발송 이력"]:visible')
        .first();
      if ((await historyBtn.count()) > 0 && (await historyBtn.isEnabled())) {
        await historyBtn.click();
        await sleep(500);
        await page.screenshot({
          path: path.join(OUT_DIR, `history-${vp.name}.png`),
          fullPage: true,
        });
        console.log(`✓ history @ ${vp.name}`);
        await page.keyboard.press("Escape");
        await sleep(200);
      } else {
        console.log(`  skip history @ ${vp.name} (no 발송 button visible)`);
      }

      await ctx.close();
    }
    await browser.close();
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
