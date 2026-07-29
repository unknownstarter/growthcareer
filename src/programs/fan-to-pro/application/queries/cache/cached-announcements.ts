/**
 * Cached announcements query (Task #8, Iris).
 *
 * cohort 공지 목록 = cohort 공용 + 비PII (title/body/status/pinned). 캐시 OK.
 * ⛔ Sage: 공지 본문에 개인 식별 정보 없음 (cohort 전체 broadcast). 캐시 대상.
 *
 * 캐시 밖에서 권한 판정 (announcements 페이지의 assertProgramAdmin,
 * student 페이지의 cohort_memberships 가드). 캐시엔 데이터만.
 *
 * 무효화: create/publish/archive/delete announcement action 이
 * revalidateTag(announcementsTag(cohort_id)) 호출.
 * TTL 60s 는 보조 (누락 시 stale 최대 60s).
 */
import { unstable_cache } from "next/cache";
import {
  fetchAnnouncementsByCohort,
  fetchPublishedAnnouncementsByCohort,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/announcement-repository";
import type { Announcement } from "@/src/programs/fan-to-pro/domain/entities/announcement";
import { announcementsTag, LMS_CACHE_TTL_SEC } from "./cache-tags";

/** 운영자 view — 모든 status. cohort:{id}:announcements 태그. */
export function getAnnouncementsByCohortCached(
  cohortId: string,
): Promise<Announcement[]> {
  const cached = unstable_cache(
    async () => fetchAnnouncementsByCohort(cohortId),
    ["announcements-all", cohortId],
    {
      tags: [announcementsTag(cohortId)],
      revalidate: LMS_CACHE_TTL_SEC,
    },
  );
  return cached();
}

/** 학생 view — published 만. 동일 태그로 무효화. */
export function getPublishedAnnouncementsByCohortCached(
  cohortId: string,
): Promise<Announcement[]> {
  const cached = unstable_cache(
    async () => fetchPublishedAnnouncementsByCohort(cohortId),
    ["announcements-published", cohortId],
    {
      tags: [announcementsTag(cohortId)],
      revalidate: LMS_CACHE_TTL_SEC,
    },
  );
  return cached();
}
