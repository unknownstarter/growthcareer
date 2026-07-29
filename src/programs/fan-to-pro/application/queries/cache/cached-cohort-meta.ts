/**
 * Cached cohort meta query (Task #8, Iris).
 *
 * cohort 메타 (slug/status/일정/name) 는 거의 불변 + cohort 공용 + 비PII.
 * → unstable_cache 로 감싼다. 모든 /[cohortSlug]/* 페이지가 slug→cohort lookup 을
 * 매 요청 DB round-trip 하던 것을 캐시.
 *
 * ⛔ Sage: Cohort entity 는 PII 아님 (slug/status/정원/일정만). 캐시 OK.
 * ⚠️ status 는 시각에 따라 운영자가 전이시키지만, cohort status 전이는 write action
 *   (updateCohortStatus 계열) 이 revalidateTag 로 무효화. 자동 시각 전이 아님 →
 *   TTL 60s 보조로 충분 (§7 자정 자동 전환 대상 아님).
 *
 * 권한 판정은 캐시 밖 (페이지의 assertProgramAdmin / assertCohortRole).
 * 캐시엔 데이터만, 유저 스코프 없음.
 */
import { unstable_cache } from "next/cache";
import {
  fetchCohortBySlug,
  fetchCohortById,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";
import {
  cohortMetaTag,
  COHORT_SLUG_INDEX_TAG,
  LMS_CACHE_TTL_SEC,
} from "./cache-tags";

/**
 * slug → cohort 캐시. slug 별 개별 캐시 엔트리.
 * 태그: slug-index (신규 cohort / slug 변경 무효화) + meta:{id} 는 결과가 있어야
 * 알 수 있으므로 slug-index 로만 무효화. 개별 cohort 수정은 by-id 캐시가 담당.
 */
export function getCohortBySlugCached(slug: string): Promise<Cohort | null> {
  const cached = unstable_cache(
    async () => fetchCohortBySlug(slug),
    ["cohort-by-slug", slug],
    {
      tags: [COHORT_SLUG_INDEX_TAG],
      revalidate: LMS_CACHE_TTL_SEC,
    },
  );
  return cached();
}

/**
 * id → cohort 캐시. cohort:{id}:meta 태그로 개별 무효화 (cohort 수정/상태 전이).
 */
export function getCohortByIdCached(id: string): Promise<Cohort | null> {
  const cached = unstable_cache(
    async () => fetchCohortById(id),
    ["cohort-by-id", id],
    {
      tags: [cohortMetaTag(id), COHORT_SLUG_INDEX_TAG],
      revalidate: LMS_CACHE_TTL_SEC,
    },
  );
  return cached();
}
