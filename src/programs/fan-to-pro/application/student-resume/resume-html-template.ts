/**
 * Student Resume HTML template (B0062).
 *
 * 잡코리아 + 사람인 + 원티드 패턴 한국 이력서 양식.
 *
 * 구조:
 *   1. 사진 + 인적사항 (이름 한/영 / 연락처 / 생년 / 국적 / 비자 / 한국 거주)
 *   2. 학력 (education)
 *   3. 경력 (experience)
 *   4. 자격증 (certification)
 *   5. 수상 (award)
 *   6. 어학 (language)
 *   7. 프로젝트 (project)
 *   8. 기타활동 (activity) — B0063
 *   9. 활용능력 (skill) — B0063
 *   10. 희망 진로 + 자기 PR (career_target)
 *
 * 디자인:
 *   - Pretendard / OS 한글 폰트 fallback
 *   - A4 (210mm x 297mm), 12mm padding
 *   - 단색 (흰 배경 + 검정 텍스트 + 회색 #ccc 구분선)
 *   - 사진 80mm x 100mm (한국 표준 증명사진 비율)
 *
 * 카피 룰 (CLAUDE.md §6.5):
 *   - em dash (—) / interpunct (·) / 곡선 따옴표 / 단일 ellipsis 금지
 *   - 빈 값은 "—" 대신 "(미입력)" 또는 placeholder
 *   - 범위 표시는 "YYYY.MM - YYYY.MM" (hyphen-minus)
 *
 * 보안:
 *   - escapeHtml() 모든 사용자 입력에 적용. credential_url 은 이미 zod 가 http(s) 만
 *     허용 (entity 의 httpsUrl). title="기관 ABC" 등 attribute 도 escape.
 */
import {
  TARGET_ROLE_LABELS,
  type TargetRoleCategory,
} from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import {
  RESUME_ITEM_TYPES,
  RESUME_ITEM_LABELS,
  type StudentResumeItem,
  type ResumeItemType,
} from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";
import type { ResumeBuildData } from "./build-resume-data";

const PLACEHOLDER = "(미입력)";

/** HTML escape — &, <, >, ", ' 모두. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nz(v: string | null | undefined): string {
  return v && v.trim().length > 0 ? escapeHtml(v.trim()) : PLACEHOLDER;
}

/** ISO date (YYYY-MM-DD) → "YYYY.MM" 한국 이력서 관례. 빈 값은 placeholder. */
function fmtMonth(d: string | null | undefined): string {
  if (!d) return PLACEHOLDER;
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(d);
  if (!m) return escapeHtml(d);
  return `${m[1]}.${m[2]}`;
}

/** "YYYY.MM - YYYY.MM" 또는 "YYYY.MM - 현재" — hyphen-minus 사용. */
function fmtPeriod(start: string | null, end: string | null): string {
  const s = start ? fmtMonth(start) : PLACEHOLDER;
  const e = end ? fmtMonth(end) : "현재";
  return `${s} - ${e}`;
}

/** ISO date (YYYY-MM-DD) → "YYYY.MM.DD". */
function fmtDate(d: string | null | undefined): string {
  if (!d) return PLACEHOLDER;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return escapeHtml(d);
  return `${m[1]}.${m[2]}.${m[3]}`;
}

function genderLabel(g: string | null | undefined): string {
  if (!g) return PLACEHOLDER;
  switch (g) {
    case "male":
      return "남";
    case "female":
      return "여";
    case "other":
      return "기타";
    case "prefer_not_to_say":
      return "비공개";
    default:
      return escapeHtml(g);
  }
}

