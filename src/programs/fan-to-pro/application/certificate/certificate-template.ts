/**
 * Certificate HTML template (B0081) - Ivy Serif + K-pop Industry Emblem 재설계 (2026-07-19).
 *
 * A4 세로 (210mm x 297mm). 화이트 배경, F/P monogram crest, Cormorant Garamond serif,
 * Pinyon Script 서명/타이틀, K-pop Blue accent seal.
 *
 * 노아 확정 (2026-07-19):
 *   1. 배경 #ffffff (크림 X)
 *   2. 영문 title 만 (한글 병기 X)
 *   3. Crest = F/P monogram (인라인 SVG)
 *   4. 서명 = Pinyon Script (Great Vibes 폐기)
 *
 * IA (5 tier):
 *   T1 Identity - Crest + Fan to Pro + K-Pop Live Production + Dropdown
 *   T2 Title    - "Certificate of Completion" (Pinyon Script 46pt)
 *   T3 Name     - 수령인 (Cormorant Garamond 40pt weight 700, focal point)
 *   T4 Attest   - 서술문 (Pretendard italic 회색, 회색 카드 폐기)
 *   T5 Footer   - 좌 issuer + 중 서명 + 우 seal
 *
 * 카피 룰 (CLAUDE.md §6.5):
 *   em dash / interpunct / 곡선 따옴표 / 단일 ellipsis 사용 금지.
 *
 * 인터랙션 룰 (§6.7):
 *   수료증은 인쇄 전용 문서 = 애니메이션/hover state 예외.
 *
 * 보안:
 *   - escapeHtml() 모든 사용자 입력 (이름, cohort_name 등) 에 적용.
 *   - Verify URL 은 serial_no 를 encodeURIComponent 로 escape.
 *
 * 디자인 원칙:
 *   1. 그라디언트 절대 금지 (solid 색만)
 *   2. 여백 상 25mm / 하 40mm / 좌우 30mm (인쇄 safe area)
 *   3. Cormorant Garamond (serif) + Pinyon Script (script) + Pretendard (sans) 3-layer
 *   4. -webkit-print-color-adjust: exact - 인쇄 시 seal 색 유지
 *   5. 5줄 커리큘럼 = 1기 4주 8회 실 강의 (2기 5주 스펙 언급 금지)
 */

export type CertificateData = {
  serial_no: string;
  program_name_ko: string;
  program_name_en: string;
  duration_ko: string;
  duration_en: string;
  cohort_label: string;
  /** 서브 (한글). 외국인 학생 = null. 재설계 후 미사용 (호환 유지). */
  recipient_name_ko: string | null;
  /** 크게 (Cormorant Garamond 40pt 700). 노아 fix 2026-07-11: 원본 이름 (영문). */
  recipient_name_en: string;
  attest_ko: string;
  attest_en: string;
  issued_date_ko: string;
  issued_date_en: string;
  issuer_name: string;
  issuer_biz_no: string;
  verify_url: string;
  /** public/brand/signature-noah.png 등. HTML 안에서 img src 로 삽입. */
  signature_image_path: string;
};

const PLACEHOLDER_ATTEST_KO =
  "위 사람은 Fan to Pro 4주 K-pop 공연 실무 교육 과정을 성실히 이수하였음을 증명합니다.";
const PLACEHOLDER_ATTEST_EN =
  "This is to certify that the above named person has successfully completed the Fan to Pro 4-week K-Pop Live Production program.";

/** HTML escape - &, <, >, ", '. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Certificate HTML 생성. iframe srcDoc 또는 새 탭 window.document.write() 로 렌더.
 * 인쇄 시 A4 정확히 1 페이지.
 */
