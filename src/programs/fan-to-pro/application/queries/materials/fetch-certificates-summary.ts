/**
 * Certificates Summary — /admin/materials 통합 랜딩.
 *
 * certificates 테이블 요약 (completion + performance kind 모두 포함).
 * 최근 발급 3건, cohort 별 발급 수.
 *
 * ADR 0005 §2 — queries/ = CQRS read. 호출자 가드 책임.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { CertificateKind } from "@/src/programs/fan-to-pro/domain/entities/certificate";

export type CertificateSummaryItem = {
  id: string;
  student_id: string;
  student_name: string;
  cohort_id: string;
  cohort_name: string;
  cohort_slug: string | null;
  kind: CertificateKind;
  serial_no: string;
  issued_at: string;
};

export type CertificatesSummary = {
  /** 전체 발급 총 개수. */
  total: number;
  /** kind 별 카운트. */
  byKind: {
    completion: number;
    performance: number;
  };
  /** 최근 발급 3건. */
  recent: CertificateSummaryItem[];
  /** cohort 별 발급 수 (내림차순). */
  breakdown: Array<{
    cohort_id: string;
    cohort_name: string;
    cohort_slug: string | null;
    count: number;
  }>;
};

export async function fetchCertificatesSummary(): Promise<CertificatesSummary> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return {
      total: 0,
      byKind: { completion: 0, performance: 0 },
      recent: [],
      breakdown: [],
    };
  }

  // 1) 전 row minimum — PII 최소 (file_path 안 뽑음, verify 는 별도 페이지).
  const { data: rows, error } = await supabase
    .from("certificates")
    .select("id, student_id, cohort_id, kind, serial_no, issued_at")
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);

  if (!rows || rows.length === 0) {
    return {
      total: 0,
      byKind: { completion: 0, performance: 0 },
      recent: [],
      breakdown: [],
    };
  }

  // 2) student + cohort join
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id as string)));
  const cohortIds = Array.from(new Set(rows.map((r) => r.cohort_id as string)));

  const [studentsRes, cohortsRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, display_name")
      .in("id", studentIds),
    supabase
      .from("cohorts")
      .select("id, name, slug")
      .in("id", cohortIds),
  ]);

  if (studentsRes.error) throw new Error(studentsRes.error.message);
  if (cohortsRes.error) throw new Error(cohortsRes.error.message);

  const studentMap = new Map<string, string>();
  for (const s of (studentsRes.data ?? []) as Array<{
    id: string;
    display_name: string;
  }>) {
    studentMap.set(s.id, s.display_name);
  }

  const cohortMap = new Map<
    string,
    { name: string; slug: string | null }
  >();
  for (const c of (cohortsRes.data ?? []) as Array<{
    id: string;
    name: string;
    slug: string | null;
  }>) {
    cohortMap.set(c.id, { name: c.name, slug: c.slug });
  }

  // 3) 카운트
  let completionCount = 0;
  let performanceCount = 0;
  const countByCohort = new Map<string, number>();

  for (const r of rows) {
    const kind = r.kind as CertificateKind;
    if (kind === "completion") completionCount += 1;
    else if (kind === "performance") performanceCount += 1;
    countByCohort.set(
      r.cohort_id as string,
      (countByCohort.get(r.cohort_id as string) ?? 0) + 1,
    );
  }

  // 4) recent 3 (이미 정렬됨)
  const recent: CertificateSummaryItem[] = rows.slice(0, 3).map((r) => {
    const cohort = cohortMap.get(r.cohort_id as string);
    return {
      id: r.id as string,
      student_id: r.student_id as string,
      student_name: studentMap.get(r.student_id as string) ?? "미상",
      cohort_id: r.cohort_id as string,
      cohort_name: cohort?.name ?? "미상",
      cohort_slug: cohort?.slug ?? null,
      kind: r.kind as CertificateKind,
      serial_no: r.serial_no as string,
      issued_at: r.issued_at as string,
    };
  });

  // 5) breakdown by cohort
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
    byKind: {
      completion: completionCount,
      performance: performanceCount,
    },
    recent,
    breakdown,
  };
}
