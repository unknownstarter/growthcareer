/**
 * LMS 캐시 태그 규약 (Task #8, Iris).
 *
 * ⛔ Sage CRITICAL: cohort 공용 + 비PII read 만 캐시. 캐시 키/태그에는
 * cohort_id 만 들어간다. user_id / role / 개인화 스코프 절대 금지.
 * PII (applicants / students / user_profiles / student_profiles / career docs /
 * consultations / 개인 dashboard / 재무 개별) 은 캐시 금지 → force-dynamic 유지.
 *
 * 태그 3종 (cohort 공용):
 *   - cohort:{id}:announcements — 공지 목록 (published + draft, cohort 별)
 *   - cohort:{id}:materials     — 강의 자료 메타 목록 (파일명/회차/크기, cohort 별)
 *   - cohort:{id}:meta          — cohort 메타 (slug/status/일정) + slug→id 매핑
 *
 * ⚠️ signed URL 은 캐시 X (자체 TTL 5분). 여기 태그는 "목록/메타" 만.
 * ⚠️ 시각 의존 분기 (visible_from cutoff) 는 캐시 밖에서 계산 (§7 SSG 자정 사고 방지).
 *
 * TTL: 보조로 revalidate 60초. 주 무효화는 write action 의 revalidateTag.
 */

import { revalidateTag } from "next/cache";

/** cohort 공지 목록 태그. */
export function announcementsTag(cohortId: string): string {
  return `cohort:${cohortId}:announcements`;
}

/** cohort 강의 자료 메타 목록 태그. */
export function materialsTag(cohortId: string): string {
  return `cohort:${cohortId}:materials`;
}

/** cohort 메타 (slug/status/일정) + slug→id 매핑 태그. */
export function cohortMetaTag(cohortId: string): string {
  return `cohort:${cohortId}:meta`;
}

/**
 * slug→id 매핑 lookup 태그 (id 미확정 시점 무효화용).
 * 신규 cohort 생성 / slug 변경 시 이 태그로 전체 slug lookup 캐시 무효화.
 */
export const COHORT_SLUG_INDEX_TAG = "cohort:slug-index";

/** 보조 TTL (초). 주 무효화는 purgeTag. */
export const LMS_CACHE_TTL_SEC = 60;

/**
 * 태그 즉시 purge — write action 에서 unstable_cache 엔트리 무효화.
 *
 * Next 16 에서 revalidateTag 는 (tag, profile) 2-arg 시그니처. cacheComponents
 * 미사용 (unstable_cache 경로) 에서는 "max" profile 로 해당 태그 전체 purge.
 * 이 detail 을 한 곳에 격리 — 호출처는 purgeTag(tag) 만.
 */
export function purgeTag(tag: string): void {
  revalidateTag(tag, "max");
}
