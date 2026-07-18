/**
 * Certificate HTML template (B0081) — tools/certificate-preview.html 을 함수화.
 *
 * A4 세로 (210mm x 297mm), Ivy 학위증 톤 + Toss / K-pop 블루 accent (안 1, 2026-07-11).
 * 크림 아이보리 배경 + 영문 세리프 헤딩 + 한글 Pretendard 유지 + 인장 확대 35mm.
 *
 * 카피 룰 (CLAUDE.md §6.5):
 *   em dash / interpunct / 곡선 따옴표 / 단일 ellipsis 사용 금지.
 *
 * 인터랙션 룰 (§6.7):
 *   수료증은 인쇄 전용 문서 = 애니메이션·hover state 예외.
 *
 * 보안:
 *   - escapeHtml() 모든 사용자 입력 (이름, cohort_name 등) 에 적용.
 *   - Verify URL 은 serial_no 를 encodeURIComponent 로 escape.
 *
 * 디자인 원칙:
 *   1. 그라디언트 절대 금지 (solid 색만)
 *   2. 여백 넉넉 (top/side 25mm, side 20mm — 인쇄 safe area)
 *   3. Pretendard CDN + OS 한글 폰트 fallback
 *   4. -webkit-print-color-adjust: exact — 인쇄 시 배경색 (border, seal, cream) 유지
 *   5. 5줄 커리큘럼 = 1기 4주 8회 실 강의 (2기 5주 스펙 언급 금지)
 */

export type CertificateData = {
  serial_no: string;
  program_name_ko: string;
  program_name_en: string;
  duration_ko: string;
  duration_en: string;
  cohort_label: string;
  /** 서브 (작게 회색). 외국인 학생 = null (한글 이름 없음). */
  recipient_name_ko: string | null;
  /** 크게 (28pt 세리프). 노아 fix 2026-07-11: 원본 이름 (영문). */
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

/** HTML escape — &, <, >, ", '. */
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
  const attestKo = escapeHtml(data.attest_ko || PLACEHOLDER_ATTEST_KO);
  const attestEn = escapeHtml(data.attest_en || PLACEHOLDER_ATTEST_EN);
  // 노아 fix (2026-07-11): 원본 이름 (영문) 크게, 한글 이름 (있을 때만) 서브 작게 회색.
  const nameEn = escapeHtml(data.recipient_name_en);
  const nameKo = data.recipient_name_ko ? escapeHtml(data.recipient_name_ko) : null;
  const serial = escapeHtml(data.serial_no);
  const verifyUrl = escapeHtml(data.verify_url);
  const programKo = escapeHtml(data.program_name_ko);
  const programEn = escapeHtml(data.program_name_en);
  const durationKo = escapeHtml(data.duration_ko);
  const durationEn = escapeHtml(data.duration_en);
  const cohortLabel = escapeHtml(data.cohort_label);
  const issuedKo = escapeHtml(data.issued_date_ko);
  const issuedEn = escapeHtml(data.issued_date_en);
  const issuer = escapeHtml(data.issuer_name);
  const bizNo = escapeHtml(data.issuer_biz_no);
  const signaturePath = escapeHtml(data.signature_image_path);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>Certificate of Completion / 수료증 - ${serial}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow,noarchive" />
<style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #111;
  background: #FAF6EF;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@page { size: A4; margin: 0; }

.cert-page {
  width: 210mm;
  height: 297mm;
  padding: 25mm 20mm 40mm;
  position: relative;
  background: #FAF6EF;
  border: 1px solid #d9cfbc;
  overflow: hidden;
}

.cert-page::before {
  content: "";
  position: absolute;
  inset: 6mm;
  border: 1px solid #c9bea3;
  pointer-events: none;
}

.cert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 7mm;
  border-bottom: 1px solid #d9cfbc;
  margin-bottom: 10mm;
}

