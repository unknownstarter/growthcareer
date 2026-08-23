#!/usr/bin/env node
/**
 * GA4 Data API 리포트 — 모집 페이지(/fan-to-pro/2) 유입을 과거 포함해 조회.
 *
 * 필요한 자격증명 (.env.local 에 추가, git 커밋 금지):
 *   GA4_PROPERTY_ID=123456789          # GA4 관리 > 속성 설정 > 속성 ID (숫자, G- 아님)
 *   GA4_KEY_FILE=/절대경로/ga4-sa.json  # 서비스계정 JSON 키 파일 경로
 *     (그 서비스계정 이메일을 GA4 속성에 '뷰어' 로 추가해야 함)
 *
 * 사용: node tools/ga4-report.mjs [일수(기본 30)] [경로필터(기본 /fan-to-pro/2)]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
try {
  for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* .env.local 없어도 진행(환경변수 사용) */ }

const PROPERTY_ID = env.GA4_PROPERTY_ID || process.env.GA4_PROPERTY_ID;
const KEY_FILE = env.GA4_KEY_FILE || process.env.GA4_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const days = Number(process.argv[2] || 30);
const pathFilter = process.argv[3] || "/fan-to-pro/2";

if (!PROPERTY_ID || !KEY_FILE) {
  console.error("자격증명 누락. .env.local 에 다음을 추가하세요:");
  console.error("  GA4_PROPERTY_ID=123456789            (GA4 관리>속성설정>속성 ID, 숫자)");
  console.error("  GA4_KEY_FILE=/절대경로/ga4-sa.json    (서비스계정 JSON, GA4 속성에 뷰어로 추가)");
  process.exit(1);
}
if (!fs.existsSync(KEY_FILE)) {
  console.error(`키 파일을 찾을 수 없음: ${KEY_FILE}`);
  process.exit(1);
}

const client = new BetaAnalyticsDataClient({ keyFilename: KEY_FILE });
const property = `properties/${PROPERTY_ID}`;
const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];
const pageFilter = {
  filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS", value: pathFilter } },
};

async function run(name, req) {
  try {
    const [res] = await client.runReport({ property, dateRanges, ...req });
    return res.rows || [];
  } catch (e) {
    console.error(`[${name}] 조회 실패:`, e.message);
    if (/permission|PERMISSION|403/.test(e.message))
      console.error("  → 서비스계정 이메일을 GA4 속성에 '뷰어' 로 추가했는지 확인.");
    if (/property|404|NOT_FOUND/.test(e.message))
      console.error("  → GA4_PROPERTY_ID(숫자) 가 맞는지 확인.");
    process.exit(1);
  }
}

console.log(`\n===== GA4 유입 리포트 (최근 ${days}일, path ~ "${pathFilter}") =====`);

// 1. 총계
const total = await run("overview", {
  metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
  dimensionFilter: pageFilter,
});
const t = total[0]?.metricValues?.map((m) => m.value) || ["0", "0", "0"];
console.log(`\n총계: 세션 ${t[0]} / 사용자 ${t[1]} / 페이지뷰 ${t[2]}`);

// 2. 일자별 세션
const byDay = await run("byDay", {
  dimensions: [{ name: "date" }],
  metrics: [{ name: "sessions" }, { name: "totalUsers" }],
  dimensionFilter: pageFilter,
  orderBys: [{ dimension: { dimensionName: "date" } }],
});
console.log("\n일자별 (세션 / 사용자):");
for (const r of byDay) {
  const d = r.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  console.log(`  ${d}  ${r.metricValues[0].value} / ${r.metricValues[1].value}`);
}

// 3. 채널별 (source / medium)
const byChannel = await run("byChannel", {
  dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
  metrics: [{ name: "sessions" }],
  dimensionFilter: pageFilter,
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  limit: 20,
});
console.log("\n채널별 (source / medium — 세션):");
for (const r of byChannel)
  console.log(`  ${(r.dimensionValues[0].value + " / " + r.dimensionValues[1].value).padEnd(28)} ${r.metricValues[0].value}`);

// 4. UTM 캠페인별
const byCampaign = await run("byCampaign", {
  dimensions: [{ name: "sessionCampaignName" }],
  metrics: [{ name: "sessions" }],
  dimensionFilter: pageFilter,
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  limit: 20,
});
console.log("\n캠페인별 (utm_campaign — 세션):");
for (const r of byCampaign)
  console.log(`  ${r.dimensionValues[0].value.padEnd(24)} ${r.metricValues[0].value}`);

console.log("");