function monthsInKoreaLabel(m: number | null | undefined): string {
  if (m === null || m === undefined) return PLACEHOLDER;
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

/**
 * 1 섹션 (학력 / 경력 등) HTML. items 가 비면 회색 placeholder 한 줄.
 */
function renderSection(
  type: ResumeItemType,
  items: StudentResumeItem[],
): string {
  const label = RESUME_ITEM_LABELS[type];
  const sectionNo = RESUME_ITEM_TYPES.indexOf(type) + 2; // 1번은 인적사항.

  if (items.length === 0) {
    return `
      <section class="resume-section">
        <h2 class="resume-section-title">${sectionNo}. ${escapeHtml(label)}</h2>
        <p class="resume-empty">${PLACEHOLDER}</p>
      </section>
    `;
  }

  const rows = items
    .map((it) => {
      const period = fmtPeriod(it.start_date, it.end_date);
      const credentialLink = it.credential_url
        ? `<a class="resume-credential-link" href="${escapeHtml(it.credential_url)}" target="_blank" rel="noopener noreferrer">증명 링크</a>`
        : "";
      const description = it.description
        ? `<p class="resume-item-desc">${escapeHtml(it.description)}</p>`
        : "";
      const org = it.organization
        ? `<span class="resume-item-org">${escapeHtml(it.organization)}</span>`
        : "";

      return `
        <article class="resume-item">
          <div class="resume-item-head">
            <div class="resume-item-title-wrap">
              <span class="resume-item-title">${escapeHtml(it.title)}</span>
              ${org}
            </div>
            <span class="resume-item-period">${period}</span>
          </div>
          ${description}
          ${credentialLink}
        </article>
      `;
    })
    .join("");

  return `
    <section class="resume-section">
      <h2 class="resume-section-title">${sectionNo}. ${escapeHtml(label)}</h2>
      ${rows}
    </section>
  `;
}

function renderCareerTarget(data: ResumeBuildData): string {
  const t = data.careerTarget;
  const role = t?.target_role_category
    ? TARGET_ROLE_LABELS[t.target_role_category as TargetRoleCategory]
    : null;
  const companies =
    t?.target_companies && t.target_companies.length > 0
      ? t.target_companies.map((c) => escapeHtml(c)).join(", ")
      : PLACEHOLDER;
  const start = t?.desired_start_date ? fmtDate(t.desired_start_date) : PLACEHOLDER;
  const pitch =
    t?.self_pitch && t.self_pitch.trim().length > 0
      ? escapeHtml(t.self_pitch)
      : PLACEHOLDER;

  // 1번 인적사항 + RESUME_ITEM_TYPES.length 섹션 → 그 다음 번호.
  const sectionNo = RESUME_ITEM_TYPES.length + 2;

  return `
    <section class="resume-section">
      <h2 class="resume-section-title">${sectionNo}. 희망 진로</h2>
      <table class="resume-target-table">
        <tbody>
          <tr><th>희망 직무</th><td>${role ? escapeHtml(role) : PLACEHOLDER}</td></tr>
          <tr><th>관심 회사</th><td>${companies}</td></tr>
          <tr><th>시작 가능일</th><td>${start}</td></tr>
        </tbody>
      </table>
      <h3 class="resume-pitch-title">자기 PR</h3>
      <p class="resume-pitch-body">${pitch}</p>
    </section>
  `;
}

function renderHeader(data: ResumeBuildData): string {
  const p = data.profile;
  const displayName =
    p?.name_ko ||
    p?.name_en ||
    data.student.display_name ||
    "(이름 미입력)";
  const nameEn = p?.name_en;
  const photo = data.photoSignedUrl
    ? `<img class="resume-photo" src="${escapeHtml(data.photoSignedUrl)}" alt="${escapeHtml(displayName)}" />`
    : `<div class="resume-photo resume-photo-placeholder">사진</div>`;

  const birth = p?.birth_date
    ? fmtDate(p.birth_date)
    : p?.birth_year
      ? `${p.birth_year}`
      : PLACEHOLDER;

  const monthsKo = monthsInKoreaLabel(p?.months_in_korea);

  // B0063: 홈페이지 / SNS / 포트폴리오 link. http(s) only (entity 검증).
  // 표시는 hostname 만 — 긴 URL 잘림 방지. 클릭 시 풀 URL.
  const website = p?.website_url
    ? `<a class="resume-website-link" href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortenUrl(p.website_url))}</a>`
    : PLACEHOLDER;

  return `
    <header class="resume-header">
      ${photo}
      <div class="resume-header-info">
        <h1 class="resume-name-ko">${escapeHtml(displayName)}</h1>
        ${nameEn ? `<p class="resume-name-en">${escapeHtml(nameEn)}</p>` : ""}
        <table class="resume-info-table">
          <tbody>
            <tr>
              <th>생년월일</th><td>${birth}</td>
              <th>성별</th><td>${genderLabel(p?.gender)}</td>
            </tr>
            <tr>
              <th>국적</th><td>${nz(data.applicantNationality)}</td>
              <th>비자</th><td>${nz(p?.visa_type)}</td>
            </tr>
            <tr>
              <th>연락처</th><td>${nz(p?.phone)}</td>
              <th>한국 거주</th><td>${monthsKo}</td>
            </tr>
            <tr>
              <th>홈페이지</th><td colspan="3">${website}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </header>
  `;
}

/** http(s) URL → "도메인/path 일부" 형태로 짧게. 인쇄용. */
function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url;
  }
}

