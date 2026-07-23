/**
 * 수료증 샘플 HTML 생성기 (B0081).
 *
 * certificate-template.ts 의 renderCertificateHtml 을 직접 import 해서
 * /tmp/cert-sample-preview.html 로 출력한다. capture-cert-batch-10.mjs 와
 * capture-cert-redesign.mjs 가 이 파일을 읽어 이름/serial 만 교체 후 캡처.
 *
 * 템플릿 변경 시 이 스크립트만 다시 돌리면 샘플이 항상 최신 동기화.
 *
 * 실행: node tools/gen-cert-sample.ts  (Node 23+ 네이티브 TS type-stripping)
 */
import { writeFile } from "node:fs/promises";
import {
  renderCertificateHtml,
  type CertificateData,
} from "../src/programs/fan-to-pro/application/certificate/certificate-template.ts";

const OUT = "/tmp/cert-sample-preview.html";

// 실 1기 값 기준 샘플. 이름 · serial 은 batch 스크립트가 학생별로 교체.
const sample: CertificateData = {
  serial_no: "GC-FTP-1기-001",
  program_name_ko: "Fan to Pro 4주 K-pop 공연 실무 교육 과정",
  program_name_en: "Fan to Pro 4-week K-Pop Live Production Program",
  duration_ko: "2026년 6월 27일 부터 2026년 7월 19일 까지 (4주, 총 8회차)",
  duration_en: "June 27, 2026 to July 19, 2026 (4 weeks, 8 sessions)",
  cohort_label: "1기 / Cohort 1",
  recipient_name_ko: null,
  recipient_name_en: "Kim Ji-Woo",
  attest_ko:
    "위 사람은 Fan to Pro 4주 K-pop 공연 실무 교육 과정을 성실히 이수하였음을 증명합니다.",
  attest_en:
    "This certifies that the recipient has completed the Fan to Pro 4-week K-Pop Live Production program from June 27, 2026 to July 19, 2026, comprising 8 sessions of hands-on training.",
  issued_date_ko: "2026년 7월 19일",
  issued_date_en: "July 19, 2026",
  issuer_name: "Dropdown (드롭다운)",
  issuer_biz_no: "154-28-02110",
  verify_url: "https://growthcareer.xyz/verify/PREVIEW",
  signature_image_path: "/brand/signature-noah.png",
};

const html = renderCertificateHtml(sample);
await writeFile(OUT, html, "utf8");
console.log(`[gen] wrote ${OUT} (${html.length} bytes)`);
