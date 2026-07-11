/**
 * Announcements Summary — /admin/materials 통합 랜딩.
 *
 * ⚠️ 첨부 자료 (attachments) 컬럼이 announcements 테이블에 아직 없음. 노아 스코프
 * "announcement 첨부 자료" 는 향후 확장 대상. 현재는 title body 만 지원 (마이그레이션
 * `20260628000001_announcements.sql` 확인).
 *
 * Slice 1 정책 (Sophia/Aria 확정 대기):
 *   (A) 이 카테고리를 통합 랜딩에서 제외 (미구현 표시)
 *   (B) 공지 자체를 "자료" 로 취급 (첨부 없이 title/body) — 현재 구현
 *
 * (B) 접근으로 진행 — 학생 관점에서 공지 = 자료 라고 보는 관점 성립. 향후 첨부
 * 컬럼 추가 시 shape 확장 (breaking change 없음).
 *
 * ADR 0005 §2 — queries/ = CQRS read.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { AnnouncementStatus } from "@/src/programs/fan-to-pro/domain/entities/announcement";

export type AnnouncementSummaryItem = {
  id: string;
  cohort_id: string;
  cohort_name: string;
  cohort_slug: string | null;
  title: string;
  status: AnnouncementStatus;
  pinned: boolean;
  published_at: string | null;
  created_at: string;
};

export type AnnouncementsSummary = {
  /** 전체 공지 (모든 status). */
  total: number;
  /** published 공지 카운트 (학생 노출). */
  publishedCount: number;
  /** 최근 3건 (published 우선 pinned desc, 없으면 created_at desc). */
  recent: AnnouncementSummaryItem[];
  /** cohort 별 공지 수 (내림차순). */
  breakdown: Array<{
    cohort_id: string;
    cohort_name: string;
    cohort_slug: string | null;
    count: number;
  }>;
};

export async function fetchAnnouncementAttachmentsSummary(): Promise<AnnouncementsSummary> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { total: 0, publishedCount: 0, recent: [], breakdown: [] };
  }

  // 1) 전 row (최소 컬럼)
  const { data: rows, error } = await supabase
    .from("announcements")
    .select(
      "id, cohort_id, title, status, pinned, published_at, created_at",
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  if (!rows || rows.length === 0) {
    return { total: 0, publishedCount: 0, recent: [], breakdown: [] };
  }

  // 2) cohort join
  const cohortIds = Array.from(
    new Set(rows.map((r) => r.cohort_id as string)),
  );
  const { data: cohorts, error: cErr } = await supabase
    .from("cohorts")
    .select("id, name, slug")
    .in("id", cohortIds);
  if (cErr) throw new Error(cErr.message);

  const cohortMap = new Map<
    string,
    { name: string; slug: string | null }
  >();
  for (const c of (cohorts ?? []) as Array<{
    id: string;
    name: string;
    slug: string | null;
  }>) {
    cohortMap.set(c.id, { name: c.name, slug: c.slug });
  }

  // 3) 카운트
  let publishedCount = 0;
  const countByCohort = new Map<string, number>();
  for (const r of rows) {
    if ((r.status as AnnouncementStatus) === "published") publishedCount += 1;
    countByCohort.set(
      r.cohort_id as string,
      (countByCohort.get(r.cohort_id as string) ?? 0) + 1,
    );
  }

  // 4) recent 3
  const recent: AnnouncementSummaryItem[] = rows.slice(0, 3).map((r) => {
    const cohort = cohortMap.get(r.cohort_id as string);
    return {
      id: r.id as string,
      cohort_id: r.cohort_id as string,
      cohort_name: cohort?.name ?? "미상",
      cohort_slug: cohort?.slug ?? null,
      title: r.title as string,
      status: r.status as AnnouncementStatus,
      pinned: (r.pinned as boolean) ?? false,
      published_at: (r.published_at as string | null) ?? null,
      created_at: r.created_at as string,
    };
  });

  // 5) breakdown
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
    total: rows.length,
    publishedCount,
    recent,
    breakdown,
  };
}
