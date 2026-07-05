import type { Metadata } from "next";
import Link from "next/link";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { routing } from "@/src/i18n/routing";
import {
  verifyCertificateBySerialNo,
  type VerifyCertificateResult,
} from "@/src/programs/fan-to-pro/application/certificate/verify-certificate";

/**
 * /[locale]/verify/[serialNo]. 수료증 진위 확인 페이지 (B0081).
 *
 * 공개 표면 (익명 접근 가능). PII 노출 정책 (§7.4, 노아 승인 옵션 B):
 *   - 노출 O: 발급번호 / 프로그램명 / 기수 / 발급일 / 발급 주체
 *   - 노출 X: 학생 이름 / 이메일 / 전화 / 국적 / 비자 등
 *
 * verifyCertificateBySerialNo 의 반환 타입 자체가 노출 계약. 여기선 그대로 표시.
 *
 * 노출 최소화:
 *   - robots noindex (개별 발급번호가 검색 노출 X)
 *   - 실패 케이스 (not-found / invalid-format) 는 동일한 문구로 통합해 브루트포스
 *     시도 신호 감소
 *
 * 톤: 라이트. 수료증 본체와 동일한 프로페셔널 문서 톤.
 */

type PageParams = { locale: string; serialNo: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { serialNo: raw } = await params;
  let serialNo = raw;
  try {
    serialNo = decodeURIComponent(raw);
  } catch {
    // malformed. raw 그대로 title 노출.
  }
  return {
    title: `수료증 진위 확인 - ${serialNo}`,
    // 개별 발급번호는 검색 노출 절대 금지. brute-force 대비.
    robots: { index: false, follow: false, nocache: true },
  };
}

// verify 는 실시간 조회. SSG 금지 (§7 시간 기반 자동 전환 룰 준용).
export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, serialNo: rawSerialNo } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // 경계 검증: locale 통과. serialNo 는 URL path 에서 percent-encoded 상태로 들어옴
  // (예: 한글 "1기" → "1%EA%B8%B0"). decode 후 zod 검증에 넘김.
  // decode 실패 시 (invalid escape) fallback 으로 raw 그대로 사용해 not-found 처리.
  let serialNo = rawSerialNo;
  try {
    serialNo = decodeURIComponent(rawSerialNo);
  } catch {
    // malformed URI. verifyCertificateBySerialNo 의 zod regex 가 reject 하도록 두기.
  }
  const result = await verifyCertificateBySerialNo(serialNo);

  return (
    <main className="min-h-screen bg-neutral-50 py-16 px-6">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#3182f6]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Growth Career
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            수료증 진위 확인 / Certificate Verification
          </p>
        </header>

        <ResultCard result={result} serialNo={serialNo} />

        <footer className="mt-10 text-center text-xs text-neutral-400">
          <p>
            본 페이지는 발급번호의 유효성만 확인하며 개인 정보는 표시하지 않습니다.
          </p>
          <p className="mt-1">
            추가 확인이 필요한 경우 <Link href={`/${locale}`} className="underline">growthcareer.xyz</Link> 문의 채널을 이용해 주세요.
          </p>
        </footer>
      </div>
    </main>
  );
}

function ResultCard({
  result,
  serialNo,
}: {
  result: VerifyCertificateResult;
  serialNo: string;
}) {
  // 실패 케이스는 통합. brute-force 시 존재 여부 유출 최소화.
  if (result.status !== "valid") {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-[#b42318]" />
          <h2 className="text-base font-semibold text-neutral-900">
            유효하지 않은 수료증
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-neutral-600">
          입력하신 발급번호 <code className="font-mono text-neutral-800">{serialNo}</code> 에 해당하는 수료증을 찾을 수 없습니다.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          발급번호를 다시 확인하시거나 발급 기관에 문의해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#067647]" />
        <h2 className="text-base font-semibold text-neutral-900">
          유효한 수료증입니다
        </h2>
      </div>

      <dl className="space-y-4 text-sm">
        <Row label="발급번호 / Serial No" value={result.serial_no} mono />
        <Row label="프로그램 / Program" value={result.program_name} />
        {result.cohort_label ? (
          <Row label="기수 / Cohort" value={result.cohort_label} />
        ) : null}
        <Row
          label="발급일 / Issued on"
          value={formatIssuedDate(result.issued_at)}
        />
        <Row label="발급 주체 / Issuer" value={result.issuer_name} />
      </dl>

      <p className="mt-6 border-t border-neutral-100 pt-4 text-xs leading-relaxed text-neutral-500">
        본 발급번호는 발급 기록이 확인된 유효한 수료증입니다. 수료자의 이름 등 개인정보는 이 페이지에서 표시하지 않습니다.
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <dt className="w-40 shrink-0 text-neutral-500">{label}</dt>
      <dd
        className={`flex-1 text-neutral-900 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * issued_at (ISO datetime 또는 date) → "YYYY년 M월 D일 / Month D, YYYY".
 */
function formatIssuedDate(iso: string): string {
  const dateStr = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return iso;
  const y = m[1];
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${y}년 ${mo}월 ${d}일 / ${months[mo - 1]} ${d}, ${y}`;
}
