/**
 * Cached lecture materials query (Task #8, Iris).
 *
 * 강의 자료 "메타 목록" (파일명/회차/크기/visibility) = cohort 공용 + 비PII. 캐시 OK.
 * ⛔ Sage: signed URL 은 캐시 X (자체 TTL 5분, 요청마다 발급). 여기선 메타 row 만.
 *
 * ⚠️ 시각 의존 분기 회피 (§7 SSG 자정 사고 방지):
 *   student view 의 "visible_from <= now()" 컷오프를 캐시 안에 넣으면 now() 가
 *   캐시 시점에 얼어붙어 scheduled 자료가 제 시각에 안 뜬다.
 *   → 캐시는 "전체 목록 (all visibility, 시각 무관)" 만 저장.
 *   → 학생 가시성 필터는 캐시 밖에서 isVisibleToStudent(m, new Date()) 로 계산.
 *   이러면 DB round-trip 은 캐시되고 컷오프는 요청 시각 기준 정확.
 *
 * 권한 판정은 캐시 밖 (listLectureMaterialsAction 의 assertCanUploadMaterial /
 * cohort_membership 가드, student 페이지의 assertCohortRole).
 *
 * 무효화: material insert/update/delete action 이
 * revalidateTag(materialsTag(cohort_id)) 호출.
 */
import { unstable_cache } from "next/cache";
import { fetchLectureMaterialsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";
import {
  isVisibleToStudent,
  type LectureMaterial,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";
import { materialsTag, LMS_CACHE_TTL_SEC } from "./cache-tags";

/**
 * cohort 전체 자료 (all visibility, 시각 무관). cohort:{id}:materials 태그.
 * 운영자 view = 이걸 그대로 사용.
 */
export function getLectureMaterialsByCohortCached(
  cohortId: string,
): Promise<LectureMaterial[]> {
  const cached = unstable_cache(
    async () => fetchLectureMaterialsByCohort(cohortId),
    ["lecture-materials-all", cohortId],
    {
      tags: [materialsTag(cohortId)],
      revalidate: LMS_CACHE_TTL_SEC,
    },
  );
  return cached();
}

/**
 * 학생 가시 자료 — 캐시된 전체 목록에서 시각 컷오프를 요청 시각으로 필터.
 *
 * ⚠️ now 는 캐시 밖 인자 (기본값 new Date()). 캐시엔 안 들어감.
 * scheduled 자료의 visible_from 컷오프가 자정 지나면 즉시 반영됨 (§7 준수).
 */
export async function getVisibleLectureMaterialsByCohortCached(
  cohortId: string,
  now: Date = new Date(),
): Promise<LectureMaterial[]> {
  const all = await getLectureMaterialsByCohortCached(cohortId);
  return all.filter((m) => isVisibleToStudent(m, now));
}