export function renderCertificateHtml(data: CertificateData): string {
  // attest_ko / attest_en 은 CertificateData 계약 유지 (호출자 호환).
  // 재설계 후 렌더링은 attest_en 을 서술문으로 사용 (attest_ko 는 미노출).
  void data.attest_ko;
  const attestEn = escapeHtml(data.attest_en || PLACEHOLDER_ATTEST_EN);
  // 노아 fix (2026-07-19): 영문 이름만 표시. 한글 이름 서브 제거.
  const nameEn = escapeHtml(data.recipient_name_en);
  const serial = escapeHtml(data.serial_no);
  const verifyUrl = escapeHtml(data.verify_url);
  // 재설계 후 program_name / duration / cohort_label 은 seal + attest 안 통합.
  // 데이터 계약은 유지하되 명시적으로 참조.
  void data.program_name_ko;
  void data.program_name_en;
  void data.duration_ko;
  void data.duration_en;
  const cohortLabel = escapeHtml(data.cohort_label);
  const issuedKo = escapeHtml(data.issued_date_ko);
  void data.issued_date_en;
  const issuer = escapeHtml(data.issuer_name);
  const bizNo = escapeHtml(data.issuer_biz_no);
  const signaturePath = escapeHtml(data.signature_image_path);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Certificate of Completion - ${serial}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow,noarchive" />
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Pinyon+Script&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #111;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@page { size: A4; margin: 0; }

.cert-page {
  width: 210mm;
  height: 297mm;
  padding: 25mm 30mm 40mm;
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.cert-page::before {
  content: "";
  position: absolute;
  inset: 6mm;
  border: 1px solid #d1d5db;
  pointer-events: none;
}

/* T1 IDENTITY (GROWTH CAREER 우산 브랜드 + Fan to Pro 트랙 + K-Pop Live Production + Dropdown) */
.cert-identity {
  text-align: center;
  margin-bottom: 18mm;
}
.cert-umbrella {
  font-family: 'Pretendard', sans-serif;
  font-size: 22pt;
  font-weight: 900;
  color: #111;
  letter-spacing: 1.5px;
  line-height: 1;
  margin-bottom: 6mm;
}
.cert-brand-name {
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 20pt;
  font-weight: 600;
  color: #111;
  letter-spacing: 0.5px;
  line-height: 1.1;
  margin-bottom: 2mm;
}
.cert-brand-sub {
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 10pt;
  font-weight: 400;
  font-style: italic;
  color: #374151;
  letter-spacing: 0.8px;
  margin-bottom: 2mm;
}
.cert-brand-issuer {
  font-family: 'Pretendard', sans-serif;
  font-size: 9pt;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Serial No - 우측 상단 절대 배치 */
.cert-serial {
  position: absolute;
  top: 12mm;
  right: 12mm;
  text-align: right;
  font-family: 'Pretendard', sans-serif;
  font-size: 8pt;
  color: #6b7280;
  letter-spacing: 0.8px;
  line-height: 1.4;
}
.cert-serial-label {
  display: block;
  font-size: 7pt;
  color: #9ca3af;
  letter-spacing: 1.2px;
  margin-bottom: 0.5mm;
  text-transform: uppercase;
}
.cert-serial-value {
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.5px;
}

/* T2 TITLE (Pinyon Script 46pt) */
.cert-title {
  text-align: center;
  margin-bottom: 12mm;
}
.cert-title-en {
  font-family: 'Pinyon Script', 'Snell Roundhand', cursive;
  font-size: 46pt;
  font-weight: 400;
  letter-spacing: 1px;
  color: #111;
  line-height: 1.1;
}

/* T3 RECIPIENT NAME (Cormorant Garamond 40pt 700, focal point) */
.cert-recipient-name {
  text-align: center;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 40pt;
  font-weight: 700;
  color: #111;
  letter-spacing: 0.5px;
  margin-bottom: 18mm;
  line-height: 1.15;
}

/* T4 ATTEST (서술문, Pretendard italic 회색) */
.cert-attest {
  text-align: center;
  max-width: 140mm;
  margin: 0 auto 14mm;
}
.cert-attest-body {
  font-family: 'Pretendard', sans-serif;
  font-size: 12pt;
  font-weight: 400;
  font-style: italic;
  line-height: 1.9;
  color: #374151;
}
.cert-attest-body .cert-attest-name {
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-style: normal;
  font-weight: 600;
  color: #111;
}

/* T5 FOOTER (3-col: 좌 issuer + 중 서명 + 우 seal) */
.cert-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8mm;
  padding-top: 6mm;
  border-top: 1px solid #e5e7eb;
  position: absolute;
  bottom: 30mm;
  left: 30mm;
  right: 30mm;
}

/* 좌: Issuer */
.cert-issuer { flex: 1; min-width: 0; }
.cert-issue-date {
  font-family: 'Pretendard', sans-serif;
  font-size: 10pt;
  font-weight: 500;
  color: #111;
  margin-bottom: 5mm;
  letter-spacing: 0.3px;
}
.cert-issuer-name {
  font-family: 'Pretendard', sans-serif;
  font-size: 11pt;
  font-weight: 700;
  color: #111;
  margin-bottom: 1mm;
  letter-spacing: -0.2px;
}
.cert-issuer-meta {
  font-family: 'Pretendard', sans-serif;
  font-size: 8pt;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.6;
}

/* 중: 서명 */
.cert-signature {
  text-align: center;
  min-width: 48mm;
  flex: 0 0 auto;
}
.cert-signature-line {
  height: 22mm;
  border-bottom: 1px solid #374151;
  margin-bottom: 2mm;
  position: relative;
}
.cert-signature-img {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  padding-bottom: 1mm;
  height: 20mm;
  object-fit: contain;
}
.cert-signature-fallback {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Pinyon Script', 'Snell Roundhand', cursive;
  font-size: 30pt;
  font-weight: 400;
  color: #111;
  padding-bottom: 0.5mm;
  line-height: 1.1;
  white-space: nowrap;
}
.cert-signature-name {
  font-family: 'Pretendard', sans-serif;
  font-size: 9pt;
  font-weight: 500;
  color: #374151;
  margin-top: 1mm;
}
.cert-signature-title {
  font-family: 'Pretendard', sans-serif;
  font-size: 8pt;
  font-weight: 400;
  color: #6b7280;
  margin-top: 0.5mm;
}

/* 우: Seal */
.cert-seal {
  width: 36mm;
  height: 36mm;
  border-radius: 50%;
  border: 2.5px solid #3182f6;
  color: #3182f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Pretendard', sans-serif;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.3;
  text-align: center;
  flex-shrink: 0;
  transform: rotate(-6deg);
  background: #ffffff;
  position: relative;
}
.cert-seal::before {
  content: "";
  position: absolute;
  inset: 2mm;
  border-radius: 50%;
  border: 1px solid #3182f6;
  pointer-events: none;
}
.cert-seal-top { font-size: 7.5pt; margin-bottom: 1mm; letter-spacing: 1.2px; }
.cert-seal-mid { font-size: 11pt; font-weight: 800; letter-spacing: 1px; }
.cert-seal-bot { font-size: 7.5pt; margin-top: 1mm; letter-spacing: 0.8px; }

/* Verify URL (최하단) */
.cert-verify {
  position: absolute;
  bottom: 14mm;
  left: 30mm;
  right: 30mm;
  padding-top: 4mm;
  border-top: 1px solid #e5e7eb;
  font-family: 'Pretendard', sans-serif;
  font-size: 8pt;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.5;
}
.cert-verify-url {
  color: #374151;
  font-weight: 500;
}

@media screen {
  body { background: #f3f4f6; padding: 20mm 0; display: flex; justify-content: center; }
  .cert-page { box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12); }
}
@media print {
  body { background: #ffffff; padding: 0; }
  .cert-page { box-shadow: none; }
}
</style>
</head>
<body>
<div class="cert-page">

  <div class="cert-serial">
    <span class="cert-serial-label">Serial No.</span>
    <span class="cert-serial-value">${serial}</span>
  </div>

  <section class="cert-identity">
    <div class="cert-umbrella">GROWTH CAREER</div>
    <div class="cert-brand-name">Fan to Pro</div>
    <div class="cert-brand-sub">K-Pop Live Production</div>
    <div class="cert-brand-issuer">Issued by Dropdown</div>
  </section>

  <div class="cert-title">
    <div class="cert-title-en">Certificate of Completion</div>
  </div>

  <div class="cert-recipient-name">${nameEn}</div>

  <div class="cert-attest">
    <p class="cert-attest-body">
      ${attestEn}
      <br />
      <span style="display:inline-block; margin-top: 3mm; font-style: normal; font-size: 10pt; color: #6b7280; letter-spacing: 0.5px;">${cohortLabel}</span>
    </p>
  </div>

  <footer class="cert-footer">
    <div class="cert-issuer">
      <div class="cert-issue-date">발급일 ${issuedKo}</div>
      <div class="cert-issuer-name">${issuer}</div>
      <div class="cert-issuer-meta">
        사업자등록번호 ${bizNo}<br />
        growthcareer.xyz
      </div>
    </div>
    <div class="cert-signature">
      <div class="cert-signature-line">
        <img class="cert-signature-img" src="${signaturePath}" alt="Signature" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
        <span class="cert-signature-fallback" style="display:none">Jaeha</span>
      </div>
      <div class="cert-signature-name">대표</div>
      <div class="cert-signature-title">${issuer}</div>
    </div>
    <div class="cert-seal">
      <span class="cert-seal-top">DROPDOWN</span>
      <span class="cert-seal-mid">Certified</span>
      <span class="cert-seal-bot">2026</span>
    </div>
  </footer>

  <div class="cert-verify">
    본 수료증은 아래 URL 에서 진위를 확인할 수 있습니다.
    <span class="cert-verify-url">${verifyUrl}</span>
  </div>

</div>
</body>
</html>`;
}
