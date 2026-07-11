/**
 * Lecture Materials Summary — /admin/materials 통합 랜딩 5-카테고리 카드용.
 *
 * cohort 별로 그룹핑된 강의 자료 요약. lecture_materials 테이블 조회.
 *
 * ADR 0005 §2 — queries/ = CQRS read 전용. 호출자 (server component / server
 * action) 가 assertProgramAdmin 등 가드 책임 (CLAUDE.md §7.4).
 *
 * 캐시 정책: 라이브 운영 중 실시간 변동 → 랜딩 페이지 force-dynamic. 본 query
 * 자체는 pure fetch, 캐시 없음.
 *
 * 성능: recent 3건 정렬만 필요 — cohort loop 없이 single order+limit 로 뽑고,
 * cohort 별 count 는 별도 aggregate query. 3 round-trips 이내.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  LectureMaterialSchema,
  type LectureMaterial,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

export type LectureMaterialsSummary = {
  /** 전체 lecture_materials 총 개수. */
  total: number;
  /** 최근 업로드 3건 — cohort_slug 조인 포함. */
  recent: Array<
    Pick<
      LectureMaterial,
      | "id"
      | "cohort_id"
      | "title"
      | "storage_method"
      | "visibility"
      | "week_number"
      | "created_at"
    > & {
      cohort_slug: string | null;
      cohort_name: string;
    }
  >;
  /** cohort 별 자료 개수 (내림차순). 랜딩 카드에서 [1기 12개 · 2기 8개 ...] 표시. */
  breakdown: Array<{
    cohort_id: string;
    cohort_name: string;
    cohort_slug: string | null;
    count: number;
  }>;
};

export async function fetchLectureMaterialsSummary(): Promise<LectureMaterialsSummary> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { total: 0, recent: [], breakdown: [] };
  }

  // 1) total count (head)
  const { count: totalCount, error: countErr } = await supabase
    .from("lecture_materials")
    .select("id", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);

  // 2) recent 3 (cohort join)
  const { data: recentRows, error: recentErr } = await supabase
    .from("lecture_materials")
    .select(
      "id, cohort_id, title, storage_method, visibility, week_number, created_at, file_path, file_name, file_size_bytes, mime_type, external_url, description, session_id, visible_from, uploaded_by, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(3);
  if (recentErr) throw new Error(recentErr.message);

  // 3) cohort names for recent rows + all cohort counts
  const cohortIds = new Set<string>();
  for (const r of (recentRows ?? []) as Array<{ cohort_id: string }>) {
    cohortIds.add(r.cohort_id);
  }

  // 3-1) cohort-level count (group by cohort_id) — Supabase 는 group-by 미지원 →
  // 전 row 를 최소 컬럼만 뽑아 in-memory group. 자료 수가 수천 단위 넘기 전엔 OK.
  const { data: allMinRows, error: allErr } = await supabase
    .from("lecture_materials")
    .select("cohort_id");
  if (allErr) throw new Error(allErr.message);

  const countByCohort = new Map<string, number>();
  for (const r of (allMinRows ?? []) as Array<{ cohort_id: string }>) {
    countByCohort.set(r.cohort_id, (countByCohort.get(r.cohort_id) ?? 0) + 1);
    cohortIds.add(r.cohort_id);
  }

  // 4) cohort name/slug lookup — 최소 컬럼만.
  const cohortMap = new Map<
    string,
    { name: string; slug: string | null }
  >();
  if (cohortIds.size > 0) {
    const { data: cohortRows, error: cohortErr } = await supabase
      .from("cohorts")
      .select("id, name, slug")
      .in("id", Array.from(cohortIds));
    if (cohortErr) throw new Error(cohortErr.message);
    for (const c of (cohortRows ?? []) as Array<{
      id: string;
      name: string;
      slug: string | null;
    }>) {
      cohortMap.set(c.id, { name: c.name, slug: c.slug });
    }
  }

  // recent: cohort join
  const recent = (recentRows ?? []).map((row) => {
    const parsed = LectureMaterialSchema.parse(row);
    const cohort = cohortMap.get(parsed.cohort_id);
    return {
      id: parsed.id,
      cohort_id: parsed.cohort_id,
      title: parsed.title,
      storage_method: parsed.storage_method,
      visibility: parsed.visibility,
      week_number: parsed.week_number,
      created_at: parsed.created_at,
      cohort_slug: cohort?.slug ?? null,
      cohort_name: cohort?.name ?? "미상",
    };
  });

  // breakdown: cohort 별 count 내림차순
  const breakdown = Array.from(countByCohort.entries())
    .map(([cohort_id, count]) => {
      const cohort = cohortMap.get(cohort_id);
      return {
        cohort_id,
        cohort_name: cohort?.name ?? "미상",
        cohort_slug: cohort?.slug ?? null,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    total: totalCount ?? 0,
    recent,
    breakdown,
  };
}
