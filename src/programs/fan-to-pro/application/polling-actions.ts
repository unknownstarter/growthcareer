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
import type { ApplicantView } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
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

const VALID_VIEWS: readonly ApplicantView[] = ["cohort2", "cohort1", "all"];

export async function pollApplicants(
  requestedView?: ApplicantView,
): Promise<PollApplicantsResult> {
  // role 검증 — middleware 가 admin/viewer 만 통과시키지만 헤더 부재면 throw.
  // ADR 0017 D1: viewer(코워크) 는 PII 마스킹. page.tsx 진입 렌더와 동일 규칙을
  // 폴링에도 적용해야 함 — 안 그러면 30초 뒤 폴링 응답이 마스킹을 덮어써 원문
  // 노출 (Sage 배포게이트 CRIT). admin/super 는 mask:false 로 원문 불변.
  const role = await getAdminRole();
  const isViewer = role === "viewer";

  // 기수 필터 (옵션 A) — page 진입 렌더와 같은 스코프를 폴링에도 적용해야 함.
  // 안 그러면 30초 뒤 poll 이 전체(all) 스냅샷을 staging 해 "N건 변경" chip 이
  // 스코프 밖 row 로 오염 + apply 시 뷰 이탈. viewer 는 서버에서 강제 cohort2
  // (클라가 다른 view 를 넘겨도 무시 — page 가드와 동일한 server gate).
  const safeRequested =
    requestedView && VALID_VIEWS.includes(requestedView)
      ? requestedView
      : "cohort2";
  const view: ApplicantView = isViewer ? "cohort2" : safeRequested;

  const { rows, eligibility, error, supabaseAvailable } = await fetchApplicants(
    { mask: isViewer, view },
  );

  return {
    rows,
    eligibility,
    error,
    supabaseAvailable,
    fetchedAt: new Date().toISOString(),
  };
}
