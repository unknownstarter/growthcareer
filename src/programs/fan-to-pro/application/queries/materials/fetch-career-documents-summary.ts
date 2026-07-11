/**
 * Career Documents Summary (resume / portfolio) — /admin/materials 통합 랜딩.
 *
 * student_career_documents 테이블 doc_type 별 필터. Resume, Portfolio 두 카테고리
 * 카드 데이터를 한 파일에 담아 shape 공유 + Supabase call 중복 회피.
 *
 * 데이터 특성:
 *   - student_career_documents PK = (student_id, doc_type) — 학생당 1건씩 최신본
 *   - doc_type ∈ {resume, cover_letter, portfolio}
 *   - PII: file_path 자체는 signed URL 필요 → 랜딩 요약은 file_name / storage_method
 *     만. 실제 열람은 상세 페이지 (별도 server action).
 *
 * ADR 0005 §2 — queries/ = CQRS read.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { CareerDocType } from "@/src/programs/fan-to-pro/domain/entities/career-document";

export type CareerDocSummaryItem = {
  student_id: string;
  student_name: string;
  cohort_id: string | null;
  cohort_name: string | null;
  cohort_slug: string | null;
  storage_method: "external_url" | "file_upload";
  file_name: string | null;
  external_url: string | null;
  updated_at: string;
};

export type CareerDocumentsSummary = {
  /** doc_type=resume 총 개수. */
  total: number;
  /** 최근 3건. */
  recent: CareerDocSummaryItem[];
  /** cohort 별 개수 (내림차순). */
  breakdown: Array<{
    cohort_id: string;
    cohort_name: string;
    cohort_slug: string | null;
    count: number;
  }>;
};

/** doc_type='resume' 요약. */
export function fetchResumesSummary(): Promise<CareerDocumentsSummary> {
  return fetchCareerDocumentsSummaryByType("resume");
}

/** doc_type='portfolio' 요약. */
export function fetchPortfoliosSummary(): Promise<CareerDocumentsSummary> {
  return fetchCareerDocumentsSummaryByType("portfolio");
}

async function fetchCareerDocumentsSummaryByType(
  docType: CareerDocType,
): Promise<CareerDocumentsSummary> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { total: 0, recent: [], breakdown: [] };
  }

  // 1) total count
  const { count: totalCount, error: countErr } = await supabase
    .from("student_career_documents")
    .select("student_id", { count: "exact", head: true })
    .eq("doc_type", docType);
  if (countErr) throw new Error(countErr.message);

  // 2) 전 row minimum (breakdown + recent 후처리).
  //   PII 최소 원칙: file_path 안 뽑음 (signed URL 필요). storage_method / file_name 만.
  const { data: rows, error: rowsErr } = await supabase
    .from("student_career_documents")
    .select(
      "student_id, storage_method, file_name, external_url, updated_at",
    )
    .eq("doc_type", docType)
    .order("updated_at", { ascending: false });
  if (rowsErr) throw new Error(rowsErr.message);

  if (!rows || rows.length === 0) {
    return { total: totalCount ?? 0, recent: [], breakdown: [] };
  }

  // 3) student join — 이름 + cohort_id
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id as string)));
  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, display_name, cohort_id")
    .in("id", studentIds);
  if (sErr) throw new Error(sErr.message);

  const studentMap = new Map<
    string,
    { display_name: string; cohort_id: string }
  >();
  for (const s of (students ?? []) as Array<{
    id: string;
    display_name: string;
    cohort_id: string;
  }>) {
    studentMap.set(s.id, {
      display_name: s.display_name,
      cohort_id: s.cohort_id,
    });
  }

  // 4) cohort lookup — name + slug
  const cohortIds = Array.from(
    new Set(
      Array.from(studentMap.values())
        .map((s) => s.cohort_id)
        .filter((c): c is string => !!c),
    ),
  );
  const cohortMap = new Map<
    string,
    { name: string; slug: string | null }
  >();
  if (cohortIds.length > 0) {
    const { data: cohorts, error: cErr } = await supabase
      .from("cohorts")
      .select("id, name, slug")
      .in("id", cohortIds);
    if (cErr) throw new Error(cErr.message);
    for (const c of (cohorts ?? []) as Array<{
      id: string;
      name: string;
      slug: string | null;
    }>) {
      cohortMap.set(c.id, { name: c.name, slug: c.slug });
    }
  }

  // 5) recent 3 (이미 updated_at desc 정렬)
  const recent: CareerDocSummaryItem[] = rows.slice(0, 3).map((r) => {
    const student = studentMap.get(r.student_id as string);
    const cohort = student ? cohortMap.get(student.cohort_id) : undefined;
    return {
      student_id: r.student_id as string,
      student_name: student?.display_name ?? "미상",
      cohort_id: student?.cohort_id ?? null,
      cohort_name: cohort?.name ?? null,
      cohort_slug: cohort?.slug ?? null,
      storage_method: r.storage_method as "external_url" | "file_upload",
      file_name: (r.file_name as string | null) ?? null,
      external_url: (r.external_url as string | null) ?? null,
      updated_at: r.updated_at as string,
    };
  });

  // 6) breakdown by cohort
  const countByCohort = new Map<string, number>();
  for (const r of rows) {
    const student = studentMap.get(r.student_id as string);
    if (!student?.cohort_id) continue;
    countByCohort.set(
      student.cohort_id,
      (countByCohort.get(student.cohort_id) ?? 0) + 1,
    );
  }
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