.cert-brand { display: flex; flex-direction: column; gap: 2mm; }
.cert-brand-name {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 16pt;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #111;
}
.cert-brand-sub { font-size: 9pt; color: #6b5c3f; letter-spacing: 0.3px; }

.cert-serial {
  text-align: right;
  font-family: 'SF Mono', 'JetBrains Mono', 'Courier New', monospace;
  font-size: 10pt;
  color: #3182f6;
  letter-spacing: 0.5px;
  font-weight: 500;
}
.cert-serial-label {
  display: block;
  font-family: 'Pretendard', sans-serif;
  font-size: 8pt;
  color: #8a7a5d;
  letter-spacing: 1px;
  margin-bottom: 1mm;
  text-transform: uppercase;
}

.cert-title { text-align: center; margin-bottom: 10mm; }
.cert-title-en {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 26pt;
  font-weight: 400;
  letter-spacing: 4px;
  color: #111;
  margin-bottom: 2mm;
}
.cert-title-ko {
  font-size: 14pt;
  font-weight: 600;
  color: #374151;
  letter-spacing: 6px;
}

.cert-body { padding: 0 6mm; }
.cert-recipient-name {
  text-align: center;
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 28pt;
  font-weight: 700;
  color: #111;
  margin-bottom: 3mm;
  letter-spacing: 0.5px;
}
.cert-recipient-name-sub {
  text-align: center;
  font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  font-size: 12pt;
  font-weight: 400;
  color: #6b7280;
  margin-bottom: 8mm;
  letter-spacing: -0.3px;
}

.cert-program {
  background: #f4ecdb;
  border-radius: 3mm;
  padding: 5mm 7mm;
  margin-bottom: 8mm;
  border: 1px solid #e7dcc4;
}
.cert-program-row {
  display: flex;
  gap: 6mm;
  padding: 2mm 0;
  font-size: 10pt;
  line-height: 1.6;
}
.cert-program-row + .cert-program-row { border-top: 1px solid #e7dcc4; }
.cert-program-key { flex: 0 0 30mm; color: #6b5c3f; font-weight: 500; }
.cert-program-value { flex: 1; color: #111; font-weight: 500; }

.cert-attest { text-align: center; margin-bottom: 7mm; }
.cert-attest-ko {
  font-size: 11pt;
  line-height: 1.9;
  color: #1f2937;
  margin-bottom: 4mm;
  padding: 0 4mm;
}
.cert-attest-en {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 10.5pt;
  line-height: 1.8;
  color: #4b5563;
  font-style: italic;
  padding: 0 6mm;
}

.cert-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 5mm;
  margin-top: 2mm;
  border-top: 1px solid #d9cfbc;
}
.cert-issuer { flex: 1; }
.cert-issue-date {
  font-size: 10pt;
  color: #111;
  font-weight: 500;
  margin-bottom: 5mm;
  letter-spacing: 0.3px;
}
.cert-issuer-name {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 13pt;
  font-weight: 600;
  color: #111;
  margin-bottom: 1mm;
  letter-spacing: 0.3px;
}
.cert-issuer-meta { font-size: 9pt; color: #6b5c3f; line-height: 1.7; }

.cert-sign { display: flex; align-items: flex-end; gap: 10mm; }
.cert-signature { text-align: center; min-width: 42mm; }
.cert-signature-line {
  height: 20mm;
  border-bottom: 1.2px solid #6b5c3f;
  margin-bottom: 2mm;
  position: relative;
}
.cert-signature-img {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  padding-bottom: 1mm;
  height: 18mm;
  object-fit: contain;
}
.cert-signature-fallback {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Brush Script MT', 'Snell Roundhand', cursive;
  font-size: 20pt;
  color: #1f2937;
  padding-bottom: 1mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}
.cert-signature-company {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-style: italic;
  font-size: 10pt;
  color: #6b5c3f;
  margin-top: 1mm;
  letter-spacing: 0.5px;
}
.cert-signature-name { font-size: 9pt; color: #374151; font-weight: 500; }
.cert-signature-title { font-size: 8pt; color: #6b5c3f; margin-top: 0.5mm; }

.cert-seal {
  width: 35mm;
  height: 35mm;
  border-radius: 50%;
  border: 2.5px solid #3182f6;
  color: #3182f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Times New Roman', 'Georgia', serif;
  font-weight: 700;
  letter-spacing: 0.6px;
  line-height: 1.3;
  text-align: center;
  flex-shrink: 0;
  transform: rotate(-6deg);
  background: #FAF6EF;
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

.cert-verify {
  position: absolute;
  bottom: 14mm;
  left: 20mm;
  right: 20mm;
  padding-top: 4mm;
  border-top: 1px solid #d9cfbc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8pt;
  color: #8a7a5d;
  gap: 6mm;
}
.cert-verify-text { line-height: 1.5; }
.cert-verify-url {
  font-family: 'SF Mono', 'JetBrains Mono', 'Courier New', monospace;
  color: #6b5c3f;
}
.cert-qr {
  width: 18mm;
  height: 18mm;
  background: #fff;
  border: 1px solid #d9cfbc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7pt;
  color: #8a7a5d;
}

@media screen {
  body { background: #eee6d3; padding: 20mm 0; display: flex; justify-content: center; }
  .cert-page { box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12); }
}
@media print {
  body { background: #FAF6EF; padding: 0; }
  .cert-page { box-shadow: none; }
}
</style>
</head>
<body>
<div class="cert-page">

  <header class="cert-header">
    <div class="cert-brand">
      <span class="cert-brand-name">Dropdown</span>
      <span class="cert-brand-sub">Fan to Pro / K-Pop Live Production</span>
    </div>
    <div>
      <span class="cert-serial-label">Serial No.</span>
      <span class="cert-serial">${serial}</span>
    </div>
  </header>

  <div class="cert-title">
    <div class="cert-title-en">CERTIFICATE OF COMPLETION</div>
    <div class="cert-title-ko">수 료 증</div>
  </div>

  <main class="cert-body">
    <div class="cert-recipient-name">${nameEn}</div>
    ${nameKo ? `<div class="cert-recipient-name-sub">${nameKo}</div>` : `<div style="margin-bottom: 8mm;"></div>`}

    <div class="cert-program">
      <div class="cert-program-row">
        <div class="cert-program-key">Program / 과정</div>
        <div class="cert-program-value">${programKo}<br>${programEn}</div>
      </div>
      <div class="cert-program-row">
        <div class="cert-program-key">Duration / 기간</div>
        <div class="cert-program-value">${durationKo}<br>${durationEn}</div>
      </div>
      <div class="cert-program-row">
        <div class="cert-program-key">Cohort / 기수</div>
        <div class="cert-program-value">${cohortLabel}</div>
      </div>
    </div>

    <div class="cert-attest">
      <p class="cert-attest-ko">${attestKo}</p>
      <p class="cert-attest-en">${attestEn}</p>
    </div>

  </main>

  <footer class="cert-footer">
    <div class="cert-issuer">
      <div class="cert-issue-date">
        발급일 Issued on: ${issuedKo} / ${issuedEn}
      </div>
      <div class="cert-issuer-name">${issuer}</div>
      <div class="cert-issuer-meta">
        사업자등록번호 ${bizNo}<br>
        Business Registration No. ${bizNo}<br>
        growthcareer.xyz
      </div>
    </div>
    <div class="cert-sign">
      <div class="cert-signature">
        <div class="cert-signature-line">
          <img class="cert-signature-img" src="${signaturePath}" alt="Signature" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
          <span class="cert-signature-fallback" style="display:none">Noah<span class="cert-signature-company">Dropdown</span></span>
        </div>
        <div class="cert-signature-name">대표 / CEO</div>
        <div class="cert-signature-title">${issuer}</div>
      </div>
      <div class="cert-seal">
        <span class="cert-seal-top">DROPDOWN</span>
        <span class="cert-seal-mid">성실 이수</span>
        <span class="cert-seal-bot">2026</span>
      </div>
    </div>
  </footer>

  <div class="cert-verify">
    <div class="cert-verify-text">
      본 수료증은 아래 URL 에서 진위를 확인할 수 있습니다.<br>
      Verify this certificate at:
      <span class="cert-verify-url">${verifyUrl}</span>
    </div>
    <div class="cert-qr">QR</div>
  </div>

</div>
</body>
</html>`;
}
