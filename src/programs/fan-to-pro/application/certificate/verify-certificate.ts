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

import {
  fetchCertificateByVerifyToken,
  fetchCertificateBySerialNo,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { isPlausibleVerifyToken } from "./verify-token";
import type { Certificate } from "@/src/programs/fan-to-pro/domain/entities/certificate";
import { z } from "zod";

// URL param 통합 스키마.
// 신규 verify_token = 10자 alphanumeric (hex 백필 row 는 16자).
// 기존 serial_no = "GC-FTP-1기-003" 형태 (한글 포함) — backward compat.
const TokenOrSerialSchema = z
  .string()
  .min(6)
  .max(60)
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
 * URL param (verify_token 또는 serial_no) 로 발급 여부 조회.
 *
 * 조회 우선순위:
 *   1) verify_token 매칭 (신규 opaque URL, 2026-07-19+ 발급물)
 *   2) serial_no 매칭 (backward compat, 이전 URL 캡처 대응)
 *
 * 함수명은 `BySerialNo` 로 남기지만 실제로는 두 매핑 모두 시도. 라우트 param
 * 이름 (`[serialNo]`) 유지 위해 이름 유지 = breaking rename 회피.
 *
 * 노출 정책 (§7.4 옵션 B):
 *   - PII 반환 X. 학생 이름, 이메일, 전화, 사업자번호 등 절대 X.
 *   - "유효 + 프로그램명 + 기수 + 발급일 + 발급 주체" 만 노출.
 *
 * @param token — URL path 로부터 (이미 decodeURIComponent 완료된 상태)
 */
export async function verifyCertificateBySerialNo(
  token: string,
): Promise<VerifyCertificateResult> {
  // 1) 입력 검증 — 형식 벗어나면 조회 자체 skip.
  const parsed = TokenOrSerialSchema.safeParse(token);
  if (!parsed.success) return { status: "invalid-format" };

  // 2) verify_token 매칭 우선. 형식이 alphanumeric only 일 때만 시도해 불필요
  //    쿼리 회피 (한글 포함 문자열 = serial_no 형식).
  let cert: Certificate | null = null;
  if (isPlausibleVerifyToken(parsed.data)) {
    cert = await fetchCertificateByVerifyToken(parsed.data);
  }

  // 3) verify_token 미매칭이면 serial_no fallback (backward compat).
  if (!cert) {
    cert = await fetchCertificateBySerialNo(parsed.data);
  }

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
