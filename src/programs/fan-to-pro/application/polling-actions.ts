"use server";

/**
 * Polling-friendly server actions — viewer role 도 호출 가능.
 *
 * /admin/applicants 의 30 초 silent 폴링이 호출. fetchApplicants 가 server-only
 * helper 라 client 에서 직접 호출 불가 → "use server" 로 래핑.
 *
 * 규칙:
 *   - getAdminRole() 만 통과시키면 OK (assertAdmin 강제 X). viewer 면 mask=true.
 *   - 입력 0개. 폴링 빈도 30 s, 신청자 수 < 30 명 기준 부하 미미.
 *   - 외부 부작용 없음 — 순수 SELECT.
 *   - 에러는 throw 하지 말고 { rows: [], error: "<msg>" } 로.
 *
 * 같은 SELECT 가 server component 진입 시점에도 도는데, 폴링 응답은 별도 캐시
 * 안 탄다 (Supabase JS 가 fetch 캐시 미사용 + 이 함수는 unstable_cache 없음).
 */

import { fetchApplicants } from "@/src/programs/fan-to-pro/admin/fetch-applicants";
import { getAdminRole } from "@/src/programs/fan-to-pro/admin/role";
import type {
  AnonymizeEligibility,
  ApplicantRow,
} from "@/src/programs/fan-to-pro/admin/types";

export type PollApplicantsResult = {
  rows: ApplicantRow[];
  eligibility: AnonymizeEligibility;
  error: string | null;
  supabaseAvailable: boolean;
  /** server 응답 시각 ISO. 클라이언트의 "마지막 갱신" chip 이 사용. */
  fetchedAt: string;
};

export async function pollApplicants(): Promise<PollApplicantsResult> {
  // role 검증 — middleware 가 admin/viewer 만 통과시키지만 헤더 부재면 throw.
  // viewer 면 mask=true 유지 (server component 진입과 동일 정책).
  const role = await getAdminRole();
  const isViewer = role === "viewer";

  const { rows, eligibility, error, supabaseAvailable } = await fetchApplicants(
    { mask: isViewer },
  );

  return {
    rows,
    eligibility,
    error,
    supabaseAvailable,
    fetchedAt: new Date().toISOString(),
  };
}
