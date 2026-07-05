/**
 * Certificate serial number generator (B0081).
 *
 * 형식: `GC-FTP-{N}기-{seq}` (예: `GC-FTP-1기-001`)
 *   - N = cohort.name 에서 "N기" 숫자 부분 추출 (예: "1기" -> 1)
 *   - seq = cohort 내 발급 순서 001~999 (created_at ASC)
 *
 * Idempotent — 이미 발급된 (student_id, cohort_id, kind='completion') 있으면
 * 그 serial_no 반환. 새로 생성하지 않음.
 *
 * 동시성: 노아 결정 — admin 이 1명씩 수동 발급 또는 학생 self-serve 하나씩.
 * MAX(seq) + 1 계산과 INSERT 사이 race 가능성 낮음. UNIQUE 제약이 있으면
 * 후처리로 retry 하면 됨 (본 함수는 계산만).
 */
import "server-only";
import {
  fetchCertificatesByStudent,
  fetchCertificatesByCohort,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";

/**
 * cohort.name (예: "1기", "2기") 에서 숫자 부분 추출.
 * 못 찾으면 null — 발급번호 형식이 fallback 됨.
 */
export function extractCohortNumber(cohortName: string): number | null {
  const m = /(\d+)\s*기/.exec(cohortName);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 발급번호 생성 (idempotent).
 *
 * 순서:
 *   1. 학생의 completion 수료증 이미 있으면 그 serial_no 반환
 *   2. cohort 정보 + 기존 발급 count 조회
 *   3. seq = 기존 completion 발급 count + 1
 *   4. cohort 번호 (N기) 확정 못 하면 slug 사용
 *
 * @param studentId — 학생 UUID
 * @param cohortId — cohort UUID
 * @returns 발급번호 문자열
 */
export async function generateSerialNo(
  studentId: string,
  cohortId: string,
): Promise<string> {
  // 1. idempotent — 이미 발급됐으면 재사용
  const existing = await fetchCertificatesByStudent(studentId);
  const already = existing.find(
    (c) => c.cohort_id === cohortId && c.kind === "completion",
  );
  if (already) return already.serial_no;

  // 2. cohort + 기존 발급 병렬
  const [cohort, cohortCerts] = await Promise.all([
    fetchCohortById(cohortId),
    fetchCertificatesByCohort(cohortId),
  ]);
  if (!cohort) throw new Error(`unknownCohort: ${cohortId}`);

  // 3. seq — completion 만 카운트 (performance 는 별도 sequence)
  const completionCount = cohortCerts.filter(
    (c) => c.kind === "completion",
  ).length;
  const nextSeq = completionCount + 1;
  const seqStr = String(nextSeq).padStart(3, "0");

  // 4. cohort 번호 확정
  const cohortNum = extractCohortNumber(cohort.name);
  const cohortToken = cohortNum !== null ? `${cohortNum}기` : cohort.slug ?? cohort.id.slice(0, 8);

  return `GC-FTP-${cohortToken}-${seqStr}`;
}
