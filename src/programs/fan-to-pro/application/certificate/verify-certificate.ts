import "server-only";

/**
 * Certificate 공개 verify — B0081 §7.4 신규 공개 표면.
 *
 * URL: /[locale]/verify/[serialNo]  (익명 접근 가능)
 *
 * PII 노출 정책 (노아 승인 옵션 B):
 *   - 노출 O: 발급번호, 프로그램명, 기수명, 발급일
 *   - 노출 X: 학생 이름 (한/영), 이메일, 전화, 국적, 비자, 사업자번호 등
 *
 * §7.4: 새 공개 표면 = Sage 검토 대상. 본 파일은 PII 필드 반환 절대 금지.
 * 반환 타입 (VerifyCertificateResult) 이 곧 노출 범위 계약.
 *
 * 노출 X 룰을 TypeScript 로 강제: return 타입에 이름/이메일 필드가 아예 없음.
 * 실수로 추가하려면 타입부터 변경해야 하므로 리뷰 검출력 상승.
 *
 * server action 아님 — 순수 read query. 페이지가 직접 호출.
 * Rate limiting: 향후 Sage 권고 시 Vercel Firewall custom rule 적용 예정.
 */

import { fetchCertificateBySerialNo } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { z } from "zod";

const SerialSchema = z
  .string()
  .min(6)
  .max(60)
  // 발급번호 문자셋: 한글 (기), 영숫자, hyphen 만. 다른 문자 유입 시 즉시 reject.
  .regex(/^[A-Za-z0-9가-힣-]+$/);

export type VerifyCertificateResult =
  | { status: "not-found" }
  | { status: "invalid-format" }
  | {
      status: "valid";
      serial_no: string;
      program_name: string;
      cohort_label: string;
      issued_at: string;
      issuer_name: string;
    };

/**
 * serial_no 로 발급 여부 조회.
 *
 * 노출 정책 (§7.4 옵션 B):
 *   - PII 반환 X. 학생 이름, 이메일, 전화, 사업자번호 등 절대 X.
 *   - "유효 + 프로그램명 + 기수 + 발급일 + 발급 주체" 만 노출.
 *
 * @param serialNo — URL path 로부터 (이미 decodeURIComponent 완료된 상태)
 */
export async function verifyCertificateBySerialNo(
  serialNo: string,
): Promise<VerifyCertificateResult> {
  // 1) 입력 검증 — 형식 벗어나면 조회 자체 skip.
  const parsed = SerialSchema.safeParse(serialNo);
  if (!parsed.success) return { status: "invalid-format" };

  const cert = await fetchCertificateBySerialNo(parsed.data);
  if (!cert) return { status: "not-found" };

  // 2) cohort 정보 join (프로그램명 조회용)
  const cohort = await fetchCohortById(cert.cohort_id).catch(() => null);

  // 3) 프로그램명 — cohort.program_id → programs.name.
  //    현재 fan-to-pro 만 활성 이므로 fallback 고정.
  let programName = "Fan to Pro / K-Pop Live Production";
  if (cohort?.program_id) {
    const supabase = getSupabaseServer();
    if (supabase) {
      const { data: prog } = await supabase
        .from("programs")
        .select("name")
        .eq("id", cohort.program_id)
        .maybeSingle();
      if (prog && typeof (prog as { name?: unknown }).name === "string") {
        programName = (prog as { name: string }).name;
      }
    }
  }

  // 4) cohort 라벨 — "1기" 만. 학생 이름 등 PII 없음.
  const cohortLabel = cohort?.name ?? "";

  return {
    status: "valid",
    serial_no: cert.serial_no,
    program_name: programName,
    cohort_label: cohortLabel,
    issued_at: cert.issued_at,
    issuer_name: "Dropdown (드롭다운)",
  };
}