/** 전체 HTML — print-ready. <html> 부터 </html> 까지. */
export function renderResumeHtml(data: ResumeBuildData): string {
  const sections = RESUME_ITEM_TYPES.map((t) =>
    renderSection(t, data.itemsByType[t]),
  ).join("\n");

  const title = `이력서 - ${escapeHtml(
    data.profile?.name_ko || data.profile?.name_en || data.student.display_name,
  )}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${RESUME_CSS}
</style>
</head>
<body>
<main class="resume-root">
  ${renderHeader(data)}
  ${sections}
  ${renderCareerTarget(data)}
  <footer class="resume-footer">
    <span>이력서 완성도 ${data.completion.percent}%</span>
    <span class="resume-footer-meta">Growth Career / Fan to Pro</span>
  </footer>
</main>
</body>
</html>`;
}

/**
 * Print + screen 양쪽에 동작하는 CSS. A4 page-size + 12mm margin.
 *
 * Pretendard CDN 우선, OS 폰트 fallback (Apple SD Gothic Neo / Malgun Gothic).
 */
const RESUME_CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #111;
  background: #fff;
}

@page {
  size: A4;
  margin: 12mm;
}

.resume-root {
  max-width: 186mm; /* 210 - 12*2 */
  margin: 0 auto;
  padding: 0;
}

/* Header */
.resume-header {
  display: flex;
  gap: 8mm;
  padding-bottom: 6mm;
  border-bottom: 1px solid #ccc;
  margin-bottom: 6mm;
}

.resume-photo {
  width: 30mm;
  height: 40mm;
  object-fit: cover;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.resume-photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 10pt;
}

.resume-header-info {
  flex: 1;
}

.resume-name-ko {
  font-size: 22pt;
  font-weight: 700;
  margin-bottom: 1mm;
}

.resume-name-en {
  font-size: 12pt;
  color: #666;
  margin-bottom: 3mm;
}

.resume-info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.resume-info-table th {
  text-align: left;
  background: #f5f5f5;
  padding: 1.5mm 2mm;
  font-weight: 500;
  color: #555;
  width: 18mm;
  border: 1px solid #e5e5e5;
}

.resume-info-table td {
  padding: 1.5mm 2mm;
  border: 1px solid #e5e5e5;
  color: #111;
}

.resume-website-link {
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
}

/* Sections */
.resume-section {
  margin-bottom: 5mm;
  page-break-inside: avoid;
}

.resume-section-title {
  font-size: 12pt;
  font-weight: 700;
  background: #f5f5f5;
  padding: 1.5mm 3mm;
  margin-bottom: 3mm;
  border-left: 3px solid #111;
}

.resume-empty {
  color: #999;
  font-size: 10pt;
  padding: 1mm 3mm 2mm;
}

/* Items */
.resume-item {
  padding: 2mm 3mm 3mm;
  border-bottom: 1px dashed #eee;
  margin-bottom: 1mm;
}

.resume-item:last-child {
  border-bottom: none;
}

.resume-item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1mm;
  gap: 4mm;
}

.resume-item-title-wrap {
  flex: 1;
}

.resume-item-title {
  font-size: 11pt;
  font-weight: 600;
  margin-right: 2mm;
}

.resume-item-org {
  font-size: 10pt;
  color: #555;
}

.resume-item-period {
  font-size: 10pt;
  color: #666;
  white-space: nowrap;
}

.resume-item-desc {
  font-size: 10pt;
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-top: 1mm;
}

.resume-credential-link {
  display: inline-block;
  margin-top: 1mm;
  font-size: 9pt;
  color: #2563eb;
  text-decoration: underline;
}

/* Career target */
.resume-target-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
  margin-bottom: 3mm;
}

.resume-target-table th {
  text-align: left;
  background: #f5f5f5;
  padding: 1.5mm 3mm;
  font-weight: 500;
  color: #555;
  width: 28mm;
  border: 1px solid #e5e5e5;
}

.resume-target-table td {
  padding: 1.5mm 3mm;
  border: 1px solid #e5e5e5;
}

.resume-pitch-title {
  font-size: 10pt;
  font-weight: 600;
  margin-top: 3mm;
  margin-bottom: 1mm;
  color: #555;
}

.resume-pitch-body {
  font-size: 10pt;
  color: #222;
  line-height: 1.6;
  padding: 2mm 3mm;
  background: #fafafa;
  border-left: 2px solid #ccc;
  white-space: pre-wrap;
}

/* Footer */
.resume-footer {
  margin-top: 6mm;
  padding-top: 3mm;
  border-top: 1px solid #ccc;
  display: flex;
  justify-content: space-between;
  font-size: 9pt;
  color: #888;
}

/* Print specific */
@media print {
  body { font-size: 10.5pt; }
  .resume-credential-link { color: #333; text-decoration: none; }
  .no-print { display: none !important; }
}

/* Screen specific (preview) */
@media screen {
  body { padding: 8mm; background: #f0f0f0; }
  .resume-root {
    background: #fff;
    padding: 12mm;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    min-height: 297mm;
  }
}
`;
