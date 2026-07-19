#!/usr/bin/env node
/**
 * 10명 임의 학생 수료증 PNG 일괄 캡처. 노아 = 실 수료증 이미지 만들 용도.
 *
 * - 신청등록순 001~010
 * - Serial: GC-FTP-1기-001 ~ GC-FTP-1기-010
 * - /tmp/cert-sample-preview.html 안 name + serial 만 교체 후 각각 캡처
 * - 출력: docs/screenshots/b0081/certificates/cert-1기-NNN_slug.png
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const SAMPLE = "/tmp/cert-sample-preview.html";
const OUT_DIR = "/Users/noah/growthcareer/docs/screenshots/b0081/certificates";

// 실 1기 학생 명단 (applicants.created_at ASC · 2026-06-08 ~ 06-20 신청등록순)
const STUDENTS = [
  { seq: "001", name: "RAMPOLDI MARTINA" },
  { seq: "002", name: "NGUYEN THI QUYNH TRANG" },
  { seq: "003", name: "JESUS CORTINHAS FABIA ALEXANDRA" },
  { seq: "004", name: "MEDEIROS DE BRITO PONTES CAROLINA" },
  { seq: "005", name: "LIU JIEXIAN" },
  { seq: "006", name: "Isabel Mendoza Garcia" },
  { seq: "007", name: "SIU KRISTEL CELINE CO" },
  { seq: "008", name: "AYE AYE KHAING" },
  { seq: "009", name: "Lysa MBAH" },
  { seq: "010", name: "Alagiriswamy Abinaya" },
];

await mkdir(OUT_DIR, { recursive: true });

const base = await readFile(SAMPLE, "utf8");
// base HTML 안 원본 이름 · 원본 serial 을 찾을 정규식으로 교체
// 기존 sample: "Kim Ji-Woo" · "GC-FTP-1-0007" · "1기 / Cohort 1" 유지
const ORIG_NAME_RE = /<div class="cert-recipient-name">[^<]*<\/div>/;
const ORIG_SERIAL_RE = /<span class="cert-serial-value">[^<]*<\/span>/;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 900, height: 1273 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

for (const s of STUDENTS) {
  const serial = `GC-FTP-1기-${s.seq}`;
  const html = base
    .replace(
      ORIG_NAME_RE,
      `<div class="cert-recipient-name">${s.name}</div>`,
    )
    .replace(
      ORIG_SERIAL_RE,
      `<span class="cert-serial-value">${serial}</span>`,
    );
  const tmp = `/tmp/cert-batch-${s.seq}.html`;
  await writeFile(tmp, html, "utf8");

  await page.goto(pathToFileURL(tmp).toString(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const certPage = await page.$(".cert-page");
  if (!certPage) throw new Error(".cert-page selector not found");

  const slug = s.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outFile = path.join(OUT_DIR, `cert-1기-${s.seq}_${slug}.png`);
  await certPage.screenshot({ path: outFile });
  console.log(`[capture] ok ${outFile}`);
}

await ctx.close();
await browser.close();
console.log(`\n총 ${STUDENTS.length}장 저장: ${OUT_DIR}`);
